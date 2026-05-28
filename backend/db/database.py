"""
Database session management and initialization.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

import config
from db.models import Base

# SQLite: check_same_thread=False needed for FastAPI's async context
connect_args = {"check_same_thread": False} if "sqlite" in config.DATABASE_URL else {}

engine = create_engine(
    config.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set True for SQL query logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and ensures cleanup."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
