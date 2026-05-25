"""
Suno API Client for AceForge integration.

This module provides a Python client for interacting with the Suno API
to generate music, lyrics, and process audio files.
"""

import logging
import requests
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable
from urllib.parse import urljoin

# Configure logging
logger = logging.getLogger(__name__)


class SunoAPIError(Exception):
    """Custom exception for Suno API errors."""
    pass


class SunoRateLimitError(SunoAPIError):
    """Raised when API rate limit is exceeded."""
    pass


class SunoAuthenticationError(SunoAPIError):
    """Raised when authentication fails."""
    pass


class SunoAPIClient:
    """
    Client for interacting with the Suno API.
    
    https://api.sunoapi.org
    """
    
    BASE_URL = "https://api.sunoapi.org"
    DEFAULT_TIMEOUT = 30
    POLL_INTERVAL = 5  # seconds
    MAX_POLL_ATTEMPTS = 120  # 10 minutes max
    
    # Available models
    MODELS = {
        "v4": "V4 - Improved Vocals (up to 4 min)",
        "v4_5": "V4_5 - Smart Prompts (up to 8 min)",
        "v4_5plus": "V4_5PLUS - Richer Tones (up to 8 min)",
        "v4_5all": "V4_5ALL - Better Song Structure (up to 8 min)",
        "v5": "V5 - Latest Model",
        "v5_5": "V5_5 - Voice-Customized Model",
    }
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize the Suno API client.
        
        Args:
            api_key: Your Suno API key
            base_url: Optional custom base URL (defaults to api.sunoapi.org)
        """
        self.api_key = api_key
        self.base_url = (base_url or self.BASE_URL).rstrip('/')
        
        # Create session with default headers
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        
        logger.info(f"SunoAPIClient initialized with models: {list(self.MODELS.keys())}")
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the Suno API.
        
        Args:
            method: HTTP method (GET, POST, DELETE)
            endpoint: API endpoint path (without base URL)
            params: Query parameters
            json_data: JSON body for POST/PUT
            timeout: Request timeout in seconds
            
        Returns:
            JSON response as dictionary
            
        Raises:
            SunoAuthenticationError: If authentication fails
            SunoRateLimitError: If rate limit exceeded
            SunoAPIError: For other API errors
        """
        url = urljoin(f"{self.base_url}/", endpoint.lstrip('/'))
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                timeout=timeout,
            )
            
            # Handle specific error codes
            if response.status_code == 401:
                error_msg = response.json().get("error", "Authentication failed")
                raise SunoAuthenticationError(error_msg)
            elif response.status_code == 429:
                error_msg = response.json().get("error", "Rate limit exceeded")
                raise SunoRateLimitError(error_msg)
            elif response.status_code >= 400:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
                error_msg = error_data.get("error", response.text)
                raise SunoAPIError(f"API error {response.status_code}: {error_msg}")
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise SunoAPIError(f"Request timeout after {timeout}s")
        except requests.exceptions.ConnectionError as e:
            raise SunoAPIError(f"Connection error: {str(e)}")
        except requests.exceptions.RequestException as e:
            raise SunoAPIError(f"Request failed: {str(e)}")
        except ValueError as e:
            raise SunoAPIError(f"Invalid JSON response: {str(e)}")
    
    def get_remaining_credits(self) -> Dict[str, Any]:
        """
        Get remaining credits for the account.
        
        Returns:
            Dict with 'credits' key and remaining count
        """
        result = self._make_request("GET", "/credits/remaining")
        logger.debug(f"Remaining credits: {result}")
        return result
    
    # ========== Music Generation APIs ==========
    
    def generate_music(
        self,
        prompt: str,
        lyrics: Optional[str] = None,
        is_instrumental: bool = False,
        duration_seconds: int = 60,
        model: str = "v5",
        custom_seed: Optional[str] = None,
        callback_url: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate music from text description.
        
        Args:
            prompt: Music style/description prompt
            lyrics: Optional lyrics (ignored if is_instrumental=True)
            is_instrumental: Generate without vocals
            duration_seconds: Desired duration (15-240)
            model: Model version (v4, v4_5, v4_5plus, v4_5all, v5, v5_5)
            custom_seed: Optional custom seed for reproducibility
            callback_url: Optional webhook URL for progress updates
            **kwargs: Additional model-specific parameters
            
        Returns:
            Dict with 'id' (generation_id) and initial status
        """
        if model not in self.MODELS:
            raise ValueError(
                f"Invalid model '{model}'. Available: {list(self.MODELS.keys())}"
            )
        
        if not prompt:
            raise ValueError("Prompt is required")
        
        duration_seconds = max(15, min(240, duration_seconds))
        
        payload = {
            "prompt": prompt,
            "is_instrumental": is_instrumental,
            "duration_seconds": duration_seconds,
            "model": model,
        }
        
        if lyrics and not is_instrumental:
            payload["lyrics"] = lyrics
        
        if custom_seed:
            payload["custom_seed"] = custom_seed
        
        if callback_url:
            payload["callback_url"] = callback_url
        
        # Add any additional parameters
        payload.update(kwargs)
        
        logger.info(f"Generating music with model={model}, duration={duration_seconds}s, instrumental={is_instrumental}")
        result = self._make_request("POST", "/generate/music", json_data=payload)
        
        generation_id = result.get("id")
        if not generation_id:
            raise SunoAPIError("No generation ID returned from API")
        
        logger.info(f"Music generation started with ID: {generation_id}")
        return result
    
    def get_generation_status(
        self,
        generation_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed status of a music generation task.
        
        Args:
            generation_id: ID returned by generate_music()
            
        Returns:
            Dict with status, progress, audio_url when complete, etc.
        """
        result = self._make_request(
            "GET",
            "/generation/details",
            params={"id": generation_id}
        )
        return result
    
    def poll_for_completion(
        self,
        generation_id: str,
        progress_callback: Optional[Callable[[float, str, Dict], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None,
        max_attempts: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Poll for generation completion.
        
        Args:
            generation_id: ID returned by generate_music()
            progress_callback: Callback function(progress_percent, stage, status_data)
            cancel_check: Callback function that returns True to cancel
            max_attempts: Maximum polling attempts (default: MAX_POLL_ATTEMPTS)
            
        Returns:
            Final status dict with audio_url when complete
            
        Raises:
            SunoAPIError: If generation fails or times out
            Exception: If cancelled by user
        """
        max_attempts = max_attempts or self.MAX_POLL_ATTEMPTS
        attempts = 0
        
        logger.info(f"Polling for generation {generation_id} completion...")
        
        while attempts < max_attempts:
            if cancel_check and cancel_check():
                logger.info(f"Generation {generation_id} cancelled by user")
                raise Exception(f"Generation {generation_id} cancelled by user")
            
            try:
                status = self.get_generation_status(generation_id)
                
                status_text = status.get("status", "unknown").lower()
                
                # Call progress callback if provided
                if progress_callback:
                    progress_pct = self._estimate_progress(status_text, attempts, max_attempts)
                    progress_callback(progress_pct, status_text, status)
                
                # Check if complete
                if status_text in ("completed", "succeeded", "success"):
                    logger.info(f"Generation {generation_id} completed successfully")
                    return status
                elif status_text in ("failed", "error"):
                    error_msg = status.get("error", status.get("message", "Generation failed"))
                    raise SunoAPIError(f"Generation failed: {error_msg}")
                elif status_text == "cancelled":
                    raise Exception(f"Generation {generation_id} was cancelled")
                
                # Continue polling
                attempts += 1
                time.sleep(self.POLL_INTERVAL)
                
            except SunoAPIError as e:
                # Don't retry on API errors (unless rate limit)
                if not isinstance(e, SunoRateLimitError):
                    raise
                
                # Retry on rate limit
                logger.warning(f"Rate limit hit, retrying... ({attempts}/{max_attempts})")
                attempts += 1
                time.sleep(self.POLL_INTERVAL * 2)
        
        raise SunoAPIError(
            f"Generation {generation_id} timed out after {max_attempts * self.POLL_INTERVAL}s"
        )
    
    @staticmethod
    def _estimate_progress(
        status_text: str,
        attempt: int,
        max_attempts: int
    ) -> float:
        """
        Estimate progress percentage for callback.
        
        Args:
            status_text: Current status text
            attempt: Current polling attempt
            max_attempts: Maximum attempts
            
        Returns:
            Progress percentage (0-100)
        """
        if status_text in ("completed", "succeeded", "success"):
            return 100.0
        elif status_text in ("processing", "generating"):
            # Linear estimate based on attempts
            return min(90.0, (attempt / max_attempts) * 85.0)
        elif status_text in ("queued", "pending"):
            return min(10.0, (attempt / max_attempts) * 10.0)
        else:
            return 0.0
    
    def download_audio(
        self,
        audio_url: str,
        save_path: Path,
    ) -> Path:
        """
        Download generated audio file.
        
        Args:
            audio_url: URL to audio file
            save_path: Local path to save file
            
        Returns:
            Path to downloaded file
        """
        logger.info(f"Downloading audio from {audio_url} to {save_path}")
        
        ensure_parent_dir = save_path.parent
        ensure_parent_dir.mkdir(parents=True, exist_ok=True)
        
        # Download with streaming
        response = self.session.get(audio_url, stream=True, timeout=60)
        
        if response.status_code != 200:
            raise SunoAPIError(f"Failed to download audio: HTTP {response.status_code}")
        
        # Determine content size for progress
        content_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
        
        logger.info(f"Audio downloaded successfully ({downloaded} bytes)")
        
        if not save_path.exists():
            raise SunoAPIError(f"File not found after download: {save_path}")
        
        return save_path
    
    def extend_music(
        self,
        audio_url: str,
        extend_duration_seconds: int = 30,
        model: str = "v5",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Extend existing music with AI-generated content.
        
        Args:
            audio_url: URL of existing audio to extend
            extend_duration_seconds: Duration to extend (in seconds)
            model: Model version
            **kwargs: Additional parameters
            
        Returns:
            Dict with generation_id
        """
        payload = {
            "audio_url": audio_url,
            "extend_duration_seconds": extend_duration_seconds,
            "model": model,
        }
        payload.update(kwargs)
        
        result = self._make_request("POST", "/extend/music", json_data=payload)
        return result
    
    def cover_music(
        self,
        original_audio_url: str,
        style_prompt: str,
        model: str = "v5",
        reference_audio_url: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a cover/resinterpretation of existing music.
        
        Args:
            original_audio_url: URL of original track
            style_prompt: Description of new style/interpretation
            model: Model version
            reference_audio_url: Optional reference audio for style
            **kwargs: Additional parameters
            
        Returns:
            Dict with generation_id
        """
        payload = {
            "original_audio_url": original_audio_url,
            "style_prompt": style_prompt,
            "model": model,
        }
        
        if reference_audio_url:
            payload["reference_audio_url"] = reference_audio_url
        
        payload.update(kwargs)
        
        result = self._make_request("POST", "/cover/music", json_data=payload)
        return result
    
    def add_vocals(
        self,
        instrumental_url: str,
        vocal_prompt: str,
        model: str = "v5",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate vocals for instrumental music.
        
        Args:
            instrumental_url: URL of instrumental track
            vocal_prompt: Description of vocals desired
            model: Model version
            **kwargs: Additional parameters
            
        Returns:
            Dict with generation_id
        """
        payload = {
            "instrumental_url": instrumental_url,
            "vocal_prompt": vocal_prompt,
            "model": model,
        }
        payload.update(kwargs)
        
        result = self._make_request("POST", "/add/vocals", json_data=payload)
        return result
    
    def add_instrumental(
        self,
        vocals_url: str,
        instrumental_prompt: str,
        model: str = "v5",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate instrumental accompaniment for vocal track.
        
        Args:
            vocals_url: URL of vocal track
            instrumental_prompt: Description of instrumental desired
            model: Model version
            **kwargs: Additional parameters
            
        Returns:
            Dict with generation_id
        """
        payload = {
            "vocals_url": vocals_url,
            "instrumental_prompt": instrumental_prompt,
            "model": model,
        }
        payload.update(kwargs)
        
        result = self._make_request("POST", "/add/instrumental", json_data=payload)
        return result
    
    # ========== Lyrics Generation APIs ==========
    
    def generate_lyrics(
        self,
        prompt: str,
        theme: Optional[str] = None,
        language: Optional[str] = None,
        verse_count: int = 2,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate lyrics using AI.
        
        Args:
            prompt: Topic or theme for lyrics
            theme: Optional specific theme/genre
            language: Language of lyrics
            verse_count: Number of verses to generate
            **kwargs: Additional parameters
            
        Returns:
            Dict with generated lyrics text
        """
        payload = {
            "prompt": prompt,
            "verse_count": verse_count,
        }
        
        if theme:
            payload["theme"] = theme
        
        if language:
            payload["language"] = language
        
        payload.update(kwargs)
        
        result = self._make_request("POST", "/generate/lyrics", json_data=payload)
        return result
    
    def get_timestamped_lyrics(
        self,
        lyrics_id: str
    ) -> Dict[str, Any]:
        """
        Get lyrics with precise timestamps.
        
        Args:
            lyrics_id: ID from generate_lyrics
            
        Returns:
            Dict with timestamped lyrics
        """
        result = self._make_request(
            "GET",
            "/lyrics/timestamped",
            params={"id": lyrics_id}
        )
        return result
    
    # ========== Audio Processing APIs ==========
    
    def separate_vocals(
        self,
        audio_url: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Separate vocals from instrumental in audio.
        
        Args:
            audio_url: URL of audio file
            **kwargs: Additional parameters
            
        Returns:
            Dict with分离的vocals and instrumental URLs
        """
        payload = {"audio_url": audio_url}
        payload.update(kwargs)
        
        result = self._make_request("POST", "/separate/vocals", json_data=payload)
        return result
    
    def convert_to_wav(
        self,
        audio_url: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Convert generated music to WAV format.
        
        Args:
            audio_url: URL of source audio
            **kwargs: Additional parameters
            
        Returns:
            Dict with WAV conversion task ID
        """
        payload = {"audio_url": audio_url}
        payload.update(kwargs)
        
        result = self._make_request("POST", "/convert/wav", json_data=payload)
        return result
    
    def get_wav_conversion_details(
        self,
        conversion_id: str
    ) -> Dict[str, Any]:
        """
        Get status of WAV conversion.
        
        Args:
            conversion_id: ID from convert_to_wav
            
        Returns:
            Dict with conversion status and download URL
        """
        result = self._make_request(
            "GET",
            "/wav/conversion/details",
            params={"id": conversion_id}
        )
        return result
    
    # ========== Testing Methods ==========
    
    def ping(self) -> bool:
        """
        Test API connection.
        
        Returns:
            True if connection successful
        """
        try:
            self.get_remaining_credits()
            return True
        except Exception as e:
            logger.error(f"API ping failed: {e}")
            return False
    
    def get_api_info(self) -> Dict[str, str]:
        """
        Get information about the API client.
        
        Returns:
            Dict with API info
        """
        return {
            "base_url": self.base_url,
            "available_models": list(self.MODELS.keys()),
            "timeout": self.DEFAULT_TIMEOUT,
        }


# Convenience function for quick initialization
def create_suno_client(api_key: Optional[str] = None) -> Optional[SunoAPIClient]:
    """
    Create SunoAPIClient instance.
    
    Args:
        api_key: API key (if None, will try to load from config)
        
    Returns:
        SunoAPIClient instance or None if no key available
    """
    if not api_key:
        try:
            from config_suno import get_suno_api_key
            api_key = get_suno_api_key()
        except ImportError:
            logger.error("config_suno module not available")
            return None
    
    if not api_key:
        logger.error("No Suno API key available")
        return None
    
    return SunoAPIClient(api_key)


if __name__ == "__main__":
    # Quick test
    import sys
    
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
    else:
        print("Usage: python suno_client.py <API_KEY>")
        sys.exit(1)
    
    client = SunoAPIClient(api_key)
    
    # Test connection
    print("Testing connection...")
    if client.ping():
        print("✓ Connection successful")
        
        # Get credits
        credits = client.get_remaining_credits()
        print(f"✓ Remaining credits: {credits}")
        
        # Get API info
        info = client.get_api_info()
        print(f"✓ API info: {info}")
    else:
        print("✗ Connection failed")
        sys.exit(1)