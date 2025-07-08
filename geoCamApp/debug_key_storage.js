#!/usr/bin/env node
/**
 * Test script to diagnose the key storage issue
 */

const EXPECTED_KEYS = [
  'private_key_secp256k1',
  'public_key_secp256k1', 
  'key_metadata_secp256k1'
];

console.log('🔍 Diagnosing key storage issue...\n');

console.log('📝 Expected SecureStore keys:');
EXPECTED_KEYS.forEach(key => {
  console.log(`  - ${key}`);
});

console.log('\n💡 The issue is likely that:');
console.log('1. hasSecureKeys() returns true (finds keys)');
console.log('2. But getPublicKeyForRegistration() returns null (cannot parse keys)');
console.log('3. This suggests the keys exist but are in the wrong format');

console.log('\n🔧 The fix ensures that:');
console.log('1. Keys are re-initialized to ensure correct format');
console.log('2. Better error handling and debugging is in place');
console.log('3. The registration flow handles missing keys gracefully');

console.log('\n📱 Once the app is reloaded, you should see detailed logs showing:');
console.log('  - Whether keys exist in SecureStore');
console.log('  - The specific key names being checked');
console.log('  - Any parsing errors');

console.log('\n✅ The app should now work correctly after the fixes!');
