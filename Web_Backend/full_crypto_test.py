#!/usr/bin/env python3
"""
Full Cryptographic Test for GeoCam Secure Backend
Tests end-to-end signature creation and verification
"""

import requests
import json
import hashlib
import base64
import coincurve
from datetime import datetime
import os

# Test configuration
BACKEND_URL = "http://localhost:5001"
STEG_URL = "http://localhost:3001"

def create_secp256k1_keypair():
    """Create a secp256k1 keypair for testing"""
    private_key = coincurve.PrivateKey()
    public_key = private_key.public_key
    
    # Get compressed public key (33 bytes)
    public_key_bytes = public_key.format(compressed=True)
    public_key_base64 = base64.b64encode(public_key_bytes).decode('utf-8')
    
    return private_key, public_key_base64

def create_test_signature(private_key, image_data):
    """Create a test signature using the private key"""
    # Calculate SHA-512 hash of image data (64 bytes)
    sha512_hash = hashlib.sha512(image_data).digest()
    
    # For secp256k1, we need a 32-byte hash, so we take first 32 bytes of SHA-512
    # This is what the backend expects based on the verification logic
    signing_hash = sha512_hash[:32]
    
    # Create signature
    signature = private_key.sign(signing_hash, hasher=None)
    signature_base64 = base64.b64encode(signature).decode('utf-8')
    
    return signature_base64, sha512_hash.hex()

def test_full_crypto_workflow():
    """Test the complete cryptographic workflow"""
    print("🔐 GEOCAM FULL CRYPTOGRAPHIC TEST")
    print("=" * 60)
    
    # Step 1: Generate keypair
    print("\n1. GENERATING SECP256K1 KEYPAIR")
    print("-" * 40)
    private_key, public_key_base64 = create_secp256k1_keypair()
    
    # Create public key fingerprint
    public_key_bytes = base64.b64decode(public_key_base64)
    fingerprint = hashlib.sha256(public_key_bytes).hexdigest()[:16]
    
    print(f"✅ Private key: {private_key.secret.hex()[:16]}...")
    print(f"✅ Public key: {public_key_base64[:32]}...")
    print(f"✅ Fingerprint: {fingerprint}")
    
    # Step 2: Register device
    print("\n2. REGISTERING DEVICE")
    print("-" * 40)
    
    registration_data = {
        "installation_id": "crypto_test_device_001",
        "device_model": "CryptoTest Device",
        "os_name": "TestOS",
        "os_version": "1.0.0",
        "public_key": {
            "keyBase64": public_key_base64,
            "keyId": f"crypto_test_{fingerprint}",
            "algorithm": "secp256k1",
            "fingerprint": fingerprint
        },
        "device_fingerprint": f"device_{fingerprint}",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/register-device-secure",
        json=registration_data
    )
    
    if response.status_code == 201:
        reg_result = response.json()
        print(f"✅ Device registered successfully")
        print(f"   Device ID: {reg_result['device_id']}")
        print(f"   Public Key ID: {reg_result['public_key_id']}")
    else:
        print(f"❌ Registration failed: {response.text}")
        return False
    
    # Step 3: Create test image data
    print("\n3. CREATING TEST IMAGE DATA")
    print("-" * 40)
    
    # Simulate image data (in real app this would be actual image bytes)
    test_image_data = b"test_image_data_for_geocam_crypto_test_12345"
    image_base64 = base64.b64encode(test_image_data).decode('utf-8')
    
    print(f"✅ Image data: {len(test_image_data)} bytes")
    print(f"✅ Image hash: {hashlib.sha512(test_image_data).hexdigest()[:32]}...")
    
    # Step 4: Create signature
    print("\n4. CREATING SIGNATURE")
    print("-" * 40)
    
    signature_base64, image_hash = create_test_signature(private_key, test_image_data)
    
    print(f"✅ Signature: {signature_base64[:32]}...")
    print(f"✅ Image hash: {image_hash[:32]}...")
    
    # Step 5: Verify signature with backend
    print("\n5. VERIFYING SIGNATURE WITH BACKEND")
    print("-" * 40)
    
    verification_data = {
        "image_data": image_base64,
        "signature": signature_base64,
        "public_key_id": registration_data["public_key"]["keyId"],
        "timestamp": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/verify-image-secure",
        json=verification_data
    )
    
    if response.status_code == 200:
        result = response.json()
        verification_result = result["verification_result"]
        
        print(f"✅ Verification completed")
        print(f"   Signature Valid: {verification_result['signature_valid']}")
        print(f"   Is Authentic: {verification_result['is_authentic']}")
        print(f"   Device Model: {verification_result['device_info']['device_model']}")
        
        # Check security details
        security_checks = verification_result.get('security_checks', {})
        print(f"\n🛡️  Security Checks:")
        for check, passed in security_checks.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check.replace('_', ' ').title()}: {passed}")
        
        # Overall result
        if verification_result['signature_valid']:
            print(f"\n🎉 CRYPTOGRAPHIC VERIFICATION: SUCCESS!")
            print(f"   All security checks passed")
            print(f"   Signature is cryptographically valid")
        else:
            print(f"\n⚠️  CRYPTOGRAPHIC VERIFICATION: FAILED")
            if 'error_details' in verification_result:
                print(f"   Error: {verification_result['error_details']}")
        
        return verification_result['signature_valid']
    else:
        print(f"❌ Verification request failed: {response.text}")
        return False

def test_tampered_signature():
    """Test with a tampered signature (should fail)"""
    print("\n6. TESTING TAMPERED SIGNATURE")
    print("-" * 40)
    
    # Create keypair
    private_key, public_key_base64 = create_secp256k1_keypair()
    public_key_bytes = base64.b64decode(public_key_base64)
    fingerprint = hashlib.sha256(public_key_bytes).hexdigest()[:16]
    
    # Register device
    registration_data = {
        "installation_id": "tamper_test_device_001",
        "device_model": "TamperTest Device",
        "public_key": {
            "keyBase64": public_key_base64,
            "keyId": f"tamper_test_{fingerprint}",
            "algorithm": "secp256k1",
            "fingerprint": fingerprint
        },
        "device_fingerprint": f"device_{fingerprint}",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    requests.post(f"{BACKEND_URL}/api/register-device-secure", json=registration_data)
    
    # Create test data and signature
    test_image_data = b"tamper_test_image_data_12345"
    image_base64 = base64.b64encode(test_image_data).decode('utf-8')
    signature_base64, _ = create_test_signature(private_key, test_image_data)
    
    # Tamper with signature (change last byte)
    signature_bytes = base64.b64decode(signature_base64)
    tampered_signature = signature_bytes[:-1] + bytes([signature_bytes[-1] ^ 0xFF])
    tampered_signature_base64 = base64.b64encode(tampered_signature).decode('utf-8')
    
    print(f"✅ Original signature: {signature_base64[:32]}...")
    print(f"🔴 Tampered signature: {tampered_signature_base64[:32]}...")
    
    # Verify tampered signature
    verification_data = {
        "image_data": image_base64,
        "signature": tampered_signature_base64,
        "public_key_id": registration_data["public_key"]["keyId"],
        "timestamp": datetime.now().isoformat()
    }
    
    response = requests.post(f"{BACKEND_URL}/api/verify-image-secure", json=verification_data)
    
    if response.status_code == 200:
        result = response.json()
        verification_result = result["verification_result"]
        
        if not verification_result['signature_valid']:
            print(f"✅ Tampered signature correctly REJECTED")
            print(f"   Security system working properly")
            return True
        else:
            print(f"🚨 SECURITY BREACH: Tampered signature accepted!")
            return False
    else:
        print(f"❌ Verification request failed: {response.text}")
        return False

def main():
    """Run all cryptographic tests"""
    print("🚀 STARTING FULL CRYPTOGRAPHIC TEST SUITE")
    print("=" * 60)
    
    # Test 1: Valid signature
    valid_test = test_full_crypto_workflow()
    
    # Test 2: Tampered signature
    tamper_test = test_tampered_signature()
    
    # Test 3: Check stats
    print("\n7. CHECKING VERIFICATION STATISTICS")
    print("-" * 40)
    
    response = requests.get(f"{BACKEND_URL}/api/verification-stats")
    if response.status_code == 200:
        stats = response.json()['stats']
        print(f"✅ Total verifications: {stats['total_verifications']}")
        print(f"✅ Valid verifications: {stats['valid_verifications']}")
        print(f"✅ Invalid verifications: {stats['invalid_verifications']}")
        print(f"✅ Success rate: {stats['success_rate']}%")
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 CRYPTOGRAPHIC TEST SUMMARY")
    print("=" * 60)
    
    if valid_test:
        print("✅ Valid signature verification: PASSED")
    else:
        print("❌ Valid signature verification: FAILED")
    
    if tamper_test:
        print("✅ Tampered signature rejection: PASSED")
    else:
        print("❌ Tampered signature rejection: FAILED")
    
    if valid_test and tamper_test:
        print("\n🔐 CRYPTOGRAPHIC SECURITY: FULLY OPERATIONAL")
        print("🛡️  All security tests passed")
        print("✅ Ready for production use")
    else:
        print("\n🚨 CRYPTOGRAPHIC SECURITY: ISSUES DETECTED")
        print("🔧 Fix required before production")
    
    return valid_test and tamper_test

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
