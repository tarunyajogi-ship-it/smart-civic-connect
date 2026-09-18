import os

class Config:
    # Port to run Flask on
    PORT = int(os.environ.get("PORT", 5000))
    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() == "true"
    
    # Path to the Firebase service account credentials JSON file
    FIREBASE_SERVICE_ACCOUNT_KEY = os.environ.get(
        "FIREBASE_SERVICE_ACCOUNT_KEY", 
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "serviceAccountKey.json")
    )
    
    # Category to Department Routing Map
    CATEGORY_DEPARTMENT_MAP = {
        "Garbage": "Sanitation",
        "Potholes": "Public Works",
        "WaterLeakage": "Water Supply",
        "Drainage": "Sanitation",
        "Streetlights": "Electricity",
        "RoadDamage": "Public Works"
    }
    
    # Default escalation days (7 days before automatic escalation)
    ESCALATION_DAYS_THRESHOLD = 7

    # Google Gemini API Key for AI Image Verification
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyC2KSnllBgzC7f8mRKP0l3v6H8gPUHoXCU")