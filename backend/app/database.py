from __future__ import annotations

from contextlib import contextmanager
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine

from pathlib import Path
from .config import settings


# SQLAlchemy base
Base = declarative_base()


def _create_engine() -> Engine:
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},  # needed for SQLite + threads
        future=True,
    )

    # Apply SQLite pragmas for better concurrency and durability
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=3000;")
        cursor.close()

    return engine


engine: Engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    # Ensure database directory exists
    db_path = Path(settings.sqlite_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Import models to register metadata
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
