import asyncio
import logging
import io
import os
import re
import tempfile
import time
import subprocess
from typing import Optional, Dict, List
from .audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

# Known UAE Arabic navigation and landmark terms transliterated to clean English phonetics
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
    'الأصايل': 'Al Asayel',
    'الاصايل': 'Al Asayel',
    'المركز المالي': 'Financial Centre',
    'الشيخ زايد': 'Sheikh Zayed',
    'الشيخ محمد بن راشد': 'Sheikh Mohammed bin Rashid',
    'الشيخ خليفة': 'Sheikh Khalifa',
    'الشيخ راشد': 'Sheikh Rashid',
    'الخيل': 'Al Khail',
    'جميرا': 'Jumeirah',
    'الصفا': 'Al Safa',
    'الوصل': 'Al Wasl',
    'السطوة': 'Al Satwa',
    'القوز': 'Al Quoz',
    'البرشاء': 'Al Barsha',
    'النهدة': 'Al Nahda',
    'القصيص': 'Al Qusais',
    'الممزر': 'Al Mamzar',
    'الكرامة': 'Al Karama',
    'ديرة': 'Deira',
    'بر دبي': 'Bur Dubai',
    'حصة': 'Hessa',
    'أم سقيم': 'Umm Suqeim',
    'ام سقيم': 'Umm Suqeim',
    'القدرة': 'Al Qudra',
    'الرباط': 'Al Rebat',
    'مطار': 'Airport',
    'الشارقة': 'Sharjah',
    'عجمان': 'Ajman',
    'رأس الخور': 'Ras Al Khor',
    'راس الخور': 'Ras Al Khor',
    'المرابع العربية': 'Arabian Ranches',
    'المدينة الأكاديمية': 'Academic City',
    'واحة السيليكون': 'Silicon Oasis',
    'الورقاء': 'Al Warqa',
    'مردف': 'Mirdif',
    'ند الحمر': 'Nad Al Hamar',
    'عود ميثاء': 'Oud Metha',
    'زعبيل': 'Za\'abeel',
    'المستقبل': 'Al Mustaqbal',
    'المركاض': 'Al Markadh',
    'الخليج التجاري': 'Business Bay',
    'مرسى دبي': 'Dubai Marina',
    'نخلة جميرا': 'Palm Jumeirah',
    'قرية جميرا': 'JVC',
    'دبي': 'Dubai',
    'أبوظبي': 'Abu Dhabi',
    'ابوظبي': 'Abu Dhabi',
    'العين': 'Al Ain',
}

# Phonetic character mapping for unlisted Arabic words
ARABIC_CHAR_MAP = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ء': "'",
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
    'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't',
    'ظ': 'z', 'ع': "'a", 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h',
    'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'ah', 'ؤ': 'u', 'ئ': 'i',
    'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ّ': '', 'ْ': '', 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in'
}

def transliterate_arabic(text: str) -> str:
    """Replaces Arabic terms and characters with fluent English syllables."""
    if not re.search(r'[\u0600-\u06FF]', text):
        return text

    s = text
    # 1. Replace known multi-word / word terms first
    for ar, en in ARABIC_ROAD_TERMS.items():
        s = s.replace(ar, en)

    # 2. Transliterate any remaining Arabic words character by character
    def replace_word(match):
        word = match.group(0)
        out = []
        for ch in word:
            out.append(ARABIC_CHAR_MAP.get(ch, ch))
        res = "".join(out)
        return res.capitalize() if res else ""

    s = re.sub(r'[\u0600-\u06FF]+', replace_word, s)
    return s

def normalize_road_text(text: str) -> str:
    """
    Normalizes street names, slashes, route codes (e.g. S128, E11),
    distance units, and Arabic text for crystal-clear spoken navigation.
    """
    if not text:
        return ""

    s = text.strip()

    # 1. Handle multi-part slash separated components (e.g. "Al Asayel St / شارع الأصايل / S128")
    if '/' in s:
        raw_parts = [p.strip() for p in s.split('/') if p.strip()]
        processed_parts: List[str] = []
        seen_names = set()

        for p in raw_parts:
            # Check if this part is a route shield code like S128, D71, E11, E311
            is_route_code = bool(re.match(r'^[A-Za-z]\d+$', p))
            has_arabic = bool(re.search(r'[\u0600-\u06FF]', p))

            # Transliterate if Arabic
            clean_part = transliterate_arabic(p) if has_arabic else p

            # Expand route codes (e.g. "S128" -> "S 128")
            clean_part = re.sub(r'\b([A-Za-z])(\d+)\b', r'\1 \2', clean_part)

            # Normalization key for deduplication (avoid saying "Al Asayel Street, Al Asayel Street")
            norm_key = re.sub(r'[^a-zA-Z0-9]', '', clean_part).lower()

            if is_route_code or (norm_key and norm_key not in seen_names):
                if norm_key:
                    seen_names.add(norm_key)
                processed_parts.append(clean_part)

        s = ", ".join(processed_parts) if processed_parts else s.replace('/', ' ')
    else:
        s = transliterate_arabic(s)

    # 2. Expand metric distance units (e.g. "500 m" -> "500 meters", "1.5 km" -> "1.5 kilometers")
    s = re.sub(r'(\d+(?:\.\d+)?)\s*m\b', r'\1 meters', s, flags=re.IGNORECASE)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*km\b', r'\1 kilometers', s, flags=re.IGNORECASE)

    # 3. Expand common road abbreviations
    s = re.sub(r'\bRd\b\.?', 'Road', s)
    s = re.sub(r'\bSt\b\.?', 'Street', s)
    s = re.sub(r'\bAve\b\.?', 'Avenue', s)
    s = re.sub(r'\bBlvd\b\.?', 'Boulevard', s)
    s = re.sub(r'\bDr\b\.?', 'Drive', s)
    s = re.sub(r'\bHwy\b\.?', 'Highway', s)
    s = re.sub(r'\bShk\b\.?', 'Sheikh', s)
    s = re.sub(r'\bSh\b\.?', 'Sheikh', s)

    # 4. Format all route codes (e.g. "S128" -> "S 128", "E11" -> "E 11", "D71" -> "D 71", "E311" -> "E 311")
    s = re.sub(r'\b([A-Za-z])(\d+)\b', r'\1 \2', s)

    # 5. Format Exit numbers (e.g. "Exit 50" -> "Exit 50")
    s = re.sub(r'\bExit\s*(\d+)', r'Exit \1', s, flags=re.IGNORECASE)

    # Clean up double whitespace / commas
    s = re.sub(r'\s*,\s*', ', ', s)
    s = re.sub(r'\s+', ' ', s).strip()

    return s

class VoiceGuidanceService:
    def __init__(self):
        self.is_speaking = False
        self.last_spoken_text: str = ""
        self.last_spoken_time: float = 0.0
        self.voice: str = "en-US-JennyNeural"
        self._audio_cache: Dict[str, bytes] = {}
        self._lock = asyncio.Lock()

    async def generate_speech_bytes(self, text: str) -> Optional[bytes]:
        clean_text = normalize_road_text(text)
        if not clean_text:
            return None

        # Check in-memory audio cache for 0ms latency
        if clean_text in self._audio_cache:
            return self._audio_cache[clean_text]

        try:
            import edge_tts
            communicate = edge_tts.Communicate(clean_text, self.voice, rate="+4%")
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])
            
            data = audio_buffer.getvalue()
            # Cache up to 30 recent phrases
            if len(self._audio_cache) > 30:
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

            # 1. Duck background media volume to 25% of current volume
            await audio_ducker.duck(duck_ratio=0.25)

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
