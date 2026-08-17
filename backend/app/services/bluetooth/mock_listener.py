import asyncio
import random
from typing import Optional
from ...routers.ws import ws_manager
from ...models.schemas import TrackMetadata, CallState
from ..artwork_service import ArtworkService
from ..audio_ducking import audio_ducker

class MockBluetoothListener:
    """
    Simulates BlueZ and oFono state changes for desktop development.
    Generates track progress ticks, simulated incoming calls, and track switches.
    """
    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self.current_track = TrackMetadata(
            title="Starboy",
            artist="The Weeknd",
            album="Starboy",
            duration=230,
            position=45,
            status="playing",
            artwork_url="https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bf/25/11/bf2511fe-6f19-9aa8-9f17-f58c4dc3ef33/16UMGIM61012.rgb.jpg/600x600bb.jpg"
        )
        self.call_state = CallState(state="idle")
        self.playlist = [
            ("Blinding Lights", "The Weeknd", "After Hours", 200),
            ("Save Your Tears", "The Weeknd", "After Hours", 215),
            ("Get Lucky", "Daft Punk", "Random Access Memories", 248),
            ("Midnight City", "M83", "Hurry Up, We're Dreaming", 244),
            ("Nightcall", "Kavinsky", "OutRun", 259),
        ]
        self.playlist_idx = 0

    async def start(self):
        self.running = True
        self.task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()

    async def next_track(self):
        self.playlist_idx = (self.playlist_idx + 1) % len(self.playlist)
        title, artist, album, duration = self.playlist[self.playlist_idx]
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

    async def prev_track(self):
        self.playlist_idx = (self.playlist_idx - 1) % len(self.playlist)
        title, artist, album, duration = self.playlist[self.playlist_idx]
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

    async def toggle_play(self):
        self.current_track.status = "paused" if self.current_track.status == "playing" else "playing"
        await ws_manager.broadcast("media:playback_state", self.current_track.model_dump())

    async def simulate_incoming_call(self, caller_name="Sarah", caller_id="+971 50 123 4567"):
        self.call_state = CallState(
            state="incoming",
            caller_name=caller_name,
            caller_id=caller_id,
            duration=0
        )
        await audio_ducker.duck(target_volume_percent=15)
        await ws_manager.broadcast("call:incoming", self.call_state.model_dump())

    async def answer_call(self):
        if self.call_state.state == "incoming":
            self.call_state.state = "active"
            await ws_manager.broadcast("call:state", self.call_state.model_dump())

    async def end_call(self):
        self.call_state = CallState(state="idle")
        await audio_ducker.restore()
        await ws_manager.broadcast("call:ended", self.call_state.model_dump())

    async def _run_loop(self):
        # Initial broadcast
        await asyncio.sleep(1)
        await ws_manager.broadcast("media:track_changed", self.current_track.model_dump())
        await ws_manager.broadcast("system:status", {
            "connectivity": True,
            "bluetooth_connected": True,
            "connected_device_name": "iPhone 15 Pro",
            "battery_level": 84,
            "theme": "night"
        })

        counter = 0
        while self.running:
            await asyncio.sleep(1)
            counter += 1
            
            # Progress playback position
            if self.current_track.status == "playing":
                self.current_track.position = (self.current_track.position or 0) + 1
                if self.current_track.duration and self.current_track.position >= self.current_track.duration:
                    await self.next_track()
                elif counter % 2 == 0:
                    await ws_manager.broadcast("media:playback_state", self.current_track.model_dump())

            # Progress call duration
            if self.call_state.state == "active":
                self.call_state.duration += 1
                await ws_manager.broadcast("call:state", self.call_state.model_dump())

mock_bt_listener = MockBluetoothListener()
