from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email import Email
from app.auth import get_current_user, get_current_user_optional, require_api_key_or_jwt
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
    current_user_id: str = Depends(require_api_key_or_jwt)
):
    """
    Creates a new tracked email record in the database, strictly tagged with the authenticated user's ID.
    Rejects unauthenticated requests with 401 Unauthorized if X-API-Key or Authorization header is missing.
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
    sort_by: Optional[str] = "sent_at",
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Retrieves tracked emails belonging to the currently authenticated user.
    Supports sort_by='sent_at' (default) or sort_by='last_opened'.
    """
    from sqlalchemy import func
    from app.models.event import Event

    # Determine order clause
    if sort_by == "last_opened":
        order_clause = (func.max(Event.timestamp).desc().nulls_last(), Email.sent_at.desc())
    else:
        order_clause = (Email.sent_at.desc(),)

    # Perform a LEFT OUTER JOIN to get user's emails and count/aggregate their associated "open" events
    results = (
        db.query(
            Email.id,
            Email.recipient,
            Email.subject,
            Email.sent_at,
            Email.replied,
            Email.needs_follow_up,
            func.count(Event.id).label("open_count"),
            func.max(Event.timestamp).label("last_opened")
        )
        .filter((Email.user_id == current_user_id) | (Email.user_id.is_(None)))
        .outerjoin(Event, (Email.id == Event.email_id) & (Event.type == "open"))
        .group_by(Email.id)
        .order_by(*order_clause)
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
            "last_opened": row.last_opened,
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

    # Deterministic UUID v4 IDs for demo seed cleanup and idempotency
    demo_ids = [
        "11111111-1111-4111-a111-111111111111",
        "22222222-2222-4222-a222-222222222222",
        "33333333-3333-4333-a333-333333333333",
        "44444444-4444-4444-a444-444444444444",
        "55555555-5555-4555-a555-555555555555"
    ]
    
    # Clean up any existing demo events first
    db.query(Event).filter(Event.email_id.in_(demo_ids)).delete(synchronize_session=False)
    # Clean up existing demo emails
    db.query(Email).filter(Email.id.in_(demo_ids)).delete(synchronize_session=False)
    db.commit()

    now = datetime.utcnow()

    # Define mock emails with UUID v4 IDs
    mock_emails = [
        Email(
            id="11111111-1111-4111-a111-111111111111",
            recipient="sarah.connell@techcorp.com",
            subject="Partnership Proposal & Integration Options",
            sent_at=now - timedelta(hours=2),
            replied=True,
            needs_follow_up=False
        ),
        Email(
            id="22222222-2222-4222-a222-222222222222",
            recipient="recruiting@google.com",
            subject="Software Engineer Application - Antigravity AI",
            sent_at=now - timedelta(days=1),
            replied=False,
            needs_follow_up=False
        ),
        Email(
            id="33333333-3333-4333-a333-333333333333",
            recipient="investors@venturecap.com",
            subject="Seed Round Pitch Deck - Email Tracker Tool",
            sent_at=now - timedelta(days=3),
            replied=False,
            needs_follow_up=True
        ),
        Email(
            id="44444444-4444-4444-a444-444444444444",
            recipient="james@designstudio.io",
            subject="Feedback on Website Mockup & SVG Icons",
            sent_at=now - timedelta(days=4),
            replied=False,
            needs_follow_up=True
        ),
        Email(
            id="55555555-5555-4555-a555-555555555555",
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
        Event(email_id="11111111-1111-4111-a111-111111111111", type="open", timestamp=now - timedelta(minutes=90)),
        Event(email_id="11111111-1111-4111-a111-111111111111", type="open", timestamp=now - timedelta(minutes=60)),
        Event(email_id="11111111-1111-4111-a111-111111111111", type="open", timestamp=now - timedelta(minutes=30)),

        # recruiting@google.com opened once
        Event(email_id="22222222-2222-4222-a222-222222222222", type="open", timestamp=now - timedelta(hours=12)),

        # james@designstudio.io opened 5 times
        Event(email_id="44444444-4444-4444-a444-444444444444", type="open", timestamp=now - timedelta(days=3, hours=10)),
        Event(email_id="44444444-4444-4444-a444-444444444444", type="open", timestamp=now - timedelta(days=3, hours=5)),
        Event(email_id="44444444-4444-4444-a444-444444444444", type="open", timestamp=now - timedelta(days=2, hours=20)),
        Event(email_id="44444444-4444-4444-a444-444444444444", type="open", timestamp=now - timedelta(days=2, hours=12)),
        Event(email_id="44444444-4444-4444-a444-444444444444", type="open", timestamp=now - timedelta(days=1, hours=2)),

        # alicia@freelance.org opened 2 times
        Event(email_id="55555555-5555-4555-a555-555555555555", type="open", timestamp=now - timedelta(days=4, hours=22)),
        Event(email_id="55555555-5555-4555-a555-555555555555", type="open", timestamp=now - timedelta(days=4, hours=18)),
    ]

    for email in mock_emails:
        db.add(email)
    for event in mock_events:
        db.add(event)

    db.commit()
    return {"status": "success", "message": "Successfully seeded 5 demo emails and 11 events."}



