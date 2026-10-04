"""Pytest configuration and fixtures for Vikāsa backend tests."""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

from backend.app.services.storage import StorageService
from backend.app.services.memory_storage import InMemoryStorage
from backend.app.schemas.sensor import SensorReadingCreate, SensorReadingResponse


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def memory_storage() -> InMemoryStorage:
    """Create an in-memory storage instance for testing."""
    storage = InMemoryStorage()
    await storage.initialize()
    yield storage
    await storage.close()


@pytest.fixture
def mock_firebase_storage() -> MagicMock:
    """Create a mocked Firebase storage for testing."""
    mock = MagicMock(spec=StorageService)
    mock.initialize = AsyncMock()
    mock.close = AsyncMock()
    mock.health_check = AsyncMock()
    mock.create_reading = AsyncMock()
    mock.get_reading = AsyncMock()
    mock.get_latest_reading = AsyncMock()
    mock.list_readings = AsyncMock()
    mock.count_readings = AsyncMock()
    return mock


@pytest.fixture
def sample_reading_data() -> Dict[str, Any]:
    """Sample valid sensor reading data for testing."""
    return {
        "reading_id": "TEST-READING-001",
        "plant_id": "PLANT-001",
        "session_id": "SESSION-2026-001",
        "timestamp": "2026-10-04T10:00:00Z",
        "species": "Solanum lycopersicum",
        "stress_type": "healthy",
        "health_label": "healthy",
        "label_evidence": "visual inspection",
        "red_raw": 2100,
        "nir_raw": 3200,
        "red_dark": 45,
        "nir_dark": 52,
        "red_reference": 3800,
        "nir_reference": 3950,
        "red_reflectance": 54.2,
        "nir_reflectance": 79.8,
        "ndvi": 0.191,
        "temperature_c": 24.5,
        "humidity_pct": 62.3,
        "soil_moisture_raw": 1850,
        "soil_moisture_pct": 42.1,
        "ambient_light_raw": 2900,
        "operator_id": "OPERATOR-001",
        "notes": "Test reading",
    }


@pytest.fixture
def sample_reading_create(sample_reading_data) -> SensorReadingCreate:
    """Create a SensorReadingCreate model from sample data."""
    return SensorReadingCreate(**sample_reading_data)


@pytest.fixture
def mock_firebase_admin():
    """Mock firebase_admin for testing without credentials."""
    with patch("backend.app.services.firebase_storage.firebase_admin") as mock:
        mock.initialize_app = MagicMock()
        mock.credentials = MagicMock()
        mock.credentials.Certificate = MagicMock()
        mock.exceptions = MagicMock()
        mock.exceptions.FirebaseError = Exception
        yield mock


@pytest.fixture
def mock_firebase_db():
    """Mock firebase database reference."""
    mock_ref = MagicMock()
    mock_ref.child = MagicMock(return_value=mock_ref)
    mock_ref.order_by_child = MagicMock(return_value=mock_ref)
    mock_ref.equal_to = MagicMock(return_value=mock_ref)
    mock_ref.limit_to_last = MagicMock(return_value=mock_ref)
    mock_ref.start_at = MagicMock(return_value=mock_ref)
    mock_ref.end_at = MagicMock(return_value=mock_ref)
    mock_ref.limit_to_first = MagicMock(return_value=mock_ref)
    mock_ref.get = MagicMock(return_value=None)
    mock_ref.set = MagicMock()
    return mock_ref