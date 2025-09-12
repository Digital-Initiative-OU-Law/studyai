import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db
from app.models import Course, Week, User

def setup_test_data():
    print("Setting up test data...")
    
    # Initialize database
    init_db()
    
    db = SessionLocal()
    try:
        # Get professor user
        professor = db.query(User).filter(User.email == "professor@test.com").first()
        if not professor:
            print("Error: Professor user not found. Please run create_test_users.py first.")
            return
        
        # Check if course exists
        course = db.query(Course).filter(Course.code == "LAW101").first()
        if not course:
            course = Course(
                code="LAW101", 
                name="Introduction to Law",
                professor_id=professor.id
            )
            db.add(course)
            db.flush()
            print(f"Created course: {course.name}")
        else:
            print(f"Course already exists: {course.name}")
        
        # Check if week exists
        # Check if week 1 exists for the course
        week = (
            db.query(Week)
            .filter(Week.course_id == course.id, Week.number == 1)
            .first()
        )
        if not week:
            week = Week(
                course_id=course.id,
                number=1,
                title="Constitutional Law Basics",
            )
            db.add(week)
            db.flush()
            print(f"Created week: Week {week.number} - {week.title}")
        else:
            print(f"Week already exists: Week {week.number} - {week.title}")        
        db.commit()
        print("Test data setup complete!")
        
    except Exception as e:
        print(f"Error setting up test data: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    setup_test_data()