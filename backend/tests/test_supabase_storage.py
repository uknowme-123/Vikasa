"""Mocked tests for the Supabase storage adapter.

These tests use a local fluent-client fake. No Supabase project, credentials,
network access, or database request is required.
"""

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from backend.app.services.storage import PaginationParams
from backend.app.services.supabase_storage import SupabaseStorage
from backend.app.utils.errors import DuplicateError, StorageError


class FakeSupabaseError(Exception):
    def __init__(self, message="duplicate key", code=None):
        super().__init__(message)
        self.message = message
        self.code = code


class FakeResponse:
    def __init__(self, data=None, count=None):
        self.data = data
        self.count = count


class FakeQuery:
    def __init__(self, client, operation="read"):
        self.client = client
        self.operation = operation
        self.filters = []
        self.order_field = None
        self.order_desc = False
        self.range_start = None
        self.range_end = None
        self.payload = None
        self.single_row = False
        self.requested_count = False

    def select(self, _columns="*", count=None):
        self.requested_count = count == "exact"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def single(self):
        self.single_row = True
        return self

    def eq(self, field, value):
        self.filters.append((field, "eq", value))
        return self

    def gte(self, field, value):
        self.filters.append((field, "gte", value))
        return self

    def lte(self, field, value):
        self.filters.append((field, "lte", value))
        return self

    def order(self, field, desc=False):
        self.order_field = field
        self.order_desc = desc
        return self

    def limit(self, value):
        self.range_start = 0
        self.range_end = value - 1
        return self

    def range(self, start, end):
        self.range_start = start
        self.range_end = end
        return self

    def execute(self):
        if self.operation == "insert":
            reading_id = self.payload["reading_id"]
            if any(row["reading_id"] == reading_id for row in self.client.rows):
                raise FakeSupabaseError(code="23505")
            row = dict(self.payload)
            row.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            self.client.rows.append(row)
            return FakeResponse([row])

        rows = [dict(row) for row in self.client.rows]
        for field, operator, value in self.filters:
            if operator == "eq":
                rows = [row for row in rows if row.get(field) == value]
            elif operator == "gte":
                rows = [row for row in rows if row.get(field) >= value]
            elif operator == "lte":
                rows = [row for row in rows if row.get(field) <= value]

        total = len(rows)
        if self.order_field:
            rows.sort(key=lambda row: row[self.order_field], reverse=self.order_desc)
        if self.range_start is not None and self.range_end is not None:
            rows = rows[self.range_start : self.range_end + 1]
        if self.single_row:
            rows = rows[:1]
        return FakeResponse(rows, total if self.requested_count else None)


class FakeSupabaseClient:
    def __init__(self, rows=None, failure=None):
        self.rows = list(rows or [])
        self.failure = failure

    def table(self, _table_name):
        if self.failure:
            raise self.failure
        return FakeQuery(self)


def make_storage(rows=None, failure=None):
    return SupabaseStorage(client=FakeSupabaseClient(rows, failure))


def reading_row(reading, **overrides):
    row = reading.model_dump(mode="json")
    row["timestamp"] = reading.timestamp.astimezone(timezone.utc).isoformat()
    row["created_at"] = "2026-10-04T10:01:00+00:00"
    row.update(overrides)
    return row


def test_injected_client_is_initialized(sample_reading_create):
    storage = make_storage()

    assert storage._initialized is True
    result = asyncio.run(storage.get_reading(sample_reading_create.reading_id))
    assert result is None


def test_initialize_requires_configuration():
    storage = SupabaseStorage()

    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(StorageError, match="configuration is incomplete"):
            asyncio.run(storage.initialize())


def test_initialize_rejects_invalid_client_configuration():
    storage = SupabaseStorage(url="not-a-url", key="test-key")

    with patch("backend.app.services.supabase_storage.import_module") as import_module:
        import_module.return_value.create_client.side_effect = ValueError("invalid URL")
        with pytest.raises(StorageError, match="Supabase initialization failed"):
            asyncio.run(storage.initialize())


def test_initialize_uses_supabase_client_factory():
    client = FakeSupabaseClient()
    storage = SupabaseStorage(url="https://example.supabase.co", key="test-key")

    with patch("backend.app.services.supabase_storage.import_module") as import_module:
        import_module.return_value.create_client.return_value = client
        asyncio.run(storage.initialize())

    assert storage._initialized is True
    assert storage._client is client


def test_create_returns_response_and_preserves_nullable_optical_data(sample_reading_create):
    sample_reading_create = sample_reading_create.model_copy(
        update={
            "red_reflectance": None,
            "nir_reflectance": None,
            "ndvi": None,
            "soil_moisture_pct": None,
        }
    )
    storage = make_storage()

    stored = asyncio.run(storage.create_reading(sample_reading_create))

    assert stored.reading_id == sample_reading_create.reading_id
    assert stored.created_at.tzinfo is not None
    row = storage._client.rows[0]
    assert row["red_reflectance"] is None
    assert row["nir_reflectance"] is None
    assert row["ndvi"] is None
    assert row["soil_moisture_pct"] is None
    assert row["red_raw"] == sample_reading_create.red_raw


def test_duplicate_primary_key_becomes_duplicate_error(sample_reading_create):
    storage = make_storage([reading_row(sample_reading_create)])

    with pytest.raises(DuplicateError):
        asyncio.run(storage.create_reading(sample_reading_create))


def test_get_existing_and_missing_readings(sample_reading_create):
    storage = make_storage([reading_row(sample_reading_create)])

    found = asyncio.run(storage.get_reading(sample_reading_create.reading_id))
    missing = asyncio.run(storage.get_reading("MISSING-001"))

    assert found is not None
    assert found.session_id == sample_reading_create.session_id
    assert missing is None


def test_latest_reading_global_and_by_plant(sample_reading_create):
    rows = [
        reading_row(sample_reading_create, reading_id="OLD-001", timestamp="2026-10-04T10:00:00+00:00"),
        reading_row(
            sample_reading_create,
            reading_id="NEW-001",
            plant_id="PLANT-002",
            timestamp="2026-10-04T11:00:00+00:00",
        ),
        reading_row(
            sample_reading_create,
            reading_id="NEW-002",
            timestamp="2026-10-04T12:00:00+00:00",
        ),
    ]
    storage = make_storage(rows)

    global_latest = asyncio.run(storage.get_latest_reading())
    plant_latest = asyncio.run(storage.get_latest_reading("PLANT-002"))

    assert global_latest.reading_id == "NEW-002"
    assert plant_latest.reading_id == "NEW-001"


def test_list_filters_paginates_newest_first(sample_reading_create):
    rows = [
        reading_row(sample_reading_create, reading_id="R-001", timestamp="2026-10-04T10:00:00+00:00"),
        reading_row(sample_reading_create, reading_id="R-002", timestamp="2026-10-04T11:00:00+00:00"),
        reading_row(
            sample_reading_create,
            reading_id="R-003",
            session_id="SESSION-OTHER",
            timestamp="2026-10-04T12:00:00+00:00",
        ),
    ]
    storage = make_storage(rows)
    params = PaginationParams(
        page=1,
        page_size=1,
        plant_id=sample_reading_create.plant_id,
        session_id=sample_reading_create.session_id,
        start_time=datetime(2026, 10, 4, 10, 30, tzinfo=timezone.utc),
        end_time=datetime(2026, 10, 4, 11, 30, tzinfo=timezone.utc),
    )

    page, total = asyncio.run(storage.list_readings(params))

    assert total == 1
    assert [item.reading_id for item in page] == ["R-002"]
    assert page[0].timestamp.tzinfo is not None


def test_list_pagination_returns_correct_total(sample_reading_create):
    rows = [
        reading_row(
            sample_reading_create,
            reading_id=f"R-{index:03d}",
            timestamp=f"2026-10-04T{10 + index:02d}:00:00+00:00",
        )
        for index in range(3)
    ]
    storage = make_storage(rows)

    page, total = asyncio.run(storage.list_readings(PaginationParams(page=2, page_size=2)))

    assert total == 3
    assert [item.reading_id for item in page] == ["R-000"]


def test_count_returns_exact_total(sample_reading_create):
    storage = make_storage([reading_row(sample_reading_create)])

    assert asyncio.run(storage.count_readings()) == 1


def test_health_reports_supabase_and_count(sample_reading_create):
    storage = make_storage([reading_row(sample_reading_create)])

    stats = asyncio.run(storage.health_check())

    assert stats.backend_type == "supabase"
    assert stats.is_healthy is True
    assert stats.total_readings == 1
    assert stats.last_error is None


def test_health_reports_unavailable_client():
    storage = SupabaseStorage()

    stats = asyncio.run(storage.health_check())

    assert stats.backend_type == "supabase"
    assert stats.is_healthy is False
    assert stats.last_error == "Not initialized"


def test_database_failure_becomes_storage_error(sample_reading_create):
    storage = make_storage(failure=RuntimeError("database unavailable"))

    with pytest.raises(StorageError, match="Supabase get_reading failed"):
        asyncio.run(storage.get_reading(sample_reading_create.reading_id))


def test_optical_values_and_ndvi_are_not_calculated(sample_reading_create):
    storage = make_storage(
        [
            reading_row(
                sample_reading_create,
                red_reflectance=12.5,
                nir_reflectance=87.5,
                ndvi=None,
            )
        ]
    )

    result = asyncio.run(storage.get_reading(sample_reading_create.reading_id))

    assert result.red_reflectance == 12.5
    assert result.nir_reflectance == 87.5
    assert result.ndvi is None
