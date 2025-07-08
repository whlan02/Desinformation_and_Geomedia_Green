#!/usr/bin/env python3
"""
Test script to simulate the mobile app's registration flow and check what's happening
"""
import json
import requests
import time

# Backend configuration
BASE_URL = "http://192.168.0.234:5001"
INSTALLATION_ID = "install_mcghwk1x_2o565y4n1i4736y"

def test_registration_flow():
    """
    Test the registration flow to see what's happening
    """
    print("🧪 Testing registration flow...")
    
    # Check if device is registered
    print("🔍 Checking device registration...")
    try:
        response = requests.get(f"{BASE_URL}/api/devices-secure")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend responded with {len(data.get('devices', []))} registered devices")
            
            # Find our device
            found_device = None
            for device in data.get('devices', []):
                if device.get('installation_id') == INSTALLATION_ID:
                    found_device = device
                    break
            
            if found_device:
                print(f"✅ Device found: {found_device['public_key_id']}")
                print(f"📱 Device model: {found_device['device_model']}")
                print(f"🆔 Installation ID: {found_device['installation_id']}")
                print(f"📅 Last activity: {found_device['last_activity']}")
                print(f"🔑 Public key fingerprint: {found_device['public_key_fingerprint']}")
                return True
            else:
                print(f"❌ Device not found with installation ID: {INSTALLATION_ID}")
                return False
        else:
            print(f"❌ Backend request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking registration: {e}")
        return False

def main():
    print("🔧 Mobile App Registration Flow Simulation")
    print("=" * 50)
    
    # Test registration check
    is_registered = test_registration_flow()
    
    if is_registered:
        print("\n✅ RESULT: Device is registered - app should show 'Ready to capture'")
    else:
        print("\n❌ RESULT: Device is not registered - app should show 'Device not registered'")
    
    print("\n💡 If app shows 'Initializing...' but device is registered, it's likely a state update issue")

if __name__ == "__main__":
    main()
