#!/usr/bin/env python3
"""Test script to verify voice session endpoints are working"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"[OK] Health endpoint: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"[FAIL] Health endpoint failed: {e}")
        return False

def test_login():
    """Login and get token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "student@test.com", "password": "student123"}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            print(f"[OK] Login successful, got token")
            return token
        else:
            print(f"[FAIL] Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"[FAIL] Login failed: {e}")
        return None

def test_sessions_start(token):
    """Test sessions/start endpoint"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/sessions/start",
            json={"week_id": 1},
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"[OK] Sessions/start endpoint: {response.status_code}")
            print(f"  Session ID: {data.get('id')}")
            print(f"  Expires at: {data.get('expires_at')}")
            return data.get('id')
        else:
            print(f"[FAIL] Sessions/start failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"[FAIL] Sessions/start failed: {e}")
        return None

def test_voice_token():
    """Test voice/token endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/voice/token")
        print(f"  Voice/token endpoint: {response.status_code}")
        if response.status_code == 503:
            print("  Note: This is expected if ELEVENLABS_API_KEY is not configured")
        elif response.status_code == 200:
            print(f"  Token received: {response.json()}")
        else:
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"[FAIL] Voice/token failed: {e}")

def test_summaries():
    """Test summaries endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/summaries?week_id=1")
        if response.status_code == 200:
            print(f"[OK] Summaries endpoint: {response.status_code}")
        else:
            print(f"  Summaries endpoint: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[FAIL] Summaries failed: {e}")

def main():
    print("Testing Voice Session Endpoints")
    print("=" * 40)
    
    # Test health
    if not test_health():
        print("\n[WARNING] Backend server is not running!")
        print("Please restart the backend with:")
        print("  cd backend && uvicorn app.main:app --reload --port 8000")
        return 1
    
    # Test login
    token = test_login()
    if not token:
        print("\n[WARNING] Could not authenticate. Check JWT_SECRET in .env")
        return 1
    
    # Test sessions
    session_id = test_sessions_start(token)
    if not session_id:
        print("\n[WARNING] Sessions endpoint not working!")
        print("Make sure the sessions router is registered in main.py")
        return 1
    
    # Test voice token
    test_voice_token()
    
    # Test summaries
    test_summaries()
    
    print("\n[SUCCESS] All critical endpoints are working!")
    print("\nNote: Voice token will fail with 503 if ELEVENLABS_API_KEY is not set.")
    print("To fix this, add a valid ElevenLabs API key to .env:")
    print("  ELEVENLABS_API_KEY=your-actual-api-key")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())