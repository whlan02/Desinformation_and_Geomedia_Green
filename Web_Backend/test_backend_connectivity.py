#!/usr/bin/env python3
"""
Simple backend connection test for GeoCam mobile app
Tests device registration and basic backend connectivity
"""

import requests
import json
import base64
import hashlib
import time
from datetime import datetime
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

# Configuration
BACKEND_URL = "http://192.168.0.234:5001"

def generate_test_keypair():
    """Generate a test EC keypair for simulation"""
    private_key = ec.generate_private_key(ec.SECP256K1(), default_backend())
    public_key = private_key.public_key()
    
    # Serialize public key for transmission
    public_key_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    return private_key, public_key_bytes

def create_device_fingerprint(installation_id, device_model):
    """Create a device fingerprint similar to mobile app"""
    combined = f"{installation_id}:{device_model}:iOS:GeoCam"
    return hashlib.sha256(combined.encode()).hexdigest()

def create_public_key_fingerprint(public_key_bytes):
    """Create a public key fingerprint"""
    return hashlib.sha256(public_key_bytes).hexdigest()[:16]

def test_backend_connectivity():
    """Test backend services connectivity"""
    print("🚀 GeoCam Backend Connectivity Test")
    print("=" * 50)
    
    # Test Python backend health
    try:
        print("🏥 Testing Python backend health...")
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Python Backend: {health_data.get('status')}")
            print(f"   - Service: {health_data.get('service')}")
            print(f"   - Version: {health_data.get('version')}")
        else:
            print(f"❌ Python Backend: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Python Backend: {str(e)}")
        return False
    
    # Test device registration
    try:
        print("\n🔐 Testing device registration...")
        
        # Generate test data
        installation_id = f"test_mobile_{int(time.time())}"
        device_model = "iPhone 14 Pro"
        private_key, public_key_bytes = generate_test_keypair()
        
        # Create fingerprints
        device_fingerprint = create_device_fingerprint(installation_id, device_model)
        public_key_fingerprint = create_public_key_fingerprint(public_key_bytes)
        public_key_id = f"mobile_key_{int(time.time())}"
        
        # Registration payload
        registration_data = {
            "installation_id": installation_id,
            "device_model": device_model,
            "os_name": "iOS",
            "public_key": {
                "keyBase64": base64.b64encode(public_key_bytes).decode(),
                "keyId": public_key_id,
                "algorithm": "secp256k1",
                "fingerprint": public_key_fingerprint
            },
            "device_fingerprint": device_fingerprint,
            "registration_timestamp": datetime.now().isoformat()
        }
        
        print(f"📱 Device: {device_model}")
        print(f"📱 Installation ID: {installation_id}")
        print(f"📱 Public Key ID: {public_key_id}")
        
        # Send registration request
        response = requests.post(
            f"{BACKEND_URL}/api/register-device-secure",
            json=registration_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"✅ Registration successful!")
            print(f"   - Device ID: {result.get('device_id')}")
            print(f"   - Message: {result.get('message')}")
            return True
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   - Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        return False

def main():
    """Run connectivity test"""
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    success = test_backend_connectivity()
    
    print("\n" + "=" * 50)
    print("🎯 Test Summary")
    print("=" * 50)
    
    if success:
        print("✅ Backend connectivity test passed!")
        print("📱 Mobile app should be able to:")
        print("   ✓ Connect to the backend")
        print("   ✓ Register devices securely")
        print("   ✓ Store public keys in backend")
        print("   ✓ Maintain secure key isolation")
        print("\n🔄 Next steps:")
        print("   1. Open the mobile app")
        print("   2. Go to Security Info screen")
        print("   3. Test device registration")
        print("   4. Try image verification")
        return True
    else:
        print("❌ Backend connectivity test failed!")
        print("📱 Please check:")
        print("   • Backend services are running")
        print("   • Network connectivity")
        print("   • Port accessibility")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
