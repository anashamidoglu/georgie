import asyncio
import logging
from typing import Optional
from ...routers.ws import ws_manager
from ..audio_ducking import audio_ducker

logger = logging.getLogger(__name__)

class DBusBluetoothListener:
    """
    Connects to system D-Bus on Linux to listen to BlueZ 5 (AVRCP metadata)
    and oFono (hands-free telephony / call state) signals.
    """
    def __init__(self):
        self.running = False
        self.bus = None

    async def start(self):
        try:
            import dasbus.connection
            self.bus = dasbus.connection.SystemMessageBus()
            self.running = True
            logger.info("[DBusListener] Connected to system D-Bus")
            # In production on the Pi, subscribe to:
            # - org.freedesktop.DBus.Properties.PropertiesChanged on /org/bluez/*
            # - org.ofono.VoiceCallManager.CallAdded / CallRemoved
        except ImportError:
            logger.warning("[DBusListener] dasbus not installed or not on Linux. D-Bus disabled.")
        except Exception as e:
            logger.error(f"[DBusListener] Failed to connect to D-Bus: {e}")

    async def stop(self):
        self.running = False
        if self.bus:
            self.bus.disconnect()

dbus_listener = DBusBluetoothListener()
