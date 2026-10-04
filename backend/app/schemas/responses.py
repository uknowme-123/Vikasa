"""Standardized response envelopes for Vikāsa API."""

from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar("T")


class Meta(BaseModel):
    """Response metadata."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    version: str = "1.0"


class ErrorDetail(BaseModel):
    """Error detail structure."""

    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ResponseEnvelope(BaseModel, Generic[T]):
    """Standard API response envelope."""

    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    meta: Meta = Field(default_factory=Meta)

    @classmethod
    def success_response(cls, data: T, request_id: Optional[str] = None) -> "ResponseEnvelope[T]":
        """Create a successful response."""
        return cls(
            success=True,
            data=data,
            meta=Meta(request_id=request_id),
        )

    @classmethod
    def error_response(
        cls,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
        status_code: int = 500,
        request_id: Optional[str] = None,
    ) -> "ResponseEnvelope[None]":
        """Create an error response."""
        return cls(
            success=False,
            error=ErrorDetail(code=code, message=message, details=details or {}),
            meta=Meta(request_id=request_id),
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response envelope."""

    items: list[T]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=1000)
    has_more: bool

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedResponse[T]":
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=(page * page_size) < total,
        )