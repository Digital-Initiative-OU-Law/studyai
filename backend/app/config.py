import os
from pathlib import Path
from dataclasses import dataclass, field

from dotenv import load_dotenv, find_dotenv


# Ensure only the root .env is used; find_dotenv() resolves the nearest
# .env upward from this file, which in this project is the repo root.
load_dotenv(find_dotenv(), override=False)


@dataclass
class Settings:
    # Secrets (server-side only)
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    ELEVEN_API_KEY: str | None = os.getenv("ELEVEN_API_KEY")
    JWT_SECRET: str | None = os.getenv("JWT_SECRET")

    # Session
    SESSION_MAX_SECONDS: int = max(1, int(os.getenv("SESSION_MAX_SECONDS", "300")))

    # Server
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = max(1, min(65535, int(os.getenv("API_PORT", "8000"))))
    CORS_ORIGINS: list[str] = field(default_factory=lambda: (
        os.getenv("CORS_ORIGINS", "http://localhost:3001").split(",")
    ))

    def __post_init__(self):
        # Validate CORS origins format
        for origin in self.CORS_ORIGINS:
            origin = origin.strip()
            if origin and not (origin.startswith('http://') or origin.startswith('https://')):
                raise ValueError(f"Invalid CORS origin format: {origin}")

    # Database
    @property
    def sqlite_path(self) -> Path:
        # backend/app/config.py → backend/app/databases/app.db
        return Path(__file__).resolve().parent / "databases" / "app.db"

    @property
    def database_url(self) -> str:
        # Absolute path to avoid cwd issues
        return f"sqlite:///{self.sqlite_path.as_posix()}"


settings = Settings()
