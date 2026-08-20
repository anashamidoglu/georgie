import asyncio
import logging
from typing import Optional, Dict, Any
from ...routers.ws import ws_manager
from ...models.schemas import TrackMetadata, CallState
from ..artwork_service import ArtworkService
from ..audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

def unwrap_variant(val: Any) -> Any:
    """
    Recursively unwraps dbus-next Variant objects into raw Python primitives.
    """
    if hasattr(val, 'value'):
        return unwrap_variant(val.value)
    if isinstance(val, dict):
        return {str(k): unwrap_variant(v) for k, v in val.items()}
    if isinstance(val, list):
        return [unwrap_variant(v) for v in val]
    return val

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
        self.active_player_path: Optional[str] = None
        self.current_track = TrackMetadata(
            title="No Track Playing",
            artist="Connect Bluetooth to Stream",
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

            # Subscribe to all system D-Bus signals for BlueZ and oFono
            await self._subscribe_signals()

            # Poll once on boot in case music was already playing before backend started
            await self._poll_current_media_state()

        except ImportError:
            logger.warning("[DBusListener] dbus-next not installed. D-Bus listener disabled.")
        except Exception as e:
            logger.error(f"[DBusListener] Error initializing D-Bus listener: {e}")

    async def _setup_bluetooth_agent_and_alias(self):
        """
        Sets the Bluetooth broadcast name to 'Georgie' and registers the auto-pairing agent.
        """
        try:
            from dbus_next import Message, Variant

            # Set adapter alias to "Georgie"
            await self.bus.call(
                Message(
                    destination='org.bluez',
                    path='/org/bluez/hci0',
                    interface='org.freedesktop.DBus.Properties',
                    member='Set',
                    signature='ssv',
                    body=['org.bluez.Adapter1', 'Alias', Variant('s', 'Georgie')]
                )
            )
            logger.info("[BlueZ] Set Bluetooth broadcast name to 'Georgie'")

            # Export and register auto-pairing agent
            if BlueZPairingAgent:
                agent = BlueZPairingAgent()
                self.bus.export('/org/bluez/georgie/agent', agent)

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

    async def _subscribe_signals(self):
        """
        Subscribes to pure D-Bus signals for instant, low-latency event-driven updates.
        """
        try:
            from dbus_next import Message, MessageType

            def signal_dispatcher(msg: Message):
                if msg.message_type != MessageType.SIGNAL:
                    return

                # 1. PropertiesChanged on org.bluez.MediaPlayer1
                if msg.member == 'PropertiesChanged' and msg.interface == 'org.freedesktop.DBus.Properties':
                    iface, changed_raw, _ = msg.body
                    changed = unwrap_variant(changed_raw)
                    if iface == 'org.bluez.Device1':
                        connected_val = changed.get('Connected')
                        if connected_val is not None:
                            logger.info(f"[BlueZ Device] {msg.path} Connected: {connected_val}")
                            async def handle_device_conn_change(is_conn: bool):
                                if is_conn:
                                    try:
                                        from dbus_next import Message, Variant
                                        await self.bus.call(
                                            Message(
                                                destination='org.bluez',
                                                path=msg.path,
                                                interface='org.freedesktop.DBus.Properties',
                                                member='Set',
                                                signature='ssv',
                                                body=['org.bluez.Device1', 'Trusted', Variant('b', True)]
                                            )
                                        )
                                        logger.info(f"[BlueZ] Set {msg.path} to Trusted=True for persistent link")
                                    except Exception as ex:
                                        logger.debug(f"[BlueZ] Note setting Trusted=True: {ex}")

                                    await asyncio.sleep(1.0)
                                    await self._poll_current_media_state()
                                else:
                                    self.active_player_path = None
                                    self.current_track = TrackMetadata(
                                        title="No Track Playing",
                                        artist="Connect Bluetooth to Stream",
                                        album="",
                                        duration=0,
                                        position=0,
                                        status="stopped",
                                        artwork_url=None
                                    )
                                    await ws_manager.broadcast("media:playback_state", self.current_track.model_dump())
                                    await ws_manager.broadcast("media:track_changed", self.current_track.model_dump())
                                
                                try:
                                    from ...routers.bluetooth import get_bluetooth_status
                                    status = await get_bluetooth_status()
                                    await ws_manager.broadcast("bluetooth:status_changed", status.model_dump())
                                except Exception:
                                    pass
                            asyncio.create_task(handle_device_conn_change(bool(connected_val)))

                    elif iface == 'org.bluez.MediaPlayer1':
                        self.active_player_path = msg.path
                        track_val = changed.get('Track', {})
                        pos_ms = changed.get('Position')
                        status_val = changed.get('Status')

                        has_update = False
                        if pos_ms is not None:
                            self.current_track.position = int(pos_ms) // 1000
                            has_update = True

                        if status_val is not None:
                            self.current_track.status = str(status_val)
                            has_update = True

                        if track_val and isinstance(track_val, dict):
                            raw_title = track_val.get('Title')
                            if raw_title and str(raw_title).strip() and str(raw_title) != 'Unknown Track':
                                title = str(raw_title)
                                artist = str(track_val.get('Artist', 'Unknown Artist'))
                                album = str(track_val.get('Album', ''))
                                duration = int(track_val.get('Duration', 0)) // 1000
                                position = self.current_track.position
                                # If Status was explicitly provided, use it; otherwise default to playing on track change
                                current_status = str(status_val) if status_val is not None else 'playing'
                                self.current_track.status = current_status
                                asyncio.create_task(self._on_track_changed(title, artist, album, duration, position, current_status))
                        elif has_update:
                            asyncio.create_task(ws_manager.broadcast("media:playback_state", self.current_track.model_dump()))

                # 2. InterfacesAdded (e.g. MediaPlayer1 attached when song starts)
                elif msg.member == 'InterfacesAdded' and msg.interface == 'org.freedesktop.DBus.ObjectManager':
                    obj_path, interfaces_raw = msg.body
                    interfaces = unwrap_variant(interfaces_raw)
                    if 'org.bluez.MediaPlayer1' in interfaces:
                        self.active_player_path = obj_path
                        props = interfaces['org.bluez.MediaPlayer1']
                        track_val = props.get('Track', {})
                        status_val = str(props.get('Status', 'playing'))
                        pos_ms = props.get('Position', 0)
                        position = int(pos_ms) // 1000
                        if track_val and isinstance(track_val, dict):
                            raw_title = track_val.get('Title')
                            if raw_title and str(raw_title).strip() and str(raw_title) != 'Unknown Track':
                                title = str(raw_title)
                                artist = str(track_val.get('Artist', 'Unknown Artist'))
                                album = str(track_val.get('Album', ''))
                                duration = int(track_val.get('Duration', 0)) // 1000
                                asyncio.create_task(self._on_track_changed(title, artist, album, duration, position, status_val))

                # 3. InterfacesRemoved (e.g. music app closed on phone)
                elif msg.member == 'InterfacesRemoved' and msg.interface == 'org.freedesktop.DBus.ObjectManager':
                    obj_path, interfaces_raw = msg.body
                    interfaces = unwrap_variant(interfaces_raw)
                    if 'org.bluez.MediaPlayer1' in interfaces or obj_path == self.active_player_path:
                        logger.info(f"[BlueZ] Media player closed: {obj_path}")
                        self.active_player_path = None
                        self.current_track = TrackMetadata(
                            title="No Track Playing",
                            artist="Connect Bluetooth to Stream",
                            album="",
                            duration=0,
                            position=0,
                            status="stopped",
                            artwork_url=None
                        )
                        asyncio.create_task(ws_manager.broadcast("media:playback_state", self.current_track.model_dump()))
                        asyncio.create_task(ws_manager.broadcast("media:track_changed", self.current_track.model_dump()))

                # 4. oFono Manager.ModemAdded
                elif msg.member == 'ModemAdded' and msg.interface == 'org.ofono.Manager':
                    modem_path, _ = msg.body
                    logger.info(f"[oFono] New modem connected: {modem_path}, activating...")
                    asyncio.create_task(self._activate_modem(modem_path))

                # 5. oFono VoiceCallManager.CallAdded (Incoming Call)
                elif msg.member == 'CallAdded' and msg.interface == 'org.ofono.VoiceCallManager':
                    call_path, properties_raw = msg.body
                    properties = unwrap_variant(properties_raw)
                    self.active_call_path = call_path
                    caller_number = str(properties.get('LineIdentification', 'Unknown'))
                    caller_name = str(properties.get('Name', caller_number))
                    state = str(properties.get('State', 'incoming'))

                    logger.info(f"[oFono] CallAdded: {caller_name} ({caller_number}) - State: {state}")
                    self.active_call_state = CallState(
                        state="incoming" if state in ["incoming", "waiting"] else "active",
                        caller_name=caller_name or "Incoming Call",
                        caller_id=caller_number or "+971 50 000 0000",
                        duration=0
                    )
                    asyncio.create_task(audio_ducker.duck(target_volume_percent=15))
                    asyncio.create_task(ws_manager.broadcast("call:incoming", self.active_call_state.model_dump()))

                # 6. oFono VoiceCallManager.CallRemoved (Ended Call)
                elif msg.member == 'CallRemoved' and msg.interface == 'org.ofono.VoiceCallManager':
                    logger.info(f"[oFono] CallRemoved: {self.active_call_path}")
                    self.active_call_path = None
                    self.active_call_state = CallState(state="idle")
                    asyncio.create_task(audio_ducker.restore())
                    asyncio.create_task(ws_manager.broadcast("call:ended", self.active_call_state.model_dump()))

                # 7. oFono VoiceCall.PropertyChanged
                elif msg.member == 'PropertyChanged' and msg.interface == 'org.ofono.VoiceCall':
                    name, val_raw = msg.body
                    prop_val = str(unwrap_variant(val_raw))
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
                self.bus.add_message_handler(signal_dispatcher)

                # Add match rules
                await self.bus.call(
                    Message(
                        destination='org.freedesktop.DBus',
                        path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus',
                        member='AddMatch',
                        signature='s',
                        body=["type='signal',interface='org.freedesktop.DBus.Properties',member='PropertiesChanged'"]
                    )
                )
                await self.bus.call(
                    Message(
                        destination='org.freedesktop.DBus',
                        path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus',
                        member='AddMatch',
                        signature='s',
                        body=["type='signal',interface='org.freedesktop.DBus.ObjectManager'"]
                    )
                )
                await self.bus.call(
                    Message(
                        destination='org.freedesktop.DBus',
                        path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus',
                        member='AddMatch',
                        signature='s',
                        body=["type='signal',interface='org.ofono.VoiceCallManager'"]
                    )
                )
                await self.bus.call(
                    Message(
                        destination='org.freedesktop.DBus',
                        path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus',
                        member='AddMatch',
                        signature='s',
                        body=["type='signal',interface='org.ofono.VoiceCall'"]
                    )
                )
                logger.info("[DBusListener] Successfully subscribed to BlueZ and oFono D-Bus signals")
        except Exception as e:
            logger.warning(f"[DBusListener] Failed to set up signal matches: {e}")

    async def _poll_current_media_state(self):
        """
        Queries BlueZ once on startup to read current track if already playing.
        """
        try:
            from dbus_next import Message

            reply = await self.bus.call(
                Message(
                    destination='org.bluez',
                    path='/',
                    interface='org.freedesktop.DBus.ObjectManager',
                    member='GetManagedObjects'
                )
            )
            objects_raw = reply.body[0] if reply.body else {}
            objects = unwrap_variant(objects_raw)
            for path, interfaces in objects.items():
                if 'org.bluez.MediaPlayer1' in interfaces:
                    self.active_player_path = path
                    props = interfaces['org.bluez.MediaPlayer1']
                    track_val = props.get('Track', {})
                    status = str(props.get('Status', 'stopped'))
                    if track_val and isinstance(track_val, dict):
                        title = str(track_val.get('Title', 'Unknown Track'))
                        artist = str(track_val.get('Artist', 'Unknown Artist'))
                        album = str(track_val.get('Album', ''))
                        duration = int(track_val.get('Duration', 0)) // 1000
                        position = int(props.get('Position', 0)) // 1000
                        logger.info(f"[BlueZ] Found active media player on boot: '{title}' by {artist} ({status})")
                        await self._on_track_changed(title, artist, album, duration, position, status)
                        return
        except Exception as e:
            logger.warning(f"[BlueZ] Error polling media state on boot: {e}")

    async def _on_track_changed(self, title: str, artist: str, album: str, duration: int, position: int = 0, status: str = "playing"):
        if not title or title in ['Unknown Track', '']:
            return
            
        # 1. Update track state and broadcast IMMEDIATELY with zero blocking delay
        self.current_track = TrackMetadata(
            title=title,
            artist=artist,
            album=album,
            duration=duration,
            position=position,
            status=status,
            artwork_url=self.current_track.artwork_url if self.current_track.title == title else None
        )
        logger.info(f"[Media] Broadcasting track change instantly: '{title}' - {artist} ({status})")
        await ws_manager.broadcast("media:track_changed", self.current_track.model_dump())

        # 2. Asynchronously resolve iTunes album artwork in background without blocking
        asyncio.create_task(self._resolve_artwork_background(artist, title))

    async def _resolve_artwork_background(self, artist: str, title: str):
        try:
            art_url = await ArtworkService.resolve_artwork(artist, title)
            if art_url and self.current_track.title == title:
                self.current_track.artwork_url = art_url
                await ws_manager.broadcast("media:track_changed", self.current_track.model_dump())
        except Exception as e:
            logger.debug(f"[Artwork] Background resolution note: {e}")

    async def get_live_track(self) -> TrackMetadata:
        """
        Returns the current track metadata.
        """
        player_path = self.active_player_path or await self._find_player_path()
        if player_path and self.bus:
            try:
                from dbus_next import Message
                reply = await self.bus.call(
                    Message(
                        destination='org.bluez',
                        path=player_path,
                        interface='org.freedesktop.DBus.Properties',
                        member='GetAll',
                        signature='s',
                        body=['org.bluez.MediaPlayer1']
                    )
                )
                if reply.body:
                    props = unwrap_variant(reply.body[0])
                    pos_ms = props.get('Position')
                    if pos_ms is not None:
                        self.current_track.position = int(pos_ms) // 1000
                    status = props.get('Status')
                    if status:
                        self.current_track.status = str(status)
                    track_val = props.get('Track', {})
                    if track_val and isinstance(track_val, dict):
                        title = str(track_val.get('Title', ''))
                        artist = str(track_val.get('Artist', ''))
                        album = str(track_val.get('Album', ''))
                        dur_ms = track_val.get('Duration', 0)
                        if title and title != 'Unknown Track':
                            self.current_track.title = title
                            self.current_track.artist = artist
                            self.current_track.album = album
                            self.current_track.duration = int(dur_ms) // 1000
            except Exception as e:
                logger.debug(f"[BlueZ] Error refreshing live track properties: {e}")
        return self.current_track

    async def media_play(self):
        player_path = self.active_player_path or await self._find_player_path()
        if player_path and self.bus:
            try:
                from dbus_next import Message
                await self.bus.call(Message(
                    destination='org.bluez',
                    path=player_path,
                    interface='org.bluez.MediaPlayer1',
                    member='Play'
                ))
                self.current_track.status = 'playing'
                await ws_manager.broadcast("media:playback_state", self.current_track.model_dump())
            except Exception as e:
                logger.error(f"[DBusListener] Error playing media: {e}")

    async def media_pause(self):
        player_path = self.active_player_path or await self._find_player_path()
        if player_path and self.bus:
            try:
                from dbus_next import Message
                await self.bus.call(Message(
                    destination='org.bluez',
                    path=player_path,
                    interface='org.bluez.MediaPlayer1',
                    member='Pause'
                ))
                self.current_track.status = 'paused'
                await ws_manager.broadcast("media:playback_state", self.current_track.model_dump())
            except Exception as e:
                logger.error(f"[DBusListener] Error pausing media: {e}")

    async def media_next(self):
        player_path = self.active_player_path or await self._find_player_path()
        if player_path and self.bus:
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
        player_path = self.active_player_path or await self._find_player_path()
        if player_path and self.bus:
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
            objects_raw = reply.body[0] if reply.body else {}
            objects = unwrap_variant(objects_raw)
            for path, interfaces in objects.items():
                if 'org.bluez.MediaPlayer1' in interfaces:
                    self.active_player_path = path
                    return path
        except Exception:
            pass
        return None

    async def answer_call(self):
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
