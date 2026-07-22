import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email import Email
from app.models.event import Event

router = APIRouter()

# Binary representation of a 1x1 transparent PNG image
TRANSPARENT_PNG_PIXEL = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

@router.get("/pixel/{email_id}")
def track_pixel(email_id: str, db: Session = Depends(get_db)):
    """
    Receives pixel tracking requests, logs an 'open' event, and returns a 1x1 transparent PNG.
    """
    # Check if the email ID exists in the database to prevent foreign key violations
    email_exists = db.query(Email.id).filter(Email.id == email_id).first()
    if email_exists:
        event = Event(
            email_id=email_id,
            type="open",
            timestamp=datetime.datetime.utcnow()
        )
        db.add(event)
        try:
            db.commit()
        except Exception:
            db.rollback()
    
    # Return binary 1x1 transparent PNG image response
    return Response(
        content=TRANSPARENT_PNG_PIXEL,
        media_type="image/png",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

