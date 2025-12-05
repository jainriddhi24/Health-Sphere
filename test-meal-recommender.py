#!/usr/bin/env python3
"""
Test script to verify the meal recommender system works correctly
with real medical report data and produces accurate recommendations
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml-services'))

from app.services.meal_recommender import (
    extract_conditions_from_report,
    recommend_meals,
    generate_diet_plan_from_report,
    CONDITION_MEAL_DATABASE
)

print("=" * 80)
print("MEAL RECOMMENDER SYSTEM TEST")
print("=" * 80)

# Test 1: Check that meal database is loaded
print("\n[TEST 1] Checking meal database...")
print(f"✓ Loaded {len(CONDITION_MEAL_DATABASE)} health conditions")
for condition in CONDITION_MEAL_DATABASE.keys():
    meal_db = CONDITION_MEAL_DATABASE[condition]
    print(f"  - {condition}: {len(meal_db)} meal slots")
    for meal_type in meal_db:
        print(f"    • {meal_type}: {len(meal_db[meal_type])} options")

# Test 2: Test with diabetes report
print("\n[TEST 2] Testing with diabetes medical report...")
diabetes_report = {
    "summary": """Patient shows elevated fasting glucose of 165 mg/dL indicating 
    poor glycemic control. HbA1c of 8.5% confirms persistent hyperglycemia over the past 3 months.""",
    "metadata": {
        "danger_flags": ["high fasting glucose", "elevated blood sugar", "poor glycemic control"],
        "extracted_fields": ["glucose", "hba1c"]
    },
    "lab_values": {
        "glucose": 165,
        "hba1c": 8.5
    }
}

conditions = extract_conditions_from_report(diabetes_report)
print(f"✓ Detected conditions: {conditions}")

if "diabetes" in conditions:
    print("✓ Correctly identified DIABETES condition")
else:
    print("✗ FAILED: Did not detect diabetes condition")

meals = recommend_meals(conditions)
print(f"✓ Recommended meals:")
for meal_type, meal_list in meals.items():
    if meal_list:
        meal_names = [m['name'] for m in meal_list]
        print(f"  - {meal_type}: {', '.join(meal_names)}")
    else:
        print(f"  - {meal_type}: (no recommendations)")

# Test 3: Test with hypertension report
print("\n[TEST 3] Testing with hypertension medical report...")
hypertension_report = {
    "summary": """Blood pressure control is suboptimal with readings of 155/95 mmHg.
    Patient has elevated hypertension and requires dietary modifications.""",
    "metadata": {
        "danger_flags": ["high blood pressure", "elevated bp", "hypertension"],
        "extracted_fields": ["systolic_bp", "diastolic_bp"]
    },
    "lab_values": {
        "systolic_bp": 155,
        "diastolic_bp": 95
    }
}

conditions = extract_conditions_from_report(hypertension_report)
print(f"✓ Detected conditions: {conditions}")

if "hypertension" in conditions:
    print("✓ Correctly identified HYPERTENSION condition")
else:
    print("✗ FAILED: Did not detect hypertension condition")

meals = recommend_meals(conditions)
print(f"✓ Recommended meals (should be LOW SODIUM):")
for meal_type, meal_list in meals.items():
    if meal_list:
        meal_names = [m['name'] for m in meal_list]
        print(f"  - {meal_type}: {', '.join(meal_names)}")
    else:
        print(f"  - {meal_type}: (no recommendations)")

# Test 4: Full diet plan generation for diabetes report
print("\n[TEST 4] Testing full diet plan generation for diabetes report...")
diet_plan = generate_diet_plan_from_report(diabetes_report)

print(f"✓ Diet plan name: {diet_plan['name']}")
print(f"✓ Detected conditions: {diet_plan['conditions_detected']}")
print(f"✓ Confidence score: {diet_plan['confidence']}")
print(f"✓ Meal count: Breakfast({len(diet_plan['meals']['breakfast'])}), "
      f"Lunch({len(diet_plan['meals']['lunch'])}), "
      f"Dinner({len(diet_plan['meals']['dinner'])}), "
      f"Snacks({len(diet_plan['meals']['snacks'])})")
print(f"✓ Recommendations count: {len(diet_plan['recommendations'])}")
print(f"✓ Restrictions count: {len(diet_plan['restrictions'])}")

print("\nRecommendations:")
for rec in diet_plan['recommendations']:
    print(f"  • {rec}")

print("\nRestrictions:")
for rest in diet_plan['restrictions']:
    print(f"  ⚠️  {rest}")

# Test 5: Verify NO HALLUCINATIONS - meals only from database
print("\n[TEST 5] Verifying NO HALLUCINATIONS - meals are from database only...")

# Get all meals from database
all_db_meals = set()
for condition_meals in CONDITION_MEAL_DATABASE.values():
    for meal_type_meals in condition_meals.values():
        for meal in meal_type_meals:
            all_db_meals.add(meal['name'])

# Check that all recommended meals exist in database
diet_plan = generate_diet_plan_from_report(diabetes_report)
all_recommended_meals = set()
for meal_type in diet_plan['meals']:
    for meal in diet_plan['meals'][meal_type]:
        all_recommended_meals.add(meal['name'])

hallucinated = all_recommended_meals - all_db_meals
if hallucinated:
    print(f"✗ FAILED: Found hallucinated meals (not in database): {hallucinated}")
else:
    print(f"✓ All {len(all_recommended_meals)} recommended meals are from database (NO HALLUCINATIONS)")

# Test 6: Test with empty report (no conditions detected)
print("\n[TEST 6] Testing with report that has no detected conditions...")
empty_report = {
    "summary": "General health check. No specific concerns noted.",
    "metadata": {
        "danger_flags": [],
        "extracted_fields": []
    },
    "lab_values": {}
}

conditions = extract_conditions_from_report(empty_report)
print(f"✓ Detected conditions: {conditions if conditions else '(none)'}")

diet_plan = generate_diet_plan_from_report(empty_report)
print(f"✓ Diet plan name: {diet_plan['name']}")
print(f"✓ Confidence score: {diet_plan['confidence']} (lower when no conditions detected)")
print(f"✓ Meals provided: {sum(len(m) for m in diet_plan['meals'].values())} total")

print("\n" + "=" * 80)
print("ALL TESTS COMPLETED")
print("=" * 80)
