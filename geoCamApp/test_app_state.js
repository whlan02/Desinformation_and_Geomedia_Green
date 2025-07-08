#!/usr/bin/env node
/**
 * Quick test to simulate the app state transitions
 */

// Simulate the state conditions
const testAppState = (keysInitialized, isInitializingKeys, registrationIsRegistered, registrationIsChecking) => {
  console.log('📱 App State Test:');
  console.log(`  keysInitialized: ${keysInitialized}`);
  console.log(`  isInitializingKeys: ${isInitializingKeys}`);
  console.log(`  registrationStatus.isRegistered: ${registrationIsRegistered}`);
  console.log(`  registrationStatus.isChecking: ${registrationIsChecking}`);
  
  // Status dot color
  const statusColor = keysInitialized && registrationIsRegistered ? '#4CAF50' : 
                      isInitializingKeys || registrationIsChecking ? '#FF9800' : '#F44336';
  
  // Status text
  const statusText = isInitializingKeys ? 'Initializing...' :
                     registrationIsChecking ? 'Checking registration...' :
                     !keysInitialized ? 'Key setup failed' :
                     !registrationIsRegistered ? 'Device not registered' :
                     'Ready to capture';
  
  console.log(`  Status: ${statusText} (${statusColor})`);
  
  // Button state
  const buttonDisabled = !keysInitialized || isInitializingKeys || !registrationIsRegistered || registrationIsChecking;
  console.log(`  Button disabled: ${buttonDisabled}`);
  
  return { statusText, statusColor, buttonDisabled };
};

console.log('🧪 Testing app state transitions...\n');

// Test 1: Initial state
console.log('Test 1: Initial state');
testAppState(false, true, false, false);

// Test 2: After keys are initialized, but registration is being checked
console.log('\nTest 2: Keys initialized, checking registration');
testAppState(true, true, false, true);

// Test 3: Keys initialized, registration check done, device registered
console.log('\nTest 3: Keys initialized, device registered');
testAppState(true, false, true, false);

// Test 4: Expected final state based on backend test
console.log('\nTest 4: Expected final state (should show "Ready to capture")');
testAppState(true, false, true, false);

console.log('\n✅ If the app is stuck on "Initializing..." but the device is registered,');
console.log('   it means isInitializingKeys is not being set to false properly.');
