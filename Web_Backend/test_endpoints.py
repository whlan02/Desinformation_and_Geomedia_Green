#!/usr/bin/env python3
"""
Test script for GeoCam Backend API endpoints
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:5000"
STEG_BASE_URL = "http://localhost:3001"

def test_health_checks():
    """Test health check endpoints"""
    print("🔍 Testing Health Checks...")
    
    try:
        # Test API service health
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Service health check passed")
        else:
            print(f"❌ API Service health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Service unreachable: {e}")
        return False
    
    try:
        # Test Steganography service health
        response = requests.get(f"{STEG_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Steganography Service health check passed")
        else:
            print(f"❌ Steganography Service health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Steganography Service unreachable: {e}")
        return False
    
    return True

def test_device_registration():
    """Test device registration endpoint"""
    print("\n📱 Testing Device Registration...")
    
    test_device = {
        "installation_id": f"test_install_{int(time.time())}",
        "device_model": "Test iPhone 15 Pro",
        "os_name": "iOS",
        "os_version": "17.1",
        "public_key_data": {
            "type": "device-crypto",
            "hash": "test_public_key_hash_123",
            "keyId": f"test_key_{int(time.time())}",
            "generatedAt": datetime.now().isoformat()
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/register-device",
            json=test_device,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ Device registered successfully as {result.get('message', 'GeoCam device')}")
                return test_device['installation_id']
            else:
                print(f"❌ Device registration failed: {result}")
                return None
        else:
            print(f"❌ Device registration failed with status {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Device registration error: {e}")
        return None

def test_get_devices():
    """Test get all devices endpoint"""
    print("\n📋 Testing Get All Devices...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/devices", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                devices = result.get('devices', [])
                print(f"✅ Retrieved {len(devices)} registered devices")
                
                if devices:
                    print("📱 Sample device info:")
                    sample = devices[0]
                    print(f"   • {sample.get('geocam_name')}: {sample.get('device_model')}")
                    print(f"   • Registered: {sample.get('registration_date', 'Unknown')}")
                
                return True
            else:
                print(f"❌ Failed to get devices: {result}")
                return False
        else:
            print(f"❌ Get devices failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Get devices error: {e}")
        return False

def test_stats():
    """Test statistics endpoint"""
    print("\n📊 Testing Statistics...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/stats", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                stats = result.get('stats', {})
                print(f"✅ System statistics retrieved:")
                print(f"   • Total devices: {stats.get('total_devices', 0)}")
                print(f"   • Active devices: {stats.get('active_devices', 0)}")
                
                latest = stats.get('latest_registration')
                if latest:
                    print(f"   • Latest registration: {latest.get('geocam_name')} ({latest.get('device_model')})")
                
                return True
            else:
                print(f"❌ Failed to get stats: {result}")
                return False
        else:
            print(f"❌ Get stats failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Get stats error: {e}")
        return False

def create_test_image():
    """Create a simple test image for verification testing"""
    try:
        from PIL import Image
        import io
        
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        return img_bytes
    except ImportError:
        print("⚠️ PIL not available, skipping image verification test")
        return None

def test_image_verification():
    """Test image verification endpoint (without actual steganographic data)"""
    print("\n🔍 Testing Image Verification...")
    
    test_image = create_test_image()
    if not test_image:
        print("⏭️ Skipping image verification test (PIL not available)")
        return True
    
    try:
        files = {'image': ('test.jpg', test_image, 'image/jpeg')}
        data = {'installation_id': 'test_install_verification'}
        
        response = requests.post(
            f"{API_BASE_URL}/api/verify-image",
            files=files,
            data=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Image verification endpoint responded successfully")
            
            if result.get('success'):
                print("   • Steganography decoding completed")
                sig_verification = result.get('signature_verification', {})
                print(f"   • Signature verification: {sig_verification.get('message', 'Unknown')}")
            else:
                print("   • No hidden data found (expected for test image)")
            
            return True
        else:
            print(f"❌ Image verification failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Image verification error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 GeoCam Backend API Tests")
    print("=" * 50)
    
    tests = [
        ("Health Checks", test_health_checks),
        ("Device Registration", test_device_registration),
        ("Get All Devices", test_get_devices),
        ("System Statistics", test_stats),
        ("Image Verification", test_image_verification),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        try:
            result = test_func()
            if result:
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main() 