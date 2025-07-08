#!/usr/bin/env python3
"""
Mobile App Registration Simulation
This simulates the exact registration process from the mobile app
"""
import requests
import json
import time
import secrets
from datetime import datetime

BASE_URL = "http://192.168.0.234:5001"

def simulate_mobile_app_registration():
    """Simulate the registration process from the mobile app"""
    print("🚀 SIMULATING MOBILE APP REGISTRATION")
    print("=" * 50)
    
    # 1. Generate data similar to what the mobile app would send
    registration_data = {
        "installation_id": f"mobile_app_{secrets.token_hex(8)}",
        "device_model": "iPhone Simulator",
        "os_name": "iOS",
        "os_version": "17.5", 
        "public_key": {
            "keyBase64": secrets.token_hex(64),
            "keyId": f"mobile_pubkey_{secrets.token_hex(8)}",
            "algorithm": "secp256k1",
            "fingerprint": secrets.token_hex(20)
        },
        "device_fingerprint": secrets.token_hex(32),
        "registration_timestamp": datetime.now().isoformat()
    }
    
    print("📱 Registration Data:")
    print(json.dumps(registration_data, indent=2))
    print("\n" + "=" * 50)
    
    # 2. Send registration request
    try:
        response = requests.post(
            f"{BASE_URL}/api/register-device-secure",
            json=registration_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "GeoCam/1.0.0 (iOS)"
            },
            timeout=30
        )
        
        print(f"🌐 Response Status: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Registration successful!")
            print(f"📄 Response: {response.json()}")
        else:
            print("❌ Registration failed!")
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"🚨 Error during registration: {e}")
        
    print("\n" + "=" * 50)

def test_endpoint_availability():
    """Test all endpoints to make sure they're available"""
    print("🔍 TESTING ENDPOINT AVAILABILITY")
    print("=" * 50)
    
    endpoints = [
        "/api/health",
        "/api/register-device-secure",
        "/api/devices-secure",
        "/api/verification-stats"
    ]
    
    for endpoint in endpoints:
        try:
            if endpoint == "/api/register-device-secure":
                # Test with minimal data
                response = requests.post(
                    f"{BASE_URL}{endpoint}",
                    json={"test": "data"},
                    timeout=5
                )
            else:
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            
            print(f"✅ {endpoint}: {response.status_code}")
            
        except Exception as e:
            print(f"❌ {endpoint}: ERROR - {e}")

if __name__ == "__main__":
    print(f"🔥 Testing Backend: {BASE_URL}")
    print(f"⏰ Timestamp: {datetime.now()}")
    print()
    
    # Test endpoint availability first
    test_endpoint_availability()
    print()
    
    # Simulate mobile app registration
    simulate_mobile_app_registration()
