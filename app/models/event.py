import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Event(Base):
    __tablename__ = "events"

    # Auto-incrementing primary key for the event log
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign key linking back to the emails table
    email_id = Column(String, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Type of event: 'open' or 'click'
    type = Column(String, nullable=False)
    
    # Timestamp when the event occurred
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Establish relationship back to the Email model
    email = relationship("Email", back_populates="events")
