#!/usr/bin/env python3
"""
Debug script to help identify the mobile app registration issue
"""

import requests
import json

def check_backend_logs():
    """Check backend logs for any registration attempts"""
    print("📊 Checking backend status...")
    
    try:
        response = requests.get('http://192.168.0.234:5001/api/health', timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Backend is healthy: {health_data.get('service')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check failed: {str(e)}")
        return False

def send_test_registration():
    """Send a test registration to trigger backend logging"""
    print("🧪 Sending test registration to trigger backend logs...")
    
    # Send an invalid registration to see the error handling
    test_data = {
        'installation_id': 'debug_test',
        'device_model': 'Debug Device',
        'os_name': 'Debug OS',
        'os_version': '1.0'
        # Missing public_key and device_fingerprint to trigger the error
    }
    
    try:
        response = requests.post(
            'http://192.168.0.234:5001/api/register-device-secure',
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📥 Response Status: {response.status_code}")
        print(f"📥 Response Body: {response.text}")
        
        if response.status_code == 400:
            print("✅ Backend is responding to invalid requests correctly")
        else:
            print("⚠️  Unexpected response from backend")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")

def main():
    print("🔍 Mobile App Registration Debug Helper")
    print("=" * 50)
    
    # Check backend health
    if not check_backend_logs():
        print("❌ Backend is not accessible, exiting...")
        exit(1)
    
    print()
    
    # Send test registration
    send_test_registration()
    
    print("\n📋 Debug Instructions:")
    print("1. Check the backend terminal for any registration attempts")
    print("2. If you see 'no public key available for registration' error:")
    print("   - The mobile app is trying to register but can't find keys")
    print("   - Check that initializeSecureKeys() is being called")
    print("   - Check that hasSecureKeys() returns true before registration")
    print("3. If you see network errors:")
    print("   - Check that the mobile app is using the correct IP: 192.168.0.234:5001")
    print("   - Check that CORS is enabled on the backend")
    print("4. If you see 'Key initialization failed' in mobile app:")
    print("   - Check that the secp256k1 key generation is working")
    print("   - Check that SecureStore is working properly")

if __name__ == '__main__':
    main()
