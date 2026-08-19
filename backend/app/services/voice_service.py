import asyncio
import logging
import io
import os
import re
import tempfile
import time
import subprocess
from typing import Optional, Dict
from .audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

# Common Arabic navigation terms transliterated to clean English phonetics
ARABIC_ROAD_TERMS = {
    'شارع': 'Street',
    'طريق': 'Road',
    'مخرج': 'Exit',
    'دوار': 'Roundabout',
    'جسر': 'Bridge',
    'نفق': 'Tunnel',
    'مدينة': 'City',
    'منطقة': 'Area',
    'شاطئ': 'Beach',
    'برج': 'Burj',
    'ميدان': 'Meydan',
    'المركز المالي': 'Financial Centre',
    'الشيخ زايد': 'Sheikh Zayed',
    'الخيل': 'Al Khail',
    'جميرا': 'Jumeirah',
    'دبي': 'Dubai',
    'أبوظبي': 'Abu Dhabi',
    'الشارقة': 'Sharjah',
    'العين': 'Al Ain',
    'عجمان': 'Ajman',
}

def is_predominantly_arabic(text: str) -> bool:
    """Checks if a string contains mostly Arabic unicode characters."""
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
    latin_chars = len(re.findall(r'[a-zA-Z]', text))
    return arabic_chars > latin_chars and arabic_chars > 0

def normalize_road_text(text: str) -> str:
    """
    Normalizes bilingual street names, slashes, distance abbreviations,
    and highway codes for natural, fluent pronunciation.
    """
    if not text:
        return ""

    s = text.strip()

    # 1. Handle bilingual names with slashes (e.g. "Al Khail Road / شارع الخيل" -> "Al Khail Road")
    if '/' in s:
        parts = [p.strip() for p in s.split('/')]
        # Prefer the English/Latin part if present
        english_part = next((p for p in parts if re.search(r'[a-zA-Z]', p)), None)
        if english_part:
            s = english_part
        else:
            s = parts[0]

    # Remove any stray slashes
    s = s.replace('/', ' ')

    # 2. Transliterate common Arabic prefixes in mixed strings
    for ar, en in ARABIC_ROAD_TERMS.items():
        s = s.replace(ar, en)

    # 3. Expand metric distance units (e.g. "500 m" -> "500 meters", "1.5 km" -> "1.5 kilometers")
    s = re.sub(r'(\d+(?:\.\d+)?)\s*m\b', r'\1 meters', s, flags=re.IGNORECASE)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*km\b', r'\1 kilometers', s, flags=re.IGNORECASE)

    # 4. Expand common road abbreviations
    s = re.sub(r'\bRd\b\.?', 'Road', s)
    s = re.sub(r'\bSt\b\.?', 'Street', s)
    s = re.sub(r'\bAve\b\.?', 'Avenue', s)
    s = re.sub(r'\bBlvd\b\.?', 'Boulevard', s)
    s = re.sub(r'\bDr\b\.?', 'Drive', s)
    s = re.sub(r'\bHwy\b\.?', 'Highway', s)
    s = re.sub(r'\bShk\b\.?', 'Sheikh', s)
    s = re.sub(r'\bSh\b\.?', 'Sheikh', s)

    # 5. Format highway route codes (e.g. "E11" -> "E 11", "D71" -> "D 71", "E311" -> "E 311")
    s = re.sub(r'\b([ED])(\d+)\b', r'\1 \2', s)

    # 6. Format Exit numbers
    s = re.sub(r'\bExit\s*(\d+)', r'Exit \1', s, flags=re.IGNORECASE)

    # Clean up double whitespace
    s = re.sub(r'\s+', ' ', s).strip()

    return s

class VoiceGuidanceService:
    def __init__(self):
        self.is_speaking = False
        self.last_spoken_text: str = ""
        self.last_spoken_time: float = 0.0
        self.english_voice: str = "en-US-JennyNeural"
        self.arabic_voice: str = "ar-AE-FatimaNeural"
        self._audio_cache: Dict[str, bytes] = {}
        self._lock = asyncio.Lock()

    async def generate_speech_bytes(self, text: str) -> Optional[bytes]:
        clean_text = normalize_road_text(text)
        if not clean_text:
            return None

        # Check in-memory audio cache for 0ms latency
        if clean_text in self._audio_cache:
            return self._audio_cache[clean_text]

        # Dynamically choose voice: native Emirati Arabic for Arabic text, English Neural for English
        selected_voice = self.arabic_voice if is_predominantly_arabic(clean_text) else self.english_voice

        try:
            import edge_tts
            communicate = edge_tts.Communicate(clean_text, selected_voice, rate="+4%")
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])
            
            data = audio_buffer.getvalue()
            # Cache up to 25 recent phrases
            if len(self._audio_cache) > 25:
                self._audio_cache.clear()
            self._audio_cache[clean_text] = data
            return data
        except ImportError:
            logger.warning("[Voice] edge-tts package not installed. Falling back to system TTS.")
            return None
        except Exception as e:
            logger.warning(f"[Voice] Error generating neural speech: {e}")
            return None

    async def speak(self, text: str, priority: str = "normal") -> bool:
        """
        Synthesizes and speaks turn-by-turn prompts using Microsoft Neural Voice with automatic ducking.
        """
        if not text or not text.strip():
            return False

        clean_text = normalize_road_text(text)
        now = time.time()

        # Deduplication: Avoid repeating within 25 seconds
        if priority != "high" and clean_text.lower() == self.last_spoken_text.lower():
            if now - self.last_spoken_time < 25.0:
                return False

        async with self._lock:
            self.last_spoken_text = clean_text
            self.last_spoken_time = now
            self.is_speaking = True

            logger.info(f"[Voice Neural] Speaking: '{clean_text}'")

            # 1. Duck background media volume to 20%
            await audio_ducker.duck(target_volume_percent=20)

            try:
                audio_bytes = await self.generate_speech_bytes(clean_text)
                if audio_bytes:
                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                        f.write(audio_bytes)
                        temp_path = f.name

                    loop = asyncio.get_running_loop()
                    # Play through Linux/PipeWire audio player
                    cmd = (
                        f'pw-play "{temp_path}" 2>/dev/null || '
                        f'paplay "{temp_path}" 2>/dev/null || '
                        f'mpv --no-video --really-quiet "{temp_path}" 2>/dev/null || '
                        f'ffplay -nodisp -autoexit -loglevel quiet "{temp_path}" 2>/dev/null'
                    )
                    await loop.run_in_executor(None, lambda: subprocess.run(cmd, shell=True, timeout=8))

                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
                else:
                    # Fallback to local synthesizer if offline / no internet
                    loop = asyncio.get_running_loop()
                    cmd = f'spd-say -r -10 "{clean_text}" 2>/dev/null || espeak-ng -v en-us "{clean_text}" 2>/dev/null'
                    await loop.run_in_executor(None, lambda: subprocess.run(cmd, shell=True, timeout=8))

            except Exception as e:
                logger.warning(f"[Voice] Speech synthesis error: {e}")
            finally:
                self.is_speaking = False
                # 2. Restore background media volume
                await audio_ducker.restore()

        return True

    def stop(self):
        self.is_speaking = False
        asyncio.create_task(audio_ducker.restore())

voice_service = VoiceGuidanceService()
