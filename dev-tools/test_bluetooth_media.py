#!/usr/bin/env python3
import asyncio
from typing import Any
from dbus_next.aio import MessageBus
from dbus_next import BusType, Message

def unwrap_variant(val: Any) -> Any:
    if hasattr(val, 'value'):
        return unwrap_variant(val.value)
    if isinstance(val, dict):
        return {str(k): unwrap_variant(v) for k, v in val.items()}
    if isinstance(val, list):
        return [unwrap_variant(v) for v in val]
    return val

async def diagnose_bluetooth():
    print("=" * 60)
    print("Georgie Bluetooth & Media Diagnostics")
    print("=" * 60)

    try:
        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        print("[+] Connected to System D-Bus")

        reply = await bus.call(
            Message(
                destination='org.bluez',
                path='/',
                interface='org.freedesktop.DBus.ObjectManager',
                member='GetManagedObjects'
            )
        )
        objects_raw = reply.body[0] if reply.body else {}
        objects = unwrap_variant(objects_raw)
        
        found_player = False

        for path, interfaces in objects.items():
            if 'org.bluez.Device1' in interfaces:
                dev = interfaces['org.bluez.Device1']
                name = dev.get('Name', dev.get('Alias', 'Unknown'))
                connected = dev.get('Connected', False)
                paired = dev.get('Paired', False)
                if paired or connected:
                    print(f"\n[Device] {name} ({path})")
                    print(f"   Connected: {connected} | Paired: {paired}")

            if 'org.bluez.MediaPlayer1' in interfaces:
                found_player = True
                player = interfaces['org.bluez.MediaPlayer1']
                status = player.get('Status', 'Unknown')
                track = player.get('Track', {})
                title = track.get('Title', 'Unknown') if isinstance(track, dict) else 'Unknown'
                artist = track.get('Artist', 'Unknown') if isinstance(track, dict) else 'Unknown'
                album = track.get('Album', 'Unknown') if isinstance(track, dict) else 'Unknown'
                duration = track.get('Duration', 0) if isinstance(track, dict) else 0

                print(f"\n[+] Active Media Player Found! ({path})")
                print(f"   Status: {status}")
                print(f"   Title:  {title}")
                print(f"   Artist: {artist}")
                print(f"   Album:  {album}")
                print(f"   Length: {duration} ms ({duration // 1000}s)")

        if not found_player:
            print("\n[-] No org.bluez.MediaPlayer1 found.")
            print("   -> Make sure your phone is connected and playing audio via Bluetooth.")

        bus.disconnect()
    except Exception as e:
        print(f"[-] Diagnostic Error: {e}")

if __name__ == '__main__':
    asyncio.run(diagnose_bluetooth())
