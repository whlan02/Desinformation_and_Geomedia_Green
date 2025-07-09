#!/usr/bin/env python3
"""
Test script to verify backend endpoints are working correctly.
"""
import requests
import json
import base64
import hashlib
from PIL import Image
import io
import os

# Backend URLs
PYTHON_BACKEND = "http://localhost:5001"
STEG_BACKEND = "http://localhost:3001"

def test_health_endpoints():
    """Test health endpoints of both services"""
    print("🔍 Testing health endpoints...")
    
    # Test Python backend
    try:
        response = requests.get(f"{PYTHON_BACKEND}/health")
        print(f"✅ Python backend health: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Python backend health failed: {e}")
    
    # Test steganography service
    try:
        response = requests.get(f"{STEG_BACKEND}/health")
        print(f"✅ Steganography service health: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Steganography service health failed: {e}")

def create_test_image():
    """Create a simple test image"""
    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='red')
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    return img_buffer.getvalue()

def test_image_processing():
    """Test image processing endpoints"""
    print("\n🔍 Testing image processing endpoints...")
    
    # Create test image
    test_image = create_test_image()
    
    # Test data
    test_data = {
        "device_id": "test_device_123",
        "installation_id": "test_install_456",
        "timestamp": "2025-07-09T13:30:00Z",
        "location": {
            "latitude": 40.7128,
            "longitude": -74.0060
        },
        "device_security": {
            "screen_lock_enabled": True,
            "biometric_enabled": True,
            "app_integrity": True
        }
    }
    
    # Test steganography service - pure PNG sign
    try:
        files = {
            'image': ('test.png', test_image, 'image/png')
        }
        data = {
            'metadata': json.dumps(test_data)
        }
        
        response = requests.post(f"{STEG_BACKEND}/pure-png-sign", files=files, data=data)
        print(f"✅ Steganography sign: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   - Hash: {result.get('hash', 'N/A')[:20]}...")
            print(f"   - Signed image size: {len(result.get('signed_image', ''))}")
            
            # Test verification
            verify_data = {
                'signed_image': result['signed_image'],
                'metadata': json.dumps(test_data)
            }
            
            verify_response = requests.post(f"{STEG_BACKEND}/pure-png-verify", json=verify_data)
            print(f"✅ Steganography verify: {verify_response.status_code}")
            
            if verify_response.status_code == 200:
                verify_result = verify_response.json()
                print(f"   - Verification: {verify_result.get('verified', False)}")
                print(f"   - Hash match: {verify_result.get('hash_match', False)}")
        
    except Exception as e:
        print(f"❌ Steganography service failed: {e}")

def main():
    """Run all tests"""
    print("🚀 Testing GeoCam Backend Services\n")
    
    test_health_endpoints()
    test_image_processing()
    
    print("\n✅ Backend testing completed!")

if __name__ == "__main__":
    main()
