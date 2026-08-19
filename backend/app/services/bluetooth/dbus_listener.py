import asyncio
import logging
import subprocess
from typing import Optional, Dict, Any
from ...routers.ws import ws_manager
from ...models.schemas import TrackMetadata, CallState
from ..artwork_service import ArtworkService
from ..audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

# BlueZ Agent D-Bus Interface for 1-Tap Auto-Pairing & Passkey Confirmation
try:
    from dbus_next.service import ServiceInterface, method

    class BlueZPairingAgent(ServiceInterface):
        def __init__(self):
            super().__init__('org.bluez.Agent1')

        @method()
        def Release(self):
            pass

        @method()
        def RequestPinCode(self, device: 'o') -> 's':
            logger.info(f"[BlueZ Agent] RequestPinCode for {device} -> 0000")
            return "0000"

        @method()
        def DisplayPinCode(self, device: 'o', pincode: 's'):
            logger.info(f"[BlueZ Agent] DisplayPinCode: {pincode}")

        @method()
        def RequestPasskey(self, device: 'o') -> 'u':
            logger.info(f"[BlueZ Agent] RequestPasskey -> 0")
            return 0

        @method()
        def DisplayPasskey(self, device: 'o', passkey: 'u', entered: 'q'):
            logger.info(f"[BlueZ Agent] DisplayPasskey: {passkey}")

        @method()
        def RequestConfirmation(self, device: 'o', passkey: 'u'):
            logger.info(f"[BlueZ Agent] Auto-confirming pairing passkey {passkey} for {device}")
            # Returning nothing indicates auto-accept/confirmation in BlueZ spec
            return

        @method()
        def RequestAuthorization(self, device: 'o'):
            logger.info(f"[BlueZ Agent] Auto-authorizing pairing for {device}")
            return

        @method()
        def AuthorizeService(self, device: 'o', uuid: 's'):
            logger.info(f"[BlueZ Agent] Auto-authorizing service {uuid} for {device}")
            return

        @method()
        def Cancel(self):
            logger.info("[BlueZ Agent] Pairing cancelled")
except ImportError:
    BlueZPairingAgent = None


class DBusBluetoothListener:
    """
    Connects to system D-Bus on Linux to listen to:
    1. oFono (org.ofono) - Hands-Free Telephony (HFP) for incoming/active/ended phone calls.
    2. BlueZ (org.bluez) - AVRCP Media Player track metadata & playback state.
    3. BlueZ Agent1 - Auto-confirms Bluetooth pairing PINs from phones with 1-tap.
    """
    def __init__(self):
        self.running = False
        self.bus = None
        self.active_call_path: Optional[str] = None
        self.active_call_state = CallState(state="idle")
        self.current_track = TrackMetadata(
            title="Unknown Track",
            artist="Unknown Artist",
            album="",
            duration=0,
            position=0,
            status="stopped",
            artwork_url=None
        )

    async def start(self):
        """
        Starts the D-Bus connection loop using dbus-next.
        """
        self.running = True
        try:
            from dbus_next.aio import MessageBus
            from dbus_next import BusType

            self.bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
            logger.info("[DBusListener] Connected to Linux System D-Bus via dbus-next")

            # Register Bluetooth pairing agent and set broadcast name to "Georgie Dash"
            await self._setup_bluetooth_agent_and_alias()

            # Auto-enable any connected oFono modems
            await self._auto_enable_modems()
            # Subscribe to oFono Manager & VoiceCallManager signals
            await self._subscribe_ofono()
            # Subscribe to BlueZ Media Player signals
            await self._subscribe_bluez()

        except ImportError:
            logger.warning("[DBusListener] dbus-next not installed. D-Bus listener disabled.")
        except Exception as e:
            logger.error(f"[DBusListener] Error initializing D-Bus listener: {e}")

    async def _setup_bluetooth_agent_and_alias(self):
        """
        Sets the Bluetooth broadcast name to 'Georgie Dash' and registers the auto-pairing agent.
        """
        try:
            from dbus_next import Message, Variant

            # Set adapter name / alias to "Georgie Dash"
            await self.bus.call(
                Message(
                    destination='org.bluez',
                    path='/org/bluez/hci0',
                    interface='org.freedesktop.DBus.Properties',
                    member='Set',
                    signature='ssv',
                    body=['org.bluez.Adapter1', 'Alias', Variant('s', 'Georgie Dash')]
                )
            )
            logger.info("[BlueZ] Set Bluetooth device name to 'Georgie Dash'")

            # Export and register auto-pairing agent
            if BlueZPairingAgent:
                agent = BlueZPairingAgent()
                self.bus.export('/org/bluez/georgie/agent', agent)

                # Register with AgentManager1
                try:
                    await self.bus.call(
                        Message(
                            destination='org.bluez',
                            path='/org/bluez',
                            interface='org.bluez.AgentManager1',
                            member='RegisterAgent',
                            signature='os',
                            body=['/org/bluez/georgie/agent', 'NoInputNoOutput']
                        )
                    )
                    await self.bus.call(
                        Message(
                            destination='org.bluez',
                            path='/org/bluez',
                            interface='org.bluez.AgentManager1',
                            member='RequestDefaultAgent',
                            signature='o',
                            body=['/org/bluez/georgie/agent']
                        )
                    )
                    logger.info("[BlueZ] Successfully registered Georgie auto-pairing agent")
                except Exception as ex:
                    logger.info(f"[BlueZ] Agent registration note: {ex}")
        except Exception as e:
            logger.warning(f"[BlueZ] Agent setup notice: {e}")

    async def _auto_enable_modems(self):
        """
        Queries org.ofono.Manager for all modems and powers them on + sets them online.
        """
        try:
            from dbus_next import Message, Variant

            reply = await self.bus.call(
                Message(
                    destination='org.ofono',
                    path='/',
                    interface='org.ofono.Manager',
                    member='GetModems'
                )
            )
            modems = reply.body[0] if reply.body else []
            for path, props in modems:
                logger.info(f"[oFono] Found modem: {path}, powering on & setting online...")
                await self._activate_modem(path)
        except Exception as e:
            logger.warning(f"[DBusListener] Auto-enable modems check: {e}")

    async def _activate_modem(self, path: str):
        """
        Sets Powered=True and Online=True on a specific oFono modem.
        """
        try:
            from dbus_next import Message, Variant
            # Powered = True
            await self.bus.call(
                Message(
                    destination='org.ofono',
                    path=path,
                    interface='org.ofono.Modem',
                    member='SetProperty',
                    signature='sv',
                    body=['Powered', Variant('b', True)]
                )
            )
            # Online = True
            await self.bus.call(
                Message(
                    destination='org.ofono',
                    path=path,
                    interface='org.ofono.Modem',
                    member='SetProperty',
                    signature='sv',
                    body=['Online', Variant('b', True)]
                )
            )
            logger.info(f"[oFono] Successfully activated modem: {path}")
        except Exception as e:
            logger.warning(f"[oFono] Failed activating modem {path}: {e}")

    async def _subscribe_ofono(self):
        """
        Subscribes to oFono signals:
        - Manager.ModemAdded (auto activates new Bluetooth phones)
        - VoiceCallManager.CallAdded (incoming calls)
        - VoiceCallManager.CallRemoved (ended calls)
        - VoiceCall.PropertyChanged (state transitions)
        """
        try:
            from dbus_next import Message, MessageType

            def message_handler(msg: Message):
                if msg.message_type != MessageType.SIGNAL:
                    return

                # oFono Manager.ModemAdded
                if msg.member == 'ModemAdded' and msg.interface == 'org.ofono.Manager':
                    modem_path, _ = msg.body
                    logger.info(f"[oFono] New modem connected: {modem_path}, activating...")
                    asyncio.create_task(self._activate_modem(modem_path))

                # VoiceCallManager.CallAdded
                elif msg.member == 'CallAdded' and msg.interface == 'org.ofono.VoiceCallManager':
                    call_path, properties = msg.body
                    self.active_call_path = call_path
                    caller_number = properties.get('LineIdentification', {}).value if hasattr(properties.get('LineIdentification'), 'value') else properties.get('LineIdentification', 'Unknown')
                    caller_name = properties.get('Name', {}).value if hasattr(properties.get('Name'), 'value') else properties.get('Name', caller_number)
                    state = properties.get('State', {}).value if hasattr(properties.get('State'), 'value') else properties.get('State', 'incoming')

                    logger.info(f"[oFono] CallAdded: {caller_name} ({caller_number}) - State: {state}")
                    self.active_call_state = CallState(
                        state="incoming" if state in ["incoming", "waiting"] else "active",
                        caller_name=caller_name or "Incoming Call",
                        caller_id=caller_number or "+971 50 000 0000",
                        duration=0
                    )
                    asyncio.create_task(audio_ducker.duck(target_volume_percent=15))
                    asyncio.create_task(ws_manager.broadcast("call:incoming", self.active_call_state.model_dump()))

                # VoiceCallManager.CallRemoved
                elif msg.member == 'CallRemoved' and msg.interface == 'org.ofono.VoiceCallManager':
                    logger.info(f"[oFono] CallRemoved: {self.active_call_path}")
                    self.active_call_path = None
                    self.active_call_state = CallState(state="idle")
                    asyncio.create_task(audio_ducker.restore())
                    asyncio.create_task(ws_manager.broadcast("call:ended", self.active_call_state.model_dump()))

                # VoiceCall.PropertyChanged
                elif msg.member == 'PropertyChanged' and msg.interface == 'org.ofono.VoiceCall':
                    name, val = msg.body
                    prop_val = val.value if hasattr(val, 'value') else val
                    if name == 'State':
                        logger.info(f"[oFono] Call State Changed: {prop_val}")
                        if prop_val == 'active':
                            self.active_call_state.state = 'active'
                            asyncio.create_task(ws_manager.broadcast("call:state", self.active_call_state.model_dump()))
                        elif prop_val in ['disconnected', 'idle']:
                            self.active_call_state.state = 'idle'
                            self.active_call_path = None
                            asyncio.create_task(audio_ducker.restore())
                            asyncio.create_task(ws_manager.broadcast("call:ended", self.active_call_state.model_dump()))

            if self.bus and hasattr(self.bus, 'add_message_handler'):
                self.bus.add_message_handler(message_handler)

                # Add match rule for org.ofono
                await self.bus.call(
                    Message(
                        destination='org.freedesktop.DBus',
                        path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus',
                        member='AddMatch',
                        signature='s',
                        body=["type='signal',sender='org.ofono'"]
                    )
                )
        except Exception as e:
            logger.warning(f"[DBusListener] Failed to set up oFono signal match: {e}")

    async def _subscribe_bluez(self):
        """
        Subscribes to BlueZ MediaPlayer1 properties changed signals.
        """
        try:
            from dbus_next import Message, MessageType

            def media_handler(msg: Message):
                if msg.message_type != MessageType.SIGNAL:
                    return

                if msg.member == 'PropertiesChanged' and msg.interface == 'org.freedesktop.DBus.Properties':
                    iface, changed, _ = msg.body
                    if iface == 'org.bluez.MediaPlayer1':
                        self.active_player_path = msg.path
                        track = changed.get('Track', {})
                        track_val = track.value if hasattr(track, 'value') else track
                        if track_val:
                            title = str(track_val.get('Title', 'Unknown Track'))
                            artist = str(track_val.get('Artist', 'Unknown Artist'))
                            album = str(track_val.get('Album', ''))
                            duration = int(track_val.get('Duration', 0)) // 1000

                            asyncio.create_task(self._on_track_changed(title, artist, album, duration))

                        if 'Status' in changed:
                            status_val = changed['Status'].value if hasattr(changed['Status'], 'value') else changed['Status']
                            self.current_track.status = status_val
                            asyncio.create_task(ws_manager.broadcast("media:playback_state", self.current_track.model_dump()))

            if self.bus and hasattr(self.bus, 'add_message_handler'):
                self.bus.add_message_handler(media_handler)
                await self.bus.call(
                    Message(
                        destination='org.freedesktop.DBus',
                        path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus',
                        member='AddMatch',
                        signature='s',
                        body=["type='signal',sender='org.bluez'"]
                    )
                )
        except Exception as e:
            logger.warning(f"[DBusListener] Failed to set up BlueZ media signal match: {e}")

    async def _on_track_changed(self, title: str, artist: str, album: str, duration: int):
        art_url = await ArtworkService.resolve_artwork(artist, title)
        self.current_track = TrackMetadata(
            title=title,
            artist=artist,
            album=album,
            duration=duration,
            position=0,
            status="playing",
            artwork_url=art_url
        )
        await ws_manager.broadcast("media:track_changed", self.current_track.model_dump())

    async def media_play(self):
        if not self.bus:
            return
        player_path = self.active_player_path or await self._find_player_path()
        if player_path:
            try:
                from dbus_next import Message
                await self.bus.call(Message(
                    destination='org.bluez',
                    path=player_path,
                    interface='org.bluez.MediaPlayer1',
                    member='Play'
                ))
            except Exception as e:
                logger.error(f"[DBusListener] Error playing media: {e}")

    async def media_pause(self):
        if not self.bus:
            return
        player_path = self.active_player_path or await self._find_player_path()
        if player_path:
            try:
                from dbus_next import Message
                await self.bus.call(Message(
                    destination='org.bluez',
                    path=player_path,
                    interface='org.bluez.MediaPlayer1',
                    member='Pause'
                ))
            except Exception as e:
                logger.error(f"[DBusListener] Error pausing media: {e}")

    async def media_next(self):
        if not self.bus:
            return
        player_path = self.active_player_path or await self._find_player_path()
        if player_path:
            try:
                from dbus_next import Message
                await self.bus.call(Message(
                    destination='org.bluez',
                    path=player_path,
                    interface='org.bluez.MediaPlayer1',
                    member='Next'
                ))
            except Exception as e:
                logger.error(f"[DBusListener] Error skipping next track: {e}")

    async def media_previous(self):
        if not self.bus:
            return
        player_path = self.active_player_path or await self._find_player_path()
        if player_path:
            try:
                from dbus_next import Message
                await self.bus.call(Message(
                    destination='org.bluez',
                    path=player_path,
                    interface='org.bluez.MediaPlayer1',
                    member='Previous'
                ))
            except Exception as e:
                logger.error(f"[DBusListener] Error skipping previous track: {e}")

    async def _find_player_path(self) -> Optional[str]:
        try:
            from dbus_next import Message
            reply = await self.bus.call(Message(
                destination='org.bluez',
                path='/',
                interface='org.freedesktop.DBus.ObjectManager',
                member='GetManagedObjects'
            ))
            objects = reply.body[0] if reply.body else {}
            for path, interfaces in objects.items():
                if 'org.bluez.MediaPlayer1' in interfaces:
                    self.active_player_path = path
                    return path
        except Exception:
            pass
        return None

    async def answer_call(self):
        """
        Calls oFono org.ofono.VoiceCall.Answer() on active call object path.
        """
        if not self.active_call_path or not self.bus:
            logger.warning("[DBusListener] No active call path to answer")
            return

        try:
            from dbus_next import Message
            await self.bus.call(
                Message(
                    destination='org.ofono',
                    path=self.active_call_path,
                    interface='org.ofono.VoiceCall',
                    member='Answer'
                )
            )
            self.active_call_state.state = 'active'
            await ws_manager.broadcast("call:state", self.active_call_state.model_dump())
        except Exception as e:
            logger.error(f"[DBusListener] Error answering call: {e}")

    async def hangup_call(self):
        """
        Calls oFono org.ofono.VoiceCall.Hangup() on active call object path.
        """
        if not self.active_call_path or not self.bus:
            self.active_call_state = CallState(state="idle")
            await ws_manager.broadcast("call:ended", self.active_call_state.model_dump())
            return

        try:
            from dbus_next import Message
            await self.bus.call(
                Message(
                    destination='org.ofono',
                    path=self.active_call_path,
                    interface='org.ofono.VoiceCall',
                    member='Hangup'
                )
            )
            self.active_call_state.state = 'idle'
            self.active_call_path = None
            await audio_ducker.restore()
            await ws_manager.broadcast("call:ended", self.active_call_state.model_dump())
        except Exception as e:
            logger.error(f"[DBusListener] Error hanging up call: {e}")

    async def reject_call(self):
        await self.hangup_call()

    async def stop(self):
        self.running = False
        if self.bus and hasattr(self.bus, 'disconnect'):
            self.bus.disconnect()

dbus_listener = DBusBluetoothListener()
