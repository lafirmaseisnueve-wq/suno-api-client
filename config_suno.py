"""
Configuration management for Suno API integration in AceForge.

This module handles:
- Loading and saving Suno API keys
- User preferences for API usage
- Configuration validation
- Default settings for Suno API
"""

import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


# Default configuration keys
DEFAULT_SUNO_CONFIG = {
    "api_key": "",
    "default_model": "v5",
    "prefer_suno_backend": False,  # User preference: use Suno by default
    "show_backend_selector": True,
    "api_base_url": "https://api.sunoapi.org",
    "poll_timeout": 600,  # seconds
    "enable_callbacks": False,
    "callback_url": "",
}


def get_user_data_dir() -> Path:
    """
    Get the user data directory for AceForge.
    
    This should match the directory used by cdmf_paths.
    """
    try:
        # Try to import from AceForge
        import cdmf_paths
        return cdmf_paths.get_user_data_dir()
    except ImportError:
        # Fallback to platform-specific location
        import platform
        import os
        
        if platform.system() == "Darwin":  # macOS
            home = Path.home()
            data_dir = home / "Library" / "Application Support" / "AceForge"
        elif platform.system() == "Linux":
            home = Path.home()
            data_dir = home / ".aceforge"
        else:  # Windows
            appdata = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
            data_dir = appdata / "AceForge"
        
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir


def get_suno_config_path() -> Path:
    """
    Get the path to the Suno API configuration file.
    """
    user_data_dir = get_user_data_dir()
    return user_data_dir / "suno_api_config.json"


def load_config() -> Dict[str, Any]:
    """
    Load Suno API configuration from file.
    
    Returns:
        Configuration dictionary
    """
    config_path = get_suno_config_path()
    
    if not config_path.exists():
        logger.debug(f"Suno config file not found at {config_path}, using defaults")
        return DEFAULT_SUNO_CONFIG.copy()
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        # Merge with defaults to ensure all keys exist
        merged_config = DEFAULT_SUNO_CONFIG.copy()
        merged_config.update(config)
        
        logger.debug(f"Loaded Suno config from {config_path}")
        return merged_config
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in config file {config_path}: {e}")
        return DEFAULT_SUNO_CONFIG.copy()
    except Exception as e:
        logger.error(f"Error loading Suno config: {e}")
        return DEFAULT_SUNO_CONFIG.copy()


def save_config(config: Dict[str, Any]) -> bool:
    """
    Save Suno API configuration to file.
    
    Args:
        config: Configuration dictionary to save
        
    Returns:
        True if saved successfully, False otherwise
    """
    config_path = get_suno_config_path()
    
    try:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        
        logger.debug(f"Saved Suno config to {config_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error saving Suno config: {e}")
        return False


def get_suno_api_key() -> Optional[str]:
    """
    Get the Suno API key from configuration.
    
    Returns:
        API key string or None if not configured
    """
    config = load_config()
    api_key = config.get("api_key", "").strip()
    
    if api_key:
        # Mask for logging
        masked = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "***"
        logger.debug(f"Found API key: {masked}")
    else:
        logger.debug("No Suno API key configured")
    
    return api_key or None


def set_suno_api_key(api_key: str) -> bool:
    """
    Set the Suno API key in configuration.
    
    Args:
        api_key: API key to save
        
    Returns:
        True if saved successfully
    """
    api_key = api_key.strip()
    
    if not api_key:
        logger.warning("Attempted to set empty API key")
        return False
    
    config = load_config()
    config["api_key"] = api_key
    
    return save_config(config)


def clear_suno_api_key() -> bool:
    """
    Remove the Suno API key from configuration.
    
    Returns:
        True if cleared successfully
    """
    config = load_config()
    config["api_key"] = ""
    
    return save_config(config)


def get_suno_callback_url() -> str:
    """
    Get the configured callback URL for Suno API.
    
    Returns:
        Callback URL string or empty string
    """
    config = load_config()
    return config.get("callback_url", "").strip()


def set_suno_callback_url(url: str) -> bool:
    """
    Set the callback URL for Suno API.
    
    Args:
        url: Callback URL (must be publicly accessible)
        
    Returns:
        True if saved successfully
    """
    url = url.strip()
    config = load_config()
    config["callback_url"] = url
    config["enable_callbacks"] = bool(url)
    return save_config(config)


def get_default_suno_model() -> str:
    """
    Get the default Suno model to use.
    
    Returns:
        Model identifier (e.g., "v5", "v4_5")
    """
    config = load_config()
    model = config.get("default_model", "v5")
    
    # Validate model
    from suno_client import SunoAPIClient
    if model not in SunoAPIClient.MODELS:
        logger.warning(f"Invalid default model '{model}', falling back to 'v5'")
        model = "v5"
        set_default_suno_model(model)
    
    return model


def set_default_suno_model(model: str) -> bool:
    """
    Set the default Suno model.
    
    Args:
        model: Model identifier
        
    Returns:
        True if saved successfully
    """
    from suno_client import SunoAPIClient
    
    if model not in SunoAPIClient.MODELS:
        logger.error(f"Invalid model '{model}'. Available: {list(SunoAPIClient.MODELS.keys())}")
        return False
    
    config = load_config()
    config["default_model"] = model
    
    return save_config(config)


def prefer_suno_backend(prefer: bool) -> bool:
    """
    Set whether to prefer Suno backend over ACE-Step.
    
    Args:
        prefer: True to prefer Suno, False for ACE-Step
        
    Returns:
        True if saved successfully
    """
    config = load_config()
    config["prefer_suno_backend"] = prefer
    
    return save_config(config)


def get_preferred_backend() -> str:
    """
    Get the user's preferred backend.
    
    Returns:
        "suno" or "acestep"
    """
    config = load_config()
    prefer_suno = config.get("prefer_suno_backend", False)
    
    return "suno" if prefer_suno else "acestep"


def get_api_base_url() -> str:
    """
    Get the custom API base URL (or default).
    
    Returns:
        Base URL for Suno API
    """
    config = load_config()
    return config.get("api_base_url", "https://api.sunoapi.org")


def set_api_base_url(url: str) -> bool:
    """
    Set a custom API base URL.
    
    Args:
        url: Base URL (e.g., "https://api.sunoapi.org")
        
    Returns:
        True if saved successfully
    """
    url = url.rstrip("/")
    
    if not url.startswith(("http://", "https://")):
        logger.error(f"Invalid base URL '{url}', must start with http:// or https://")
        return False
    
    config = load_config()
    config["api_base_url"] = url
    
    return save_config(config)


def validate_api_key(api_key: str) -> bool:
    """
    Validate that an API key is functional.
    
    Args:
        api_key: API key to validate
        
    Returns:
        True if key is valid and functional
    """
    if not api_key or not api_key.strip():
        return False
    
    try:
        # Try to create client and ping
        from suno_client import SunoAPIClient
        client = SunoAPIClient(api_key.strip())
        return client.ping()
    except Exception as e:
        logger.error(f"API key validation failed: {e}")
        return False


def get_suno_config_dict() -> Dict[str, Any]:
    """
    Get complete Suno configuration (for API/UI consumption).
    
    Returns:
        Configuration dictionary with sensitive data masked
    """
    config = load_config()
    
    # Mask API key for security
    safe_config = config.copy()
    api_key = safe_config.get("api_key", "")
    if api_key:
        safe_config["api_key"] = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "***"
    else:
        safe_config["api_key"] = ""
    
    # Add available models
    from suno_client import SunoAPIClient
    safe_config["available_models"] = SunoAPIClient.MODELS
    
    return safe_config


def reset_config() -> bool:
    """
    Reset Suno configuration to defaults (preserves API key if set).
    
    Returns:
        True if reset successfully
    """
    current_config = load_config()
    api_key = current_config.get("api_key", "")
    
    default_config = DEFAULT_SUNO_CONFIG.copy()
    
    # Preserve API key if it exists
    if api_key:
        default_config["api_key"] = api_key
    
    return save_config(default_config)


def export_config(include_api_key: bool = False) -> Dict[str, Any]:
    """
    Export configuration for backup/migration.
    
    Args:
        include_api_key: Whether to include API key in export
        
    Returns:
        Exported configuration dictionary
    """
    config = load_config()
    
    if not include_api_key:
        config = config.copy()
        config["api_key"] = ""
    
    return config


def import_config(imported_config: Dict[str, Any], merge_with_existing: bool = True) -> bool:
    """
    Import configuration from exported data.
    
    Args:
        imported_config: Configuration dictionary to import
        merge_with_existing: If True, merge with existing config; if False, replace all
        
    Returns:
        True if imported successfully
    """
    try:
        if merge_with_existing:
            current_config = load_config()
            current_config.update(imported_config)
            config = current_config
        else:
            config = DEFAULT_SUNO_CONFIG.copy()
            config.update(imported_config)
        
        return save_config(config)
    except Exception as e:
        logger.error(f"Error importing config: {e}")
        return False


# Convenience functions for common operations
def is_suno_configured() -> bool:
    """
    Check if Suno API is properly configured with valid key.
    
    Returns:
        True if configured and functional
    """
    api_key = get_suno_api_key()
    if not api_key:
        return False
    
    # Could add cached validation here to avoid repeated API calls
    return True


def get_effective_backend(default: str = "acestep") -> str:
    """
    Get the backend that should be used, considering user preference and availability.
    
    Args:
        default: Default backend if no preference configured
        
    Returns:
        "suno" or "acestep"
    """
    if not is_suno_configured():
        return "acestep"
    
    return get_preferred_backend() or default


if __name__ == "__main__":
    # Test configuration functions
    print("=" * 60)
    print("Suno API Configuration Test")
    print("=" * 60)
    
    # Show current config
    print("\n1. Current configuration:")
    config = get_suno_config_dict()
    for key, value in config.items():
        if key == "available_models":
            print(f"  {key}:")
            for model, desc in value.items():
                print(f"    - {model}: {desc}")
        else:
            print(f"  {key}: {value}")
    
    # Check if configured
    print("\n2. Configuration status:")
    print(f"  Is configured: {is_suno_configured()}")
    print(f"  Preferred backend: {get_preferred_backend()}")
    print(f"  Effective backend: {get_effective_backend()}")
    print(f"  Default model: {get_default_suno_model()}")
    
    # Test setting values
    print("\n3. Test configuration updates:")
    print("  Setting default model to v4_5...")
    set_default_suno_model("v4_5")
    print(f"  Default model is now: {get_default_suno_model()}")
    
    print("  Setting backend preference to Suno...")
    prefer_suno_backend(True)
    print(f"  Preferred backend is now: {get_preferred_backend()}")
    
    # Reset
    print("\n4. Resetting to defaults (except API key)...")
    reset_config()
    print(f"  Default model after reset: {get_default_suno_model()}")
    print(f"  Preferred backend after reset: {get_preferred_backend()}")
    
    print("\n" + "=" * 60)
    print("Test completed")
    print("=" * 60)