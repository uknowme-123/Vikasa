"""Unit tests for Firebase storage using a mocked Realtime Database reference."""

import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from backend.app.services.firebase_storage import FirebaseStorage
from backend.app.services.storage import PaginationParams
from backend.app.utils.errors import DuplicateError, FirebaseError


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


@pytest.fixture
def firebase_storage(sample_reading_create):
    ref = FakeReference()
    storage = FirebaseStorage(
        config_value=SimpleNamespace(
            firebase_project_id="test-project",
            firebase_database_url="https://test.invalid",
            firebase_credentials_path=None,
            firebase_timeout_seconds=1,
            validate_firebase_config=lambda: [],
        ),
        db_reference=ref,
    )
    storage._initialized = True
    return storage, ref, sample_reading_create


def test_create_reading_uses_idempotent_transaction(firebase_storage):
    storage, ref, reading = firebase_storage

    stored = asyncio.run(storage.create_reading(reading))

    assert stored.reading_id == reading.reading_id
    assert ref.values[reading.reading_id]["plant_id"] == reading.plant_id

    with pytest.raises(DuplicateError):
        asyncio.run(storage.create_reading(reading))


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


def test_firebase_failure_is_not_reported_as_success(firebase_storage):
    storage, ref, reading = firebase_storage
    ref.child(reading.reading_id).transaction = MagicMock(side_effect=TimeoutError("timed out"))

    with pytest.raises(FirebaseError):
        asyncio.run(storage.create_reading(reading))
