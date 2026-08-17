import hashlib
import httpx
import aiosqlite
from typing import Optional
from ..config import settings

class ArtworkService:
    @staticmethod
    def generate_key(artist: str, title: str) -> str:
        raw = f"{artist.strip().lower()}:{title.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    async def resolve_artwork(cls, artist: str, title: str) -> Optional[str]:
        if not artist or not title:
            return None
            
        key = cls.generate_key(artist, title)
        
        # 1. Local Cache Lookup (SQLite)
        async with aiosqlite.connect(settings.DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT artwork_url, local_path FROM artwork_cache WHERE key = ?", 
                (key,)
            )
            row = await cursor.fetchone()
            if row:
                if row["local_path"]:
                    return f"/static/art/{row['local_path']}"
                if row["artwork_url"]:
                    return row["artwork_url"]

        # 2. iTunes Search API Fallback
        try:
            query = f"{artist} {title}"
            url = f"https://itunes.apple.com/search?term={query}&entity=song&limit=1"
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    if results and "artworkUrl100" in results[0]:
                        # Upgrade resolution from 100x100 to 600x600
                        art_url = results[0]["artworkUrl100"].replace("100x100bb.jpg", "600x600bb.jpg")
                        
                        # Cache the resolved URL
                        async with aiosqlite.connect(settings.DB_PATH) as db:
                            await db.execute(
                                """
                                INSERT OR REPLACE INTO artwork_cache (key, artist, title, artwork_url, source)
                                VALUES (?, ?, ?, ?, 'itunes')
                                """,
                                (key, artist, title, art_url)
                            )
                            await db.commit()
                            
                        return art_url
        except Exception as e:
            # Fallback gracefully without blocking
            pass

        return None
