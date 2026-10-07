"""Unit tests for Firebase storage using a mocked Realtime Database reference.

All tests in this module mock the Firebase Admin SDK and the Realtime Database
reference. No real Firebase project, network call, or credential file is ever
required or used, and no production Firebase records are created.
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from backend.app.services.firebase_storage import FirebaseStorage
from backend.app.services.storage import PaginationParams, StorageStats
from backend.app.utils.errors import DuplicateError, FirebaseError, StorageError


class FakeReference:
    def __init__(self, values=None):
        self.values = values or {}
        self.children = {}

    def child(self, key):
        self.children[key] = self.children.get(key, FakeChildReference(self, key))
        return self.children[key]

    def get(self, **kwargs):
        return self.values

    def limit_to_first(self, _value):
        return self

    def order_by_child(self, _value):
        return self

    def equal_to(self, _value):
        return self

    def limit_to_last(self, _value):
        return self

    def order_by_key(self):
        return self


class FakeChildReference:
    def __init__(self, parent, key):
        self.parent = parent
        self.key = key

    def transaction(self, callback):
        current = self.parent.values.get(self.key)
        value = callback(current)
        self.parent.values[self.key] = value
        return value

    def get(self, **kwargs):
        return self.parent.values.get(self.key)

    def set(self, value):
        self.parent.values[self.key] = value
        return value

    def delete(self):
        self.parent.values.pop(self.key, None)


def make_config(**overrides):
    """Build a minimal fake config object for FirebaseStorage tests."""
    defaults = dict(
        firebase_project_id="test-project",
        firebase_database_url="https://test.invalid",
        firebase_credentials_path=None,
        firebase_timeout_seconds=1,
        firebase_smoke_test=False,
        validate_firebase_config=lambda: [],
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


@pytest.fixture
def firebase_storage(sample_reading_create):
    ref = FakeReference()
    storage = FirebaseStorage(
        config_value=make_config(),
        db_reference=ref,
    )
    storage._initialized = True
    return storage, ref, sample_reading_create


@pytest.fixture
def uninitialized_firebase_storage():
    """FirebaseStorage instance without initialization or database reference."""
    storage = FirebaseStorage(config_value=make_config())
    return storage


# --- 1. Firebase initialization success ---
def test_firebase_initialization_success():
    """Test successful Firebase initialization with valid config and mocked reference."""
    ref = FakeReference()
    config = make_config()
    
    storage = FirebaseStorage(config_value=config, db_reference=ref)
    asyncio.run(storage.initialize())
    
    assert storage._initialized is True
    assert storage._ref is not None


# --- 2. Firebase initialization with missing configuration ---
def test_firebase_initialization_missing_config():
    """Test Firebase initialization fails with missing required configuration."""
    config = make_config(
        firebase_project_id=None,
        firebase_database_url=None,
        validate_firebase_config=lambda: [
            "FIREBASE_PROJECT_ID is required when STORAGE_BACKEND=firebase",
            "FIREBASE_DATABASE_URL is required when STORAGE_BACKEND=firebase",
        ],
    )
    
    storage = FirebaseStorage(config_value=config)
    
    with pytest.raises(StorageError, match="Firebase configuration invalid"):
        asyncio.run(storage.initialize())


# --- 3. Firebase initialization failure ---
def test_firebase_initialization_failure(uninitialized_firebase_storage):
    """Test Firebase initialization fails when Admin SDK raises an exception."""
    storage = uninitialized_firebase_storage
    storage._config.validate_firebase_config = lambda: []
    
    with patch("backend.app.services.firebase_storage.firebase_admin.initialize_app", 
               side_effect=Exception("credential error")):
        with pytest.raises(FirebaseError, match="Firebase initialization failed"):
            asyncio.run(storage.initialize())


# --- 4. Successful sensor-reading creation ---
def test_create_reading_uses_idempotent_transaction(firebase_storage):
    storage, ref, reading = firebase_storage

    stored = asyncio.run(storage.create_reading(reading))

    assert stored.reading_id == reading.reading_id
    assert ref.values[reading.reading_id]["plant_id"] == reading.plant_id


# --- 5. Duplicate reading_id protection ---
def test_duplicate_reading_id_protection(firebase_storage):
    storage, ref, reading = firebase_storage

    asyncio.run(storage.create_reading(reading))

    with pytest.raises(DuplicateError):
        asyncio.run(storage.create_reading(reading))


# --- 6. get_reading() ---
def test_get_reading_returns_stored_reading(firebase_storage):
    """Test retrieving a single reading by ID."""
    storage, ref, reading = firebase_storage

    created = asyncio.run(storage.create_reading(reading))
    
    fetched = asyncio.run(storage.get_reading(reading.reading_id))
    
    assert fetched is not None
    assert fetched.reading_id == reading.reading_id
    assert fetched.plant_id == reading.plant_id
    assert fetched.session_id == reading.session_id
    assert fetched.timestamp == reading.timestamp


def test_get_reading_returns_none_for_missing(firebase_storage):
    """Test get_reading returns None for non-existent reading ID."""
    storage, _, _ = firebase_storage
    
    result = asyncio.run(storage.get_reading("NONEXISTENT-READING"))
    
    assert result is None


# --- 7. get_latest_reading() ---
def test_get_latest_reading_returns_most_recent(firebase_storage):
    storage, ref, reading = firebase_storage
    second = reading.model_copy(
        update={
            "reading_id": "TEST-READING-002",
            "timestamp": reading.timestamp.replace(minute=30),
        }
    )
    asyncio.run(storage.create_reading(reading))
    asyncio.run(storage.create_reading(second))

    latest = asyncio.run(storage.get_latest_reading(plant_id=reading.plant_id))
    
    assert latest.reading_id == second.reading_id


def test_get_latest_reading_without_plant_filter(firebase_storage):
    """Test get_latest_reading without plant filter returns global latest."""
    storage, ref, reading = firebase_storage
    second = reading.model_copy(
        update={
            "reading_id": "TEST-READING-002",
            "plant_id": "PLANT-002",
            "timestamp": reading.timestamp.replace(minute=30),
        }
    )
    asyncio.run(storage.create_reading(reading))
    asyncio.run(storage.create_reading(second))

    latest = asyncio.run(storage.get_latest_reading())
    
    assert latest.reading_id == second.reading_id


def test_get_latest_reading_returns_none_when_empty(firebase_storage):
    """Test get_latest_reading returns None when no readings exist."""
    storage, _, _ = firebase_storage
    
    result = asyncio.run(storage.get_latest_reading())
    
    assert result is None


# --- 8. list_readings() ---
def test_get_latest_and_paginated_history(firebase_storage):
    storage, ref, reading = firebase_storage
    second = reading.model_copy(
        update={
            "reading_id": "TEST-READING-002",
            "timestamp": reading.timestamp.replace(minute=30),
        }
    )
    asyncio.run(storage.create_reading(reading))
    asyncio.run(storage.create_reading(second))

    latest = asyncio.run(storage.get_latest_reading(plant_id=reading.plant_id))
    page, total = asyncio.run(
        storage.list_readings(PaginationParams(page=1, page_size=1, plant_id=reading.plant_id))
    )

    assert latest.reading_id == second.reading_id
    assert total == 2
    assert len(page) == 1
    assert page[0].reading_id == second.reading_id


def test_list_readings_with_session_filter(firebase_storage):
    """Test list_readings filters by session_id."""
    storage, ref, reading = firebase_storage
    second = reading.model_copy(
        update={
            "reading_id": "TEST-READING-002",
            "session_id": "DIFFERENT-SESSION",
            "timestamp": reading.timestamp.replace(minute=30),
        }
    )
    asyncio.run(storage.create_reading(reading))
    asyncio.run(storage.create_reading(second))

    page, total = asyncio.run(
        storage.list_readings(PaginationParams(page=1, page_size=10, plant_id=reading.plant_id, session_id=reading.session_id))
    )
    
    assert total == 1
    assert len(page) == 1
    assert page[0].reading_id == reading.reading_id


def test_list_readings_with_time_filter(firebase_storage):
    """Test list_readings filters by start_time and end_time."""
    storage, ref, reading = firebase_storage
    early = reading.model_copy(
        update={
            "reading_id": "TEST-READING-EARLY",
            "timestamp": reading.timestamp.replace(hour=8),
        }
    )
    late = reading.model_copy(
        update={
            "reading_id": "TEST-READING-LATE",
            "timestamp": reading.timestamp.replace(hour=18),
        }
    )
    asyncio.run(storage.create_reading(early))
    asyncio.run(storage.create_reading(late))

    page, total = asyncio.run(
        storage.list_readings(PaginationParams(
            page=1, 
            page_size=10, 
            plant_id=reading.plant_id,
            start_time=reading.timestamp.replace(hour=12),
            end_time=reading.timestamp.replace(hour=20),
        ))
    )
    
    assert total == 1
    assert len(page) == 1
    assert page[0].reading_id == "TEST-READING-LATE"


def test_list_readings_pagination(firebase_storage):
    """Test list_readings pagination with multiple pages."""
    storage, ref, reading = firebase_storage
    for i in range(5):
        r = reading.model_copy(
            update={
                "reading_id": f"TEST-READING-{i:03d}",
                "timestamp": reading.timestamp.replace(minute=i * 10),
            }
        )
        asyncio.run(storage.create_reading(r))

    page1, total = asyncio.run(
        storage.list_readings(PaginationParams(page=1, page_size=2, plant_id=reading.plant_id))
    )
    page2, _ = asyncio.run(
        storage.list_readings(PaginationParams(page=2, page_size=2, plant_id=reading.plant_id))
    )
    
    assert total == 5
    assert len(page1) == 2
    assert len(page2) == 2
    assert page1[0].reading_id != page2[0].reading_id


# --- 9. count_readings() ---
def test_count_readings_returns_correct_count(firebase_storage):
    """Test count_readings returns the correct number of stored readings."""
    storage, ref, reading = firebase_storage
    
    assert asyncio.run(storage.count_readings()) == 0
    
    asyncio.run(storage.create_reading(reading))
    assert asyncio.run(storage.count_readings()) == 1
    
    second = reading.model_copy(update={"reading_id": "TEST-READING-002"})
    asyncio.run(storage.create_reading(second))
    assert asyncio.run(storage.count_readings()) == 2


def test_count_readings_empty_database(firebase_storage):
    """Test count_readings returns 0 for empty database."""
    storage, _, _ = firebase_storage
    
    count = asyncio.run(storage.count_readings())
    
    assert count == 0


# --- 10. Firebase/database failure handling ---
def test_firebase_failure_is_not_reported_as_success(firebase_storage):
    storage, ref, reading = firebase_storage
    ref.child(reading.reading_id).transaction = MagicMock(side_effect=TimeoutError("timed out"))

    with pytest.raises(FirebaseError):
        asyncio.run(storage.create_reading(reading))


def test_get_reading_handles_database_error(firebase_storage):
    """Test get_reading raises FirebaseError on database failure."""
    storage, ref, reading = firebase_storage
    asyncio.run(storage.create_reading(reading))
    
    ref.child(reading.reading_id).get = MagicMock(side_effect=Exception("network error"))
    
    with pytest.raises(FirebaseError, match="Failed to read reading"):
        asyncio.run(storage.get_reading(reading.reading_id))


def test_list_readings_handles_database_error(firebase_storage):
    """Test list_readings raises FirebaseError on database failure."""
    storage, ref, reading = firebase_storage
    asyncio.run(storage.create_reading(reading))
    
    ref.order_by_child = MagicMock(side_effect=Exception("network error"))
    
    with pytest.raises(FirebaseError, match="Failed to list readings"):
        asyncio.run(storage.list_readings(PaginationParams(plant_id=reading.plant_id)))


def test_count_readings_handles_database_error(firebase_storage):
    """Test count_readings raises FirebaseError on database failure."""
    storage, ref, _ = firebase_storage
    
    ref.get = MagicMock(side_effect=Exception("network error"))
    
    with pytest.raises(FirebaseError, match="Failed to count readings"):
        asyncio.run(storage.count_readings())


# --- 11. health_check() ---
def test_health_check_returns_healthy_when_initialized(firebase_storage):
    """Test health_check returns healthy status when Firebase is initialized."""
    storage, ref, reading = firebase_storage
    asyncio.run(storage.create_reading(reading))
    
    stats = asyncio.run(storage.health_check())
    
    assert stats.is_healthy is True
    assert stats.backend_type == "firebase"
    assert stats.total_readings == 1
    assert stats.last_error is None
    assert "project_id" in stats.details
    assert "database_url" in stats.details


def test_health_check_returns_unhealthy_when_not_initialized(uninitialized_firebase_storage):
    """Test health_check returns unhealthy when Firebase is not initialized."""
    storage = uninitialized_firebase_storage
    
    stats = asyncio.run(storage.health_check())
    
    assert stats.is_healthy is False
    assert stats.backend_type == "firebase"
    assert stats.total_readings == 0
    assert stats.last_error == "Not initialized"


def test_health_check_returns_unhealthy_on_database_failure(firebase_storage):
    """Test health_check returns unhealthy when database query fails."""
    storage, ref, _ = firebase_storage
    
    ref.limit_to_first = MagicMock(side_effect=Exception("connection refused"))
    
    stats = asyncio.run(storage.health_check())
    
    assert stats.is_healthy is False
    assert stats.last_error is not None
    assert "connection refused" in stats.last_error.lower()


# --- 12. close() ---
def test_close_resets_storage_state(firebase_storage):
    """Test close() resets the storage state."""
    storage, ref, reading = firebase_storage
    asyncio.run(storage.create_reading(reading))
    
    assert storage._initialized is True
    assert storage._ref is not None
    
    asyncio.run(storage.close())
    
    assert storage._initialized is False
    assert storage._ref is None
    assert storage._app is None


def test_close_handles_app_deletion_error():
    """Test close() handles errors when deleting Firebase app."""
    ref = FakeReference()
    config = make_config()
    storage = FirebaseStorage(config_value=config, db_reference=ref)
    asyncio.run(storage.initialize())
    
    # Mock _app to simulate delete_app failure
    with patch("backend.app.services.firebase_storage.firebase_admin.delete_app", 
               side_effect=Exception("delete failed")):
        asyncio.run(storage.close())
    
    # Should still reset state even if delete_app fails
    assert storage._initialized is False
    assert storage._ref is None
    assert storage._app is None


# --- Additional smoke test tests ---
def test_smoke_test_skipped_when_disabled(firebase_storage):
    """Test smoke_test returns False when FIREBASE_SMOKE_TEST is disabled."""
    storage, ref, _ = firebase_storage
    
    result = asyncio.run(storage.smoke_test())
    
    assert result is False


def test_smoke_test_skipped_when_not_initialized(uninitialized_firebase_storage):
    """Test smoke_test returns False when Firebase not initialized."""
    storage = uninitialized_firebase_storage
    storage._config.firebase_smoke_test = True
    
    result = asyncio.run(storage.smoke_test())
    
    assert result is False


def test_smoke_test_writes_and_verifies_record():
    """Test smoke_test writes a test record and verifies it."""
    ref = FakeReference()
    config = make_config(firebase_smoke_test=True)
    storage = FirebaseStorage(config_value=config, db_reference=ref)
    storage._initialized = True
    
    result = asyncio.run(storage.smoke_test())
    
    assert result is True
    # Verify test record was written and cleaned up
    smoke_records = [k for k in ref.values.keys() if k.startswith("SMOKE_TEST_")]
    assert len(smoke_records) == 0  # Test record should be deleted after verification
