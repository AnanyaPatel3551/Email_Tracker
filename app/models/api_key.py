import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base

class ApiKey(Base):
    __tablename__ = "api_keys"

    # Auto-incrementing primary key ID
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # User ID linking key to Supabase Auth user UUID
    user_id = Column(String, nullable=False, index=True)
    
    # Unique, prefix-tagged API key string (e.g., et_live_3f9a1b...)
    key = Column(String, unique=True, nullable=False, index=True)
    
    # Optional label for identifying the device/installation
    name = Column(String, nullable=True, default="Gmail Extension")
    
    # Timestamp when key was generated
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
