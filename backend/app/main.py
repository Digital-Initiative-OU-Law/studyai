from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .config import settings
from .database import init_db
from .routers import health as health_router
from .routers import auth as auth_router
from .routers import ingestion as ingestion_router
from .routers import summaries as summaries_router
from .routers import tutor as tutor_router
from .routers import jobs as jobs_router
from .routers import diagnostics as diagnostics_router
from .routers import voice as voice_router
from .routers import sessions as sessions_router
from .routers import maintenance as maintenance_router


def create_app() -> FastAPI:
    app = FastAPI(title="StudyAI API", version="1.0.0")
    
    # Normalize and validate CORS origins
    origins = [o.strip() for o in settings.CORS_ORIGINS if o and o.strip()]
    if "*" in origins and True:  # allow_credentials=True
        # Drop '*' when credentials are enabled
        origins = [o for o in origins if o != "*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(health_router.router)
    app.include_router(auth_router.router)
    app.include_router(ingestion_router.router)
    app.include_router(jobs_router.router)
    app.include_router(summaries_router.router)
    app.include_router(tutor_router.router)
    app.include_router(diagnostics_router.router)
    app.include_router(voice_router.router)
    app.include_router(sessions_router.router)
    app.include_router(maintenance_router.router)

    @app.on_event("startup")
    async def startup():
        """Initialize database on startup"""
        try:
            # Run init_db in a thread since it's synchronous
            await asyncio.to_thread(init_db)
        except Exception as e:
            # Log error but don't crash the app
            print(f"Failed to initialize database: {e}")
            # In production, you might want to use proper logging here

    return app


app = create_app()
