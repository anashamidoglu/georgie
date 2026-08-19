import asyncio
import logging
import io
import os
import re
import tempfile
import time
import subprocess
from typing import Optional
from .audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

def normalize_road_text(text: str) -> str:
    """
    Normalizes street names, distance abbreviations, and highway codes
    for human-like phonetic pronunciation.
    """
    if not text:
        return ""

    s = text.strip()

    # 1. Expand metric distance units (e.g. "500 m" -> "500 meters", "1.5 km" -> "1.5 kilometers")
    s = re.sub(r'(\d+(?:\.\d+)?)\s*m\b', r'\1 meters', s, flags=re.IGNORECASE)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*km\b', r'\1 kilometers', s, flags=re.IGNORECASE)

    # 2. Expand common road abbreviations
    s = re.sub(r'\bRd\b\.?', 'Road', s)
    s = re.sub(r'\bSt\b\.?', 'Street', s)
    s = re.sub(r'\bAve\b\.?', 'Avenue', s)
    s = re.sub(r'\bBlvd\b\.?', 'Boulevard', s)
    s = re.sub(r'\bDr\b\.?', 'Drive', s)
    s = re.sub(r'\bHwy\b\.?', 'Highway', s)
    s = re.sub(r'\bShk\b\.?', 'Sheikh', s)
    s = re.sub(r'\bSh\b\.?', 'Sheikh', s)

    # 3. Format highway route codes (e.g. "E11" -> "E 11", "D71" -> "D 71", "E311" -> "E 311")
    s = re.sub(r'\b([ED])(\d+)\b', r'\1 \2', s)

    # 4. Format Exit numbers
    s = re.sub(r'\bExit\s*(\d+)', r'Exit \1', s, flags=re.IGNORECASE)

    return s

class VoiceGuidanceService:
    def __init__(self):
        self.is_speaking = False
        self.last_spoken_text: str = ""
        self.last_spoken_time: float = 0.0
        self.voice: str = "en-US-JennyNeural"
        self._lock = asyncio.Lock()

    async def generate_speech_bytes(self, text: str) -> Optional[bytes]:
        clean_text = normalize_road_text(text)
        if not clean_text:
            return None

        try:
            import edge_tts
            communicate = edge_tts.Communicate(clean_text, self.voice, rate="+4%")
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])
            return audio_buffer.getvalue()
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
