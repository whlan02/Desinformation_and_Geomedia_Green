#!/usr/bin/env python3
"""
Simple test for basic backend functionality
"""

import requests
import json
import time

API_BASE_URL = "http://localhost:5000"

def test_device_registration():
    print("🧪 Testing Device Registration with Complex Data...")
    
    # Complex device data that was failing
    device_data = {
        "installation_id": "test_install_complex_123",
        "device_model": "Test iPhone 15 Pro",
        "os_name": "iOS",
        "os_version": "17.0",
        "public_key_hash": "test_hash_123",
        "public_key_data": {
            "keyId": "test_key_id",
            "hash": "test_public_key_hash",
            "algorithm": "ECDSA",
            "curve": "P-256",
            "privateKeyHashForVerification": "test_private_hash"
        }
    }
    
    try:
        response = requests.post('http://localhost:5000/api/register-device', 
                               json=device_data, 
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Complex device registration successful!")
            return True
        else:
            print(f"❌ Complex device registration failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_simple_device_registration():
    print("🧪 Testing Simple Device Registration...")
    
    # Simple device data
    device_data = {
        "installation_id": "test_install_simple_456",
        "device_model": "Test Device Simple"
    }
    
    try:
        response = requests.post('http://localhost:5000/api/register-device', 
                               json=device_data, 
                               timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Simple device registration successful!")
            return True
        else:
            print(f"❌ Simple device registration failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_get_devices():
    """Test get devices"""
    print("\n📋 Testing Get Devices...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/devices", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ Got {len(result.get('devices', []))} devices")
                return True
        
        return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Device Registration Debug Test")
    print("=" * 50)
    
    # Test simple first
    simple_result = test_simple_device_registration()
    print()
    
    # Test complex
    complex_result = test_device_registration()
    
    print()
    print("=" * 50)
    print(f"Simple Registration: {'✅ PASSED' if simple_result else '❌ FAILED'}")
    print(f"Complex Registration: {'✅ PASSED' if complex_result else '❌ FAILED'}")
    
    # Test health first
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Service is running")
        else:
            print("❌ API Service not responding")
            exit(1)
    except:
        print("❌ Cannot connect to API service")
        exit(1)
    
    # Test basic functionality
    test_get_devices() 