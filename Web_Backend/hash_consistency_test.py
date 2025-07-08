#!/usr/bin/env python3
"""
GeoCam Hash Consistency Test
Tests that client and server use consistent hashing for signature verification
"""

import json
import hashlib
from datetime import datetime

def test_hash_consistency():
    """Test that client and server hash data consistently"""
    
    print("🔍 TESTING HASH CONSISTENCY BETWEEN CLIENT AND SERVER")
    print("=" * 60)
    
    # Simulate client-side hashing (TypeScript)
    print("\n1. CLIENT-SIDE HASHING (Mobile App):")
    print("   📱 Language: TypeScript")
    print("   📦 Library: expo-crypto")
    print("   📊 Algorithm: SHA-512")
    
    # Client creates signing payload
    client_payload = {
        "imageData": "base64_encoded_image_data",
        "metadata": {"location": "test", "timestamp": "2025-07-08T22:30:00Z"},
        "timestamp": "2025-07-08T22:30:00Z",
        "publicKeyId": "geocam_12345_abc123"
    }
    
    client_data_to_sign = json.dumps(client_payload, separators=(',', ':'))
    print(f"   🔤 Data to sign: {client_data_to_sign}")
    
    # Client calculates hash
    client_hash = hashlib.sha512(client_data_to_sign.encode('utf-8')).hexdigest()
    print(f"   🔐 Client hash: {client_hash}")
    
    # Simulate server-side hashing (Python)
    print("\n2. SERVER-SIDE HASHING (Backend):")
    print("   🖥️  Language: Python")
    print("   📦 Library: hashlib")
    print("   📊 Algorithm: SHA-512")
    
    # Server receives image data and calculates hash
    server_image_data = "base64_encoded_image_data"
    server_hash = hashlib.sha512(server_image_data.encode('utf-8')).hexdigest()
    print(f"   🔤 Image data: {server_image_data}")
    print(f"   🔐 Server hash: {server_hash}")
    
    # CRITICAL FINDING: Hash mismatch!
    print("\n3. HASH COMPARISON:")
    print(f"   📱 Client hash: {client_hash}")
    print(f"   🖥️  Server hash: {server_hash}")
    
    if client_hash == server_hash:
        print("   ✅ Hashes match - signature verification will work")
    else:
        print("   ❌ Hashes DON'T match - signature verification will FAIL")
        print("   🚨 SECURITY ISSUE: Hash inconsistency detected!")
    
    return client_hash == server_hash

def identify_hash_mismatch_issue():
    """Identify the source of hash mismatch between client and server"""
    
    print("\n🚨 IDENTIFYING HASH MISMATCH ISSUE")
    print("=" * 60)
    
    print("\n1. CLIENT-SIDE PROCESS:")
    print("   📱 Creates signing payload: {imageData, metadata, timestamp, publicKeyId}")
    print("   📱 Serializes to JSON: JSON.stringify(payload)")
    print("   📱 Calculates hash: SHA512(JSON.stringify(payload))")
    print("   📱 Signs hash: secp256k1.sign(hash, private_key)")
    print("   📱 Sends to server: {image_data, signature, public_key_id}")
    
    print("\n2. SERVER-SIDE PROCESS:")
    print("   🖥️  Receives: {image_data, signature, public_key_id}")
    print("   🖥️  Calculates hash: SHA512(image_data)")
    print("   🖥️  Verifies signature: public_key.verify(signature, hash)")
    
    print("\n3. PROBLEM IDENTIFIED:")
    print("   ❌ Client signs hash of: JSON.stringify({imageData, metadata, timestamp, publicKeyId})")
    print("   ❌ Server verifies hash of: image_data only")
    print("   🚨 CRITICAL: Different data being hashed!")
    
    print("\n4. SECURITY IMPACT:")
    print("   🚨 Signature verification will ALWAYS FAIL")
    print("   🚨 No valid images can be verified")
    print("   🚨 System is effectively broken")
    
    return False

def propose_solution():
    """Propose solution to fix hash consistency"""
    
    print("\n✅ PROPOSED SOLUTION")
    print("=" * 60)
    
    print("\n1. OPTION A - Server matches client:")
    print("   🔧 Server reconstructs full payload: {imageData, metadata, timestamp, publicKeyId}")
    print("   🔧 Server calculates hash: SHA512(JSON.stringify(payload))")
    print("   🔧 Requires sending metadata and timestamp to server")
    
    print("\n2. OPTION B - Client matches server:")
    print("   🔧 Client calculates hash: SHA512(imageData)")
    print("   🔧 Client signs: secp256k1.sign(image_hash, private_key)")
    print("   🔧 Simpler and more secure (less data transmission)")
    
    print("\n3. RECOMMENDED SOLUTION:")
    print("   ✅ Use Option B - Client matches server")
    print("   ✅ Client signs SHA512(imageData) directly")
    print("   ✅ Server verifies SHA512(imageData) directly")
    print("   ✅ Metadata and timestamp for replay protection only")
    
    return True

def main():
    """Run hash consistency test"""
    
    print("🔍 GEOCAM HASH CONSISTENCY AUDIT")
    print("=" * 60)
    print("Testing signature verification hash consistency")
    print("Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Test consistency
    is_consistent = test_hash_consistency()
    
    if not is_consistent:
        identify_hash_mismatch_issue()
        propose_solution()
    
    print("\n" + "=" * 60)
    print("🎯 HASH CONSISTENCY ASSESSMENT")
    print("=" * 60)
    
    if is_consistent:
        print("✅ Hash consistency: VERIFIED")
        print("✅ Signature verification: WORKING")
    else:
        print("❌ Hash consistency: BROKEN")
        print("❌ Signature verification: WILL FAIL")
        print("🔧 Fix required: Align client and server hashing")
    
    return is_consistent

if __name__ == "__main__":
    main()
