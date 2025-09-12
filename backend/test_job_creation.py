import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Job, Reading
from pathlib import Path

def test_job_creation():
    db = SessionLocal()
    try:
        # Create a reading
        reading = Reading(
            week_id=1,
            filename="test.pdf",
            file_path="/tmp/test.pdf"
        )
        db.add(reading)
        db.flush()
        print(f"Created reading with ID: {reading.id}")
        
        # Create a job
        job = Job(
            kind="ingestion",
            status="queued",
            progress=0,
            week_id=1
        )
        db.add(job)
        db.flush()
        print(f"Created job with ID: {job.id}")
        
        # Commit the transaction
        db.commit()
        print("Transaction committed")
        
        # Query to verify
        jobs = db.query(Job).all()
        readings = db.query(Reading).all()
        print(f"Jobs in DB: {len(jobs)}")
        print(f"Readings in DB: {len(readings)}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_job_creation()