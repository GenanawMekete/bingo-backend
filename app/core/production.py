import os
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

def get_production_db_url():
    """Get database URL for production environment"""
    if "DATABASE_URL" in os.environ:
        # Heroku uses postgres:// but SQLAlchemy needs postgresql://
        db_url = os.environ["DATABASE_URL"]
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        return db_url
    return None

def create_production_engine():
    """Create production database engine"""
    db_url = get_production_db_url()
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    return create_engine(db_url, pool_pre_ping=True, pool_recycle=300)
