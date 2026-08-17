import asyncio
import os
import platform

class AudioDucker:
    """
    Handles lowering background media output volume during incoming/active phone calls,
    and restoring normal volume when the call ends.
    Uses PipeWire / PulseAudio via pactl/pw-cli on Linux, or logs in mock mode.
    """
    def __init__(self):
        self.is_linux = platform.system().lower() == "linux"
        self.is_ducked = False

    async def duck(self, target_volume_percent: int = 15):
        if self.is_ducked:
            return
        self.is_ducked = True
        
        if self.is_linux:
            try:
                # Find media sink inputs and lower their volume
                proc = await asyncio.create_subprocess_shell(
                    f"pactl set-sink-volume @DEFAULT_SINK@ {target_volume_percent}%",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await proc.communicate()
            except Exception as e:
                print(f"[AudioDucker] Linux volume duck failed: {e}")
        else:
            print(f"[AudioDucker Mock] Audio ducked to {target_volume_percent}% for active call")

    async def restore(self):
        if not self.is_ducked:
            return
        self.is_ducked = False
        
        if self.is_linux:
            try:
                proc = await asyncio.create_subprocess_shell(
                    "pactl set-sink-volume @DEFAULT_SINK@ 100%",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await proc.communicate()
            except Exception as e:
                print(f"[AudioDucker] Linux volume restore failed: {e}")
        else:
            print("[AudioDucker Mock] Audio restored to 100%")

audio_ducker = AudioDucker()
