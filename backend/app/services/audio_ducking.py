import asyncio
import logging
import platform
import re
import subprocess
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class AudioDucker:
    """
    Handles lowering background media output volume (Bluetooth audio stream / Spotify)
    during incoming/active phone calls and turn-by-turn voice prompts,
    and restoring the EXACT previous volume level when finished.
    Combines BlueZ MediaTransport1 relative scaling with PulseAudio/PipeWire stream controls.
    """
    def __init__(self):
        self.is_linux = platform.system().lower() == "linux"
        self.is_ducked = False
        self.saved_bluez_volume: Optional[int] = None
        self.saved_transport_path: Optional[str] = None
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
        out = await self._run_command(f"pactl get-source-volume {source_name}")
        match = re.search(r'(\d+)%', out)
        if match:
            return f"{match.group(1)}%"
        return "100%"

    async def _get_sink_input_volume(self, sink_input_id: int) -> str:
        out = await self._run_command(f"pactl get-sink-input-volume {sink_input_id}")
        match = re.search(r'(\d+)%', out)
        if match:
            return f"{match.group(1)}%"
        return "100%"

    async def _duck_bluez(self, duck_ratio: float = 0.38):
        """Reads current BlueZ volume and ducks to ~38% (background audible, not muted)."""
        if not self.is_linux:
            return
        try:
            from dbus_next.aio import MessageBus
            from dbus_next import BusType, Message, Variant

            bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
            reply = await bus.call(
                Message(
                    destination='org.bluez',
                    path='/',
                    interface='org.freedesktop.DBus.ObjectManager',
                    member='GetManagedObjects'
                )
            )
            objects = reply.body[0] if reply.body else {}
            for path, ifaces in objects.items():
                if 'org.bluez.MediaTransport1' in ifaces:
                    props = ifaces['org.bluez.MediaTransport1']
                    raw_vol = props.get('Volume')
                    cur_vol = int(raw_vol.value if hasattr(raw_vol, 'value') else raw_vol) if raw_vol is not None else 100
                    self.saved_bluez_volume = cur_vol
                    self.saved_transport_path = path

                    # Compute ducked volume: e.g. 85 * 0.38 = 32 (range 30-45 out of 127)
                    duck_vol = max(30, min(127, int(cur_vol * duck_ratio)))
                    await bus.call(
                        Message(
                            destination='org.bluez',
                            path=path,
                            interface='org.freedesktop.DBus.Properties',
                            member='Set',
                            signature='ssv',
                            body=['org.bluez.MediaTransport1', 'Volume', Variant('q', duck_vol)]
                        )
                    )
                    logger.info(f"[AudioDucker] BlueZ MediaTransport volume ducked: {cur_vol}/127 -> {duck_vol}/127")
            bus.disconnect()
        except Exception as e:
            logger.debug(f"[AudioDucker] BlueZ D-Bus duck note: {e}")

    async def _restore_bluez(self):
        """Restores BlueZ volume back to the exact initial volume."""
        if not self.is_linux or self.saved_bluez_volume is None:
            return
        try:
            from dbus_next.aio import MessageBus
            from dbus_next import BusType, Message, Variant

            orig_vol = self.saved_bluez_volume
            path = self.saved_transport_path

            bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
            if path:
                await bus.call(
                    Message(
                        destination='org.bluez',
                        path=path,
                        interface='org.freedesktop.DBus.Properties',
                        member='Set',
                        signature='ssv',
                        body=['org.bluez.MediaTransport1', 'Volume', Variant('q', orig_vol)]
                    )
                )
                logger.info(f"[AudioDucker] BlueZ MediaTransport volume restored: {orig_vol}/127")
            bus.disconnect()
        except Exception as e:
            logger.debug(f"[AudioDucker] BlueZ D-Bus restore note: {e}")
        finally:
            self.saved_bluez_volume = None
            self.saved_transport_path = None

    async def duck(self, duck_ratio: float = 0.35):
        if self.is_ducked:
            return
        self.is_ducked = True

        if not self.is_linux:
            logger.info(f"[AudioDucker Mock] Audio ducked to {int(duck_ratio * 100)}% ratio")
            return

        try:
            # 1. Duck via BlueZ MediaTransport relative to current volume
            await self._duck_bluez(duck_ratio)

            # 2. Duck PulseAudio / PipeWire sources
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

                            ducked_vol = max(18, int(cur_vol_int * duck_ratio))
                            await self._run_command(f"pactl set-source-volume {source_name} {ducked_vol}%")

            # 3. Duck Sink-Inputs
            sink_inputs_out = await self._run_command("pactl list short sink-inputs")
            for line in sink_inputs_out.splitlines():
                if line.strip():
                    parts = line.split()
                    if parts and parts[0].isdigit():
                        s_id = int(parts[0])
                        cur_vol_str = await self._get_sink_input_volume(s_id)
                        cur_vol_int = int(cur_vol_str.replace("%", "")) if cur_vol_str.replace("%", "").isdigit() else 100
                        self.saved_sink_input_volumes[s_id] = cur_vol_str

                        ducked_vol = max(18, int(cur_vol_int * duck_ratio))
                        await self._run_command(f"pactl set-sink-input-volume {s_id} {ducked_vol}%")

        except Exception as e:
            logger.warning(f"[AudioDucker] Volume duck failed: {e}")

    async def restore(self):
        if not self.is_ducked:
            return
        self.is_ducked = False

        if not self.is_linux:
            logger.info("[AudioDucker Mock] Audio restored")
            return

        try:
            # 1. Restore BlueZ MediaTransport
            await self._restore_bluez()

            # 2. Restore PulseAudio Sources
            for source_name, orig_vol in self.saved_source_volumes.items():
                await self._run_command(f"pactl set-source-volume {source_name} {orig_vol}")
            self.saved_source_volumes.clear()

            # 3. Restore Sink-Inputs
            for s_id, orig_vol in self.saved_sink_input_volumes.items():
                await self._run_command(f"pactl set-sink-input-volume {s_id} {orig_vol}")
            self.saved_sink_input_volumes.clear()

        except Exception as e:
            logger.warning(f"[AudioDucker] Volume restore failed: {e}")

audio_ducker = AudioDucker()
