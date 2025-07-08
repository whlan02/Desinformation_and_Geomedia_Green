#!/usr/bin/env python3
"""
Debug Device Registration Issue
Test what the mobile app is sending vs what backend expects
"""

import requests
import json
from datetime import datetime

def test_registration_debug():
    """Debug registration with different data formats"""
    print("🔍 DEBUGGING DEVICE REGISTRATION")
    print("=" * 50)
    
    local_ip = "192.168.0.234"
    backend_url = f"http://{local_ip}:5001"
    
    # Test 1: Try registration with proper format
    print("\n1. TESTING PROPER REGISTRATION FORMAT")
    print("-" * 40)
    
    proper_data = {
        "installation_id": "test_device_unique_id_12345",
        "device_model": "Test Device",
        "os_name": "iOS",
        "os_version": "17.1",
        "public_key": {
            "keyBase64": "A3y8rHN9qjX9jKlMn8P7tQvX8sY9mNqR5wP1tL7kM9sX",
            "keyId": "test_key_id_different_from_installation",
            "algorithm": "secp256k1",
            "fingerprint": "test_fingerprint"
        },
        "device_fingerprint": "test_device_fingerprint",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"{backend_url}/api/register-device-secure",
            json=proper_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code != 201:
            print("❌ Proper format failed")
        else:
            print("✅ Proper format worked")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Test 2: Try registration with missing fields
    print("\n2. TESTING MISSING FIELDS")
    print("-" * 40)
    
    missing_data = {
        "installation_id": "test_device_missing_fields",
        "device_model": "Test Device",
        # Missing os_name, os_version (these are optional)
        "public_key": {
            "keyBase64": "A3y8rHN9qjX9jKlMn8P7tQvX8sY9mNqR5wP1tL7kM9sX",
            "keyId": "test_key_missing_fields",
            "algorithm": "secp256k1",
            "fingerprint": "test_fingerprint"
        },
        "device_fingerprint": "test_device_fingerprint",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"{backend_url}/api/register-device-secure",
            json=missing_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Test 3: Try registration with same installation_id as key_id (like mobile app)
    print("\n3. TESTING SAME INSTALLATION_ID AS KEY_ID")
    print("-" * 40)
    
    same_id_data = {
        "installation_id": "same_id_test_12345",
        "device_model": "Test Device",
        "os_name": "iOS",
        "os_version": "17.1",
        "public_key": {
            "keyBase64": "A3y8rHN9qjX9jKlMn8P7tQvX8sY9mNqR5wP1tL7kM9sX",
            "keyId": "same_id_test_12345",  # Same as installation_id
            "algorithm": "secp256k1",
            "fingerprint": "test_fingerprint"
        },
        "device_fingerprint": "test_device_fingerprint",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"{backend_url}/api/register-device-secure",
            json=same_id_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Test 4: Test what happens with duplicate installation_id
    print("\n4. TESTING DUPLICATE INSTALLATION_ID")
    print("-" * 40)
    
    duplicate_data = {
        "installation_id": "same_id_test_12345",  # Same as previous
        "device_model": "Test Device 2",
        "os_name": "iOS",
        "os_version": "17.1",
        "public_key": {
            "keyBase64": "A3y8rHN9qjX9jKlMn8P7tQvX8sY9mNqR5wP1tL7kM9sX",
            "keyId": "different_key_id_12345",  # Different key ID
            "algorithm": "secp256k1",
            "fingerprint": "test_fingerprint_2"
        },
        "device_fingerprint": "test_device_fingerprint_2",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"{backend_url}/api/register-device-secure",
            json=duplicate_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ Request failed: {e}")

def main():
    print("🚀 DEVICE REGISTRATION DEBUG TEST")
    print("Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    test_registration_debug()
    
    print("\n" + "=" * 50)
    print("🔍 DEBUG COMPLETE")
    print("Check the backend logs for detailed error messages")

if __name__ == "__main__":
    main()
