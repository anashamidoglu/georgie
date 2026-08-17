import os
import aiosqlite
from .config import settings

async def init_db():
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.ARTWORK_CACHE_DIR, exist_ok=True)
    
    async with aiosqlite.connect(settings.DB_PATH) as db:
        # Enable Write-Ahead Logging (WAL) for atomic resilience
        await db.execute("PRAGMA journal_mode = WAL;")
        await db.execute("PRAGMA synchronous = NORMAL;")
        
        # Artwork cache table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS artwork_cache (
                key TEXT PRIMARY KEY,
                artist TEXT NOT NULL,
                title TEXT NOT NULL,
                artwork_url TEXT,
                local_path TEXT,
                source TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # System event / telemetry log
        await db.execute("""
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        await db.commit()

async def get_db():
    db = await aiosqlite.connect(settings.DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
