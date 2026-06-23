# Re-export from core.db to avoid duplicate engine creation
from app.core.db import engine, SessionLocal, Base, get_db
