import asyncio
import logging
import platform
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

# Mock devices for development / fallback
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

    # Linux Live BlueZ Query via dbus-next / bluetoothctl
    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message

        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        # Query ObjectManager on org.bluez
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
                name = str(props.get('Name', {}).value if hasattr(props.get('Name'), 'value') else props.get('Name', 'Unknown Device'))
                address = str(props.get('Address', {}).value if hasattr(props.get('Address'), 'value') else props.get('Address', path))
                connected = bool(props.get('Connected', {}).value if hasattr(props.get('Connected'), 'value') else props.get('Connected', False))
                paired = bool(props.get('Paired', {}).value if hasattr(props.get('Paired'), 'value') else props.get('Paired', False))
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
    Puts the Raspberry Pi Bluetooth adapter into Discoverable & Pairable mode.
    Phones can search and find 'Georgie Dash' to pair directly from their phone.
    """
    global mock_pairable_state
    mock_pairable_state = enabled

    if settings.MOCK_MODE or platform.system().lower() != "linux":
        return {"status": "ok", "pairable": enabled, "timeout": timeout_seconds}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message, Variant

        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        # Set Pairable, Discoverable, and DiscoverableTimeout on /org/bluez/hci0
        adapter_path = '/org/bluez/hci0'
        await bus.call(Message(
            destination='org.bluez',
            path=adapter_path,
            interface='org.freedesktop.DBus.Properties',
            member='Set',
            signature='ssv',
            body=['org.bluez.Adapter1', 'Discoverable', Variant('b', enabled)]
        ))
        await bus.call(Message(
            destination='org.bluez',
            path=adapter_path,
            interface='org.freedesktop.DBus.Properties',
            member='Set',
            signature='ssv',
            body=['org.bluez.Adapter1', 'Pairable', Variant('b', enabled)]
        ))
        bus.disconnect()
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
        return {"status": "connected", "device": device_address}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message

        dev_path = f"/org/bluez/hci0/dev_{device_address.replace(':', '_')}"
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        await bus.call(Message(
            destination='org.bluez',
            path=dev_path,
            interface='org.bluez.Device1',
            member='Connect'
        ))
        bus.disconnect()
        return {"status": "connected", "device": device_address}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed to connect device: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/disconnect/{device_address}")
async def disconnect_device(device_address: str):
    """
    Disconnects an active Bluetooth device.
    """
    if settings.MOCK_MODE or platform.system().lower() != "linux":
        for d in mock_devices:
            if d.id == device_address:
                d.connected = False
        return {"status": "disconnected", "device": device_address}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message

        dev_path = f"/org/bluez/hci0/dev_{device_address.replace(':', '_')}"
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        await bus.call(Message(
            destination='org.bluez',
            path=dev_path,
            interface='org.bluez.Device1',
            member='Disconnect'
        ))
        bus.disconnect()
        return {"status": "disconnected", "device": device_address}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed to disconnect device: {e}")
        return {"status": "error", "message": str(e)}

@router.delete("/forget/{device_address}")
async def forget_device(device_address: str):
    """
    Removes/unpairs a device from BlueZ.
    """
    global mock_devices
    if settings.MOCK_MODE or platform.system().lower() != "linux":
        mock_devices = [d for d in mock_devices if d.id != device_address]
        return {"status": "forgotten", "device": device_address}

    try:
        from dbus_next.aio import MessageBus
        from dbus_next import BusType, Message, Variant

        dev_path = f"/org/bluez/hci0/dev_{device_address.replace(':', '_')}"
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        await bus.call(Message(
            destination='org.bluez',
            path='/org/bluez/hci0',
            interface='org.bluez.Adapter1',
            member='RemoveDevice',
            signature='o',
            body=[dev_path]
        ))
        bus.disconnect()
        return {"status": "forgotten", "device": device_address}
    except Exception as e:
        logger.error(f"[Bluetooth] Failed to forget device: {e}")
        return {"status": "error", "message": str(e)}
