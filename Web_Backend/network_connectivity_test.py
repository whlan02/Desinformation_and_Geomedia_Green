#!/usr/bin/env python3
"""
Test Mobile App Network Connectivity
Verify mobile app can connect to backend services from network
"""

import requests
import json
from datetime import datetime

def test_network_connectivity():
    """Test network connectivity to backend services"""
    print("📱 TESTING MOBILE APP NETWORK CONNECTIVITY")
    print("=" * 60)
    
    local_ip = "192.168.0.234"
    
    # Test 1: Backend service from network IP
    print(f"\n1. TESTING BACKEND SERVICE FROM NETWORK IP ({local_ip})")
    print("-" * 50)
    
    try:
        response = requests.get(f"http://{local_ip}:5001/api/health", timeout=10)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Backend Service: {health['service']}")
            print(f"   Version: {health['version']}")
            print(f"   Status: {health['status']}")
            print(f"   Accessible from: {local_ip}:5001")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend from network: {e}")
        print(f"   Mobile app will not be able to connect")
        return False
    
    # Test 2: Steganography service from network IP  
    print(f"\n2. TESTING STEGANOGRAPHY SERVICE FROM NETWORK IP ({local_ip})")
    print("-" * 50)
    
    try:
        response = requests.get(f"http://{local_ip}:3001/health", timeout=10)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Steganography Service: {health['service']}")
            print(f"   Port: {health['port']}")
            print(f"   Accessible from: {local_ip}:3001")
        else:
            print(f"❌ Steganography health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to steganography service from network: {e}")
        print(f"   Mobile app will not be able to connect")
        return False
    
    # Test 3: Test device registration from network IP
    print(f"\n3. TESTING DEVICE REGISTRATION FROM NETWORK IP")
    print("-" * 50)
    
    test_device_data = {
        "installation_id": "network_test_device",
        "device_model": "Network Test Device",
        "os_name": "iOS",
        "os_version": "17.1",
        "public_key": {
            "keyBase64": "A3y8rHN9qjX9jKlMn8P7tQvX8sY9mNqR5wP1tL7kM9sX",
            "keyId": "network_test_key_123",
            "algorithm": "secp256k1",
            "fingerprint": "network_test_fp"
        },
        "device_fingerprint": "network_test_device_fp",
        "registration_timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"http://{local_ip}:5001/api/register-device-secure",
            json=test_device_data,
            timeout=10
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Device registration successful from network")
            print(f"   Device ID: {result['device_id']}")
            print(f"   Public Key ID: {result['public_key_id']}")
        else:
            print(f"❌ Device registration failed from network: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Device registration error from network: {e}")
        return False
    
    # Test 4: Test ports are accessible
    print(f"\n4. TESTING PORT ACCESSIBILITY")
    print("-" * 50)
    
    import socket
    
    def test_port(host, port, service_name):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()
            if result == 0:
                print(f"✅ Port {port} ({service_name}) is accessible")
                return True
            else:
                print(f"❌ Port {port} ({service_name}) is not accessible")
                return False
        except Exception as e:
            print(f"❌ Error testing port {port}: {e}")
            return False
    
    port_5001_ok = test_port(local_ip, 5001, "Backend Service")
    port_3001_ok = test_port(local_ip, 3001, "Steganography Service")
    
    if not (port_5001_ok and port_3001_ok):
        print("\n🚨 FIREWALL WARNING:")
        print("   Some ports may be blocked by firewall")
        print("   Mobile app may not be able to connect")
        return False
    
    return True

def check_mobile_app_config():
    """Check if mobile app configuration is correct"""
    print(f"\n5. CHECKING MOBILE APP CONFIGURATION")
    print("-" * 50)
    
    try:
        with open('/Users/prince/Downloads/Desinformation_and_Geomedia_Green-main/geoCamApp/utils/backendConfig.ts', 'r') as f:
            config_content = f.read()
            
        # Check if the IP is correctly configured
        if '192.168.0.234:5001' in config_content:
            print("✅ Backend URL configured correctly in mobile app")
        else:
            print("❌ Backend URL not configured correctly in mobile app")
            return False
            
        if '192.168.0.234:3001' in config_content:
            print("✅ Steganography URL configured correctly in mobile app")
        else:
            print("❌ Steganography URL not configured correctly in mobile app")
            return False
            
        if 'USE_LOCAL_FOR_TESTING = true' in config_content:
            print("✅ Local testing enabled in mobile app")
        else:
            print("❌ Local testing not enabled in mobile app")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking mobile app config: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 GEOCAM MOBILE APP NETWORK CONNECTIVITY TEST")
    print("Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print(f"Local IP: 192.168.0.234")
    
    network_ok = test_network_connectivity()
    config_ok = check_mobile_app_config()
    
    print("\n" + "=" * 60)
    print("🎯 NETWORK CONNECTIVITY TEST SUMMARY")
    print("=" * 60)
    
    if network_ok and config_ok:
        print("✅ All network connectivity tests passed")
        print("✅ Backend services accessible from network")
        print("✅ Mobile app configuration is correct")
        print("✅ Mobile devices should be able to connect")
        
        print("\n📱 MOBILE APP CONNECTION INSTRUCTIONS:")
        print("1. Ensure your mobile device is on the same WiFi network")
        print("2. Scan the QR code with your mobile device")
        print("3. Open the GeoCam app")
        print("4. The app should connect to:")
        print(f"   - Backend: http://192.168.0.234:5001")
        print(f"   - Steganography: http://192.168.0.234:3001")
        
        print("\n🔧 TROUBLESHOOTING:")
        print("- If connection fails, check WiFi network")
        print("- Ensure no firewall blocking ports 5001 and 3001")
        print("- Verify device is on same network as this computer")
        
        print("\n🛡️  READY FOR MOBILE TESTING")
    else:
        print("❌ Some network connectivity tests failed")
        print("🔧 Issues to resolve:")
        
        if not network_ok:
            print("   - Backend services not accessible from network")
            print("   - Check firewall settings")
            print("   - Ensure services are running on 0.0.0.0")
        
        if not config_ok:
            print("   - Mobile app configuration incorrect")
            print("   - Update IP addresses in backendConfig.ts")
            print("   - Enable local testing mode")
    
    return network_ok and config_ok

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
