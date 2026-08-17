from fastapi import APIRouter, Query
from typing import Optional
from ..services.artwork_service import ArtworkService
from ..services.bluetooth.mock_listener import mock_bt_listener
from ..config import settings

router = APIRouter(prefix="/api/media", tags=["media"])

@router.get("/artwork")
async def get_artwork(artist: str = Query(...), title: str = Query(...)):
    url = await ArtworkService.resolve_artwork(artist, title)
    return {"artwork_url": url}

@router.post("/play")
async def media_play():
    if settings.MOCK_MODE:
        await mock_bt_listener.toggle_play()
    return {"status": "ok"}

@router.post("/pause")
async def media_pause():
    if settings.MOCK_MODE:
        await mock_bt_listener.toggle_play()
    return {"status": "ok"}

@router.post("/next")
async def media_next():
    if settings.MOCK_MODE:
        await mock_bt_listener.next_track()
    return {"status": "ok"}

@router.post("/previous")
async def media_previous():
    if settings.MOCK_MODE:
        await mock_bt_listener.prev_track()
    return {"status": "ok"}
