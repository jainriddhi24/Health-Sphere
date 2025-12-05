#!/usr/bin/env python3
"""
Check what's actually stored in the database for processing_result
"""

import sys
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Check if we can connect to the database
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    # Connection parameters from environment variables
    db_config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "database": os.getenv("DB_NAME", "health_sphere"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres"),
        "port": os.getenv("DB_PORT", "5432")
    }
    
    conn = psycopg2.connect(**db_config)
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get all users with their processing_result
    cur.execute("""
        SELECT id, name, email, processing_result 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
    """)
    
    users = cur.fetchall()
    
    print("=" * 80)
    print("DATABASE CHECK: Processing Results")
    print("=" * 80)
    
    if not users:
        print("\n❌ No users found in database")
    else:
        print(f"\n✓ Found {len(users)} users\n")
        
        for user in users:
            print(f"\nUser: {user['name']} ({user['email']})")
            print("-" * 80)
            
            if user['processing_result'] is None:
                print("  ⚠️  processing_result: NULL (no report processed yet)")
            elif isinstance(user['processing_result'], dict):
                result = user['processing_result']
                
                # Check if personalized_diet_plan exists
                if 'personalized_diet_plan' in result:
                    plan = result['personalized_diet_plan']
                    print(f"  ✓ personalized_diet_plan: EXISTS")
                    print(f"    - Name: {plan.get('name', 'N/A')}")
                    print(f"    - Conditions: {plan.get('conditions_detected', [])}")
                    print(f"    - Confidence: {plan.get('confidence', 'N/A')}")
                    print(f"    - Meals:")
                    for meal_type in ['breakfast', 'lunch', 'dinner', 'snacks']:
                        meals = plan.get('meals', {}).get(meal_type, [])
                        if meals:
                            for meal in meals:
                                print(f"      • {meal.get('name', 'N/A')} ({meal.get('calories', 'N/A')} cal)")
                    print(f"    - Recommendations: {len(plan.get('recommendations', []))} items")
                    print(f"    - Restrictions: {len(plan.get('restrictions', []))} items")
                else:
                    print("  ⚠️  personalized_diet_plan: NOT FOUND in processing_result")
                    print(f"  Keys in processing_result: {list(result.keys())}")
                
                # Show other fields
                if 'summary' in result:
                    summary = result['summary'][:100] if result['summary'] else "N/A"
                    print(f"  - Summary: {summary}...")
                
                if 'diagnosis' in result:
                    print(f"  - Diagnosis: {result['diagnosis'][:100] if result['diagnosis'] else 'N/A'}...")
            else:
                print(f"  ? processing_result type: {type(user['processing_result'])}")
                print(f"    Value: {str(user['processing_result'])[:200]}")
    
    cur.close()
    conn.close()
    
except ImportError:
    print("psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Database connection error: {e}")
    print("\nMake sure PostgreSQL is running and set environment variables:")
    print("  DB_HOST=localhost")
    print("  DB_NAME=health_sphere")
    print("  DB_USER=postgres")
    print("  DB_PASSWORD=your_password")
    print("  DB_PORT=5432")
    print("\nOr create a .env file in the project root with these variables")
    sys.exit(1)
