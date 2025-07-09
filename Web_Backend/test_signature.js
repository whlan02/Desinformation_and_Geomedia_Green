const crypto = require('crypto');
const fs = require('fs');

// Test the OPTIMIZED signature embedding and extraction logic
function testOptimizedSignatureConsistency() {
  console.log('🧪 Testing OPTIMIZED signature embedding/extraction consistency...');
  
  // Create a test signature package
  const testSignature = {
    publicKey: 'test-public-key-base64',
    signature: 'test-signature-base64',
    timestamp: new Date().toISOString(),
    version: '3.0-optimized'
  };
  
  const signatureJson = JSON.stringify(testSignature);
  console.log('📝 Test signature JSON:', signatureJson);
  console.log('📝 Test signature JSON length:', signatureJson.length);
  
  // OPTIMIZED APPROACH: Direct byte embedding
  const testAlphaChannels = [];
  
  // Embed (direct character to bytes)
  for (let i = 0; i < signatureJson.length; i++) {
    const char = signatureJson[i];
    const charCode = char.charCodeAt(0);
    
    // Split 16-bit character into two 8-bit bytes (MSB first)
    const highByte = (charCode >> 8) & 0xFF;
    const lowByte = charCode & 0xFF;
    
    testAlphaChannels.push(highByte);
    testAlphaChannels.push(lowByte);
  }
  
  console.log('🔐 Embedded in', testAlphaChannels.length, 'alpha channels');
  console.log('🔐 Test alpha channels (first 10):', testAlphaChannels.slice(0, 10));
  
  // Extract (direct bytes to characters)
  let extractedString = '';
  for (let i = 0; i < testAlphaChannels.length - 1; i += 2) {
    const highByte = testAlphaChannels[i];
    const lowByte = testAlphaChannels[i + 1] || 0;
    
    // MSB first: highByte is high byte, lowByte is low byte
    const charCode = (highByte << 8) | lowByte;
    
    if (charCode === 0) break; // Null terminator
    extractedString += String.fromCharCode(charCode);
  }
  
  console.log('📝 Extracted string length:', extractedString.length);
  console.log('📝 Extracted string:', extractedString);
  
  // Compare
  const match = extractedString === signatureJson;
  console.log('✅ OPTIMIZED signature consistency test:', match ? 'PASSED' : 'FAILED');
  
  if (!match) {
    console.log('❌ Original:', signatureJson);
    console.log('❌ Extracted:', extractedString);
  }
  
  return match;
}

// Run the test
testOptimizedSignatureConsistency();
