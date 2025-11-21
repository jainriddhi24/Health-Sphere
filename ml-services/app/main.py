from fastapi import FastAPI

# Import route handlers
# from app.routes import food_recognition, risk_forecast, preventive_assistant, chatbot

app = FastAPI(title="HealthSphere ML Services", version="1.0.0")

# Include routers (commented out until implementation)
# app.include_router(food_recognition.router)
# app.include_router(risk_forecast.router)
# app.include_router(preventive_assistant.router)
# app.include_router(chatbot.router)


@app.get("/")
async def root():
    return {"status": "ML service running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

