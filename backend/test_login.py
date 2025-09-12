import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.auth import authenticate_user, create_access_token
from app.config import settings

def test_login():
    print("Testing login functionality...")
    print(f"JWT_SECRET configured: {settings.JWT_SECRET is not None}")
    
    db = SessionLocal()
    try:
        # Test authenticate_user
        email = "professor@test.com"
        password = "professor123"
        
        print(f"\nTrying to authenticate: {email}")
        user = authenticate_user(db, email, password)
        
        if user:
            print(f"Authentication successful! User ID: {user.id}, Role: {user.role}")
            
            # Try to create token
            try:
                token = create_access_token(str(user.id))
                print(f"Token created successfully!")
                print(f"Token (first 20 chars): {token[:20]}...")
            except Exception as e:
                print(f"Error creating token: {e}")
        else:
            print("Authentication failed - invalid credentials")
            
    except Exception as e:
        print(f"Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_login()