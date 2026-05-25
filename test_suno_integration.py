#!/usr/bin/env python3
"""
Test script for Suno API integration.

This script tests the basic functionality of the Suno API client
and generation module to ensure integration works correctly.
"""

import os
import sys
import logging
from pathlib import Path

# Add workspace to path if needed
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_config_module():
    """Test config_suno module."""
    print("\n" + "="*60)
    print("TEST 1: Config Module")
    print("="*60)
    
    try:
        from config_suno import (
            load_config,
            save_config,
            get_suno_api_key,
            set_suno_api_key,
            is_suno_configured,
            get_suno_config_dict,
            reset_config,
        )
        
        print("✓ config_suno module imported successfully")
        
        # Test load config
        config = load_config()
        print(f"✓ Loaded config with {len(config)} keys")
        
        # Test get API key
        api_key = get_suno_api_key()
        if api_key:
            print(f"✓ API key found: {api_key[:4]}...{api_key[-4:]}")
        else:
            print("⚠ No API key configured")
        
        # Test is configured
        is_configured = is_suno_configured()
        print(f"✓ Is configured: {is_configured}")
        
        # Test get config dict
        config_dict = get_suno_config_dict()
        print(f"✓ Config dict retrieved with {len(config_dict)} keys")
        
        print("\n✅ Config module tests PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Config module tests FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_client_module(api_key: str = None):
    """Test suno_client module."""
    print("\n" + "="*60)
    print("TEST 2: Client Module")
    print("="*60)
    
    try:
        from suno_client import SunoAPIClient, SunoAPIError
        
        print("✓ suno_client module imported successfully")
        
        # Try to get API key from config if not provided
        if not api_key:
            from config_suno import get_suno_api_key
            api_key = get_suno_api_key()
        
        if not api_key:
            print("⚠ No API key available, skipping API tests")
            print("⚠ To test, set API key with: python config_suno.py <API_KEY>")
            return True  # Don't fail, just skip
        
        # Create client
        client = SunoAPIClient(api_key)
        print("✓ SunoAPIClient instance created")
        
        # Test ping (connection)
        print("\nTesting API connection...")
        if client.ping():
            print("✓ API connection successful")
        else:
            print("✗ API connection failed")
            return False
        
        # Test get credits
        print("\nTesting credits endpoint...")
        credits = client.get_remaining_credits()
        print(f"✓ Credits response: {credits}")
        
        # Test get API info
        print("\nTesting API info...")
        info = client.get_api_info()
        print(f"✓ Available models: {info['available_models']}")
        
        print("\n✅ Client module tests PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Client module tests FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_generate_module():
    """Test generate_suno module."""
    print("\n" + "="*60)
    print("TEST 3: Generate Module")
    print("="*60)
    
    try:
        from generate_suno import (
            _normalize_prompt_for_suno,
            _normalize_lyrics_for_suno,
            _map_acestep_model_to_suno,
            get_suno_model_info,
        )
        
        print("✓ generate_suno module imported successfully")
        
        # Test prompt normalization
        print("\nTesting prompt normalization...")
        prompt1 = _normalize_prompt_for_suno(
            style="electronic pop",
            bpm=128,
            key_scale="C major",
            language="english"
        )
        print(f"✓ Prompt: {prompt1}")
        
        prompt2 = _normalize_prompt_for_suno(
            song_description="A sad song about lost love",
        )
        print(f"✓ Song desc: {prompt2}")
        
        # Test lyrics normalization
        print("\nTesting lyrics normalization...")
        lyrics = """[Verse 1]
I'm walking down the street

[Chorus]
Feeling so alive"""
        normalized = _normalize_lyrics_for_suno(lyrics)
        print(f"✓ Lyrics normalized: {len(normalized)} chars")
        
        # Test model mapping
        print("\nTesting model mapping...")
        mapping = _map_acestep_model_to_suno("turbo")
        print(f"✓ 'turbo' -> '{mapping}'")
        mapping = _map_acestep_model_to_suno("sft")
        print(f"✓ 'sft' -> '{mapping}'")
        
        # Test model info
        print("\nTesting model info...")
        info = get_suno_model_info()
        print(f"✓ Available models: {list(info.keys())}")
        
        print("\n✅ Generate module tests PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Generate module tests FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_full_generation(api_key: str = None):
    """Test full generation flow (if API key available)."""
    print("\n" + "="*60)
    print("TEST 4: Full Generation Flow")
    print("="*60)
    
    try:
        from suno_client import SunoAPIClient
        from generate_suno import generate_track_suno
        from config_suno import get_suno_api_key
        
        # Get API key
        if not api_key:
            api_key = get_suno_api_key()
        
        if not api_key:
            print("⚠ No API key available, skipping generation test")
            return True
        
        print(f"✓ API key available: {api_key[:4]}...{api_key[-4:]}")
        
        # Create client
        client = SunoAPIClient(api_key)
        
        # Test generation with short duration
        print("\nStarting test generation (15s, instrumental)...")
        print("Prompt: 'electronic ambient, calm and peaceful'")
        
        result = generate_track_suno(
            suno_client=client,
            genre_prompt="electronic ambient, calm and peaceful",
            instrumental=True,
            target_seconds=15,  # Short for testing
            suno_model="v4",  # Use faster model
            basename="test_generation",
            progress_callback=lambda pct, stage, cur, total, eta: print(
                f"  Progress: {pct*100:.1f}% - {stage}"
            ),
            cancel_check=lambda: False,
        )
        
        print(f"\n✓ Generation completed!")
        print(f"  Output: {result['wav_path']}")
        print(f"  Duration: {result['actual_seconds']}s")
        print(f"  Generation ID: {result['generation_id']}")
        
        if result['wav_path'].exists():
            print(f"✓ File exists: {result['wav_path'].stat().st_size} bytes")
        else:
            print(f"✗ File not found!")
            return False
        
        print("\n✅ Full generation test PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Full generation test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("SUNO API INTEGRATION TEST SUITE")
    print("="*60)
    
    # Get API key from command line if provided
    api_key = None
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
        # Validate length (Suno API keys are typically longer)
        if len(api_key) > 10:
            print(f"\n✓ API key provided via command line")
        else:
            print(f"\n⚠ API key seems too short, ignoring")
            api_key = None
    
    # Run tests
    results = []
    
    results.append(("Config Module", test_config_module()))
    results.append(("Client Module", test_client_module(api_key)))
    results.append(("Generate Module", test_generate_module()))
    
    # Only run full generation if tests passed and API key available
    if all(r[1] for r in results) and api_key:
        # Ask user if they want to run generation test
        try:
            response = input("\nRun full generation test? (this uses API credits) [y/N]: ")
            if response.lower() in ('y', 'yes'):
                results.append(("Full Generation", test_full_generation(api_key)))
        except (EOFError, KeyboardInterrupt):
            print("\nSkipping generation test")
    else:
        print("\n⚠ Skipping full generation test (previous tests failed or no API key)")
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(r[1] for r in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("Suno API integration is ready to use.")
    else:
        print("⚠ Some tests failed.")
        print("Please check the errors above and fix issues before proceeding.")
    print("="*60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())