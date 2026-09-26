"""
NEXUS EDGE Core Configuration
Phase 1: Product Foundation & Basic System Foundation
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS EDGE"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    PHASE: str = "Phase 1 - Product Foundation"
    TAGLINE: str = "Understand what you're doing. Get intelligent help. Keep your data private."
    
    # CORS Configuration
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = {"case_sensitive": True}


settings = Settings()
