import asyncio
import logging
import platform
import subprocess
from typing import List

logger = logging.getLogger(__name__)

class AudioDucker:
    """
    Handles lowering background media output volume (Bluetooth audio stream / Spotify)
    during incoming/active phone calls and turn-by-turn voice prompts,
    and restoring normal volume when finished.
    Ducks individual sink-inputs so TTS speech audio stays crisp at 100% volume.
    """
    def __init__(self):
        self.is_linux = platform.system().lower() == "linux"
        self.is_ducked = False
        self.ducked_sink_inputs: List[int] = []

    async def _get_active_sink_inputs(self) -> List[int]:
        """Gets all active PulseAudio/PipeWire sink input IDs."""
        if not self.is_linux:
            return []
        try:
            proc = await asyncio.create_subprocess_shell(
                "pactl list short sink-inputs",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode("utf-8", errors="ignore")
            sink_inputs = []
            for line in output.strip().split("\n"):
                if line.strip():
                    parts = line.split()
                    if parts and parts[0].isdigit():
                        sink_inputs.append(int(parts[0]))
            return sink_inputs
        except Exception as e:
            logger.debug(f"[AudioDucker] Failed listing sink inputs: {e}")
            return []

    async def duck(self, target_volume_percent: int = 15):
        if self.is_ducked:
            return
        self.is_ducked = True

        if not self.is_linux:
            logger.info(f"[AudioDucker Mock] Audio ducked to {target_volume_percent}%")
            return

        try:
            # Lower all currently active media audio streams (e.g. Bluetooth A2DP stream)
            sink_inputs = await self._get_active_sink_inputs()
            self.ducked_sink_inputs = sink_inputs
            for sink_id in sink_inputs:
                subprocess.Popen(
                    f"pactl set-sink-input-volume {sink_id} {target_volume_percent}%",
                    shell=True
                )
            logger.info(f"[AudioDucker] Ducked {len(sink_inputs)} active sink-inputs to {target_volume_percent}%")
        except Exception as e:
            logger.warning(f"[AudioDucker] Volume duck failed: {e}")

    async def restore(self):
        if not self.is_ducked:
            return
        self.is_ducked = False

        if not self.is_linux:
            logger.info("[AudioDucker Mock] Audio restored to 100%")
            return

        try:
            # Restore all ducked streams to 100% volume
            for sink_id in self.ducked_sink_inputs:
                subprocess.Popen(
                    f"pactl set-sink-input-volume {sink_id} 100%",
                    shell=True
                )
            self.ducked_sink_inputs.clear()

            # Ensure all active inputs are at full volume
            current_inputs = await self._get_active_sink_inputs()
            for sink_id in current_inputs:
                subprocess.Popen(
                    f"pactl set-sink-input-volume {sink_id} 100%",
                    shell=True
                )
            logger.info("[AudioDucker] Restored all sink-inputs to 100%")
        except Exception as e:
            logger.warning(f"[AudioDucker] Volume restore failed: {e}")

audio_ducker = AudioDucker()
