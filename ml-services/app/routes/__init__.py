"""
ML Services Routes Package.
This file exposes routers so they can be included in `main.py`.
"""
from .chatbot import router as chatbot_router
from .report_processor import router as report_processor_router
from .food_recognition import router as food_recognition_router

__all__ = ['chatbot_router', 'report_processor_router', 'food_recognition_router']


