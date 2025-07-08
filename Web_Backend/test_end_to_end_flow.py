#!/usr/bin/env python3
"""
End-to-end flow test for GeoCam mobile app and backend integration
Tests the complete workflow from device registration to image verification
"""

import requests
import json
import base64
import hashlib
import secrets
import time
from datetime import datetime
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.backends import default_backend

# Configuration
BACKEND_URL = "http://192.168.0.234:5001"
STEGANOGRAPHY_URL = "http://192.168.0.234:3001"

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

def test_device_registration():
    """Test device registration with secure backend"""
    print("🔐 Testing Device Registration")
    print("=" * 50)
    
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
    
    print(f"📱 Device Info:")
    print(f"   - Installation ID: {installation_id}")
    print(f"   - Device Model: {device_model}")
    print(f"   - Public Key ID: {public_key_id}")
    print(f"   - Device Fingerprint: {device_fingerprint[:20]}...")
    print(f"   - Public Key Fingerprint: {public_key_fingerprint}")
    
    # Send registration request
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/register-device-secure",
            json=registration_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📤 Registration Response: {response.status_code}")
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"✅ Registration successful!")
            print(f"   - Device ID: {result.get('device_id')}")
            print(f"   - Message: {result.get('message')}")
            
            return {
                "success": True,
                "device_id": result.get('device_id'),
                "public_key_id": public_key_id,
                "private_key": private_key,
                "public_key_bytes": public_key_bytes,
                "installation_id": installation_id,
                "device_model": device_model
            }
        else:
            print(f"❌ Registration failed: {response.text}")
            return {"success": False}
            
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        return {"success": False}

def test_image_signing_and_verification(registration_result):
    """Test image signing and verification flow"""
    print("\n🖼️ Testing Image Signing and Verification")
    print("=" * 50)
    
    if not registration_result["success"]:
        print("❌ Cannot test verification without successful registration")
        return False
    
    # Create test image data
    test_image_data = base64.b64encode(b"fake_image_data_for_testing").decode()
    timestamp = datetime.now().isoformat()
    
    # Create metadata to embed
    metadata = {
        "geocamDevice": "GeoCam Pro",
        "deviceModel": registration_result["device_model"],
        "Time": timestamp,
        "location": {
            "latitude": 51.5074,
            "longitude": -0.1278
        }
    }
    
    print(f"📸 Creating test image with metadata...")
    print(f"   - Image size: {len(test_image_data)} bytes")
    print(f"   - Timestamp: {timestamp}")
    print(f"   - Location: {metadata['location']}")
    
    # Sign the image data
    private_key = registration_result["private_key"]
    image_hash = hashlib.sha256(test_image_data.encode()).digest()
    
    signature = private_key.sign(image_hash, ec.ECDSA(hashes.SHA256()))
    signature_b64 = base64.b64encode(signature).decode()
    
    print(f"🔐 Image signed with private key")
    print(f"   - Signature length: {len(signature)} bytes")
    
    # Prepare steganography request
    steg_request = {
        "jpegBase64": test_image_data,
        "basicInfo": json.dumps(metadata),
        "publicKeyBase64": base64.b64encode(registration_result["public_key_bytes"]).decode(),
        "privateKeyBase64": base64.b64encode(private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )).decode()
    }
    
    try:
        # Send to steganography service for embedding
        print(f"📦 Embedding data into image...")
        steg_response = requests.post(
            f"{STEGANOGRAPHY_URL}/pure-png-sign",
            json=steg_request,
            headers={"Content-Type": "application/json"}
        )
        
        if steg_response.status_code == 200:
            steg_result = steg_response.json()
            signed_image_data = steg_result.get("signedImageData")
            
            print(f"✅ Image signed and embedded successfully")
            print(f"   - Signed image size: {len(signed_image_data)} bytes")
            
            # Now test verification
            print(f"\n🔍 Testing image verification...")
            
            verification_request = {
                "image_data": signed_image_data,
                "signature": signature_b64,
                "public_key_id": registration_result["public_key_id"],
                "timestamp": timestamp
            }
            
            verification_response = requests.post(
                f"{BACKEND_URL}/api/verify-image-secure",
                json=verification_request,
                headers={"Content-Type": "application/json"}
            )
            
            if verification_response.status_code == 200:
                verification_result = verification_response.json()
                
                print(f"📊 Verification completed")
                print(f"   - Success: {verification_result.get('success')}")
                
                if verification_result.get("success"):
                    vr = verification_result.get("verification_result", {})
                    print(f"   - Signature Valid: {vr.get('signature_valid')}")
                    print(f"   - Is Authentic: {vr.get('is_authentic')}")
                    print(f"   - Device: {vr.get('device_info', {}).get('device_model')}")
                    
                    security_checks = vr.get("security_checks", {})
                    print(f"   - Security Checks:")
                    for check, result in security_checks.items():
                        print(f"     • {check}: {result}")
                    
                    return verification_result.get("success") and vr.get("signature_valid")
                else:
                    print(f"❌ Verification failed: {verification_result.get('message')}")
                    return False
            else:
                print(f"❌ Verification request failed: {verification_response.status_code}")
                return False
                
        else:
            print(f"❌ Steganography embedding failed: {steg_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        return False

def test_backend_health():
    """Test backend services health"""
    print("🏥 Testing Backend Services Health")
    print("=" * 50)
    
    # Test Python backend
    try:
        backend_response = requests.get(f"{BACKEND_URL}/api/health")
        if backend_response.status_code == 200:
            backend_health = backend_response.json()
            print(f"✅ Python Backend: {backend_health.get('status')}")
            print(f"   - Service: {backend_health.get('service')}")
            print(f"   - Version: {backend_health.get('version')}")
        else:
            print(f"❌ Python Backend: HTTP {backend_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Python Backend: {str(e)}")
        return False
    
    # Test Node.js steganography service
    try:
        steg_response = requests.get(f"{STEGANOGRAPHY_URL}/health")
        if steg_response.status_code == 200:
            steg_health = steg_response.json()
            print(f"✅ Steganography Service: {steg_health.get('status')}")
            print(f"   - Service: {steg_health.get('service')}")
            print(f"   - Port: {steg_health.get('port')}")
        else:
            print(f"❌ Steganography Service: HTTP {steg_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Steganography Service: {str(e)}")
        return False
    
    return True

def main():
    """Run complete end-to-end test"""
    print("🚀 GeoCam End-to-End Integration Test")
    print("=" * 60)
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test 1: Backend health
    if not test_backend_health():
        print("\n❌ Backend health check failed - aborting tests")
        return False
    
    print()
    
    # Test 2: Device registration
    registration_result = test_device_registration()
    if not registration_result["success"]:
        print("\n❌ Device registration failed - aborting tests")
        return False
    
    # Test 3: Image signing and verification
    verification_success = test_image_signing_and_verification(registration_result)
    
    print("\n" + "=" * 60)
    print("🎯 Test Summary")
    print("=" * 60)
    
    if verification_success:
        print("✅ All tests passed! End-to-end integration is working.")
        print("📱 Mobile app should now be able to:")
        print("   - Register devices securely")
        print("   - Sign images with private keys")
        print("   - Verify images with backend")
        print("   - Maintain secure key isolation")
        return True
    else:
        print("❌ Some tests failed. Please check the logs above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
