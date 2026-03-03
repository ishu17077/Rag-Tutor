"""
RAG Tutor Backend - Configuration Module
Files stored on disk, paths in MySQL.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

from functools import lru_cache

load_dotenv()

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DB_HOST: str = os.getenv("DB_HOST")
    DB_PORT: int = os.getenv("DB_PORT")
    DB_NAME: str = os.getenv("DB_NAME")
    DB_USER: str = os.getenv("DB_USER")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD")

    # JWT
    JWT_SECRET_KEY: str = "change-this-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # File Storage (files on disk, paths in MySQL)
    UPLOAD_DIR: str = "./uploads"
    FAISS_INDEX_DIR: str = "./faiss_indexes"
    
    # AI Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL")
    BEDROCK_AWS_API: str = os.getenv("BEDROCK_AWS_API", None)
    
    # Rate Limiting
    AI_RATE_LIMIT_PER_MINUTE: int = os.getenv("AI_RATE_LIMIT_PER_MINUTE")
    
    @property
    def DATABASE_URL(self) -> str:
        """MySQL connection URL for SQLAlchemy."""
        from urllib.parse import quote_plus
        return f"postgresql+psycopg2://{quote_plus(self.DB_USER)}:{quote_plus(self.DB_PASSWORD)}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def uploads_path(self) -> Path:
        """Get uploads directory path, create if not exists."""
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    @property
    def faiss_path(self) -> Path:
        """Get FAISS indexes directory path, create if not exists."""
        path = Path(self.FAISS_INDEX_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
