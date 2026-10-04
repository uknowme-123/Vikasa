"""Vikāsa backend configuration management."""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Config:
    """Application configuration loaded from environment variables."""

    # Flask
    api_host: str = "0.0.0.0"
    api_port: int = 5000
    flask_env: str = "development"

    # CORS
    cors_origin: str = "http://localhost:5173"

    # Storage
    storage_backend: str = "memory"  # "memory" or "firebase"

    # Firebase (required when storage_backend=firebase)
    firebase_project_id: Optional[str] = None
    firebase_credentials_path: Optional[str] = None
    firebase_database_url: Optional[str] = None

    # Logging
    log_level: str = "INFO"

    # Validation
    reading_id_pattern: str = r"^[A-Z0-9-]{1,64}$"

    @classmethod
    def from_env(cls) -> "Config":
        """Load configuration from environment variables."""
        return cls(
            api_host=os.getenv("API_HOST", "0.0.0.0"),
            api_port=int(os.getenv("API_PORT", "5000")),
            flask_env=os.getenv("FLASK_ENV", "development"),
            cors_origin=os.getenv("CORS_ORIGIN", "http://localhost:5173"),
            storage_backend=os.getenv("STORAGE_BACKEND", "memory"),
            firebase_project_id=os.getenv("FIREBASE_PROJECT_ID"),
            firebase_credentials_path=os.getenv("FIREBASE_CREDENTIALS_PATH"),
            firebase_database_url=os.getenv("FIREBASE_DATABASE_URL"),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            reading_id_pattern=os.getenv("READING_ID_PATTERN", r"^[A-Z0-9-]{1,64}$"),
        )

    def validate_firebase_config(self) -> list[str]:
        """Validate Firebase configuration when using firebase backend.
        
        Returns:
            List of validation error messages (empty if valid).
        """
        errors = []
        if self.storage_backend != "firebase":
            return errors

        if not self.firebase_project_id:
            errors.append("FIREBASE_PROJECT_ID is required when STORAGE_BACKEND=firebase")
        if not self.firebase_credentials_path:
            errors.append("FIREBASE_CREDENTIALS_PATH is required when STORAGE_BACKEND=firebase")
        elif not os.path.exists(self.firebase_credentials_path):
            errors.append(f"Firebase credentials file not found: {self.firebase_credentials_path}")
        if not self.firebase_database_url:
            errors.append("FIREBASE_DATABASE_URL is required when STORAGE_BACKEND=firebase")

        return errors


# Global config instance
config = Config.from_env()