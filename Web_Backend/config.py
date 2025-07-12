import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database configuration
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://geocam:geocam@localhost:5432/geocam_db')
    
    # Service URLs
    STEGANOGRAPHY_SERVICE_URL = os.getenv('STEGANOGRAPHY_SERVICE_URL', 'https://geocam-steganography.onrender.com')
    
    # Flask configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
    
    # File upload configuration
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB limit
    
    # CORS configuration
    CORS_ORIGINS = [
        "http://localhost:3000", 
        "http://localhost:3002",
        "http://localhost:5173",  # Vue dev server
        "https://geocam-web-frontend.onrender.com",  # Vue production site
        "https://register-device-production.up.railway.app", # Railway production site
    ] 