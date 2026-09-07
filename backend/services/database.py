from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Data directory for local cache / sqlite fallback
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

# Default to PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://shaharyar@localhost:5432/neurolab_ai")

try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        # PostgreSQL engine with connection pooling
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
        # Test connection
        with engine.connect() as conn:
            pass
        print(f"[Database] Successfully connected to PostgreSQL: {DATABASE_URL.split('@')[-1]}")
except Exception as e:
    print(f"[Database] PostgreSQL connection failed ({e}). Falling back to SQLite...")
    DATABASE_URL = "sqlite:///data/neuro_lab.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import models so they register with Base.metadata
    from models.user import User
    from models.patient import Patient, PatientRelationship, patient_consultants
    from models.diagnostic import ImagingRecord, LabRecord, EarlyDetectionRecord
    from services.seed_data import seed_database

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        print(f"[Database] Note during seeding: {e}")
        db.rollback()
    finally:
        db.close()