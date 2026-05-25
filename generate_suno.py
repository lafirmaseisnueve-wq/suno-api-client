"""
Music generation using Suno API for AceForge.

This module provides the main generation function that adapts
ACE-Step-style parameters to Suno API calls.
"""

import logging
import time
from pathlib import Path
from typing import Optional, Dict, Any, Callable

# Configure logging
logger = logging.getLogger(__name__)


def _normalize_prompt_for_suno(
    style: str,
    song_description: str = "",
    bpm: Optional[float] = None,
    key_scale: str = "",
    language: str = "",
) -> str:
    """
    Normalize and expand prompt for Suno API from ACE-Step parameters.
    
    Args:
        style: Main style/caption (from advanced mode)
        song_description: Song description (from simple mode)
        bpm: Optional BPM
        key_scale: Musical key (e.g., "C Major")
        language: Vocal language
        
    Returns:
        Formatted prompt string
    """
    # Start with primary prompt
    if song_description and not style:
        prompt = song_description
    elif style:
        prompt = style
    else:
        prompt = ""
    
    # Add musical metadata to prompt
    extras = []
    
    if bpm and bpm > 0:
        extras.append(f"bpm {int(bpm)}")
    
    if key_scale:
        extras.append(f"key {key_scale}")
    
    if language and language.lower() not in ("unknown", "auto", ""):
        extras.append(f"{language} vocals")
    
    if extras:
        if prompt:
            prompt = f"{prompt}, {', '.join(extras)}"
        else:
            prompt = ", ".join(extras)
    
    # Ensure we always have something
    if not prompt:
        prompt = "instrumental background music"
    
    return prompt


def _normalize_lyrics_for_suno(lyrics: str) -> str:
    """
    Normalize lyrics for Suno API.
    
    Args:
        lyrics: Raw lyrics text
        
    Returns:
        Normalized lyrics string
    """
    if not lyrics:
        return ""
    
    # Trim whitespace
    lyrics = lyrics.strip()
    
    # If empty after trim, return early
    if not lyrics:
        return ""
    
    # Check for structure tags [verse], [chorus], etc.
    has_tags = any(tag in lyrics.lower() for tag in [
        "[verse]", "[chorus]", "[bridge]", "[intro]", "[outro]",
        "[hook]", "[pre-chorus]", "[post-chorus]"
    ])
    
    # If no tags, this might be plain text paragraphs
    # Suno API can handle this, but let's ensure formatting
    if not has_tags:
        # Keep as plain text, but normalize line breaks
        lines = lyrics.split('\n')
        cleaned_lines = [ln.strip() for ln in lines if ln.strip()]
        lyrics = '\n'.join(cleaned_lines)
    
    return lyrics


def _map_acestep_model_to_suno(acestep_model: str) -> str:
    """
    Map ACE-Step model preferences to Suno model.
    
    Args:
        acestep_model: ACE-Step model name (e.g., "turbo", "base", "sft")
        
    Returns:
        Suno model identifier
    """
    acestep_model = acestep_model.lower()
    
    # Mapping heuristic
    if "sft" in acestep_model or "finetuned" in acestep_model:
        # Use premium model for fine-tuned
        return "v5_5"
    elif "base" in acestep_model:
        # Use balanced model for base
        return "v4_5"
    elif "turbo" in acestep_model:
        # Use fast model for turbo
        return "v4"
    else:
        # Default to latest
        return "v5"


def _estimate_sunoduration_from_params(
    target_seconds: float,
    task_type: str,
) -> int:
    """
    Estimate appropriate Suno duration based on task type.
    
    Args:
        target_seconds: Desired duration in seconds
        task_type: ACE-Step task type
        
    Returns:
        Duration in seconds (15-240 range)
    """
    # Clamp to Suno's allowed range
    duration = max(15, min(240, int(target_seconds)))
    
    # Adjust based on task type
    if task_type in ("extend", "complete"):
        # For extend, use shorter segments typically
        duration = min(120, duration)
    elif task_type == "intro":
        duration = min(30, duration)
    
    return duration


def _calculate_acestep_guidance_equiv(suno_model: str) -> float:
    """
    Calculate equivalent ACE-Step guidance scale for Suno model.
    
    This is for progress display/UI purposes only.
    
    Args:
        suno_model: Suno model identifier
        
    Returns:
        Approximate guidance scale equivalent
    """
    # Higher-quality models typically have higher adherence ("guidance")
    model_quality = {
        "v4": 4.0,
        "v4_5": 5.0,
        "v4_5plus": 6.0,
        "v4_5all": 5.5,
        "v5": 7.0,
        "v5_5": 7.5,
    }
    
    return model_quality.get(suno_model, 5.0)


def generate_track_suno(
    suno_client,
    genre_prompt: str,
    lyrics: str = "",
    instrumental: bool = True,
    negative_prompt: str = "",
    target_seconds: int = 60,
    fade_in_seconds: float = 0.5,
    fade_out_seconds: float = 0.5,
    seed: int = 0,
    out_dir: Optional[Path] = None,
    basename: str = "track",
    bpm: Optional[float] = None,
    src_audio_path: Optional[str] = None,
    task: str = "text2music",
    audio2audio_enable: bool = False,
    ref_audio_strength: float = 0.7,
    repaint_start: float = 0.0,
    repaint_end: float = -1.0,
    retake_variance: float = 0.2,
    vocal_gain_db: float = 0.0,
    instrumental_gain_db: float = 0.0,
    lora_name_or_path: Optional[str] = None,
    lora_weight: float = 0.75,
    cancel_check: Optional[Callable[[], bool]] = None,
    vocal_language: str = "",
    thinking: bool = False,
    use_cot_metas: bool = True,
    use_cot_caption: bool = True,
    use_cot_language: bool = True,
    lm_temperature: float = 0.85,
    lm_cfg_scale: float = 2.0,
    lm_top_k: int = 0,
    lm_top_p: float = 0.9,
    lm_negative_prompt: str = "NO USER INPUT",
    # Suno-specific parameters
    suno_model: str = "v5",
    custom_seed: Optional[str] = None,
    callback_url: Optional[str] = None,
    progress_callback: Optional[Callable[[float, str, int, int, float], None]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Generate a music track using Suno API.
    
    This function provides an ACE-Step-compatible interface that maps
    to Suno API capabilities. Some ACE-Step parameters may be ignored
    or approximated where Suno doesn't have equivalents.
    
    Args:
        suno_client: SunoAPIClient instance
        genre_prompt: Music style/description prompt
        lyrics: Lyrics text (ignored if instrumental=True)
        instrumental: Generate without vocals
        negative_prompt: Ignored by Suno API (for compatibility)
        target_seconds: Desired duration in seconds (15-240)
        fade_in_seconds: Ignored (post-process locally if needed)
        fade_out_seconds: Ignored (post-process locally if needed)
        seed: Random seed (if 0, random seed used)
        out_dir: Output directory for saved audio
        basename: Base filename for output
        bpm: Beats per minute (added to prompt)
        src_audio_path: Source audio path (for audio2audio tasks)
        task: Task type (affects how parameters are mapped)
        audio2audio_enable: Enable audio conditioning
        ref_audio_strength: Reference audio influence (0.0-1.0)
        repaint_start: Start of repaint segment (ignored by Suno)
        repaint_end: End of repaint segment (ignored by Suno)
        retake_variance: Variance amount (ignored by Suno)
        vocal_gain_db: Post-processing gain (ignored)
        instrumental_gain_db: Post-processing gain (ignored)
        lora_name_or_path: LoRA adapter (not supported by Suno)
        lora_weight: LoRA weight (not supported by Suno)
        cancel_check: Callable that returns True to cancel
        vocal_language: Language of vocals
        thinking: Enable thinking mode (ignored by Suno)
        use_cot_metas: Enable CoT metadata (ignored)
        use_cot_caption: Enable CoT caption formatting (ignored)
        use_cot_language: Enable CoT language (ignored)
        lm_temperature: LM temperature (ignored)
        lm_cfg_scale: LM CFG scale (ignored)
        lm_top_k: LM top_k (ignored)
        lm_top_p: LM top_p (ignore)
        lm_negative_prompt: LM negative prompt (ignored)
        suno_model: Suno model version to use
        custom_seed: Optional custom seed string
        callback_url: Webhook URL for progress callbacks
        progress_callback: Optional callback for progress updates
        **kwargs: Additional parameters
        
    Returns:
        Dict with:
        - wav_path: Path to generated audio file
        - actual_seconds: Actual duration
        - generation_id: Suno generation ID
        
    Raises:
        Exception: If generation is cancelled or fails
    """
    # Import here to avoid circular dependency
    try:
        from cdmf_paths import get_output_dir
    except ImportError:
        # Fallback
        get_output_dir = lambda: Path.cwd() / "output"
    
    # Setup output directory
    out_dir = out_dir or get_output_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Normalize prompts
    prompt = _normalize_prompt_for_suno(
        style=genre_prompt,
        bpm=bpm,
        key_scale=kwargs.get("keyScale", ""),
        language=vocal_language,
    )
    
    normalized_lyrics = _normalize_lyrics_for_suno(lyrics)
    
    # Determine effective duration
    duration = _estimate_sunoduration_from_params(target_seconds, task)
    
    # Handle custom seed
    if seed == 0:
        # Random seed, let Suno handle it
        suno_seed = None
    else:
        # Use provided seed as custom seed string
        suno_seed = str(seed)
    
    if custom_seed:
        suno_seed = custom_seed
    
    # Log parameters
    logger.info(f"[Suno] Starting generation:")
    logger.info(f"  Model: {suno_model}")
    logger.info(f"  Duration: {duration}s")
    logger.info(f"  Instrumental: {instrumental}")
    logger.info(f"  Prompt: {prompt[:100]}...")
    if normalized_lyrics and not instrumental:
        logger.info(f"  Lyrics: {len(normalized_lyrics)} characters")
    if src_audio_path and audio2audio_enable:
        logger.info(f"  Source audio: {src_audio_path}")
        logger.info(f"  Ref strength: {ref_audio_strength}")
    
    # Check for cancel before starting
    if cancel_check and cancel_check():
        raise Exception("Generation cancelled by user (before API call)")
    
    # Create internal progress callback wrapper
    def _progress_wrapper(progress: float, stage: str, status_data: Dict):
        """Convert Suno progress callback to ACE-Step format."""
        if progress_callback:
            # Map Suno stages to ACE-Step format
            steps_current = int(progress * 100)
            steps_total = 100
            eta_seconds = status_data.get("estimated_time_remaining")
            
            progress_callback(
                progress / 100.0,  # Convert to 0-1 fraction
                stage or "generating",
                steps_current,
                steps_total,
                eta_seconds,
            )
    
    try:
        # Call Suno API
        if task in ("cover", "retake") and src_audio_path:
            # For cover/retake, we need to upload source audio first
            # This would require an upload endpoint, which may not be available
            # For now, treat as text2music with style
            logger.warning(f"Task {task} with source audio not fully supported, using text2music")
            
        result = suno_client.generate_music(
            prompt=prompt,
            lyrics=normalized_lyrics if not instrumental else None,
            is_instrumental=instrumental,
            duration_seconds=duration,
            model=suno_model,
            custom_seed=suno_seed,
            callback_url=callback_url,
        )
        
        generation_id = result.get("id")
        
        if not generation_id:
            raise RuntimeError("No generation ID returned from Suno API")
        
        logger.info(f"[Suno] Generation ID: {generation_id}")
        
        # Poll for completion
        final_status = suno_client.poll_for_completion(
            generation_id,
            progress_callback=_progress_wrapper,
            cancel_check=cancel_check,
        )
        
        # Check final status
        status_text = final_status.get("status", "").lower()
        if status_text not in ("completed", "succeeded", "success"):
            error_msg = final_status.get("error", "Generation failed")
            raise RuntimeError(f"Generation failed: {error_msg}")
        
        # Get audio URL
        audio_url = final_status.get("audio_url")
        if not audio_url:
            logger.warning("No audio_url in completed status, checking alternative fields...")
            audio_url = final_status.get("output_url") or final_status.get("url")
        
        if not audio_url:
            raise RuntimeError("No audio URL found in completed generation")
        
        # Download audio
        filename = f"{basename}.wav"
        wav_path = out_dir / filename
        
        logger.info(f"[Suno] Downloading audio to {wav_path}...")
        wav_path = suno_client.download_audio(audio_url, wav_path)
        
        # Get actual duration from status or file
        actual_seconds = final_status.get("duration", duration)
        if actual_seconds == 0:
            # Fallback to requested duration
            actual_seconds = duration
        
        logger.info(f"[Suno] Generation complete:")
        logger.info(f"  Output: {wav_path}")
        logger.info(f"  Duration: {actual_seconds}s")
        
        return {
            "wav_path": wav_path,
            "actual_seconds": actual_seconds,
            "generation_id": generation_id,
            "suno_model": suno_model,
            "suno_status": final_status,
        }
        
    except Exception as e:
        logger.error(f"[Suno] Generation failed: {e}")
        raise


def generate_lyrics_suno(
    suno_client,
    prompt: str,
    theme: Optional[str] = None,
    language: Optional[str] = None,
    verse_count: int = 2,
    **kwargs
) -> Dict[str, Any]:
    """
    Generate lyrics using Suno API.
    
    Args:
        suno_client: SunoAPIClient instance
        prompt: Topic/theme for lyrics
        theme: Optional specific theme/genre
        language: Language of lyrics
        verse_count: Number of verses to generate
        **kwargs: Additional parameters
        
    Returns:
        Dict with generated lyrics text
    """
    logger.info(f"[Suno] Generating lyrics with prompt: {prompt}")
    
    result = suno_client.generate_lyrics(
        prompt=prompt,
        theme=theme,
        language=language,
        verse_count=verse_count,
        **kwargs
    )
    
    return result


# Summary function for UI/info display
def get_suno_model_info() -> Dict[str, Dict[str, Any]]:
    """
    Get information about available Suno models.
    
    Returns:
        Dict with model details
    """
    return {
        "v4": {
            "name": "V4",
            "description": "Improved Vocals",
            "max_duration": 240,  # 4 minutes
            "best_for": "Vocal clarity",
            "speed": "balanced",
        },
        "v4_5": {
            "name": "V4.5",
            "description": "Smart Prompts",
            "max_duration": 480,  # 8 minutes
            "best_for": "Complex requests",
            "speed": "fast",
        },
        "v4_5plus": {
            "name": "V4.5 Plus",
            "description": "Richer Tones",
            "max_duration": 480,  # 8 minutes
            "best_for": "Highest quality",
            "speed": "balanced",
        },
        "v4_5all": {
            "name": "V4.5 All",
            "description": "Better Song Structure",
            "max_duration": 480,  # 8 minutes
            "best_for": "Well-structured pieces",
            "speed": "balanced",
        },
        "v5": {
            "name": "V5",
            "description": "Latest Model",
            "max_duration": 480,  # Assuming 8 min
            "best_for": "Overall quality",
            "speed": "balanced",
        },
        "v5_5": {
            "name": "V5.5",
            "description": "Voice-Customized",
            "max_duration": 480,  # Assuming 8 min
            "best_for": "Custom voices",
            "speed": "balanced",
        },
    }


if __name__ == "__main__":
    # Quick test
    import sys
    
    print("Suno Generation Module")
    print("=" * 60)
    
    # Test prompt normalization
    print("\n1. Testing prompt normalization:")
    test_prompt = _normalize_prompt_for_suno(
        style="electronic pop with synth leads",
        bpm=128,
        key_scale="A minor",
        language="english"
    )
    print(f"   Result: {test_prompt}")
    
    # Test lyrics normalization
    print("\n2. Testing lyrics normalization:")
    test_lyrics = """[Verse 1]
    Walking down the street
    
    [Chorus]
    Feeling so good"""
    
    normalized = _normalize_lyrics_for_suno(test_lyrics)
    print(f"   Input has structure tags: True")
    print(f"   Output:\n{normalized}")
    
    # Test model info
    print("\n3. Available Suno models:")
    models = get_suno_model_info()
    for model_id, info in models.items():
        print(f"   {model_id}: {info['description']} - {info['max_duration']}s max")
    
    print("\n" + "=" * 60)
    print("Tests completed")