#!/usr/bin/env python3
"""
Check what the backend API is actually returning for a user profile
"""

import requests
import json
import sys

print("=" * 80)
print("API DIAGNOSTIC: Check Profile Response")
print("=" * 80)

# First, try to login to get a token
print("\n[Step 1] Getting authentication token...")

LOGIN_URL = "http://localhost:3001/auth/login"
PROFILE_URL = "http://localhost:3001/auth/profile"

# Try test credentials
test_creds = [
    {"email": "test@example.com", "password": "password"},
    {"email": "demo@health-sphere.com", "password": "demo123"},
    {"email": "user@example.com", "password": "password123"}
]

token = None
user_email = None

for creds in test_creds:
    try:
        print(f"\n  Trying: {creds['email']}")
        response = requests.post(LOGIN_URL, json=creds, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and 'token' in data['data']:
                token = data['data']['token']
                user_email = creds['email']
                print(f"  ✓ Login successful!")
                break
            elif 'token' in data:
                token = data['token']
                user_email = creds['email']
                print(f"  ✓ Login successful!")
                break
        else:
            print(f"  ✗ Status: {response.status_code}")
    except Exception as e:
        print(f"  ✗ Error: {e}")

if not token:
    print("\n❌ Could not login with any test credentials")
    print("\nTo test, please provide credentials or use browser DevTools:")
    print("  1. Go to http://localhost:3000")
    print("  2. Login with your account")
    print("  3. Open DevTools (F12)")
    print("  4. Console tab, type:")
    print("     localStorage.getItem('token')")
    print("  5. Copy the token and paste below")
    
    manual_token = input("\nEnter token (or press Enter to skip): ").strip()
    if manual_token:
        token = manual_token
        user_email = "manual"
    else:
        sys.exit(1)

print(f"\n[Step 2] Getting profile with token: {token[:20]}...")

try:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(PROFILE_URL, headers=headers, timeout=5)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✓ Profile fetched successfully")
        
        if 'data' in data:
            profile = data['data']
            
            print(f"\n[Step 3] Checking profile structure:")
            print(f"  - User ID: {profile.get('id', 'N/A')}")
            print(f"  - Name: {profile.get('name', 'N/A')}")
            print(f"  - Email: {profile.get('email', 'N/A')}")
            print(f"  - Has medical_report_url: {'medical_report_url' in profile}")
            print(f"  - Has processing_result: {'processing_result' in profile}")
            
            if 'processing_result' in profile and profile['processing_result']:
                print(f"\n[Step 4] Processing Result found!")
                result = profile['processing_result']
                
                print(f"  - Type: {type(result).__name__}")
                print(f"  - Top-level keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
                
                # Check for personalized_diet_plan
                if isinstance(result, dict):
                    if 'personalized_diet_plan' in result:
                        print(f"\n  ✓ personalized_diet_plan: FOUND")
                        plan = result['personalized_diet_plan']
                        
                        if isinstance(plan, dict):
                            print(f"    - Type: dict")
                            print(f"    - Name: {plan.get('name', 'N/A')}")
                            print(f"    - Conditions: {plan.get('conditions_detected', [])}")
                            print(f"    - Confidence: {plan.get('confidence', 'N/A')}")
                            
                            meals = plan.get('meals', {})
                            total_meals = sum(len(meals.get(k, [])) for k in ['breakfast', 'lunch', 'dinner', 'snacks'])
                            print(f"    - Total meals: {total_meals}")
                            print(f"    - Recommendations: {len(plan.get('recommendations', []))}")
                            print(f"    - Restrictions: {len(plan.get('restrictions', []))}")
                            
                            print(f"\n  Sample Meals:")
                            for meal_type in ['breakfast', 'lunch', 'dinner', 'snacks']:
                                meals_list = meals.get(meal_type, [])
                                if meals_list:
                                    meal = meals_list[0]
                                    print(f"    - {meal_type}: {meal.get('name', 'N/A')} ({meal.get('calories', 'N/A')} cal)")
                        else:
                            print(f"    - Type: {type(plan).__name__}")
                            print(f"    ⚠️  Expected dict, got {type(plan).__name__}")
                    else:
                        print(f"\n  ❌ personalized_diet_plan: NOT FOUND")
                        print(f"  Available fields: {list(result.keys())}")
                        
                        # Check if it's nested differently
                        if 'diet_plan' in result:
                            print(f"  ⚠️  Found 'diet_plan' instead of 'personalized_diet_plan'")
                        
                        # Show sample of data
                        print(f"\n  Sample data:")
                        for key in list(result.keys())[:3]:
                            val = result[key]
                            if isinstance(val, str):
                                print(f"    - {key}: {val[:50]}...")
                            elif isinstance(val, list):
                                print(f"    - {key}: [{type(val[0]).__name__}, ...] ({len(val)} items)")
                            elif isinstance(val, dict):
                                print(f"    - {key}: {{...}} ({len(val)} keys)")
                            else:
                                print(f"    - {key}: {type(val).__name__}")
            else:
                print(f"\n  ⚠️  processing_result: NULL or not present")
                print(f"  → User hasn't uploaded a medical report yet")
                
                print(f"\n[Step 5] Full profile (pretty-printed):")
                print(json.dumps(profile, indent=2, default=str))
        else:
            print("❌ Unexpected response format")
            print(json.dumps(data, indent=2))
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)

except requests.exceptions.ConnectionError:
    print(f"\n❌ Connection error: Cannot reach {PROFILE_URL}")
    print("Make sure backend is running on localhost:3001")

except Exception as e:
    print(f"\n❌ Error: {e}")
