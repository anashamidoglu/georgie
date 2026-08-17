import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Georgie Carputer Backend"
    ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Mode switch
    MOCK_MODE: bool = True  # Default to True on non-Pi or when hardware is absent
    
    # API Keys
    MAPBOX_ACCESS_TOKEN: Optional[str] = os.getenv("MAPBOX_ACCESS_TOKEN", "")
    GOOGLE_PLACES_API_KEY: Optional[str] = os.getenv("GOOGLE_PLACES_API_KEY", "")
    TOMTOM_API_KEY: Optional[str] = os.getenv("TOMTOM_API_KEY", "")
    
    # Cache & Storage
    DATA_DIR: str = os.getenv("DATA_DIR", "data")
    DB_PATH: str = os.getenv("DB_PATH", "data/georgie.db")
    ARTWORK_CACHE_DIR: str = os.getenv("ARTWORK_CACHE_DIR", "data/artwork_cache")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
