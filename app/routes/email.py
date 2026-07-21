from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email import Email
from app.auth import get_current_user, get_current_user_optional
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

# Schema for incoming request body
class EmailCreate(BaseModel):
    id: str
    recipient: str
    subject: Optional[str] = None
    sent_at: Optional[datetime] = None

@router.post("/emails", status_code=status.HTTP_201_CREATED)
def create_email(
    email_data: EmailCreate,
    db: Session = Depends(get_db),
    current_user_id: Optional[str] = Depends(get_current_user_optional)
):
    """
    Creates a new tracked email record in the database, tagged with the user's ID if authenticated.
    """
    # Check if the email with this ID already exists to prevent duplicate keys
    existing = db.query(Email).filter(Email.id == email_data.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An email with this ID already exists."
        )
    
    # Instantiate the database model
    new_email = Email(
        id=email_data.id,
        recipient=email_data.recipient,
        subject=email_data.subject,
        sent_at=email_data.sent_at or datetime.utcnow(),
        user_id=current_user_id
    )
    
    db.add(new_email)
    db.commit()
    db.refresh(new_email)
    
    return {
        "status": "success",
        "email": {
            "id": new_email.id,
            "recipient": new_email.recipient,
            "subject": new_email.subject,
            "sent_at": new_email.sent_at,
            "user_id": new_email.user_id
        }
    }

@router.get("/emails")
def get_emails(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Retrieves tracked emails belonging to the currently authenticated user.
    """
    from sqlalchemy import func
    from app.models.event import Event

    # Perform a LEFT OUTER JOIN to get user's emails and count their associated "open" events
    results = (
        db.query(
            Email.id,
            Email.recipient,
            Email.subject,
            Email.sent_at,
            Email.replied,
            Email.needs_follow_up,
            func.count(Event.id).label("open_count")
        )
        .filter((Email.user_id == current_user_id) | (Email.user_id.is_(None)))
        .outerjoin(Event, (Email.id == Event.email_id) & (Event.type == "open"))
        .group_by(Email.id)
        .order_by(Email.sent_at.desc())  # Show newest emails first
        .all()
    )

    # Format the database rows into a serialized JSON list response
    return [
        {
            "id": row.id,
            "recipient": row.recipient,
            "subject": row.subject,
            "sent_at": row.sent_at,
            "opened": row.open_count > 0,
            "open_count": row.open_count,
            "replied": row.replied,
            "needs_follow_up": row.needs_follow_up
        }
        for row in results
    ]


@router.post("/emails/seed", status_code=status.HTTP_201_CREATED)
def seed_emails(db: Session = Depends(get_db)):
    """
    Seeds the database with a set of realistic demo emails and open events.
    """
    from app.models.event import Event
    from datetime import datetime, timedelta

    # Targeted IDs for cleanup to allow idempotent runs without broad TRUNCATE
    demo_ids = [f"demo_email_{i}" for i in range(1, 6)]
    
    # Clean up any existing demo events first
    db.query(Event).filter(Event.email_id.in_(demo_ids)).delete(synchronize_session=False)
    # Clean up existing demo emails
    db.query(Email).filter(Email.id.in_(demo_ids)).delete(synchronize_session=False)
    db.commit()

    now = datetime.utcnow()

    # Define mock emails
    mock_emails = [
        Email(
            id="demo_email_1",
            recipient="sarah.connell@techcorp.com",
            subject="Partnership Proposal & Integration Options",
            sent_at=now - timedelta(hours=2),
            replied=True,
            needs_follow_up=False
        ),
        Email(
            id="demo_email_2",
            recipient="recruiting@google.com",
            subject="Software Engineer Application - Antigravity AI",
            sent_at=now - timedelta(days=1),
            replied=False,
            needs_follow_up=False
        ),
        Email(
            id="demo_email_3",
            recipient="investors@venturecap.com",
            subject="Seed Round Pitch Deck - Email Tracker Tool",
            sent_at=now - timedelta(days=3),
            replied=False,
            needs_follow_up=True
        ),
        Email(
            id="demo_email_4",
            recipient="james@designstudio.io",
            subject="Feedback on Website Mockup & SVG Icons",
            sent_at=now - timedelta(days=4),
            replied=False,
            needs_follow_up=True
        ),
        Email(
            id="demo_email_5",
            recipient="alicia@freelance.org",
            subject="Contract Agreement & Signature Requested",
            sent_at=now - timedelta(days=5),
            replied=True,
            needs_follow_up=False
        )
    ]

    # Define mock events
    mock_events = [
        # sarah.connell@techcorp.com opened it 3 times
        Event(email_id="demo_email_1", type="open", timestamp=now - timedelta(minutes=90)),
        Event(email_id="demo_email_1", type="open", timestamp=now - timedelta(minutes=60)),
        Event(email_id="demo_email_1", type="open", timestamp=now - timedelta(minutes=30)),

        # recruiting@google.com opened once
        Event(email_id="demo_email_2", type="open", timestamp=now - timedelta(hours=12)),

        # james@designstudio.io opened 5 times
        Event(email_id="demo_email_4", type="open", timestamp=now - timedelta(days=3, hours=10)),
        Event(email_id="demo_email_4", type="open", timestamp=now - timedelta(days=3, hours=5)),
        Event(email_id="demo_email_4", type="open", timestamp=now - timedelta(days=2, hours=20)),
        Event(email_id="demo_email_4", type="open", timestamp=now - timedelta(days=2, hours=12)),
        Event(email_id="demo_email_4", type="open", timestamp=now - timedelta(days=1, hours=2)),

        # alicia@freelance.org opened 2 times
        Event(email_id="demo_email_5", type="open", timestamp=now - timedelta(days=4, hours=22)),
        Event(email_id="demo_email_5", type="open", timestamp=now - timedelta(days=4, hours=18)),
    ]

    for email in mock_emails:
        db.add(email)
    for event in mock_events:
        db.add(event)

    db.commit()
    return {"status": "success", "message": "Successfully seeded 5 demo emails and 11 events."}



