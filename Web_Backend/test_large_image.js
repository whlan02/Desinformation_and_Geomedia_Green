const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');

// Test with larger image (like mobile app)
async function testWithLargerImage() {
  console.log('🧪 Testing with larger image (like mobile app)...');
  
  try {
    // Create a larger test image (1000x500 PNG)
    const width = 1000;
    const height = 500;
    const png = new PNG({ width, height });
    
    // Fill with some test data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = Math.floor(Math.random() * 256); // R
        png.data[idx + 1] = Math.floor(Math.random() * 256); // G
        png.data[idx + 2] = Math.floor(Math.random() * 256); // B
        png.data[idx + 3] = 255; // A
      }
    }
    
    // Convert to buffer
    const chunks = [];
    png.pack()
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', async () => {
        const pngBuffer = Buffer.concat(chunks);
        const pngBase64 = pngBuffer.toString('base64');
        
        console.log('✅ Large test PNG created:', width, 'x', height);
        console.log('📊 PNG buffer size:', pngBuffer.length);
        console.log('📊 Last row can fit:', Math.floor(width / 2), 'characters');
        
        // Test the workflow with this larger image
        console.log('\n🔐 Testing image processing workflow with larger image...');
        
        // Test basic info
        const basicInfo = JSON.stringify({
          timestamp: new Date().toISOString(),
          location: { lat: 37.7749, lng: -122.4194 },
          device: 'test-device-large-image',
          version: '1.0.0',
          additionalData: 'This is additional metadata for testing purposes',
          imageInfo: { width, height, channels: 4 }
        });
        
        // Realistic public key (Base64 encoded secp256k1 public key)
        const publicKey = 'A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456';
        
        // Step 1: Process the image
        console.log('\n📤 Step 1: Processing larger image...');
        
        const processData = {
          jpegBase64: pngBase64, // Use PNG as fake JPEG for testing
          basicInfo: basicInfo,
          publicKey: publicKey
        };
        
        const processResponse = await fetch('http://localhost:3001/process-geocam-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(processData)
        });
        
        const processResult = await processResponse.json();
        console.log('📊 Process result success:', processResult.success);
        
        if (processResult.success) {
          // Step 2: Complete with realistic signature
          console.log('\n📤 Step 2: Completing with realistic signature...');
          
          const sessionId = processResult.sessionId;
          const hashToSign = processResult.hashToSign;
          
          // Create a realistic secp256k1 signature (64 chars hex = 32 bytes)
          const signature = crypto.createHash('sha256').update(hashToSign + 'salt').digest('hex');
          
          const completeResponse = await fetch('http://localhost:3001/complete-geocam-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId,
              signature
            })
          });
          
          const completeResult = await completeResponse.json();
          console.log('📊 Complete result success:', completeResult.success);
          
          if (completeResult.success) {
            // Step 3: Verify the signed image
            console.log('\n🔍 Step 3: Verifying signed larger image...');
            
            const signedPngBase64 = completeResult.pngBase64;
            
            const verifyResponse = await fetch('http://localhost:3001/pure-png-verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ pngBase64: signedPngBase64 })
            });
            
            const verifyResult = await verifyResponse.json();
            console.log('📊 Large image verification result:');
            console.log('   - Success:', verifyResult.success);
            console.log('   - Signature valid:', verifyResult.verification_result?.signature_valid);
            console.log('   - Message:', verifyResult.verification_result?.message);
            
            if (verifyResult.verification_result?.decoded_info) {
              console.log('📊 Decoded info:', verifyResult.verification_result.decoded_info);
            }
          }
        }
        
        console.log('\n🎉 Large image test completed');
      });
    
  } catch (error) {
    console.error('❌ Large image test failed:', error);
  }
}

// Run the test
testWithLargerImage().catch(console.error);
