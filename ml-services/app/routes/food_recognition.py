from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter(prefix="/food", tags=["food-recognition"])


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


@router.post("/recognize", response_model=FoodRecognitionResponse)
async def recognize_food(image: UploadFile = File(...)):
    """
    Recognize food from uploaded image and predict nutritional content.
    
    Args:
        image: Food image file (JPEG, PNG)
    
    Returns:
        FoodRecognitionResponse with meal label and nutritional predictions
    """
    import hashlib
    
    # Validate file
    if not image.file:
        raise HTTPException(status_code=400, detail="No image provided")
    
    # Read file to compute hash for deterministic responses
    content = await image.read()
    file_hash = hashlib.md5(content).hexdigest()
    
    # Mock food database with nutritional info (development)
    mock_foods = [
        {
            "meal_label": "Grilled Chicken Salad",
            "calories": 320.0,
            "sodium": 450.0,
            "sugar": 3.5,
            "unhealthy_score": 15.0,
        },
        {
            "meal_label": "Burger with Fries",
            "calories": 850.0,
            "sodium": 1200.0,
            "sugar": 8.0,
            "unhealthy_score": 78.0,
        },
        {
            "meal_label": "Pizza",
            "calories": 280.0,
            "sodium": 650.0,
            "sugar": 2.0,
            "unhealthy_score": 55.0,
        },
        {
            "meal_label": "Sushi Platter",
            "calories": 380.0,
            "sodium": 800.0,
            "sugar": 5.0,
            "unhealthy_score": 28.0,
        },
        {
            "meal_label": "Caesar Wrap",
            "calories": 420.0,
            "sodium": 720.0,
            "sugar": 4.0,
            "unhealthy_score": 42.0,
        },
        {
            "meal_label": "Pad Thai",
            "calories": 520.0,
            "sodium": 980.0,
            "sugar": 12.0,
            "unhealthy_score": 52.0,
        },
    ]
    
    # Use file hash to select deterministic result (same image -> same result)
    hash_int = int(file_hash, 16)
    selected_food = mock_foods[hash_int % len(mock_foods)]
    
    # Add mock confidence score
    confidence = 0.7 + (hash_int % 30) / 100.0
    # Build candidate list
    candidates = []
    for i in range(3):
        pick = mock_foods[(hash_int + i) % len(mock_foods)]
        candidates.append({"label": pick["meal_label"], "confidence": round(0.6 + ((hash_int + i) % 40) / 100.0, 2)})

    return FoodRecognitionResponse(
        meal_label=selected_food["meal_label"],
        calories=selected_food["calories"],
        sodium=selected_food["sodium"],
        sugar=selected_food["sugar"],
        unhealthy_score=selected_food["unhealthy_score"],
        confidence=round(confidence, 2),
        candidates=candidates,
    )


@router.get("/health")
async def health_check():
    """Health check endpoint for food recognition service."""
    return {"status": "food recognition service running"}

