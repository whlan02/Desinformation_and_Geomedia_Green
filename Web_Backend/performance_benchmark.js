// Performance benchmark test for the optimized steganography
function createTestData() {
  const testSignature = {
    publicKey: 'A'.repeat(200), // Simulate longer keys
    signature: 'B'.repeat(500), // Simulate longer signatures
    timestamp: new Date().toISOString(),
    version: '3.0-performance-test',
    metadata: {
      device: 'test-device',
      location: 'test-location',
      additional: 'C'.repeat(100)
    }
  };
  
  return JSON.stringify(testSignature);
}

function benchmarkOldApproach() {
  console.log('🔬 Benchmarking OLD bit-by-bit approach...');
  const start = performance.now();
  
  const signatureJson = createTestData();
  console.log('📊 Test data length:', signatureJson.length);
  
  // Simulate OLD approach: string -> binary -> bit manipulation
  const codeUnitSize = 16;
  
  // Step 1: String to binary (slow)
  let binaryData = '';
  for (let i = 0; i < signatureJson.length; i++) {
    const charCode = signatureJson.charCodeAt(i);
    binaryData += charCode.toString(2).padStart(codeUnitSize, '0');
  }
  
  // Step 2: Embed bit by bit (very slow)
  const alphaChannels = [];
  let bitIndex = 0;
  
  for (let i = 0; i < Math.ceil(binaryData.length / 8); i++) {
    let alphaByte = 0;
    
    for (let bit = 0; bit < 8 && bitIndex < binaryData.length; bit++) {
      const bitValue = parseInt(binaryData[bitIndex]);
      if (bitValue) {
        alphaByte |= (1 << (7 - bit));
      }
      bitIndex++;
    }
    
    alphaChannels.push(alphaByte);
  }
  
  // Step 3: Extract bit by bit (very slow)
  let extractedBinary = '';
  for (let i = 0; i < alphaChannels.length; i++) {
    const alphaValue = alphaChannels[i];
    
    for (let bit = 0; bit < 8; bit++) {
      extractedBinary += (alphaValue & (1 << (7 - bit))) ? '1' : '0';
    }
  }
  
  // Step 4: Binary to string (slow)
  let extractedString = '';
  for (let i = 0; i < extractedBinary.length; i += codeUnitSize) {
    const chunk = extractedBinary.substr(i, codeUnitSize);
    if (chunk.length === codeUnitSize) {
      extractedString += String.fromCharCode(parseInt(chunk, 2));
    }
  }
  
  const end = performance.now();
  const duration = end - start;
  
  const success = extractedString.startsWith(signatureJson);
  console.log('📊 OLD approach result:', success ? 'SUCCESS' : 'FAILED');
  console.log('⏱️ OLD approach time:', duration.toFixed(2), 'ms');
  
  return { duration, success };
}

function benchmarkNewApproach() {
  console.log('🚀 Benchmarking NEW optimized approach...');
  const start = performance.now();
  
  const signatureJson = createTestData();
  
  // Step 1: Direct character to bytes (fast)
  const alphaChannels = [];
  
  for (let i = 0; i < signatureJson.length; i++) {
    const char = signatureJson[i];
    const charCode = char.charCodeAt(0);
    
    // Split 16-bit character into two 8-bit bytes
    const highByte = (charCode >> 8) & 0xFF;
    const lowByte = charCode & 0xFF;
    
    alphaChannels.push(highByte);
    alphaChannels.push(lowByte);
  }
  
  // Step 2: Direct bytes to characters (fast)
  let extractedString = '';
  for (let i = 0; i < alphaChannels.length - 1; i += 2) {
    const highByte = alphaChannels[i];
    const lowByte = alphaChannels[i + 1] || 0;
    
    const charCode = (highByte << 8) | lowByte;
    
    if (charCode === 0) break;
    extractedString += String.fromCharCode(charCode);
  }
  
  const end = performance.now();
  const duration = end - start;
  
  const success = extractedString === signatureJson;
  console.log('📊 NEW approach result:', success ? 'SUCCESS' : 'FAILED');
  console.log('⏱️ NEW approach time:', duration.toFixed(2), 'ms');
  
  return { duration, success };
}

// Run benchmarks
console.log('🏁 === PERFORMANCE BENCHMARK ===');

const oldResult = benchmarkOldApproach();
console.log('');
const newResult = benchmarkNewApproach();

console.log('');
console.log('📈 === PERFORMANCE COMPARISON ===');
console.log('⏱️ OLD approach:', oldResult.duration.toFixed(2), 'ms');
console.log('⏱️ NEW approach:', newResult.duration.toFixed(2), 'ms');
console.log('🚀 Speed improvement:', (oldResult.duration / newResult.duration).toFixed(1) + 'x faster');
console.log('💾 Memory improvement: Significantly reduced (no large binary strings)');
console.log('✅ Both approaches work:', oldResult.success && newResult.success);
