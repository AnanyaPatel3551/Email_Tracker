import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Email(Base):
    __tablename__ = "emails"

    # UUID or uniquely generated tracking ID string
    id = Column(String, primary_key=True, index=True)
    
    # Recipient email address
    recipient = Column(String, nullable=False, index=True)
    
    # Subject line of the email
    subject = Column(String, nullable=True)
    
    # Timestamp when the email was sent
    sent_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Track whether recipient has replied
    replied = Column(Boolean, default=False, nullable=False)

    # Flag indicating if this email needs a follow-up action
    needs_follow_up = Column(Boolean, default=False, nullable=False, index=True)

    # Establish relationship to events (one-to-many relationship)
    # back_populates links this to the 'email' property on the Event model
    events = relationship("Event", back_populates="email", cascade="all, delete-orphan")
