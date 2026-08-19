import asyncio
import logging
import platform
import re
import subprocess
from typing import Dict

logger = logging.getLogger(__name__)

class AudioDucker:
    """
    Handles lowering background media output volume (Bluetooth audio stream / Spotify)
    during incoming/active phone calls and turn-by-turn voice prompts,
    and restoring the EXACT previous volume level when finished.
    Operates purely on local Linux PulseAudio/PipeWire streams without touching the phone's hardware volume.
    """
    def __init__(self):
        self.is_linux = platform.system().lower() == "linux"
        self.is_ducked = False
        self.saved_source_volumes: Dict[str, str] = {}
        self.saved_sink_input_volumes: Dict[int, str] = {}

    async def _run_command(self, cmd: str) -> str:
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            return stdout.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            logger.debug(f"[AudioDucker] Command failed ({cmd}): {e}")
            return ""

    async def _get_source_volume(self, source_name: str) -> str:
        """Reads the current volume string (e.g. '75%') of a PulseAudio source."""
        out = await self._run_command(f"pactl get-source-volume {source_name}")
        match = re.search(r'(\d+)%', out)
        if match:
            return f"{match.group(1)}%"
        return "100%"

    async def _get_sink_input_volume(self, sink_input_id: int) -> str:
        """Reads the current volume string of a PulseAudio sink input."""
        out = await self._run_command(f"pactl get-sink-input-volume {sink_input_id}")
        match = re.search(r'(\d+)%', out)
        if match:
            return f"{match.group(1)}%"
        return "100%"

    async def duck(self, duck_ratio: float = 0.25):
        """
        Ducks background media streams to ~25% of their current volume level,
        preserving the user's base volume for accurate restoration.
        """
        if self.is_ducked:
            return
        self.is_ducked = True

        if not self.is_linux:
            logger.info(f"[AudioDucker Mock] Audio ducked to {int(duck_ratio * 100)}% ratio")
            return

        try:
            # 1. Inspect and duck active BlueZ PulseAudio/PipeWire Sources
            sources_out = await self._run_command("pactl list short sources")
            for line in sources_out.splitlines():
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        source_name = parts[1]
                        if "bluez" in source_name.lower():
                            cur_vol_str = await self._get_source_volume(source_name)
                            cur_vol_int = int(cur_vol_str.replace("%", "")) if cur_vol_str.replace("%", "").isdigit() else 100
                            self.saved_source_volumes[source_name] = cur_vol_str

                            ducked_vol = max(12, int(cur_vol_int * duck_ratio))
                            await self._run_command(f"pactl set-source-volume {source_name} {ducked_vol}%")
                            logger.info(f"[AudioDucker] Ducked source {source_name}: {cur_vol_str} -> {ducked_vol}%")

            # 2. Inspect and duck active Sink-Inputs
            sink_inputs_out = await self._run_command("pactl list short sink-inputs")
            for line in sink_inputs_out.splitlines():
                if line.strip():
                    parts = line.split()
                    if parts and parts[0].isdigit():
                        s_id = int(parts[0])
                        cur_vol_str = await self._get_sink_input_volume(s_id)
                        cur_vol_int = int(cur_vol_str.replace("%", "")) if cur_vol_str.replace("%", "").isdigit() else 100
                        self.saved_sink_input_volumes[s_id] = cur_vol_str

                        ducked_vol = max(12, int(cur_vol_int * duck_ratio))
                        await self._run_command(f"pactl set-sink-input-volume {s_id} {ducked_vol}%")
                        logger.info(f"[AudioDucker] Ducked sink-input {s_id}: {cur_vol_str} -> {ducked_vol}%")

        except Exception as e:
            logger.warning(f"[AudioDucker] Volume duck failed: {e}")

    async def restore(self):
        """
        Restores all media streams back to the EXACT volume they were at prior to ducking.
        """
        if not self.is_ducked:
            return
        self.is_ducked = False

        if not self.is_linux:
            logger.info("[AudioDucker Mock] Audio restored")
            return

        try:
            # 1. Restore BlueZ Sources to their exact previous volume
            for source_name, orig_vol in self.saved_source_volumes.items():
                await self._run_command(f"pactl set-source-volume {source_name} {orig_vol}")
                logger.info(f"[AudioDucker] Restored source {source_name} -> {orig_vol}")
            self.saved_source_volumes.clear()

            # 2. Restore Sink-Inputs to their exact previous volume
            for s_id, orig_vol in self.saved_sink_input_volumes.items():
                await self._run_command(f"pactl set-sink-input-volume {s_id} {orig_vol}")
                logger.info(f"[AudioDucker] Restored sink-input {s_id} -> {orig_vol}")
            self.saved_sink_input_volumes.clear()

        except Exception as e:
            logger.warning(f"[AudioDucker] Volume restore failed: {e}")

audio_ducker = AudioDucker()
