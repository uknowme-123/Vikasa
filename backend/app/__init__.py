"""Vikāsa Flask application factory."""

import os
from flask import Flask
from flask_cors import CORS

from backend.app.config import config
from backend.app.utils.logging import setup_logging
from backend.app.utils.errors import register_error_handlers
from backend.app.routes.health import register_health_routes
from backend.app.routes.sensor_data import register_sensor_routes


def create_storage_service():
    """Create storage service based on configuration."""
    if config.storage_backend == "firebase":
        from backend.app.services.firebase_storage import FirebaseStorage
        return FirebaseStorage()
    else:
        from backend.app.services.memory_storage import InMemoryStorage
        return InMemoryStorage()


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    app.config["STORAGE_BACKEND"] = config.storage_backend
    app.config["CORS_ORIGIN"] = config.cors_origin

    # Setup logging
    logger = setup_logging()

    # Configure CORS
    CORS(app, origins=[config.cors_origin], supports_credentials=True)

    # Register error handlers
    register_error_handlers(app)

    # Create and initialize storage
    storage = create_storage_service()

    @app.before_request
    def before_request():
        """Initialize storage on first request."""
        if not getattr(storage, "_initialized", False):
            import asyncio
            try:
                asyncio.run(storage.initialize())
                logger.info(f"Storage backend initialized: {config.storage_backend}")
            except Exception as e:
                logger.error(f"Storage initialization failed: {e}")

    @app.teardown_appcontext
    def close_storage(exception=None):
        """Close storage on app shutdown."""
        pass  # Storage closed on explicit shutdown

    # Register routes
    app.register_blueprint(register_health_routes(storage))
    app.register_blueprint(register_sensor_routes(storage))

    # Store storage instance for access in routes
    app.storage = storage

    logger.info(
        "Vikāsa API started",
        extra={
            "storage_backend": config.storage_backend,
            "cors_origin": config.cors_origin,
            "api_port": config.api_port,
        },
    )

    return app


def main():
    """Entry point for running the application directly."""
    import asyncio

    app = create_app()
    storage = app.storage

    # Initialize storage before running
    asyncio.run(storage.initialize())

    try:
        app.run(
            host=config.api_host,
            port=config.api_port,
            debug=config.flask_env == "development",
            use_reloader=False,
        )
    finally:
        asyncio.run(storage.close())


if __name__ == "__main__":
    main()