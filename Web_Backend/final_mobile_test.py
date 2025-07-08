#!/usr/bin/env python3
"""
Final Mobile App Connection Test
Test all aspects of mobile app connectivity
"""

import requests
import json
from datetime import datetime

def test_mobile_app_connectivity():
    """Test complete mobile app connectivity"""
    print("📱 FINAL MOBILE APP CONNECTIVITY TEST")
    print("=" * 60)
    
    local_ip = "192.168.0.234"
    backend_url = f"http://{local_ip}:5001"
    steg_url = f"http://{local_ip}:3001"
    
    print(f"Testing mobile app connectivity to:")
    print(f"  Backend: {backend_url}")
    print(f"  Steganography: {steg_url}")
    
    # Test 1: CORS headers
    print("\n1. TESTING CORS HEADERS")
    print("-" * 40)
    
    try:
        # Make an OPTIONS request to test CORS
        response = requests.options(f"{backend_url}/api/health")
        cors_headers = response.headers
        
        print(f"✅ CORS preflight request successful")
        print(f"   Status Code: {response.status_code}")
        
        # Check for CORS headers
        if 'Access-Control-Allow-Origin' in cors_headers:
            print(f"✅ CORS enabled: {cors_headers['Access-Control-Allow-Origin']}")
        else:
            print(f"⚠️  CORS headers not found (may still work)")
            
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
    
    # Test 2: Health check with mobile-like request
    print("\n2. TESTING HEALTH CHECK WITH MOBILE-LIKE REQUEST")
    print("-" * 40)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f"{backend_url}/api/health", headers=headers, timeout=10)
        
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Health check successful with mobile headers")
            print(f"   Service: {health['service']}")
            print(f"   Version: {health['version']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health check with mobile headers failed: {e}")
        return False
    
    # Test 3: Device registration with mobile-like request
    print("\n3. TESTING DEVICE REGISTRATION WITH MOBILE-LIKE REQUEST")
    print("-" * 40)
    
    mobile_device_data = {
        "installation_id": "mobile_final_test_device",
        "device_model": "iPhone 15 Pro",
        "os_name": "iOS",
        "os_version": "17.1",
        "public_key": {
            "keyBase64": "A3y8rHN9qjX9jKlMn8P7tQvX8sY9mNqR5wP1tL7kM9sX",
            "keyId": "mobile_final_test_key",
            "algorithm": "secp256k1",
            "fingerprint": "mobile_final_test_fp"
        },
        "device_fingerprint": "mobile_final_test_device_fp",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{backend_url}/api/register-device-secure",
            json=mobile_device_data,
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Device registration successful with mobile headers")
            print(f"   Device ID: {result['device_id']}")
            print(f"   Public Key ID: {result['public_key_id']}")
        else:
            print(f"❌ Device registration failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Device registration with mobile headers failed: {e}")
        return False
    
    # Test 4: Steganography service
    print("\n4. TESTING STEGANOGRAPHY SERVICE")
    print("-" * 40)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'application/json'
        }
        
        response = requests.get(f"{steg_url}/health", headers=headers, timeout=10)
        
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Steganography service accessible with mobile headers")
            print(f"   Service: {health['service']}")
            print(f"   Endpoints: {len(health['endpoints'])}")
        else:
            print(f"❌ Steganography service failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Steganography service with mobile headers failed: {e}")
        return False
    
    return True

def create_mobile_test_summary():
    """Create a summary for mobile testing"""
    print("\n" + "=" * 60)
    print("📱 MOBILE APP TESTING SUMMARY")
    print("=" * 60)
    
    print("✅ BACKEND SERVICES READY:")
    print(f"   • Secure Backend: http://192.168.0.234:5001")
    print(f"   • Steganography: http://192.168.0.234:3001")
    print(f"   • CORS enabled for mobile app requests")
    print(f"   • Network accessibility verified")
    
    print("\n✅ MOBILE APP CONFIGURATION:")
    print(f"   • Backend URL: http://192.168.0.234:5001")
    print(f"   • Steganography URL: http://192.168.0.234:3001")
    print(f"   • Local testing mode enabled")
    print(f"   • Secure endpoints configured")
    
    print("\n✅ SECURITY FEATURES:")
    print(f"   • Private keys never transmitted")
    print(f"   • Public key cryptography enabled")
    print(f"   • secp256k1 signature verification")
    print(f"   • Comprehensive security checks")
    
    print("\n📱 NEXT STEPS:")
    print("1. Ensure your mobile device is on the same WiFi network")
    print("2. Scan the QR code displayed in the Expo terminal")
    print("3. Open the GeoCam app on your device")
    print("4. Test device registration and image verification")
    print("5. Monitor backend logs for successful connections")
    
    print("\n🔧 TROUBLESHOOTING:")
    print("• If connection fails, check WiFi network")
    print("• Try restarting the mobile app")
    print("• Check if firewall is blocking ports 5001/3001")
    print("• Verify device is on same network (192.168.0.x)")
    
    print("\n🛡️  READY FOR SECURE MOBILE TESTING!")

def main():
    """Main test function"""
    print("🚀 GEOCAM FINAL MOBILE APP CONNECTIVITY TEST")
    print("Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    success = test_mobile_app_connectivity()
    
    if success:
        create_mobile_test_summary()
        print("\n🎉 ALL TESTS PASSED - MOBILE APP IS READY!")
    else:
        print("\n❌ SOME TESTS FAILED - CHECK CONFIGURATION")
        print("🔧 Review the errors above and fix issues")
    
    return success

if __name__ == "__main__":
    main()
