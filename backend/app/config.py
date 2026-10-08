"""Vikāsa backend configuration management."""

"""Vikāsa backend configuration management."""

import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

load_dotenv(
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        ".env"
    )
)

from dotenv import load_dotenv

load_dotenv()


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
    storage_backend: str = "memory"  # "memory" (dev/testing), "supabase" (production), or "firebase"

    # Firebase (required when storage_backend=firebase)
    firebase_project_id: Optional[str] = None
    firebase_credentials_path: Optional[str] = None
    firebase_database_url: Optional[str] = None
    firebase_timeout_seconds: float = 10.0

    # Supabase (required when storage_backend=supabase)
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_timeout_seconds: float = 10.0

    # Firebase smoke test (only for manual testing)
    firebase_smoke_test: bool = False

    # Telegram (optional, for alerts)
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

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
            firebase_timeout_seconds=float(os.getenv("FIREBASE_TIMEOUT_SECONDS", "10")),
            supabase_url=os.getenv("SUPABASE_URL"),
            supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
            supabase_timeout_seconds=float(os.getenv("SUPABASE_TIMEOUT_SECONDS", "10")),
            firebase_smoke_test=os.getenv("FIREBASE_SMOKE_TEST", "false").lower() == "true",
            telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN"),
            telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID"),
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
        if self.firebase_credentials_path and not os.path.exists(self.firebase_credentials_path):
            errors.append(f"Firebase credentials file not found: {self.firebase_credentials_path}")
        if not self.firebase_database_url:
            errors.append("FIREBASE_DATABASE_URL is required when STORAGE_BACKEND=firebase")
        if self.firebase_timeout_seconds <= 0:
            errors.append("FIREBASE_TIMEOUT_SECONDS must be greater than zero")

        return errors

    def validate_telegram_config(self) -> list[str]:
        """Validate Telegram configuration.
        
        Returns:
            List of validation error messages (empty if valid).
        """
        errors = []
        # Telegram is optional; if one is provided, the other must be too
        has_token = bool(self.telegram_bot_token)
        has_chat_id = bool(self.telegram_chat_id)
        if has_token != has_chat_id:
            errors.append("Both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be provided together")
        return errors


# Global config instance
config = Config.from_env()