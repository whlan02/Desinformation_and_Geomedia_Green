#!/usr/bin/env python3
"""
Test Mobile App Registration with Secure Backend
This tests if the mobile app can successfully register using the secure backend approach
"""
import requests
import json
import time
import secrets
import base64
from datetime import datetime

BASE_URL = "http://192.168.0.234:5001"

def test_mobile_registration_flow():
    """Test the complete mobile registration flow with proper secp256k1 key format"""
    print("🚀 TESTING MOBILE APP REGISTRATION FLOW")
    print("=" * 60)
    
    # Generate a proper secp256k1 compressed public key (33 bytes, starts with 02 or 03)
    public_key_bytes = bytes([0x02]) + secrets.token_bytes(32)  # Compressed format
    public_key_base64 = base64.b64encode(public_key_bytes).decode('utf-8')
    
    installation_id = f"test_mobile_{secrets.token_hex(8)}"
    public_key_id = f"pubkey_{secrets.token_hex(8)}"
    
    # Create registration data matching mobile app structure
    registration_data = {
        "installation_id": installation_id,
        "device_model": "iPhone 15 Pro",
        "os_name": "iOS",
        "os_version": "17.5",
        "public_key": {
            "keyBase64": public_key_base64,
            "keyId": public_key_id,
            "algorithm": "secp256k1",
            "fingerprint": secrets.token_hex(20)
        },
        "device_fingerprint": secrets.token_hex(32),
        "registration_timestamp": datetime.now().isoformat()
    }
    
    print("📱 Registration Data:")
    print(json.dumps(registration_data, indent=2))
    print()
    
    # Test registration
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
        
        print(f"🌐 Registration Response Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("✅ Registration successful!")
            print(f"📄 Response: {json.dumps(result, indent=2)}")
            
            # Test if device appears in device list
            devices_response = requests.get(f"{BASE_URL}/api/devices-secure")
            if devices_response.status_code == 200:
                devices = devices_response.json()
                print(f"📋 Total devices registered: {devices['total_count']}")
                
                # Find our device
                our_device = None
                for device in devices['devices']:
                    if device['public_key_id'] == public_key_id:
                        our_device = device
                        break
                
                if our_device:
                    print("✅ Device found in registry!")
                    print(f"📱 Device Model: {our_device['device_model']}")
                    print(f"🔑 Public Key ID: {our_device['public_key_id']}")
                    print(f"📊 Registration Time: {our_device['registration_timestamp']}")
                    return True
                else:
                    print("❌ Device not found in registry")
                    return False
            else:
                print("❌ Failed to get device list")
                return False
        else:
            print("❌ Registration failed!")
            print(f"📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"🚨 Error during registration: {e}")
        return False

def test_backend_health():
    """Test if backend is healthy and responsive"""
    print("🔍 TESTING BACKEND HEALTH")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Backend is healthy!")
            print(f"📊 Service: {health_data['service']}")
            print(f"🔄 Version: {health_data['version']}")
            print(f"⏰ Timestamp: {health_data['timestamp']}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"🚨 Backend health check error: {e}")
        return False

if __name__ == "__main__":
    print(f"🔥 Testing Backend: {BASE_URL}")
    print(f"⏰ Test Time: {datetime.now()}")
    print()
    
    # Test backend health
    if test_backend_health():
        print()
        # Test registration flow
        if test_mobile_registration_flow():
            print("\n🎉 ALL TESTS PASSED! Mobile app should be able to register successfully.")
        else:
            print("\n❌ Registration test failed!")
    else:
        print("\n❌ Backend is not healthy!")
