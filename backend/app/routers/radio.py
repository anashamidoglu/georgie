from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/radio", tags=["radio"])

@router.get("/proxy")
async def proxy_radio_stream(url: str = Query(..., description="Direct radio stream URL")):
    """
    Proxies live audio streams to bypass browser CORS, mixed-content, and User-Agent restrictions.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL format")

    async def audio_streamer():
        headers = {
            "User-Agent": "VLC/3.0.18 LibVLC/3.0.18 (Georgie Carputer)",
            "Icy-MetaData": "1",
            "Accept": "*/*"
        }
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                async with client.stream("GET", url, headers=headers) as response:
                    if response.status_code >= 400:
                        logger.warning(f"[Radio Proxy] Remote server returned HTTP {response.status_code} for {url}")
                        return
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        yield chunk
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug(f"[Radio Proxy] Stream ended: {e}")

    return StreamingResponse(
        audio_streamer(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*",
        }
    )
