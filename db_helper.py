import sys
from app.database import SessionLocal, engine, Base
from app.models.email import Email
from app.models.event import Event
import datetime

# Ensure tables are created
Base.metadata.create_all(bind=engine)

def seed():
    """Inserts a mock email record so foreign key constraints are met."""
    db = SessionLocal()
    try:
        # Check if the email already exists
        existing = db.query(Email).filter(Email.id == "test_email_123").first()
        if existing:
            print("Mock email 'test_email_123' already exists in the database.")
            return

        test_email = Email(
            id="test_email_123",
            recipient="test@example.com",
            subject="Test Tracking Email",
            sent_at=datetime.datetime.utcnow(),
            replied=False
        )
        db.add(test_email)
        db.commit()
        print("Successfully seeded mock email 'test_email_123' into 'emails' table.")
    finally:
        db.close()

def query():
    """Prints all contents from emails and events tables."""
    db = SessionLocal()
    try:
        emails = db.query(Email).all()
        events = db.query(Event).all()
        
        print("\n--- EMAILS TABLE ---")
        if not emails:
            print("No emails found.")
        for email in emails:
            print(f"ID: {email.id} | Recipient: {email.recipient} | Subject: {email.subject} | Replied: {email.replied}")
            
        print("\n--- EVENTS TABLE ---")
        if not events:
            print("No events found.")
        for event in events:
            print(f"ID: {event.id} | Email ID: {event.email_id} | Type: {event.type} | Timestamp: {event.timestamp}")
        print("---------------------\n")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python db_helper.py [seed|query]")
        sys.exit(1)
        
    action = sys.argv[1].lower()
    if action == "seed":
        seed()
    elif action == "query":
        query()
    else:
        print(f"Unknown action: {action}. Use 'seed' or 'query'.")
