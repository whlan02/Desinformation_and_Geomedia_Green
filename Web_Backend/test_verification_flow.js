const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

// Test the complete verification flow
async function testVerificationFlow() {
  console.log('🧪 Testing verification flow...');
  
  // Create a test image (1x1 PNG)
  const testImagePath = path.join(__dirname, 'temp_images', 'test_image.png');
  
  // Create a minimal 1x1 PNG for testing
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  // Write test image
  fs.writeFileSync(testImagePath, pngData);
  console.log('✅ Test image created:', testImagePath);
  
  // Test the steganography service directly
  console.log('\n🔍 Testing steganography service directly...');
  
  const testImageBase64 = fs.readFileSync(testImagePath).toString('base64');
  
  // First, try to verify the test image (should fail with no signature)
  const testData = {
    pngBase64: testImageBase64
  };
  
  try {
    const response = await fetch('http://localhost:3001/pure-png-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('📊 Test verification result:', result);
    
  } catch (error) {
    console.error('❌ Test verification failed:', error);
  }
  
  // Clean up
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
  
  console.log('\n🎉 Test completed');
}

// Run the test
testVerificationFlow().catch(console.error);
