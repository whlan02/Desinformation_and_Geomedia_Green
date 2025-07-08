#!/usr/bin/env python3
"""
Test Mobile App Secure Registration
This tests the secure registration function directly
"""
import requests
import json
import base64
import secrets
import random
from datetime import datetime

BASE_URL = "http://192.168.0.234:5001"

def test_secure_registration():
    """Test secure registration with proper format"""
    print("🔧 TESTING SECURE REGISTRATION")
    print("=" * 50)
    
    # Generate proper secp256k1 key (33 bytes compressed)
    public_key_bytes = bytes([0x02]) + secrets.token_bytes(32)
    public_key_base64 = base64.b64encode(public_key_bytes).decode('utf-8')
    
    installation_id = "install_mcghwk1x_2o565y4n1i4736y"  # Same as mobile app
    public_key_id = f"secp256k1_key_{random.randint(1000000000000, 9999999999999)}"
    
    # Create registration data in the format expected by secure backend
    registration_data = {
        "installation_id": installation_id,
        "device_model": "iPhone 15 Pro Max",
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
    
    print("📱 Testing with Mobile App Installation ID:")
    print(f"   Installation ID: {installation_id}")
    print(f"   Public Key ID: {public_key_id}")
    print(f"   Device Model: {registration_data['device_model']}")
    print()
    
    # Test secure registration
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
        
        if response.status_code == 201:
            result = response.json()
            print("✅ Registration successful!")
            print(f"📄 Response: {json.dumps(result, indent=2)}")
            print(f"🎉 Device {installation_id} should now be able to be found in checkDeviceRegistration!")
            return True
        else:
            print("❌ Registration failed!")
            print(f"📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"🚨 Error during registration: {e}")
        return False

def verify_device_in_backend():
    """Verify the device appears in the backend"""
    print("\n🔍 VERIFYING DEVICE IN BACKEND")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/api/devices-secure")
        if response.status_code == 200:
            devices = response.json()
            print(f"📋 Total devices: {devices['total_count']}")
            
            # Look for our device
            target_installation_id = "install_mcghwk1x_2o565y4n1i4736y"
            our_device = None
            
            for device in devices['devices']:
                if device['installation_id'] == target_installation_id:
                    our_device = device
                    break
            
            if our_device:
                print(f"✅ Found device with installation ID: {target_installation_id}")
                print(f"📱 Device Model: {our_device['device_model']}")
                print(f"🔑 Public Key ID: {our_device['public_key_id']}")
                print(f"📊 Registration Time: {our_device['registration_timestamp']}")
                return True
            else:
                print(f"❌ Device with installation ID {target_installation_id} not found")
                print("Available devices:")
                for device in devices['devices']:
                    print(f"  - {device['installation_id']} ({device['device_model']})")
                return False
        else:
            print(f"❌ Failed to get devices: {response.status_code}")
            return False
    except Exception as e:
        print(f"🚨 Error checking devices: {e}")
        return False

if __name__ == "__main__":
    print(f"🔥 Testing Secure Registration: {BASE_URL}")
    print(f"⏰ Test Time: {datetime.now()}")
    print()
    
    # Test secure registration
    if test_secure_registration():
        # Verify device appears in backend
        verify_device_in_backend()
    else:
        print("\n❌ Registration test failed!")
