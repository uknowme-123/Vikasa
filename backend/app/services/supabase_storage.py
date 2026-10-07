"""Supabase storage implementation for Vikasa sensor data.

The Supabase client is imported lazily so the existing memory and Firebase
backends remain usable when Supabase support is not installed or configured.
"""

import os
from importlib import import_module
from datetime import datetime, timezone
from typing import Any, Optional

from backend.app.schemas.sensor import SensorReadingCreate, SensorReadingResponse
from backend.app.services.storage import PaginationParams, StorageService, StorageStats
from backend.app.utils.errors import DuplicateError, StorageError
from backend.app.utils.logging import get_logger


logger = get_logger(__name__)


class SupabaseStorage(StorageService):
    """Storage adapter for the ``public.readings`` Supabase table."""

    def __init__(
        self,
        *,
        url: Optional[str] = None,
        key: Optional[str] = None,
        client: Any = None,
        table_name: str = "readings",
    ):
        self._url = url
        self._key = key
        self._client = client
        self._table_name = table_name
        self._initialized = client is not None

    @staticmethod
    def _utc_iso(value: datetime) -> str:
        """Return a timezone-aware UTC ISO-8601 timestamp."""
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()

    @classmethod
    def _payload(cls, reading: SensorReadingCreate) -> dict[str, Any]:
        """Serialize a validated reading without changing nullable values."""
        payload = reading.model_dump(mode="json")
        if isinstance(reading.timestamp, datetime):
            payload["timestamp"] = cls._utc_iso(reading.timestamp)
        return payload

    @staticmethod
    def _rows(response: Any) -> list[dict[str, Any]]:
        data = getattr(response, "data", None)
        if data is None and isinstance(response, dict):
            data = response.get("data")
        if data is None:
            return []
        if isinstance(data, dict):
            return [data]
        return list(data)

    @staticmethod
    def _count(response: Any, rows: list[dict[str, Any]]) -> int:
        count = getattr(response, "count", None)
        if count is None and isinstance(response, dict):
            count = response.get("count")
        return int(count) if count is not None else len(rows)

    @staticmethod
    def _is_duplicate_error(error: Exception) -> bool:
        code = str(getattr(error, "code", "")).lower()
        message = str(getattr(error, "message", "")).lower()
        if not message:
            message = str(error).lower()
        return code in {"23505", "409"} or "duplicate" in message or "unique" in message

    @staticmethod
    def _storage_failure(operation: str, error: Exception) -> StorageError:
        """Create a safe storage error without including credentials or SQL."""
        logger.error(
            "Supabase storage operation failed",
            extra={"operation": operation, "error_type": type(error).__name__},
        )
        return StorageError(f"Supabase {operation} failed", details={"operation": operation})

    def _require_client(self) -> Any:
        if not self._initialized or self._client is None:
            raise StorageError("Supabase storage is not initialized")
        return self._client

    async def initialize(self) -> None:
        """Create the Supabase client from environment-backed credentials."""
        if self._initialized:
            return

        url = self._url or os.getenv("SUPABASE_URL")
        key = self._key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise StorageError(
                "Supabase configuration is incomplete",
                details={"required": ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]},
            )

        try:
            create_client = getattr(import_module("supabase"), "create_client")
        except ImportError as error:
            raise StorageError(
                "Supabase client dependency is not installed",
                details={"dependency": "supabase"},
            ) from error

        try:
            self._client = create_client(url, key)
            self._url = url
            self._initialized = True
        except Exception as error:
            raise self._storage_failure("initialization", error) from error

    async def close(self) -> None:
        """Release the adapter reference; the synchronous client has no close API."""
        self._client = None
        self._initialized = False

    async def health_check(self) -> StorageStats:
        """Check table accessibility and return a truthful health result."""
        if not self._initialized or self._client is None:
            return StorageStats(
                backend_type="supabase",
                is_healthy=False,
                last_error="Not initialized",
            )

        try:
            response = (
                self._client.table(self._table_name)
                .select("reading_id", count="exact")
                .limit(1)
                .execute()
            )
            rows = self._rows(response)
            return StorageStats(
                total_readings=self._count(response, rows),
                backend_type="supabase",
                is_healthy=True,
            )
        except Exception as error:
            logger.error(
                "Supabase health check failed",
                extra={"error_type": type(error).__name__},
            )
            return StorageStats(
                backend_type="supabase",
                is_healthy=False,
                last_error="Health check failed",
            )

    async def create_reading(self, reading: SensorReadingCreate) -> SensorReadingResponse:
        """Insert a validated reading and return the database-generated row."""
        client = self._require_client()
        payload = self._payload(reading)
        try:
            response = (
                client.table(self._table_name)
                .insert(payload)
                .select("*")
                .execute()
            )
            rows = self._rows(response)
            if not rows:
                raise StorageError(
                    "Supabase insert returned no reading",
                    details={"operation": "create_reading"},
                )
            return SensorReadingResponse(**rows[0])
        except DuplicateError:
            raise
        except StorageError:
            raise
        except Exception as error:
            if self._is_duplicate_error(error):
                raise DuplicateError(
                    f"Reading with ID {reading.reading_id} already exists",
                    details={"reading_id": reading.reading_id},
                ) from error
            raise self._storage_failure("create_reading", error) from error

    async def get_reading(self, reading_id: str) -> Optional[SensorReadingResponse]:
        """Retrieve one reading by its primary key."""
        client = self._require_client()
        try:
            response = (
                client.table(self._table_name)
                .select("*")
                .eq("reading_id", reading_id)
                .limit(1)
                .execute()
            )
            rows = self._rows(response)
            return SensorReadingResponse(**rows[0]) if rows else None
        except Exception as error:
            raise self._storage_failure("get_reading", error) from error

    async def get_latest_reading(
        self, plant_id: Optional[str] = None
    ) -> Optional[SensorReadingResponse]:
        """Retrieve the newest reading globally or for one plant."""
        client = self._require_client()
        try:
            query = client.table(self._table_name).select("*")
            if plant_id:
                query = query.eq("plant_id", plant_id)
            response = query.order("timestamp", desc=True).limit(1).execute()
            rows = self._rows(response)
            return SensorReadingResponse(**rows[0]) if rows else None
        except Exception as error:
            raise self._storage_failure("get_latest_reading", error) from error

    async def list_readings(
        self, params: PaginationParams
    ) -> tuple[list[SensorReadingResponse], int]:
        """List filtered readings in descending timestamp order."""
        client = self._require_client()
        try:
            query = client.table(self._table_name).select("*", count="exact")
            if params.plant_id:
                query = query.eq("plant_id", params.plant_id)
            if params.session_id:
                query = query.eq("session_id", params.session_id)
            if params.start_time:
                query = query.gte("timestamp", self._utc_iso(params.start_time))
            if params.end_time:
                query = query.lte("timestamp", self._utc_iso(params.end_time))

            start = (params.page - 1) * params.page_size
            end = start + params.page_size - 1
            response = query.order("timestamp", desc=True).range(start, end).execute()
            rows = self._rows(response)
            return [SensorReadingResponse(**row) for row in rows], self._count(response, rows)
        except Exception as error:
            raise self._storage_failure("list_readings", error) from error

    async def count_readings(self) -> int:
        """Return the exact count of rows in ``public.readings``."""
        client = self._require_client()
        try:
            response = (
                client.table(self._table_name)
                .select("reading_id", count="exact")
                .limit(1)
                .execute()
            )
            rows = self._rows(response)
            return self._count(response, rows)
        except Exception as error:
            raise self._storage_failure("count_readings", error) from error
