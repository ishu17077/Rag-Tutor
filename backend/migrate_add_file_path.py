"""
Migration: Add file_path column to chat_messages and ai_chat_messages tables.
Run once to bring the database schema in sync with the SQLAlchemy models.
"""
import sys
import os

# Make sure the backend app is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

migrations = [
    {
        "description": "Add file_path to chat_messages",
        "check_sql": """
            SELECT column_name FROM information_schema.columns
            WHERE table_name='chat_messages' AND column_name='file_path'
        """,
        "alter_sql": "ALTER TABLE chat_messages ADD COLUMN file_path VARCHAR(500) NULL",
    },
    {
        "description": "Add file_path to ai_chat_messages",
        "check_sql": """
            SELECT column_name FROM information_schema.columns
            WHERE table_name='ai_chat_messages' AND column_name='file_path'
        """,
        "alter_sql": "ALTER TABLE ai_chat_messages ADD COLUMN file_path VARCHAR(500) NULL",
    },
]

with engine.connect() as conn:
    for m in migrations:
        result = conn.execute(text(m["check_sql"])).fetchone()
        if result:
            print(f"[SKIP]  Column already exists: {m['description']}")
        else:
            conn.execute(text(m["alter_sql"]))
            conn.commit()
            print(f"[DONE]  Applied: {m['description']}")

print("\nMigration complete.")
