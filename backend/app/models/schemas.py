from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TrackMetadata(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    duration: Optional[int] = 0  # in seconds
    position: Optional[int] = 0  # in seconds
    status: str = "paused"  # "playing", "paused", "stopped"
    artwork_url: Optional[str] = None

class CallState(BaseModel):
    state: str = "idle"  # "idle", "incoming", "dialing", "active", "held"
    caller_id: Optional[str] = None
    caller_name: Optional[str] = None
    duration: int = 0  # active duration in seconds

class SystemStatus(BaseModel):
    connectivity: bool = True
    bluetooth_connected: bool = False
    connected_device_name: Optional[str] = None
    battery_level: Optional[int] = None
    theme: str = "night"  # "day" | "night"

class WebSocketMessage(BaseModel):
    event: str
    data: Dict[str, Any]

class DirectionRequest(BaseModel):
    origin: List[float]  # [lng, lat]
    destination: List[float]  # [lng, lat]
    waypoints: Optional[List[List[float]]] = []
