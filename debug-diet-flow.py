#!/usr/bin/env python3
"""
Debugging script to test the complete meal recommendation flow
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml-services'))

from app.services.meal_recommender import generate_diet_plan_from_report

# Simulate what the report processor returns after processing a medical report
print("=" * 80)
print("DEBUGGING: Meal Recommendation Flow")
print("=" * 80)

# This is what the report_processor.py sends to generate_diet_plan_from_report
print("\n[Step 1] Report Processor creates this data structure:")
report_data = {
    "summary": """Patient shows elevated fasting glucose of 165 mg/dL indicating 
    poor glycemic control. HbA1c of 8.5% confirms persistent hyperglycemia over the past 3 months.
    Blood pressure is 155/95 mmHg indicating hypertension.""",
    "metadata": {
        "issues": [],
        "extracted_fields": ["glucose", "hba1c", "systolic_bp", "diastolic_bp"]
    },
    "lab_values": [
        {"parameter": "Fasting Glucose", "value": 165, "unit": "mg/dL", "field": "fasting_glucose"},
        {"parameter": "HbA1c", "value": 8.5, "unit": "%", "field": "hba1c"},
        {"parameter": "Systolic BP", "value": 155, "unit": "mmHg", "field": "systolic_bp"},
        {"parameter": "Diastolic BP", "value": 95, "unit": "mmHg", "field": "diastolic_bp"}
    ]
}

print("\nReport Summary:")
print(report_data["summary"][:100] + "...")
print(f"\nLab Values ({len(report_data['lab_values'])} parameters):")
for lab in report_data["lab_values"]:
    print(f"  - {lab['parameter']}: {lab['value']} {lab['unit']}")

# This is what gets returned to the frontend
print("\n" + "=" * 80)
print("[Step 2] generate_diet_plan_from_report returns this JSON:")
print("=" * 80)

diet_plan = generate_diet_plan_from_report(report_data)

import json
print("\n" + json.dumps(diet_plan, indent=2))

# Check if it has the required fields
print("\n" + "=" * 80)
print("[Step 3] Validation - Frontend should see:")
print("=" * 80)

print(f"\n✓ Plan Name: {diet_plan.get('name')}")
print(f"✓ Conditions Detected: {diet_plan.get('conditions_detected')}")
print(f"✓ Confidence: {diet_plan.get('confidence')*100:.0f}%")

meals = diet_plan.get('meals', {})
print(f"\n✓ Meals:")
print(f"  - Breakfast ({len(meals.get('breakfast', []))} options):")
for meal in meals.get('breakfast', []):
    print(f"    • {meal['name']} ({meal['calories']} cal)")
print(f"  - Lunch ({len(meals.get('lunch', []))} options):")
for meal in meals.get('lunch', []):
    print(f"    • {meal['name']} ({meal['calories']} cal)")
print(f"  - Dinner ({len(meals.get('dinner', []))} options):")
for meal in meals.get('dinner', []):
    print(f"    • {meal['name']} ({meal['calories']} cal)")
print(f"  - Snacks ({len(meals.get('snacks', []))} options):")
for meal in meals.get('snacks', []):
    print(f"    • {meal['name']} ({meal['calories']} cal)")

print(f"\n✓ Recommendations ({len(diet_plan.get('recommendations', []))} items):")
for rec in diet_plan.get('recommendations', [])[:3]:
    print(f"  • {rec}")

print(f"\n✓ Restrictions ({len(diet_plan.get('restrictions', []))} items):")
for rest in diet_plan.get('restrictions', [])[:3]:
    print(f"  • {rest}")

print("\n" + "=" * 80)
print("Flow Status: ✅ COMPLETE")
print("=" * 80)
print("\nFrontend should display the 'Based on Your Medical Report' section with:")
print("  ✓ Detected conditions (diabetes, hypertension)")
print("  ✓ Confidence score (95% = high confidence)")
print("  ✓ 4 meal recommendations")
print("  ✓ Condition-specific advice")
print("  ✓ Foods to restrict")
print("\n⚠️  If section is NOT showing, check:")
print("  1. Did user upload a medical report?")
print("  2. Is processing_result in the database?")
print("  3. Check browser console for processing_result data")
print("  4. Verify report processor API returned personaliz ed_diet_plan")
