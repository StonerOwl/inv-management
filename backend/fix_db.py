import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url:
    print(f"Connecting to database at {db_url.split('@')[1]}")
    engine = create_engine(db_url)
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE line_items ALTER COLUMN hsn_code TYPE VARCHAR(255);"))
            print("Successfully altered hsn_code to VARCHAR(255)")
        except Exception as e:
            print(f"Error altering column: {e}")
else:
    print("No DATABASE_URL found in .env")
