from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import io
import cv2
import numpy as np
from PIL import Image
import logging

router = APIRouter(prefix="/food", tags=["food-recognition"])
logger = logging.getLogger(__name__)


class Candidate(BaseModel):
    label: str
    confidence: float


class FoodRecognitionResponse(BaseModel):
    meal_label: str
    calories: float
    sodium: float  # in mg
    sugar: float  # in g
    unhealthy_score: float  # 0-100
    confidence: float  # 0-1
    candidates: Optional[List[Candidate]] = None


# Comprehensive food database with nutritional info
FOOD_DATABASE = {
    "biryani": {"label": "Biryani", "calories": 480, "sodium": 850, "sugar": 2, "unhealthy_score": 48},
    "butter_chicken": {"label": "Butter Chicken", "calories": 450, "sodium": 920, "sugar": 8, "unhealthy_score": 65},
    "paneer_tikka": {"label": "Paneer Tikka", "calories": 320, "sodium": 680, "sugar": 3, "unhealthy_score": 35},
    "dal_curry": {"label": "Dal Curry", "calories": 280, "sodium": 620, "sugar": 6, "unhealthy_score": 28},
    "tandoori_chicken": {"label": "Tandoori Chicken", "calories": 290, "sodium": 750, "sugar": 2, "unhealthy_score": 25},
    "naan": {"label": "Naan Bread", "calories": 280, "sodium": 580, "sugar": 1, "unhealthy_score": 35},
    "samosa": {"label": "Samosa", "calories": 350, "sodium": 650, "sugar": 2, "unhealthy_score": 62},
    "dosa": {"label": "Dosa", "calories": 220, "sodium": 420, "sugar": 4, "unhealthy_score": 30},
    "idli": {"label": "Idli", "calories": 180, "sodium": 350, "sugar": 2, "unhealthy_score": 15},
    "chaat": {"label": "Chaat", "calories": 280, "sodium": 750, "sugar": 8, "unhealthy_score": 55},
    "chole_bhature": {"label": "Chole Bhature", "calories": 520, "sodium": 920, "sugar": 5, "unhealthy_score": 68},
    "rice": {"label": "Rice", "calories": 200, "sodium": 120, "sugar": 0, "unhealthy_score": 15},
    "wheat_bread": {"label": "Wheat Bread", "calories": 150, "sodium": 280, "sugar": 1, "unhealthy_score": 10},
    "grilled_chicken": {"label": "Grilled Chicken", "calories": 280, "sodium": 420, "sugar": 0, "unhealthy_score": 12},
    "fish": {"label": "Grilled Fish", "calories": 250, "sodium": 350, "sugar": 0, "unhealthy_score": 8},
    "salad": {"label": "Vegetable Salad", "calories": 150, "sodium": 280, "sugar": 5, "unhealthy_score": 10},
    "pizza": {"label": "Pizza", "calories": 280, "sodium": 650, "sugar": 2, "unhealthy_score": 55},
    "burger": {"label": "Burger", "calories": 550, "sodium": 1100, "sugar": 8, "unhealthy_score": 72},
    "sandwich": {"label": "Sandwich", "calories": 380, "sodium": 680, "sugar": 4, "unhealthy_score": 42},
    "pasta": {"label": "Pasta", "calories": 420, "sodium": 580, "sugar": 6, "unhealthy_score": 45},
    "soup": {"label": "Soup", "calories": 180, "sodium": 720, "sugar": 3, "unhealthy_score": 20},
    "fruit": {"label": "Fresh Fruit", "calories": 120, "sodium": 80, "sugar": 15, "unhealthy_score": 5},
    "vegetable": {"label": "Vegetables", "calories": 80, "sodium": 120, "sugar": 4, "unhealthy_score": 5},
    "milk_products": {"label": "Milk Products", "calories": 200, "sodium": 180, "sugar": 12, "unhealthy_score": 18},
}


def analyze_image_features(image_array: np.ndarray) -> dict:
    """Analyze image features to identify food type."""
    # Convert to HSV for color analysis
    hsv = cv2.cvtColor(image_array, cv2.COLOR_RGB2HSV)
    
    # Calculate color histograms
    h_hist = cv2.calcHist([hsv], [0], None, [256], [0, 256])
    s_hist = cv2.calcHist([hsv], [1], None, [256], [0, 256])
    v_hist = cv2.calcHist([hsv], [2], None, [256], [0, 256])
    
    # Normalize histograms
    h_hist = cv2.normalize(h_hist, h_hist).flatten()
    s_hist = cv2.normalize(s_hist, s_hist).flatten()
    v_hist = cv2.normalize(v_hist, v_hist).flatten()
    
    # Detect colors (simple heuristics)
    avg_hue = np.argmax(h_hist)
    avg_saturation = np.mean(s_hist)
    avg_value = np.mean(v_hist)
    
    # Color-based food classification
    food_scores = {}
    
    # Orange/Brown hues (0-30): curry, biryani, butter chicken
    if 0 <= avg_hue <= 30 or 150 <= avg_hue <= 180:
        food_scores.update({
            "butter_chicken": 0.75,
            "biryani": 0.70,
            "tandoori_chicken": 0.65,
        })
    
    # Red/Yellow hues (30-70): pizza, tomato-based
    if 30 <= avg_hue <= 70:
        food_scores.update({
            "pizza": 0.72,
            "chaat": 0.60,
            "burger": 0.65,
        })
    
    # Green hues (80-100): salad, vegetables
    if 80 <= avg_hue <= 100:
        food_scores.update({
            "salad": 0.80,
            "vegetable": 0.75,
            "dal_curry": 0.60,
        })
    
    # Yellow/White hues (100-130): rice, bread
    if 100 <= avg_hue <= 130 or 150 <= avg_hue <= 180:
        food_scores.update({
            "rice": 0.70,
            "naan": 0.65,
            "wheat_bread": 0.68,
            "idli": 0.60,
        })
    
    # Detect edges for texture (crispy/fried items)
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / edges.size
    
    # High edge density suggests fried/crispy food
    if edge_density > 0.15:
        food_scores.update({
            "samosa": 0.75,
            "chaat": 0.70,
            "chole_bhature": 0.65,
        })
    
    # High saturation suggests vibrant, cooked food
    if avg_saturation > 100:
        food_scores.update({
            "butter_chicken": 0.80,
            "tandoori_chicken": 0.75,
            "curry": 0.70,
        })
    
    # Default foods
    if not food_scores:
        food_scores = {
            "biryani": 0.55,
            "grilled_chicken": 0.50,
            "salad": 0.48,
            "rice": 0.52,
        }
    
    return food_scores


@router.post("/recognize", response_model=FoodRecognitionResponse)
async def recognize_food(image: UploadFile = File(...)):
    """
    Recognize food from uploaded image and predict nutritional content.
    Uses actual image analysis to identify food type.
    
    Args:
        image: Food image file (JPEG, PNG)
    
    Returns:
        FoodRecognitionResponse with meal label and nutritional predictions
    """
    try:
        # Validate file
        if not image.file:
            raise HTTPException(status_code=400, detail="No image provided")
        
        # Read image
        content = await image.read()
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Analyze image features
        food_scores = analyze_image_features(img_rgb)
        
        # Find top matches
        sorted_foods = sorted(food_scores.items(), key=lambda x: x[1], reverse=True)
        top_food_key = sorted_foods[0][0]
        top_confidence = sorted_foods[0][1]
        
        # Get food data
        selected_food = FOOD_DATABASE.get(top_food_key, FOOD_DATABASE["biryani"])
        
        # Build candidate list from top 3 matches
        candidates = []
        for i in range(min(3, len(sorted_foods))):
            food_key = sorted_foods[i][0]
            confidence = min(sorted_foods[i][1], 0.99)
            food_data = FOOD_DATABASE.get(food_key, FOOD_DATABASE["biryani"])
            candidates.append({
                "label": food_data["label"],
                "confidence": round(confidence, 2)
            })
        
        return FoodRecognitionResponse(
            meal_label=selected_food["label"],
            calories=selected_food["calories"],
            sodium=selected_food["sodium"],
            sugar=selected_food["sugar"],
            unhealthy_score=selected_food["unhealthy_score"],
            confidence=round(top_confidence, 2),
            candidates=candidates,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Food recognition error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint for food recognition service."""
    return {"status": "food recognition service running"}

