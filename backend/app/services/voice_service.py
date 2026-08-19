import asyncio
import logging
import platform
import subprocess
import time
import shutil
from typing import Optional
from .audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

class VoiceGuidanceService:
    def __init__(self):
        self.is_speaking = False
        self.last_spoken_text: str = ""
        self.last_spoken_time: float = 0.0
        self.current_process: Optional[subprocess.Popen] = None
        self._lock = asyncio.Lock()

    def _get_tts_engine(self) -> str:
        """
        Determines the available TTS backend engine.
        Priority:
        1. Piper (Neural offline voice)
        2. espeak-ng / espeak (Linux fallback)
        3. spd-say (speech-dispatcher)
        4. pyttsx3 (cross-platform fallback)
        """
        if shutil.which("piper"):
            return "piper"
        elif shutil.which("espeak-ng") or shutil.which("espeak"):
            return "espeak"
        elif shutil.which("spd-say"):
            return "spd-say"
        return "pyttsx3"

    async def speak(self, text: str, priority: str = "normal") -> bool:
        """
        Speaks a navigation prompt with automatic audio ducking.
        """
        if not text or not text.strip():
            return False

        clean_text = text.strip()
        now = time.time()

        # Deduplication: Ignore identical prompt spoken within the last 25 seconds unless high priority
        if priority != "high" and clean_text.lower() == self.last_spoken_text.lower():
            if now - self.last_spoken_time < 25.0:
                logger.debug(f"[Voice] Skipping duplicate announcement: '{clean_text}'")
                return False

        async with self._lock:
            self.last_spoken_text = clean_text
            self.last_spoken_time = now
            self.is_speaking = True

            logger.info(f"[Voice] Speaking: '{clean_text}'")

            # 1. Duck background media volume to 20%
            await audio_ducker.duck(target_volume_percent=20)

            try:
                engine = self._get_tts_engine()
                loop = asyncio.get_running_loop()

                if engine == "piper":
                    # Neural Offline Voice on Pi
                    cmd = f'echo "{clean_text}" | piper --model en_US-lessac-medium.onnx --output-raw | aplay -r 22050 -f S16_LE -t raw -q'
                    await loop.run_in_executor(None, lambda: subprocess.run(cmd, shell=True, timeout=8))

                elif engine == "espeak":
                    # Linux Fast Fallback
                    cmd = f'espeak-ng -v en-us -s 160 "{clean_text}" 2>/dev/null || espeak -v en -s 160 "{clean_text}"'
                    await loop.run_in_executor(None, lambda: subprocess.run(cmd, shell=True, timeout=8))

                elif engine == "spd-say":
                    cmd = f'spd-say -r -10 -p 5 "{clean_text}" -w'
                    await loop.run_in_executor(None, lambda: subprocess.run(cmd, shell=True, timeout=8))

                else:
                    # Windows / Python Fallback
                    def run_pyttsx3():
                        try:
                            import pyttsx3
                            tts = pyttsx3.init()
                            tts.setProperty('rate', 170)
                            tts.say(clean_text)
                            tts.runAndWait()
                        except Exception as ex:
                            logger.debug(f"[Voice] pyttsx3 fallback note: {ex}")

                    await loop.run_in_executor(None, run_pyttsx3)

            except Exception as e:
                logger.warning(f"[Voice] Speech synthesis error: {e}")
            finally:
                self.is_speaking = False
                # 2. Smoothly restore media volume
                await audio_ducker.restore()

        return True

    def stop(self):
        """
        Interrupts any ongoing speech immediately.
        """
        if self.current_process and self.current_process.poll() is None:
            try:
                self.current_process.terminate()
            except Exception:
                pass
        self.is_speaking = False
        asyncio.create_task(audio_ducker.restore())

voice_service = VoiceGuidanceService()
