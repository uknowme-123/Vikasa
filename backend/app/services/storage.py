"""Storage abstraction for Vikāsa sensor data."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from backend.app.schemas.sensor import SensorReadingCreate, SensorReadingResponse


@dataclass
class PaginationParams:
    """Pagination parameters for queries."""
    page: int = 1
    page_size: int = 50
    plant_id: Optional[str] = None
    session_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


@dataclass
class StorageStats:
    """Storage backend statistics."""
    total_readings: int = 0
    backend_type: str = "unknown"
    is_healthy: bool = True
    last_error: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


class StorageService(ABC):
    """Abstract storage service for sensor readings."""

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the storage backend."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close storage connections."""
        pass

    @abstractmethod
    async def health_check(self) -> StorageStats:
        """Check storage backend health."""
        pass

    @abstractmethod
    async def create_reading(self, reading: SensorReadingCreate) -> SensorReadingResponse:
        """Create a new sensor reading.
        
        Args:
            reading: The reading to store
            
        Returns:
            The stored reading with server-generated fields
            
        Raises:
            DuplicateError: If reading_id already exists
            StorageError: If storage operation fails
        """
        pass

    @abstractmethod
    async def get_reading(self, reading_id: str) -> Optional[SensorReadingResponse]:
        """Get a single reading by ID."""
        pass

    @abstractmethod
    async def get_latest_reading(self, plant_id: Optional[str] = None) -> Optional[SensorReadingResponse]:
        """Get the most recent reading, optionally filtered by plant."""
        pass

    @abstractmethod
    async def list_readings(self, params: PaginationParams) -> tuple[List[SensorReadingResponse], int]:
        """List readings with pagination and filters.
        
        Returns:
            Tuple of (readings, total_count)
        """
        pass

    @abstractmethod
    async def count_readings(self) -> int:
        """Get total count of stored readings."""
        pass