"""
Meal recommendation service based on medical conditions and dietary restrictions.
Uses rule-based logic to avoid hallucinations - only recommends meals based on
extracted health conditions from medical reports.
"""

from typing import List, Dict, Any
import re
import logging

logger = logging.getLogger(__name__)

# Condition-based meal database - only evidence-based recommendations
CONDITION_MEAL_DATABASE = {
    # Diabetes - Low GI, controlled carbs, high fiber
    "diabetes": {
        "breakfast": [
            {"name": "Oats with cinnamon", "calories": 350, "carbs": 45, "fiber": 8, "protein": 10},
            {"name": "Greek yogurt with berries", "calories": 200, "carbs": 25, "fiber": 5, "protein": 20},
            {"name": "Whole wheat toast with almond butter", "calories": 280, "carbs": 30, "fiber": 6, "protein": 12}
        ],
        "lunch": [
            {"name": "Grilled chicken with brown rice and broccoli", "calories": 450, "carbs": 50, "fiber": 6, "protein": 40},
            {"name": "Lentil soup with whole wheat bread", "calories": 400, "carbs": 55, "fiber": 12, "protein": 18},
            {"name": "Baked fish with sweet potato and green beans", "calories": 420, "carbs": 45, "fiber": 7, "protein": 35}
        ],
        "dinner": [
            {"name": "Grilled tofu with quinoa and vegetables", "calories": 380, "carbs": 45, "fiber": 8, "protein": 20},
            {"name": "Lean beef with barley and spinach", "calories": 420, "carbs": 50, "fiber": 8, "protein": 38},
            {"name": "Baked salmon with pearl barley", "calories": 400, "carbs": 40, "fiber": 6, "protein": 36}
        ],
        "snacks": [
            {"name": "Almonds (30g)", "calories": 170, "carbs": 6, "fiber": 3.5, "protein": 6},
            {"name": "Apple with peanut butter", "calories": 200, "carbs": 25, "fiber": 4, "protein": 7},
            {"name": "Cucumber with hummus", "calories": 120, "carbs": 12, "fiber": 3, "protein": 4}
        ]
    },
    
    # Hypertension - Low sodium, potassium-rich, low saturated fat
    "hypertension": {
        "breakfast": [
            {"name": "Oatmeal with banana and walnuts", "calories": 380, "sodium": 80, "potassium": 450},
            {"name": "Egg white omelette with vegetables", "calories": 250, "sodium": 150, "potassium": 300},
            {"name": "Whole grain toast with avocado", "calories": 300, "sodium": 100, "potassium": 485}
        ],
        "lunch": [
            {"name": "Grilled chicken breast with sweet potato", "calories": 420, "sodium": 200, "potassium": 650},
            {"name": "Baked salmon with steamed broccoli", "calories": 380, "sodium": 180, "potassium": 700},
            {"name": "Vegetable stir-fry with brown rice", "calories": 350, "sodium": 120, "potassium": 550}
        ],
        "dinner": [
            {"name": "Lean turkey with quinoa and kale", "calories": 400, "sodium": 150, "potassium": 600},
            {"name": "Fish with roasted vegetables", "calories": 380, "sodium": 160, "potassium": 700},
            {"name": "Bean soup with whole wheat bread", "calories": 350, "sodium": 180, "potassium": 650}
        ],
        "snacks": [
            {"name": "Banana", "calories": 90, "sodium": 1, "potassium": 422},
            {"name": "Mixed nuts (unsalted)", "calories": 170, "sodium": 2, "potassium": 200},
            {"name": "Dried apricots", "calories": 100, "sodium": 3, "potassium": 400}
        ]
    },
    
    # Hyperlipidemia (High Cholesterol) - Lean proteins, high fiber, plant-based
    "hyperlipidemia": {
        "breakfast": [
            {"name": "Oatmeal with flaxseeds", "calories": 320, "fiber": 10, "saturated_fat": 1},
            {"name": "Whole wheat toast with tomato", "calories": 200, "fiber": 6, "saturated_fat": 0.5},
            {"name": "Smoothie with berries and yogurt", "calories": 250, "fiber": 5, "saturated_fat": 1.5}
        ],
        "lunch": [
            {"name": "Grilled chicken with lentils", "calories": 420, "fiber": 12, "saturated_fat": 2},
            {"name": "Tofu stir-fry with vegetables", "calories": 380, "fiber": 8, "saturated_fat": 1},
            {"name": "Fish with brown rice and beans", "calories": 450, "fiber": 10, "saturated_fat": 1.5}
        ],
        "dinner": [
            {"name": "Baked fish with whole wheat pasta", "calories": 400, "fiber": 7, "saturated_fat": 1},
            {"name": "Vegetable curry with chickpeas", "calories": 350, "fiber": 11, "saturated_fat": 1},
            {"name": "Lean ground turkey with whole grains", "calories": 380, "fiber": 8, "saturated_fat": 2}
        ],
        "snacks": [
            {"name": "Walnuts (30g)", "calories": 200, "fiber": 2, "saturated_fat": 2},
            {"name": "Pear with almonds", "calories": 180, "fiber": 6, "saturated_fat": 1},
            {"name": "Chickpea snack", "calories": 150, "fiber": 5, "saturated_fat": 0.5}
        ]
    },
    
    # Kidney Disease (Lower stages) - Low sodium, controlled protein, low phosphorus
    "kidney_disease": {
        "breakfast": [
            {"name": "Rice cakes with honey", "calories": 250, "sodium": 50, "protein": 5, "phosphorus": 80},
            {"name": "White toast with jam", "calories": 200, "sodium": 80, "protein": 5, "phosphorus": 100},
            {"name": "Cream of rice cereal", "calories": 180, "sodium": 40, "protein": 3, "phosphorus": 50}
        ],
        "lunch": [
            {"name": "White fish with white rice", "calories": 350, "sodium": 150, "protein": 25, "phosphorus": 250},
            {"name": "Chicken breast with pasta", "calories": 380, "sodium": 120, "protein": 30, "phosphorus": 200},
            {"name": "Turkey with white potato", "calories": 400, "sodium": 100, "protein": 28, "phosphorus": 220}
        ],
        "dinner": [
            {"name": "Lean pork with white rice", "calories": 380, "sodium": 140, "protein": 26, "phosphorus": 240},
            {"name": "Beef with pasta and vegetables", "calories": 420, "sodium": 160, "protein": 28, "phosphorus": 260},
            {"name": "Egg white omelette with rice", "calories": 350, "sodium": 100, "protein": 18, "phosphorus": 150}
        ],
        "snacks": [
            {"name": "Apple slice", "calories": 80, "sodium": 2, "protein": 0, "phosphorus": 10},
            {"name": "Rice cake", "calories": 35, "sodium": 30, "protein": 1, "phosphorus": 15},
            {"name": "Low-sodium crackers", "calories": 100, "sodium": 50, "protein": 2, "phosphorus": 40}
        ]
    },
    
    # Celiac Disease / Gluten Sensitivity - Gluten-free options only
    "celiac_disease": {
        "breakfast": [
            {"name": "Rice porridge with banana", "calories": 300, "gluten_free": True},
            {"name": "Gluten-free oats with berries", "calories": 320, "gluten_free": True},
            {"name": "Corn flakes with milk", "calories": 250, "gluten_free": True}
        ],
        "lunch": [
            {"name": "Chicken with rice and vegetables", "calories": 420, "gluten_free": True},
            {"name": "Quinoa bowl with beans", "calories": 380, "gluten_free": True},
            {"name": "Baked fish with potato", "calories": 400, "gluten_free": True}
        ],
        "dinner": [
            {"name": "Rice flour pasta with tomato sauce", "calories": 400, "gluten_free": True},
            {"name": "Corn tortillas with beef", "calories": 420, "gluten_free": True},
            {"name": "Potato-based curry", "calories": 380, "gluten_free": True}
        ],
        "snacks": [
            {"name": "Rice cakes", "calories": 120, "gluten_free": True},
            {"name": "Gluten-free bread", "calories": 150, "gluten_free": True},
            {"name": "Fruit and nuts", "calories": 180, "gluten_free": True}
        ]
    },
    
    # GERD (Acid Reflux) - Non-acidic, low-fat, smaller portions
    "gerd": {
        "breakfast": [
            {"name": "Oatmeal with banana", "calories": 300, "acidity": "low", "fat": 3},
            {"name": "Eggs with toast", "calories": 320, "acidity": "low", "fat": 5},
            {"name": "White toast with low-fat butter", "calories": 250, "acidity": "low", "fat": 4}
        ],
        "lunch": [
            {"name": "Grilled chicken with rice", "calories": 420, "acidity": "low", "fat": 4},
            {"name": "Baked fish with vegetables", "calories": 380, "acidity": "low", "fat": 5},
            {"name": "Turkey sandwich on whole wheat", "calories": 400, "acidity": "low", "fat": 6}
        ],
        "dinner": [
            {"name": "Lean meat with potato", "calories": 400, "acidity": "low", "fat": 5},
            {"name": "Fish with steamed vegetables", "calories": 380, "acidity": "low", "fat": 4},
            {"name": "Chicken soup with vegetables", "calories": 320, "acidity": "low", "fat": 3}
        ],
        "snacks": [
            {"name": "Plain yogurt", "calories": 100, "acidity": "low", "fat": 1},
            {"name": "Banana", "calories": 90, "acidity": "low", "fat": 0},
            {"name": "Almonds (small portion)", "calories": 120, "acidity": "low", "fat": 10}
        ]
    },
    
    # Anemia - Iron-rich foods
    "anemia": {
        "breakfast": [
            {"name": "Fortified cereal with milk", "calories": 300, "iron": 8, "vitamin_c": 15},
            {"name": "Eggs with whole wheat toast", "calories": 320, "iron": 4, "vitamin_c": 5},
            {"name": "Oatmeal with raisins", "calories": 350, "iron": 6, "vitamin_c": 3}
        ],
        "lunch": [
            {"name": "Red meat with vegetables", "calories": 450, "iron": 12, "vitamin_c": 25},
            {"name": "Chicken with spinach", "calories": 420, "iron": 8, "vitamin_c": 20},
            {"name": "Lentil soup with vegetables", "calories": 380, "iron": 10, "vitamin_c": 30}
        ],
        "dinner": [
            {"name": "Beef with sweet potato", "calories": 420, "iron": 11, "vitamin_c": 35},
            {"name": "Fish with leafy greens", "calories": 400, "iron": 6, "vitamin_c": 40},
            {"name": "Lamb with lentils", "calories": 450, "iron": 13, "vitamin_c": 10}
        ],
        "snacks": [
            {"name": "Dried apricots", "calories": 120, "iron": 3, "vitamin_c": 2},
            {"name": "Pumpkin seeds", "calories": 180, "iron": 4, "vitamin_c": 1},
            {"name": "Orange with nuts", "calories": 150, "iron": 1, "vitamin_c": 70}
        ]
    },
    
    # Thyroid Disease - Iodine-containing, selenium-rich
    "thyroid_disease": {
        "breakfast": [
            {"name": "Egg with iodized salt", "calories": 280, "iodine": 40, "selenium": 15},
            {"name": "Seaweed snack with rice", "calories": 250, "iodine": 200, "selenium": 10},
            {"name": "Whole wheat toast with sea salt", "calories": 200, "iodine": 30, "selenium": 8}
        ],
        "lunch": [
            {"name": "Fish with sea vegetables", "calories": 420, "iodine": 150, "selenium": 35},
            {"name": "Chicken with brown rice", "calories": 400, "iodine": 35, "selenium": 20},
            {"name": "Brazil nuts and white beans", "calories": 380, "iodine": 20, "selenium": 120}
        ],
        "dinner": [
            {"name": "Shrimp with vegetables", "calories": 380, "iodine": 120, "selenium": 25},
            {"name": "Turkey with whole grains", "calories": 420, "iodine": 30, "selenium": 22},
            {"name": "Tuna with potato", "calories": 400, "iodine": 80, "selenium": 40}
        ],
        "snacks": [
            {"name": "Brazil nuts (3 pieces)", "calories": 160, "iodine": 3, "selenium": 120},
            {"name": "Whole grain crackers", "calories": 120, "iodine": 25, "selenium": 12},
            {"name": "Cranberries", "calories": 80, "iodine": 1, "selenium": 2}
        ]
    }
}

# Risk factors to conditions mapping
RISK_CONDITION_MAP = {
    "hypertension": ["hypertension", "high blood pressure", "elevated bp"],
    "diabetes": ["diabetes", "elevated blood sugar", "high fasting glucose", "high hba1c"],
    "hyperlipidemia": ["high cholesterol", "high ldl", "elevated triglycerides", "hyperlipidemia"],
    "kidney_disease": ["kidney disease", "chronic kidney disease", "ckd", "elevated creatinine", "gfr"],
    "celiac_disease": ["celiac disease", "gluten intolerance", "celiac"],
    "gerd": ["acid reflux", "gerd", "gastroesophageal reflux"],
    "anemia": ["anemia", "low hemoglobin", "low iron", "low hematocrit"],
    "thyroid_disease": ["thyroid disease", "hyperthyroidism", "hypothyroidism", "tsh"]
}


def extract_conditions_from_report(report_data: Dict[str, Any]) -> List[str]:
    """
    Extract diagnosed conditions from the processing result.
    Only uses explicitly stated conditions - no assumptions.
    """
    conditions = []
    
    # Check danger flags / metadata
    metadata = report_data.get("metadata", {})
    danger_flags = metadata.get("danger_flags", [])
    
    for flag in danger_flags:
        # Handle both dict and string formats for flags
        if isinstance(flag, dict):
            flag_name = str(flag.get("name", "")).lower()
        else:
            flag_name = str(flag).lower()
        
        for condition_key, keywords in RISK_CONDITION_MAP.items():
            if any(kw in flag_name for kw in keywords):
                if condition_key not in conditions:
                    conditions.append(condition_key)
    
    # Check summary text for mentioned conditions
    summary = str(report_data.get("summary", "")).lower()
    for condition_key, keywords in RISK_CONDITION_MAP.items():
        if any(kw in summary for kw in keywords):
            if condition_key not in conditions:
                conditions.append(condition_key)
    
    return conditions


def recommend_meals(conditions: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Recommend meals based on extracted conditions.
    Only recommends meals from evidence-based database.
    """
    recommended_meals = {
        "breakfast": [],
        "lunch": [],
        "dinner": [],
        "snacks": []
    }
    
    if not conditions:
        # No specific conditions - return default balanced recommendations
        return {
            "breakfast": [{"name": "Oatmeal with berries", "calories": 350}],
            "lunch": [{"name": "Grilled chicken with brown rice", "calories": 450}],
            "dinner": [{"name": "Baked salmon with sweet potato", "calories": 450}],
            "snacks": [{"name": "Mixed nuts", "calories": 150}]
        }
    
    # For each meal period, select one meal from highest priority condition
    # Priority: use the first condition's recommendations
    primary_condition = conditions[0]
    
    if primary_condition in CONDITION_MEAL_DATABASE:
        db = CONDITION_MEAL_DATABASE[primary_condition]
        
        recommended_meals["breakfast"] = db.get("breakfast", [])[:1]
        recommended_meals["lunch"] = db.get("lunch", [])[:1]
        recommended_meals["dinner"] = db.get("dinner", [])[:1]
        recommended_meals["snacks"] = db.get("snacks", [])[:1]
    
    return recommended_meals


def generate_diet_plan_from_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate personalized diet plan from medical report.
    Evidence-based, no hallucinations.
    """
    
    # Extract conditions
    conditions = extract_conditions_from_report(report_data)
    
    # Get meal recommendations
    meals = recommend_meals(conditions)
    
    # Build diet plan structure
    diet_plan = {
        "name": f"Personalized Plan for {', '.join(conditions) if conditions else 'Balanced Diet'}",
        "conditions_detected": conditions,
        "confidence": 0.95 if conditions else 0.7,  # Higher confidence if conditions found
        "meals": meals,
        "recommendations": generate_recommendations(conditions),
        "restrictions": generate_restrictions(conditions),
        "note": "This diet plan is based on your medical report analysis. Please consult with your doctor or dietitian for personalized advice."
    }
    
    return diet_plan


def generate_recommendations(conditions: List[str]) -> List[str]:
    """Generate specific dietary recommendations based on conditions."""
    recommendations = []
    
    condition_advice = {
        "diabetes": [
            "Monitor portion sizes, especially carbohydrates",
            "Include fiber-rich foods to help control blood sugar",
            "Avoid sugary drinks and processed foods",
            "Eat at regular times to maintain stable blood sugar"
        ],
        "hypertension": [
            "Reduce salt intake to less than 2300mg per day",
            "Eat potassium-rich foods like bananas and leafy greens",
            "Limit saturated fats",
            "Maintain a healthy weight through balanced diet"
        ],
        "hyperlipidemia": [
            "Increase soluble fiber intake (oats, beans, fruits)",
            "Choose lean proteins over fatty meats",
            "Use plant-based oils instead of butter",
            "Limit trans fats and processed foods"
        ],
        "kidney_disease": [
            "Limit protein intake as advised by your nephrologist",
            "Reduce sodium intake",
            "Monitor potassium and phosphorus levels",
            "Stay hydrated as per medical advice"
        ],
        "celiac_disease": [
            "Strictly avoid all gluten-containing foods",
            "Read food labels carefully",
            "Use certified gluten-free products",
            "Consult dietitian for nutritional adequacy"
        ],
        "gerd": [
            "Avoid trigger foods like spicy and acidic items",
            "Eat smaller, frequent meals",
            "Don't eat 3 hours before bedtime",
            "Stay upright after meals"
        ],
        "anemia": [
            "Include iron-rich foods with vitamin C for better absorption",
            "Avoid tea and coffee with meals (they inhibit iron absorption)",
            "Consider iron supplements if recommended",
            "Monitor iron levels regularly"
        ],
        "thyroid_disease": [
            "Include iodized salt or seaweed for iodine",
            "Maintain consistent medication timing",
            "Avoid excessive goitrogens if hypothyroid",
            "Regular monitoring of thyroid function"
        ]
    }
    
    for condition in conditions:
        if condition in condition_advice:
            recommendations.extend(condition_advice[condition])
    
    return recommendations


def generate_restrictions(conditions: List[str]) -> List[str]:
    """Generate specific food restrictions based on conditions."""
    restrictions = []
    
    condition_restrictions = {
        "diabetes": ["Added sugars", "White bread", "Processed carbs", "Sugary drinks"],
        "hypertension": ["High-sodium foods", "Cured meats", "Salty snacks", "Processed foods"],
        "hyperlipidemia": ["Fatty meats", "Full-fat dairy", "Fried foods", "Butter and cream"],
        "kidney_disease": ["High-sodium foods", "Processed meats", "Excessive protein", "High-potassium items"],
        "celiac_disease": ["Wheat", "Barley", "Rye", "Cross-contaminated foods"],
        "gerd": ["Spicy foods", "Acidic foods", "High-fat foods", "Chocolate"],
        "anemia": [],  # No restrictions, only recommendations
        "thyroid_disease": ["Excessive iodine supplements", "Extreme goitrogens"]
    }
    
    for condition in conditions:
        if condition in condition_restrictions:
            restrictions.extend(condition_restrictions[condition])
    
    return list(set(restrictions))  # Remove duplicates
