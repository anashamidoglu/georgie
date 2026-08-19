from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Remaining clients: {len(self.active_connections)}")

    async def broadcast(self, event: str, data: Dict[str, Any]):
        if not self.active_connections:
            return
            
        payload = json.dumps({"event": event, "data": data})
        stale_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                stale_connections.append(connection)
                
        for stale in stale_connections:
            self.active_connections.discard(stale)

ws_manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    
    # Push initial live state immediately upon WebSocket connect
    try:
        from ..services.bluetooth.dbus_listener import dbus_listener
        from ..services.bluetooth.mock_listener import mock_bt_listener
        from ..config import settings

        track = mock_bt_listener.current_track if settings.MOCK_MODE else await dbus_listener.get_live_track()
        if track and track.title and track.title != 'No Track Playing':
            await websocket.send_text(json.dumps({"event": "media:track_changed", "data": track.model_dump()}))
    except Exception as e:
        logger.debug(f"[WS] Error pushing initial track state: {e}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong", "data": {}}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
