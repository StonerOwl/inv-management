import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from db.database import engine, Base, init_db, SessionLocal
from db.models import User
import config
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_database():
    print(f"Connecting to: {config.DATABASE_URL}")
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Re-creating all tables with pgvector extension...")
    init_db()
    
    print("Creating default admin user...")
    db = SessionLocal()
    try:
        admin_user = User(
            username="admin",
            hashed_password=pwd_context.hash("admin"),
            role="admin",
            can_upload=True,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("Default user created! Username: admin | Password: admin")
    except Exception as e:
        print(f"Failed to create admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
