#!/usr/bin/env python3
import asyncio
from dbus_next.aio import MessageBus
from dbus_next import BusType, Message

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
        objects = reply.body[0] if reply.body else {}
        
        found_player = False
        found_device = False

        for path, interfaces in objects.items():
            if 'org.bluez.Device1' in interfaces:
                found_device = True
                dev = interfaces['org.bluez.Device1']
                name = dev.get('Name', {}).value if hasattr(dev.get('Name'), 'value') else dev.get('Name', 'Unknown')
                connected = dev.get('Connected', {}).value if hasattr(dev.get('Connected'), 'value') else dev.get('Connected', False)
                paired = dev.get('Paired', {}).value if hasattr(dev.get('Paired'), 'value') else dev.get('Paired', False)
                print(f"\n[Device] {name} ({path})")
                print(f"   Connected: {connected} | Paired: {paired}")

            if 'org.bluez.MediaPlayer1' in interfaces:
                found_player = True
                player = interfaces['org.bluez.MediaPlayer1']
                status = player.get('Status', {}).value if hasattr(player.get('Status'), 'value') else player.get('Status', 'Unknown')
                track = player.get('Track', {})
                track_val = track.value if hasattr(track, 'value') else track
                title = track_val.get('Title', 'Unknown') if isinstance(track_val, dict) else 'Unknown'
                artist = track_val.get('Artist', 'Unknown') if isinstance(track_val, dict) else 'Unknown'
                album = track_val.get('Album', 'Unknown') if isinstance(track_val, dict) else 'Unknown'
                duration = track_val.get('Duration', 0) if isinstance(track_val, dict) else 0

                print(f"\n[+] Active Media Player Found! ({path})")
                print(f"   Status: {status}")
                print(f"   Title:  {title}")
                print(f"   Artist: {artist}")
                print(f"   Album:  {album}")
                print(f"   Length: {duration} ms")

        if not found_player:
            print("\n[-] No org.bluez.MediaPlayer1 found.")
            print("   -> Make sure your phone is currently playing music and Bluetooth audio is selected on your phone.")

        bus.disconnect()
    except Exception as e:
        print(f"[-] Diagnostic Error: {e}")

if __name__ == '__main__':
    asyncio.run(diagnose_bluetooth())
