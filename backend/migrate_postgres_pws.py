import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url:
    print(f"Connecting to {db_url}...")
    engine = create_engine(db_url)

    columns = [
        ("batch_id", "VARCHAR(50)"),
        ("product", "VARCHAR(200)"),
        ("work_order", "VARCHAR(100)"),
        ("category", "VARCHAR(100)"),
        ("start_date", "VARCHAR(50)"),
        ("target_date", "VARCHAR(50)"),
        ("location", "VARCHAR(200)")
    ]

    with engine.connect() as conn:
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE pws_items ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"Added {col_name}")
            except Exception as e:
                # Need to rollback the transaction if an error occurs so we can continue
                conn.rollback()
                print(f"{col_name} error: {e}")

    print("Migration done.")
else:
    print("No DATABASE_URL")
