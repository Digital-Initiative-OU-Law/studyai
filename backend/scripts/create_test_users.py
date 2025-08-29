#!/usr/bin/env python3
"""
Script to create test users for the StudyAI application.
Run from the backend directory: python scripts/create_test_users.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models import Base, User
from app.auth import get_password_hash
from app.config import settings

def create_test_users():
    """Create test users for different roles"""
    # Create database engine
    engine = create_engine(settings.database_url, echo=True)
    Base.metadata.create_all(bind=engine)
    
    # Test users data
    test_users = [
        {
            "email": "student@test.com",
            "password": "student123",
            "role": "student"
        },
        {
            "email": "professor@test.com", 
            "password": "professor123",
            "role": "professor"
        },
        {
            "email": "admin@test.com",
            "password": "admin123",
            "role": "admin"
        }
    ]
    
    with Session(engine) as session:
        for user_data in test_users:
            # Check if user already exists
            existing_user = session.query(User).filter(
                User.email == user_data["email"]
            ).first()
            
            if existing_user:
                print(f"User {user_data['email']} already exists, skipping...")
                continue
            
            # Create new user
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"]
            )
            session.add(user)
            print(f"Created user: {user_data['email']} with role: {user_data['role']}")
        
        session.commit()
        print("\nTest users created successfully!")
        print("\nLogin credentials:")
        print("-" * 40)
        for user in test_users:
            print(f"Email: {user['email']}")
            print(f"Password: {user['password']}")
            print(f"Role: {user['role']}")
            print("-" * 40)

if __name__ == "__main__":
    create_test_users()