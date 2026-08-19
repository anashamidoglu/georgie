import asyncio
import logging
import platform
import subprocess
from typing import List, Set

logger = logging.getLogger(__name__)

class AudioDucker:
    """
    Handles lowering background media output volume (Bluetooth audio stream / Spotify)
    during incoming/active phone calls and turn-by-turn voice prompts,
    and restoring normal volume when finished.
    Targets PulseAudio/PipeWire sources, source-outputs, sink-inputs, and BlueZ MediaTransport1.
    """
    def __init__(self):
        self.is_linux = platform.system().lower() == "linux"
        self.is_ducked = False
        self.ducked_sources: Set[str] = set()
        self.ducked_sink_inputs: Set[int] = set()
        self.ducked_source_outputs: Set[int] = set()

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

    async def _duck_bluez_dbus(self, volume_val: int = 25):
        """Sets AVRCP volume on active BlueZ MediaTransport1 (0-127)."""
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
                    await bus.call(
                        Message(
                            destination='org.bluez',
                            path=path,
                            interface='org.freedesktop.DBus.Properties',
                            member='Set',
                            signature='ssv',
                            body=['org.bluez.MediaTransport1', 'Volume', Variant('q', volume_val)]
                        )
                    )
                    logger.info(f"[AudioDucker] Set BlueZ MediaTransport1 volume on {path} to {volume_val}/127")
            bus.disconnect()
        except Exception as e:
            logger.debug(f"[AudioDucker] D-Bus MediaTransport1 volume note: {e}")

    async def duck(self, target_volume_percent: int = 15):
        if self.is_ducked:
            return
        self.is_ducked = True

        if not self.is_linux:
            logger.info(f"[AudioDucker Mock] Audio ducked to {target_volume_percent}%")
            return

        try:
            # 1. Duck via BlueZ D-Bus MediaTransport (AVRCP hardware volume)
            asyncio.create_task(self._duck_bluez_dbus(int(127 * (target_volume_percent / 100))))

            # 2. Duck PulseAudio / PipeWire Sources (e.g. bluez_source.XX_XX_XX_XX_XX_XX)
            sources_out = await self._run_command("pactl list short sources")
            for line in sources_out.splitlines():
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        source_id, source_name = parts[0], parts[1]
                        if "bluez" in source_name.lower():
                            self.ducked_sources.add(source_name)
                            await self._run_command(f"pactl set-source-volume {source_name} {target_volume_percent}%")
                            logger.info(f"[AudioDucker] Ducked BlueZ source: {source_name} -> {target_volume_percent}%")

            # 3. Duck PulseAudio / PipeWire Sink-Inputs
            sink_inputs_out = await self._run_command("pactl list short sink-inputs")
            for line in sink_inputs_out.splitlines():
                if line.strip():
                    parts = line.split()
                    if parts and parts[0].isdigit():
                        s_id = int(parts[0])
                        self.ducked_sink_inputs.add(s_id)
                        await self._run_command(f"pactl set-sink-input-volume {s_id} {target_volume_percent}%")

            # 4. Duck PulseAudio / PipeWire Source-Outputs
            source_outputs_out = await self._run_command("pactl list short source-outputs")
            for line in source_outputs_out.splitlines():
                if line.strip():
                    parts = line.split()
                    if parts and parts[0].isdigit():
                        so_id = int(parts[0])
                        self.ducked_source_outputs.add(so_id)
                        await self._run_command(f"pactl set-source-output-volume {so_id} {target_volume_percent}%")

            logger.info(f"[AudioDucker] Fully ducked audio streams to {target_volume_percent}%")
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
            # 1. Restore BlueZ D-Bus MediaTransport
            asyncio.create_task(self._duck_bluez_dbus(127))

            # 2. Restore BlueZ Sources
            for source_name in self.ducked_sources:
                await self._run_command(f"pactl set-source-volume {source_name} 100%")
            self.ducked_sources.clear()

            # Also ensure all bluez sources are restored
            sources_out = await self._run_command("pactl list short sources")
            for line in sources_out.splitlines():
                if "bluez" in line.lower():
                    parts = line.split()
                    if len(parts) >= 2:
                        await self._run_command(f"pactl set-source-volume {parts[1]} 100%")

            # 3. Restore Sink-Inputs
            for s_id in self.ducked_sink_inputs:
                await self._run_command(f"pactl set-sink-input-volume {s_id} 100%")
            self.ducked_sink_inputs.clear()

            # 4. Restore Source-Outputs
            for so_id in self.ducked_source_outputs:
                await self._run_command(f"pactl set-source-output-volume {so_id} 100%")
            self.ducked_source_outputs.clear()

            logger.info("[AudioDucker] Fully restored all audio streams to 100%")
        except Exception as e:
            logger.warning(f"[AudioDucker] Volume restore failed: {e}")

audio_ducker = AudioDucker()
