from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

from .config import settings
from .database import init_db
from .routers import ws, nav, media, calls, system, bluetooth
from .services.bluetooth.mock_listener import mock_bt_listener
from .services.bluetooth.dbus_listener import dbus_listener

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Init SQLite DB & directories
    await init_db()
    
    if settings.MOCK_MODE:
        print("[Georgie] Starting in MOCK MODE (Simulated Bluetooth/Telephony)")
        await mock_bt_listener.start()
    else:
        print("[Georgie] Starting in HARDWARE MODE (BlueZ / oFono D-Bus)")
        await dbus_listener.start()
        
    yield
    
    # Shutdown
    if settings.MOCK_MODE:
        await mock_bt_listener.stop()
    else:
        await dbus_listener.stop()

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount cached artwork static folder
os.makedirs(settings.ARTWORK_CACHE_DIR, exist_ok=True)
app.mount("/static/art", StaticFiles(directory=settings.ARTWORK_CACHE_DIR), name="artwork")

# Include API & WebSocket Routers
app.include_router(ws.router)
app.include_router(nav.router)
app.include_router(media.router)
app.include_router(calls.router)
app.include_router(system.router)
app.include_router(bluetooth.router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "mock_mode": settings.MOCK_MODE,
        "env": settings.ENV
    }

# Mount compiled production frontend dist if present (Single unified service for Pi kiosk)
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
