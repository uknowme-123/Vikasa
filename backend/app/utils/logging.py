"""Structured logging for Vikāsa backend."""

import json
import logging
import sys
import uuid
from contextvars import ContextVar
from typing import Any, Optional

from backend.app.config import config


# Context variable for correlation ID
correlation_id_var: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


class JSONFormatter(logging.Formatter):
    """JSON log formatter with correlation ID support."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add correlation ID if available
        corr_id = correlation_id_var.get()
        if corr_id:
            log_data["correlation_id"] = corr_id

        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "message", "name", "pathname", "process", "processName",
                "relativeCreated", "thread", "threadName", "exc_info",
                "exc_text", "stack_info"
            }:
                log_data[key] = value

        return json.dumps(log_data, default=str)


def setup_logging() -> logging.Logger:
    """Configure structured logging for the application."""
    logger = logging.getLogger("vikasa")
    logger.setLevel(getattr(logging, config.log_level.upper(), logging.INFO))

    # Clear existing handlers
    logger.handlers.clear()

    # Console handler with JSON formatting
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


def get_logger(name: str = "vikasa") -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


def set_correlation_id(correlation_id: Optional[str] = None) -> str:
    """Set or generate a correlation ID for the current request context."""
    if correlation_id is None:
        correlation_id = str(uuid.uuid4())[:8]
    correlation_id_var.set(correlation_id)
    return correlation_id


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID."""
    return correlation_id_var.get()


class LogContext:
    """Context manager for adding structured context to logs."""

    def __init__(self, **kwargs: Any):
        self.kwargs = kwargs
        self.old_factory = logging.getLogRecordFactory()

    def __enter__(self) -> "LogContext":
        def record_factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
            record = self.old_factory(*args, **kwargs)
            for key, value in self.kwargs.items():
                setattr(record, key, value)
            return record

        logging.setLogRecordFactory(record_factory)
        return self

    def __exit__(self, *args: Any) -> None:
        logging.setLogRecordFactory(self.old_factory)