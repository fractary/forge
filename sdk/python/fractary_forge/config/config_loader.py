"""
Configuration loader for Fractary Forge SDK.
"""

from typing import Any, Optional
from pathlib import Path
import yaml
import os

from ..errors import ConfigError
from ..logger import get_logger


class ConfigLoader:
    """Loads and manages configuration from files and environment."""

    DEFAULT_CONFIG = {
        "registry": {
            "local_path": "./.forge",
            "global_path": None,  # Will be set to ~/.forge
            "remote_url": "https://registry.fractary.com",
        },
        "cache": {
            "enabled": True,
            "ttl": 3600,
            "max_size": 1000,
            "strategy": "lru",
        },
        "agent": {
            "auto_install": False,
            "strict_validation": True,
        },
        "tool": {
            "timeout": 30000,
        },
        "logging": {
            "level": "INFO",
        },
    }

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize config loader.

        Args:
            config_path: Path to config file (default: ./.forge/config.yaml)
        """
        self.config_path = config_path
        self.logger = get_logger()
        self.config: dict[str, Any] = {}

    def load(self) -> dict[str, Any]:
        """
        Load configuration from file and environment.

        Returns:
            Configuration dictionary

        Raises:
            ConfigError: If configuration is invalid
        """
        # Start with defaults
        self.config = self._deep_copy(self.DEFAULT_CONFIG)

        # Set global path default
        if self.config["registry"]["global_path"] is None:
            self.config["registry"]["global_path"] = str(Path.home() / ".forge")

        # Load from file if exists
        if self.config_path:
            self._load_from_file(self.config_path)
        else:
            # Try default locations
            for path in ["./.forge/config.yaml", str(Path.home() / ".forge" / "config.yaml")]:
                if Path(path).exists():
                    self._load_from_file(path)
                    break

        # Override with environment variables
        self._load_from_env()

        return self.config

    def _load_from_file(self, path: str) -> None:
        """Load configuration from YAML file."""
        try:
            file_path = Path(path)
            if not file_path.exists():
                return

            with open(file_path, "r", encoding="utf-8") as f:
                file_config = yaml.safe_load(f) or {}

            # Merge with existing config
            self._deep_merge(self.config, file_config)
            self.logger.debug(f"Loaded config from {path}")

        except yaml.YAMLError as e:
            raise ConfigError(f"Invalid YAML in config file: {e}", details={"path": path})
        except Exception as e:
            raise ConfigError(f"Failed to load config: {e}", details={"path": path})

    def _load_from_env(self) -> None:
        """Load configuration from environment variables."""
        # FORGE_REGISTRY_LOCAL_PATH
        if env_val := os.getenv("FORGE_REGISTRY_LOCAL_PATH"):
            self.config["registry"]["local_path"] = env_val

        # FORGE_REGISTRY_GLOBAL_PATH
        if env_val := os.getenv("FORGE_REGISTRY_GLOBAL_PATH"):
            self.config["registry"]["global_path"] = env_val

        # FORGE_REGISTRY_REMOTE_URL
        if env_val := os.getenv("FORGE_REGISTRY_REMOTE_URL"):
            self.config["registry"]["remote_url"] = env_val

        # FORGE_CACHE_ENABLED
        if env_val := os.getenv("FORGE_CACHE_ENABLED"):
            self.config["cache"]["enabled"] = env_val.lower() in ("true", "1", "yes")

        # FORGE_LOG_LEVEL
        if env_val := os.getenv("FORGE_LOG_LEVEL"):
            self.config["logging"]["level"] = env_val.upper()

    def _deep_merge(self, target: dict, source: dict) -> None:
        """Deep merge source into target."""
        for key, value in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                self._deep_merge(target[key], value)
            else:
                target[key] = value

    def _deep_copy(self, obj: Any) -> Any:
        """Deep copy an object."""
        if isinstance(obj, dict):
            return {k: self._deep_copy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._deep_copy(item) for item in obj]
        else:
            return obj

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value by dot-notation key.

        Args:
            key: Configuration key (e.g., 'registry.local_path')
            default: Default value if key not found

        Returns:
            Configuration value
        """
        parts = key.split(".")
        value = self.config
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return default
        return value

    def save(self, path: Optional[str] = None) -> None:
        """
        Save configuration to file.

        Args:
            path: Path to save to (default: self.config_path or ./.forge/config.yaml)
        """
        save_path = path or self.config_path or "./.forge/config.yaml"
        file_path = Path(save_path)

        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(file_path, "w", encoding="utf-8") as f:
                yaml.dump(self.config, f, sort_keys=False)
            self.logger.info(f"Saved config to {save_path}")
        except Exception as e:
            raise ConfigError(f"Failed to save config: {e}", details={"path": save_path})


# Convenience functions
def load_config(config_path: Optional[str] = None) -> dict[str, Any]:
    """Load configuration."""
    loader = ConfigLoader(config_path)
    return loader.load()


def save_config(config: dict[str, Any], path: Optional[str] = None) -> None:
    """Save configuration."""
    loader = ConfigLoader(path)
    loader.config = config
    loader.save()
