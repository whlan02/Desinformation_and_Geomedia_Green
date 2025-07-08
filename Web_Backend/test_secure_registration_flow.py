#!/usr/bin/env python3
"""
Test script to verify secure key generation and registration flow
"""

import requests
import json
import time
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import base64
import hashlib

def generate_test_key_pair():
    """Generate a secp256k1 key pair for testing"""
    private_key = ec.generate_private_key(ec.SECP256K1(), default_backend())
    public_key = private_key.public_key()
    
    # Serialize keys
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    # Convert to base64 for transmission
    private_b64 = base64.b64encode(private_bytes).decode('utf-8')
    public_b64 = base64.b64encode(public_bytes).decode('utf-8')
    
    # Generate fingerprint
    fingerprint = hashlib.sha256(public_b64.encode()).hexdigest()[:16]
    
    return {
        'private_key': private_b64,
        'public_key': public_b64,
        'fingerprint': fingerprint
    }

def test_registration():
    """Test device registration with secure backend"""
    print("🧪 Testing secure device registration...")
    
    # Generate test key pair
    keys = generate_test_key_pair()
    device_fingerprint = hashlib.sha256(f"test_device_{time.time()}".encode()).hexdigest()
    
    # Create registration payload
    registration_data = {
        'installation_id': f"test_install_{int(time.time())}",
        'device_model': 'Test Device',
        'os_name': 'Test OS',
        'os_version': '1.0',
        'public_key': {
            'keyBase64': keys['public_key'],
            'keyId': f"test_key_{int(time.time())}",
            'algorithm': 'secp256k1',
            'fingerprint': keys['fingerprint']
        },
        'device_fingerprint': device_fingerprint,
        'registration_timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    }
    
    print(f"📤 Sending registration request...")
    print(f"   - Installation ID: {registration_data['installation_id']}")
    print(f"   - Device Model: {registration_data['device_model']}")
    print(f"   - Public Key ID: {registration_data['public_key']['keyId']}")
    print(f"   - Key Fingerprint: {registration_data['public_key']['fingerprint']}")
    print(f"   - Device Fingerprint: {registration_data['device_fingerprint']}")
    
    try:
        response = requests.post(
            'http://localhost:5001/api/register-device-secure',
            json=registration_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📥 Response Status: {response.status_code}")
        print(f"📥 Response Body: {response.text}")
        
        if response.status_code in [200, 201]:
            result = response.json()
            if result.get('success'):
                print("✅ Registration successful!")
                print(f"   - Device ID: {result.get('device_id')}")
                print(f"   - Public Key ID: {result.get('public_key_id')}")
                print(f"   - Message: {result.get('message')}")
                return True
            else:
                print(f"❌ Registration failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_backend_health():
    """Test backend health endpoint"""
    print("🏥 Testing backend health...")
    
    try:
        response = requests.get('http://localhost:5001/api/health', timeout=5)
        
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Backend is healthy!")
            print(f"   - Service: {health_data.get('service')}")
            print(f"   - Status: {health_data.get('status')}")
            print(f"   - Version: {health_data.get('version')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend health check failed: {str(e)}")
        return False

if __name__ == '__main__':
    print("🔐 GeoCam Secure Registration Test")
    print("=" * 50)
    
    # Test backend health
    if not test_backend_health():
        print("❌ Backend is not healthy, exiting...")
        exit(1)
    
    print()
    
    # Test registration
    if test_registration():
        print("\n✅ All tests passed! The secure registration flow is working.")
    else:
        print("\n❌ Registration test failed!")
        exit(1)
