"""
Logger configuration for Fractary Forge SDK.
"""

import logging
import sys
from typing import Optional


class ForgeLogger:
    """Custom logger for Fractary Forge SDK."""

    _instance: Optional["ForgeLogger"] = None
    _logger: Optional[logging.Logger] = None

    def __new__(cls) -> "ForgeLogger":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._logger is None:
            self._logger = self._setup_logger()

    def _setup_logger(self) -> logging.Logger:
        """Set up the logger with default configuration."""
        logger = logging.getLogger("fractary-forge")
        logger.setLevel(logging.INFO)

        # Console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)

        logger.addHandler(handler)
        return logger

    def set_level(self, level: str) -> None:
        """Set the logging level."""
        if self._logger:
            numeric_level = getattr(logging, level.upper(), logging.INFO)
            self._logger.setLevel(numeric_level)
            for handler in self._logger.handlers:
                handler.setLevel(numeric_level)

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        if self._logger:
            self._logger.debug(message, **kwargs)

    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        if self._logger:
            self._logger.info(message, **kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        if self._logger:
            self._logger.warning(message, **kwargs)

    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        if self._logger:
            self._logger.error(message, **kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        if self._logger:
            self._logger.critical(message, **kwargs)


# Global logger instance
_logger_instance: Optional[ForgeLogger] = None


def get_logger() -> ForgeLogger:
    """Get the global logger instance."""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = ForgeLogger()
    return _logger_instance
