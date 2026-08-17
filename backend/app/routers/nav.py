from fastapi import APIRouter, Query, HTTPException
import httpx
from typing import Optional
from ..config import settings

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
        # Return mock places for Dubai/Sharjah
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
