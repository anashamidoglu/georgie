import asyncio
import logging
import platform
import subprocess
from typing import List, Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from ..config import settings
from ..routers.ws import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bluetooth", tags=["bluetooth"])

class BluetoothDevice(BaseModel):
    id: str
    name: str
    connected: bool
    paired: bool
    type: str = "phone"
    rssi: Optional[int] = None

class BluetoothStatus(BaseModel):
    adapter_name: str = "hci0"
    powered: bool = True
    pairable: bool = False
    discoverable: bool = False
    connected_device: Optional[str] = None
    devices: List[BluetoothDevice] = []

mock_devices: List[BluetoothDevice] = [
    BluetoothDevice(id="4C:9F:F1:B6:97:F5", name="anas’s iPhone", connected=True, paired=True, type="phone"),
]
mock_pairable_state = False

@router.get("/status", response_model=BluetoothStatus)
async def get_bluetooth_status():
    if settings.MOCK_MODE or platform.system().lower() != "linux":
        connected_dev = next((d.name for d in mock_devices if d.connected), None)
        return BluetoothStatus(
            adapter_name="Georgie BT (Mock)",
            powered=True,
            pairable=mock_pairable_state,
            discoverable=mock_pairable_state,
            connected_device=connected_dev,
            devices=mock_devices
        )

    # Linux Live BlueZ Query via dbus-next
    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message

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
        devices = []
        connected_dev = None
        adapter_powered = True
        adapter_pairable = False

        for path, interfaces in objects.items():
            if 'org.bluez.Adapter1' in interfaces:
                props = interfaces['org.bluez.Adapter1']
                adapter_powered = bool(props.get('Powered', {}).value if hasattr(props.get('Powered'), 'value') else props.get('Powered', True))
                adapter_pairable = bool(props.get('Pairable', {}).value if hasattr(props.get('Pairable'), 'value') else props.get('Pairable', False))

            if 'org.bluez.Device1' in interfaces:
                props = interfaces['org.bluez.Device1']
                paired = bool(props.get('Paired', {}).value if hasattr(props.get('Paired'), 'value') else props.get('Paired', False))
                connected = bool(props.get('Connected', {}).value if hasattr(props.get('Connected'), 'value') else props.get('Connected', False))

                # STRICT FILTER: Only show paired devices or currently connected devices.
                # Discard random background BLE beacons and unknown overhead signals.
                if not paired and not connected:
                    continue

                raw_name = props.get('Name', {}).value if hasattr(props.get('Name'), 'value') else props.get('Name', None)
                alias = props.get('Alias', {}).value if hasattr(props.get('Alias'), 'value') else props.get('Alias', None)
                name = str(alias or raw_name or 'Paired Device')

                address = str(props.get('Address', {}).value if hasattr(props.get('Address'), 'value') else props.get('Address', path))
                icon = str(props.get('Icon', {}).value if hasattr(props.get('Icon'), 'value') else props.get('Icon', 'phone'))

                if connected:
                    connected_dev = name

                devices.append(BluetoothDevice(
                    id=address,
                    name=name,
                    connected=connected,
                    paired=paired,
                    type=icon or "phone"
                ))

        bus.disconnect()
        return BluetoothStatus(
            adapter_name="Georgie Dash",
            powered=adapter_powered,
            pairable=adapter_pairable,
            discoverable=adapter_pairable,
            connected_device=connected_dev,
            devices=devices
        )
    except Exception as e:
        logger.warning(f"[Bluetooth] Error querying BlueZ: {e}")
        return BluetoothStatus(
            adapter_name="hci0",
            powered=True,
            pairable=False,
            discoverable=False,
            connected_device=None,
            devices=[]
        )

@router.post("/pairable")
async def set_pairable(enabled: bool = True, timeout_seconds: int = 60):
    """
    Puts the Linux Bluetooth adapter into Discoverable & Pairable mode,
    and ensures the pairing agent is active so phones pair with 1-tap.
    """
    global mock_pairable_state
    mock_pairable_state = enabled

    if settings.MOCK_MODE or platform.system().lower() != "linux":
        return {"status": "ok", "pairable": enabled, "timeout": timeout_seconds}

    try:
        # Run bluetoothctl commands to ensure discoverability and auto-pairing agent
        if enabled:
            cmd = "bluetoothctl power on; bluetoothctl discoverable-timeout 60; bluetoothctl pairable-timeout 60; bluetoothctl discoverable on; bluetoothctl pairable on; bluetoothctl agent NoInputNoOutput; bluetoothctl default-agent"
        else:
            cmd = "bluetoothctl discoverable off; bluetoothctl pairable off"
        
        subprocess.Popen(cmd, shell=True)
        return {"status": "ok", "pairable": enabled, "timeout": timeout_seconds}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed setting pairable mode: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/connect/{device_address}")
async def connect_device(device_address: str):
    """
    Connects to a paired Bluetooth device.
    """
    if settings.MOCK_MODE or platform.system().lower() != "linux":
        for d in mock_devices:
            d.connected = (d.id == device_address)
        await ws_manager.broadcast("bluetooth:status_changed", {"devices": [d.model_dump() for d in mock_devices]})
        return {"status": "connected", "device": device_address}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message

        dev_path = f"/org/bluez/hci0/dev_{device_address.replace(':', '_')}"
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        try:
            await bus.call(Message(
                destination='org.bluez',
                path=dev_path,
                interface='org.bluez.Device1',
                member='Connect'
            ))
        except Exception:
            subprocess.Popen(f"bluetoothctl connect {device_address}", shell=True)
        bus.disconnect()

        # Trigger delayed state sync
        async def sync_after_connect():
            await asyncio.sleep(1.5)
            from ..services.bluetooth.dbus_listener import dbus_listener
            await dbus_listener._poll_current_media_state()
            status = await get_bluetooth_status()
            await ws_manager.broadcast("bluetooth:status_changed", status.model_dump())

        asyncio.create_task(sync_after_connect())
        return {"status": "connected", "device": device_address}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed to connect device: {e}")
        subprocess.Popen(f"bluetoothctl connect {device_address}", shell=True)
        return {"status": "connecting", "device": device_address}

@router.post("/disconnect/{device_address}")
async def disconnect_device(device_address: str):
    """
    Disconnects an active Bluetooth device.
    """
    if settings.MOCK_MODE or platform.system().lower() != "linux":
        for d in mock_devices:
            if d.id == device_address:
                d.connected = False
        await ws_manager.broadcast("bluetooth:status_changed", {"devices": [d.model_dump() for d in mock_devices]})
        return {"status": "disconnected", "device": device_address}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message
        from ..models.schemas import TrackMetadata

        dev_path = f"/org/bluez/hci0/dev_{device_address.replace(':', '_')}"
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        try:
            await bus.call(Message(
                destination='org.bluez',
                path=dev_path,
                interface='org.bluez.Device1',
                member='Disconnect'
            ))
        except Exception:
            pass
        bus.disconnect()

        subprocess.Popen(f"bluetoothctl disconnect {device_address}", shell=True)

        # Clear media playback immediately
        from ..services.bluetooth.dbus_listener import dbus_listener
        dbus_listener.current_track = TrackMetadata(
            title="No Track Playing",
            artist="Connect Bluetooth to Stream",
            album="",
            duration=0,
            position=0,
            status="stopped",
            artwork_url=None
        )
        dbus_listener.active_player_path = None
        await ws_manager.broadcast("media:playback_state", dbus_listener.current_track.model_dump())
        await ws_manager.broadcast("media:track_changed", dbus_listener.current_track.model_dump())

        status = await get_bluetooth_status()
        await ws_manager.broadcast("bluetooth:status_changed", status.model_dump())
        return {"status": "disconnected", "device": device_address}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed to disconnect device: {e}")
        subprocess.Popen(f"bluetoothctl disconnect {device_address}", shell=True)
        return {"status": "disconnected", "device": device_address}

@router.delete("/forget/{device_address}")
async def forget_device(device_address: str):
    """
    Disconnects, untrusts, and unpairs/removes a device from BlueZ.
    """
    global mock_devices
    if settings.MOCK_MODE or platform.system().lower() != "linux":
        mock_devices = [d for d in mock_devices if d.id != device_address]
        await ws_manager.broadcast("bluetooth:status_changed", {"devices": [d.model_dump() for d in mock_devices]})
        return {"status": "forgotten", "device": device_address}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message
        from ..models.schemas import TrackMetadata

        dev_path = f"/org/bluez/hci0/dev_{device_address.replace(':', '_')}"
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        try:
            await bus.call(Message(
                destination='org.bluez',
                path=dev_path,
                interface='org.bluez.Device1',
                member='Disconnect'
            ))
        except Exception:
            pass

        try:
            await bus.call(Message(
                destination='org.bluez',
                path='/org/bluez/hci0',
                interface='org.bluez.Adapter1',
                member='RemoveDevice',
                signature='o',
                body=[dev_path]
            ))
        except Exception:
            pass
        bus.disconnect()

        # Complete disconnection & removal
        subprocess.run(
            f"bluetoothctl disconnect {device_address}; bluetoothctl untrust {device_address}; bluetoothctl remove {device_address}",
            shell=True,
            timeout=5
        )

        # Clear media playback immediately
        from ..services.bluetooth.dbus_listener import dbus_listener
        dbus_listener.current_track = TrackMetadata(
            title="No Track Playing",
            artist="Connect Bluetooth to Stream",
            album="",
            duration=0,
            position=0,
            status="stopped",
            artwork_url=None
        )
        dbus_listener.active_player_path = None
        await ws_manager.broadcast("media:playback_state", dbus_listener.current_track.model_dump())
        await ws_manager.broadcast("media:track_changed", dbus_listener.current_track.model_dump())

        status = await get_bluetooth_status()
        await ws_manager.broadcast("bluetooth:status_changed", status.model_dump())
        return {"status": "forgotten", "device": device_address}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed to forget device: {e}")
        subprocess.run(f"bluetoothctl remove {device_address}", shell=True)
        return {"status": "forgotten", "device": device_address}
