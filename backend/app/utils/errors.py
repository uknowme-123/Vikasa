"""Custom exceptions and error handling for Vikāsa backend."""

from typing import Any, Optional
from flask import jsonify, Request
from werkzeug.exceptions import HTTPException


class VikasaError(Exception):
    """Base exception for Vikāsa backend errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for JSON response."""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class ValidationError(VikasaError):
    """Raised when request validation fails."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR", details=details)


class NotFoundError(VikasaError):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code=404, error_code="NOT_FOUND", details=details)


class DuplicateError(VikasaError):
    """Raised when attempting to create a duplicate resource."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code=409, error_code="DUPLICATE_RESOURCE", details=details)


class StorageError(VikasaError):
    """Raised when storage operations fail."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code=503, error_code="STORAGE_ERROR", details=details)


class FirebaseError(StorageError):
    """Raised when Firebase operations fail."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, details=details)
        self.error_code = "FIREBASE_ERROR"


class ConfigurationError(VikasaError):
    """Raised when configuration is invalid."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message, status_code=500, error_code="CONFIGURATION_ERROR", details=details)


def register_error_handlers(app) -> None:
    """Register error handlers with the Flask application."""

    @app.errorhandler(VikasaError)
    def handle_vikasa_error(error: VikasaError):
        response = jsonify({
            "success": False,
            "error": error.to_dict(),
        })
        response.status_code = error.status_code
        return response

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        response = jsonify({
            "success": False,
            "error": {
                "error": error.name.upper().replace(" ", "_"),
                "message": error.description,
                "details": {},
            },
        })
        response.status_code = error.code or 500
        return response

    @app.errorhandler(Exception)
    def handle_generic_error(error: Exception):
        # Log the full exception
        from backend.app.utils.logging import get_logger
        logger = get_logger()
        logger.exception("Unhandled exception: %s", error)

        response = jsonify({
            "success": False,
            "error": {
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
            },
        })
        response.status_code = 500
        return response