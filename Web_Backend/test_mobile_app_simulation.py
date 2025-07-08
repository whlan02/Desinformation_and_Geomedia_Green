#!/usr/bin/env python3
"""
Test script to simulate the mobile app key initialization flow
"""

import requests
import json
import time
import base64
import hashlib
import uuid
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def simulate_mobile_app_key_init():
    """Simulate the mobile app's key initialization process"""
    print("📱 Simulating mobile app key initialization...")
    
    # Step 1: Generate device fingerprint (similar to mobile app)
    device_info = {
        'model': 'iPhone Simulator',
        'os': 'iOS',
        'version': '17.0',
        'uuid': str(uuid.uuid4())
    }
    
    fingerprint_data = json.dumps(device_info, sort_keys=True)
    device_fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()
    
    print(f"📱 Device fingerprint: {device_fingerprint}")
    
    # Step 2: Generate secp256k1 key pair
    private_key = ec.generate_private_key(ec.SECP256K1(), default_backend())
    public_key = private_key.public_key()
    
    # Step 3: Convert to the format expected by the mobile app
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    private_b64 = base64.b64encode(private_bytes).decode('utf-8')
    public_b64 = base64.b64encode(public_bytes).decode('utf-8')
    
    # Step 4: Generate key fingerprint (similar to mobile app)
    key_fingerprint = hashlib.sha256(public_b64.encode()).hexdigest()[:16]
    
    print(f"🔑 Key fingerprint: {key_fingerprint}")
    
    # Step 5: Create key metadata
    key_id = f"geocam_{int(time.time())}_{key_fingerprint}"
    
    # Step 6: Create registration payload (same as mobile app)
    registration_data = {
        'installation_id': key_id,
        'device_model': device_info['model'],
        'os_name': device_info['os'],
        'os_version': device_info['version'],
        'public_key': {
            'keyBase64': public_b64,
            'keyId': key_id,
            'algorithm': 'secp256k1',
            'fingerprint': key_fingerprint
        },
        'device_fingerprint': device_fingerprint,
        'registration_timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    }
    
    print(f"📤 Registration payload created:")
    print(f"   - Installation ID: {registration_data['installation_id']}")
    print(f"   - Device Model: {registration_data['device_model']}")
    print(f"   - OS: {registration_data['os_name']} {registration_data['os_version']}")
    print(f"   - Public Key ID: {registration_data['public_key']['keyId']}")
    print(f"   - Key Algorithm: {registration_data['public_key']['algorithm']}")
    print(f"   - Key Fingerprint: {registration_data['public_key']['fingerprint']}")
    print(f"   - Device Fingerprint: {registration_data['device_fingerprint']}")
    
    return registration_data

def test_mobile_app_registration():
    """Test the mobile app registration flow"""
    print("🧪 Testing mobile app registration simulation...")
    
    # Simulate key initialization
    registration_data = simulate_mobile_app_key_init()
    
    # Send registration request (same as mobile app)
    try:
        response = requests.post(
            'http://192.168.0.234:5001/api/register-device-secure',
            json=registration_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📥 Response Status: {response.status_code}")
        print(f"📥 Response Body: {response.text}")
        
        if response.status_code in [200, 201]:
            result = response.json()
            if result.get('success'):
                print("✅ Mobile app registration simulation successful!")
                print(f"   - Device ID: {result.get('device_id')}")
                print(f"   - Public Key ID: {result.get('public_key_id')}")
                print(f"   - Message: {result.get('message')}")
                return True
            else:
                print(f"❌ Mobile app registration failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def check_network_access():
    """Check if we can access the backend from the network"""
    print("🌐 Testing network access to backend...")
    
    # Test local access
    try:
        response = requests.get('http://localhost:5001/api/health', timeout=5)
        print(f"✅ Local access works: {response.status_code}")
    except Exception as e:
        print(f"❌ Local access failed: {str(e)}")
    
    # Test network access (same as mobile app)
    try:
        response = requests.get('http://192.168.0.234:5001/api/health', timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Network access works: {health_data.get('service')}")
            return True
        else:
            print(f"❌ Network access failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Network access failed: {str(e)}")
        return False

if __name__ == '__main__':
    print("📱 Mobile App Registration Flow Simulation")
    print("=" * 60)
    
    # Test network access
    if not check_network_access():
        print("❌ Cannot access backend from network, exiting...")
        exit(1)
    
    print()
    
    # Test mobile app registration
    if test_mobile_app_registration():
        print("\n✅ Mobile app registration simulation successful!")
        print("   The mobile app should be able to register with these steps.")
    else:
        print("\n❌ Mobile app registration simulation failed!")
        print("   There may be an issue with the mobile app's key generation or network access.")
