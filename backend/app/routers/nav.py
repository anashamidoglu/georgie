from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
import httpx
from typing import Optional, List
import uuid
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/api/nav", tags=["navigation"])

@router.get("/directions")
async def get_directions(
    origin: str = Query(..., description="lng,lat"),
    destination: str = Query(..., description="lng,lat"),
    waypoints: Optional[str] = Query(None, description="semicolon-separated lng,lat points")
):
    """
    Proxies requests to Mapbox Directions API keeping token server-side.
    Includes banner_instructions, voice_instructions, and steps.
    """
    token = settings.MAPBOX_ACCESS_TOKEN
    if not token:
        # Provide a mock route response for local testing if no token is configured
        return {
            "routes": [{
                "distance": 8450.0,
                "duration": 720.0,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [55.2708, 25.2048],
                        [55.2740, 25.2010],
                        [55.2800, 25.1980],
                        [55.2900, 25.1950]
                    ]
                },
                "legs": [{
                    "steps": [{
                        "maneuver": {
                            "type": "turn",
                            "modifier": "right",
                            "instruction": "Turn right onto Sheikh Zayed Road"
                        },
                        "banner_instructions": [{
                            "distance_along_geometry": 350.0,
                            "primary": {
                                "text": "Turn right onto Sheikh Zayed Rd",
                                "type": "turn",
                                "modifier": "right",
                                "components": [{"text": "Sheikh Zayed Rd", "type": "text"}]
                            },
                            "sub": {
                                "text": "Keep right",
                                "components": [
                                    {"type": "lane", "indications": ["left"], "active": False, "valid": True},
                                    {"type": "lane", "indications": ["straight"], "active": False, "valid": True},
                                    {"type": "lane", "indications": ["straight", "right"], "active": True, "valid": True},
                                    {"type": "lane", "indications": ["right"], "active": True, "valid": True}
                                ]
                            }
                        }]
                    }]
                }]
            }],
            "mock": True
        }

    coords = f"{origin}"
    if waypoints:
        coords += f";{waypoints}"
    coords += f";{destination}"

    url = f"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{coords}"
    params = {
        "access_token": token,
        "geometries": "geojson",
        "steps": "true",
        "banner_instructions": "true",
        "voice_instructions": "true",
        "overview": "full"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nav proxy error: {str(e)}")

@router.get("/places/search")
async def search_places(query: str = Query(...)):
    """
    Proxies Google Places API (New) Text Search with Pro-tier field mask.
    """
    key = settings.GOOGLE_PLACES_API_KEY
    if not key:
        return {
            "places": [
                {"displayName": {"text": "The Dubai Mall"}, "formattedAddress": "Downtown Dubai, Dubai", "location": {"latitude": 25.1972, "longitude": 55.2744}},
                {"displayName": {"text": "Burj Khalifa"}, "formattedAddress": "1 Sheikh Mohammed bin Rashid Blvd, Dubai", "location": {"latitude": 25.1972, "longitude": 55.2744}},
                {"displayName": {"text": "Dubai International Airport (DXB)"}, "formattedAddress": "Garhoud, Dubai", "location": {"latitude": 25.2532, "longitude": 55.3657}},
                {"displayName": {"text": "Mall of the Emirates"}, "formattedAddress": "Al Barsha 1, Dubai", "location": {"latitude": 25.1181, "longitude": 55.2007}},
            ],
            "mock": True
        }

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location"
    }
    payload = {"textQuery": query}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Places API proxy error: {str(e)}")

# ==============================================================================
# Saved & Recent Places CRUD API
# ==============================================================================

class SavedPlaceModel(BaseModel):
    id: Optional[str] = None
    name: str
    address: Optional[str] = ""
    lat: float
    lng: float
    category: Optional[str] = "favorite"
    icon: Optional[str] = "star"

class RecentPlaceModel(BaseModel):
    id: Optional[str] = None
    name: str
    address: Optional[str] = ""
    lat: float
    lng: float

@router.get("/places/saved")
async def get_saved_places(db = Depends(get_db)):
    """
    Returns all saved/favorite locations ordered by category (home, uni first).
    """
    cursor = await db.execute("""
        SELECT id, name, address, lat, lng, category, icon, created_at 
        FROM saved_places 
        ORDER BY 
            CASE category 
                WHEN 'home' THEN 1 
                WHEN 'uni' THEN 2 
                WHEN 'work' THEN 3 
                ELSE 4 
            END, created_at DESC
    """)
    rows = await cursor.fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "address": row["address"],
            "coordinates": [row["lng"], row["lat"]],
            "category": row["category"],
            "icon": row["icon"],
            "created_at": row["created_at"]
        }
        for row in rows
    ]

@router.post("/places/saved")
async def save_place(place: SavedPlaceModel, db = Depends(get_db)):
    """
    Inserts or updates a saved place (e.g. favorite, home, work).
    """
    place_id = place.id or f"fav-{uuid.uuid4().hex[:8]}"
    await db.execute("""
        INSERT INTO saved_places (id, name, address, lat, lng, category, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            address = excluded.address,
            lat = excluded.lat,
            lng = excluded.lng,
            category = excluded.category,
            icon = excluded.icon
    """, (place_id, place.name, place.address, place.lat, place.lng, place.category, place.icon))
    await db.commit()
    return {"status": "saved", "id": place_id}

@router.delete("/places/saved/{place_id}")
async def delete_saved_place(place_id: str, db = Depends(get_db)):
    """
    Removes a place from saved places.
    """
    await db.execute("DELETE FROM saved_places WHERE id = ?", (place_id,))
    await db.commit()
    return {"status": "deleted", "id": place_id}

@router.get("/places/recent")
async def get_recent_places(db = Depends(get_db)):
    """
    Returns the 10 most recently routed destinations.
    """
    cursor = await db.execute("""
        SELECT id, name, address, lat, lng, visited_at 
        FROM recent_places 
        ORDER BY visited_at DESC 
        LIMIT 10
    """)
    rows = await cursor.fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "address": row["address"],
            "coordinates": [row["lng"], row["lat"]],
            "category": "history",
            "visited_at": row["visited_at"]
        }
        for row in rows
    ]

@router.post("/places/recent")
async def record_recent_place(place: RecentPlaceModel, db = Depends(get_db)):
    """
    Records a routed destination into recent history.
    """
    place_id = place.id or f"rec-{uuid.uuid4().hex[:8]}"
    # Remove existing by name/location to prevent duplicate entries
    await db.execute("""
        DELETE FROM recent_places 
        WHERE lower(name) = lower(?) OR (abs(lat - ?) < 0.0005 AND abs(lng - ?) < 0.0005)
    """, (place.name, place.lat, place.lng))
    
    await db.execute("""
        INSERT INTO recent_places (id, name, address, lat, lng, visited_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (place_id, place.name, place.address, place.lat, place.lng))
    
    # Keep only the latest 20 recent records
    await db.execute("""
        DELETE FROM recent_places 
        WHERE id NOT IN (SELECT id FROM recent_places ORDER BY visited_at DESC LIMIT 20)
    """)
    await db.commit()
    return {"status": "recorded", "id": place_id}

@router.delete("/places/recent/{place_id}")
async def delete_recent_place(place_id: str, db = Depends(get_db)):
    """
    Removes a single destination from recent history.
    """
    await db.execute("DELETE FROM recent_places WHERE id = ?", (place_id,))
    await db.commit()
    return {"status": "deleted", "id": place_id}

@router.delete("/places/recent")
async def clear_recent_places(db = Depends(get_db)):
    """
    Clears all recent history.
    """
    await db.execute("DELETE FROM recent_places")
    await db.commit()
    return {"status": "cleared"}

# ==============================================================================
# Voice Synthesis API
# ==============================================================================

class VoicePromptRequest(BaseModel):
    text: str
    priority: Optional[str] = "normal"

@router.post("/voice/speak")
async def voice_speak(req: VoicePromptRequest):
    """
    Speaks a navigation prompt with automatic audio ducking.
    """
    from ..services.voice_service import voice_service
    success = await voice_service.speak(req.text, priority=req.priority or "normal")
    return {"status": "ok", "spoken": success}

@router.get("/voice/audio")
async def get_voice_audio(text: str = Query(..., description="Text to synthesize")):
    """
    Returns high-fidelity Neural MP3 stream for direct browser audio playback.
    """
    from fastapi import Response
    from ..services.voice_service import voice_service
    audio_bytes = await voice_service.generate_speech_bytes(text)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Voice synthesis failed")
    return Response(content=audio_bytes, media_type="audio/mpeg")

@router.post("/voice/stop")
async def voice_stop():
    """
    Interrupts ongoing speech immediately.
    """
    from ..services.voice_service import voice_service
    voice_service.stop()
    return {"status": "stopped"}
