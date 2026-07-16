import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.models.email import Email

# Initialize the background scheduler
scheduler = BackgroundScheduler()

def check_follow_ups():
    """
    Scheduled job that scans for emails sent 3+ days ago with no reply,
    and updates their 'needs_follow_up' status to True.
    """
    print("[Scheduler] Running check_follow_ups job...")
    db = SessionLocal()
    try:
        # Define the threshold time (3 days ago in UTC)
        # Note: In production/actual testing, any email sent prior to this is flagged.
        threshold = datetime.datetime.utcnow() - datetime.timedelta(days=3)
        
        # Query emails matching criteria:
        # - sent_at is older than the 3-day threshold
        # - replied is False
        # - needs_follow_up is currently False
        emails_to_flag = db.query(Email).filter(
            Email.sent_at < threshold,
            Email.replied == False,
            Email.needs_follow_up == False
        ).all()
        
        if emails_to_flag:
            for email in emails_to_flag:
                email.needs_follow_up = True
                print(f"[Scheduler] Flagged email {email.id} sent to {email.recipient} on {email.sent_at}")
            
            db.commit()
            print(f"[Scheduler] Successfully flagged {len(emails_to_flag)} email(s) for follow-up.")
        else:
            print("[Scheduler] Checked emails. No new follow-ups to flag.")
            
    except Exception as error:
        db.rollback()
        print(f"[Scheduler] Error executing check_follow_ups job: {error}")
    finally:
        db.close()

def start_scheduler():
    """
    Schedules the follow-up checker job.
    Runs once immediately on app startup, and then runs once every 24 hours.
    """
    # Trigger immediately on startup (next_run_time=now) to make testing easy
    scheduler.add_job(
        check_follow_ups,
        "interval",
        hours=24,
        next_run_time=datetime.datetime.now(),
        id="check_follow_ups_job"
    )
    scheduler.start()
    print("[Scheduler] Background scheduler started successfully (runs every 24 hours).")
