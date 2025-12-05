from fastapi import FastAPI
from app.routes import chatbot
from app.routes.report_processor import router as report_router
from app.routes.food_recognition import router as food_router
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="HealthSphere ML Services", version="1.0.0")

# Include routers
app.include_router(chatbot.router)
app.include_router(report_router)
app.include_router(food_router)


@app.get("/")
async def root():
    return {"status": "ML service running"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "HealthSphere ML"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

