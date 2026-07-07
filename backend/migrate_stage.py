import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url:
    print(f"Connecting to database at {db_url.split('@')[1] if '@' in db_url else db_url}")
    engine = create_engine(db_url)
    with engine.begin() as conn:
        try:
            conn.execute(text("UPDATE pws_items SET type = 'stage' WHERE type = 'state';"))
            print("Successfully updated 'state' to 'stage' in pws_items")
        except Exception as e:
            print(f"Error updating records: {e}")
else:
    print("No DATABASE_URL found in .env")
