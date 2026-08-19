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
        
        # Saved Places table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS saved_places (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                category TEXT DEFAULT 'favorite',
                icon TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Pre-seed initial Home and Uni shortcuts if empty
        cursor = await db.execute("SELECT COUNT(*) FROM saved_places")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.execute("""
                INSERT INTO saved_places (id, name, address, lat, lng, category, icon)
                VALUES 
                    ('home', 'Home', 'Al Jazzat, Sharjah', 25.362693, 55.419909, 'home', 'home'),
                    ('uni', 'Uni', 'American University of Sharjah', 25.311700, 55.491400, 'uni', 'graduation-cap')
            """)
        
        # Recent Places table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS recent_places (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Pre-seed initial recent destinations if empty
        cursor_rec = await db.execute("SELECT COUNT(*) FROM recent_places")
        rec_count = (await cursor_rec.fetchone())[0]
        if rec_count == 0:
            await db.execute("""
                INSERT INTO recent_places (id, name, address, lat, lng, visited_at)
                VALUES 
                    ('rec-1', 'The Dubai Mall', 'Financial Center Rd, Downtown Dubai', 25.1972, 55.2744, datetime('now', '-1 hours')),
                    ('rec-2', 'Sharjah Airport (SHJ)', 'Airport Road, Sharjah', 25.3286, 55.5172, datetime('now', '-1 days')),
                    ('rec-3', 'Al Majaz Waterfront', 'Corniche St, Al Majaz, Sharjah', 25.3325, 55.3850, datetime('now', '-2 days'))
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
