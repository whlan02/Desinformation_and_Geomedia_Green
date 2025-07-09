const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');

// Test signature embedding and extraction
async function testSignatureEmbedding() {
  console.log('🧪 Testing signature embedding and extraction...');
  
  try {
    // Create a test image (100x100 PNG)
    const width = 100;
    const height = 100;
    const png = new PNG({ width, height });
    
    // Fill with some test data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = 100; // R
        png.data[idx + 1] = 150; // G
        png.data[idx + 2] = 200; // B
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
        
        console.log('✅ Test PNG created:', width, 'x', height);
        console.log('📊 PNG buffer size:', pngBuffer.length);
        console.log('📊 PNG base64 length:', pngBase64.length);
        
        // Test verification (should fail - no signature)
        console.log('\n🔍 Testing verification without signature...');
        const testResponse = await fetch('http://localhost:3001/pure-png-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pngBase64 })
        });
        
        const testResult = await testResponse.json();
        console.log('📊 Verification result:', testResult);
        
        // Now let's test creating a signed image through the workflow
        console.log('\n🔐 Testing image processing workflow...');
        
        // Test basic info
        const basicInfo = JSON.stringify({
          timestamp: new Date().toISOString(),
          location: { lat: 37.7749, lng: -122.4194 },
          device: 'test-device',
          version: '1.0.0'
        });
        
        // Dummy public key for testing
        const publicKey = 'dummy-public-key-for-testing';
        
        // Step 1: Process the image (simulate mobile app workflow)
        console.log('\n📤 Step 1: Processing image...');
        
        // Use JSON request like the mobile app
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
        console.log('📊 Process result:', processResult);
        
        if (processResult.success) {
          // Step 2: Complete with signature
          console.log('\n📤 Step 2: Completing with signature...');
          
          const sessionId = processResult.sessionId;
          const hashToSign = processResult.hashToSign;
          
          // Create a dummy signature
          const signature = crypto.createHash('sha256').update(hashToSign).digest('hex');
          
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
          console.log('📊 Complete result:', completeResult);
          
          if (completeResult.success) {
            // Step 3: Verify the signed image
            console.log('\n🔍 Step 3: Verifying signed image...');
            
            const signedPngBase64 = completeResult.pngBase64;
            
            const verifyResponse = await fetch('http://localhost:3001/pure-png-verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ pngBase64: signedPngBase64 })
            });
            
            const verifyResult = await verifyResponse.json();
            console.log('📊 Signed image verification result:', verifyResult);
          }
        }
        
        // Clean up - no temp file needed
        console.log('\n🎉 Test completed');
      });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSignatureEmbedding().catch(console.error);
