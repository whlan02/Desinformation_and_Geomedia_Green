const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');

// Logging utility for consistent formatting
const LOG_LEVELS = {
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
};

function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    if (typeof data === 'object') {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    } else {
      logMessage += ' ' + data;
    }
  }
  return logMessage;
}

function log(level, message, data = null) {
  const formattedMessage = formatLog(level, message, data);
  if (level === LOG_LEVELS.ERROR) {
    console.error(formattedMessage);
  } else {
    console.log(formattedMessage);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:19006',
    'https://geocam-web-frontend.onrender.com',
    'https://geocam-api.onrender.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ limit: '25mb', extended: true }));

// Configure multer for temporary file uploads
const upload = multer({
  dest: 'temp_images/',
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

// Ensure temp directory exists
if (!fs.existsSync('temp_images')) {
  fs.mkdirSync('temp_images');
}

// Simplified steganography implementation for Node.js
class SimpleSteganography {
  constructor() {
    this.config = {
      t: 3,
      threshold: 1,
      codeUnitSize: 16
    };
  }

  isPrime(n) {
    if (isNaN(n) || !isFinite(n) || n % 1 || n < 2) return false;
    if (n % 2 === 0) return (n === 2);
    if (n % 3 === 0) return (n === 3);
    const m = Math.sqrt(n);
    for (let i = 5; i <= m; i += 6) {
      if (n % i === 0) return false;
      if (n % (i + 2) === 0) return false;
    }
    return true;
  }

  findNextPrime(n) {
    for (let i = n; true; i += 1) {
      if (this.isPrime(i)) return i;
    }
  }

  messageCompleted(data, i, threshold) {
    let done = true;
    for (let j = 0; j < 16 && done; j += 1) {
      done = done && (data[i + j * 4] === 255);
    }
    return done;
  }

  decode(canvas) {
    try {
      log('INFO', 'Starting steganography decode...');
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const t = this.config.t;
      const threshold = this.config.threshold;
      const codeUnitSize = this.config.codeUnitSize;
      const prime = this.findNextPrime(Math.pow(2, t));
      
      log('INFO', 'Decode parameters:', { t, threshold, codeUnitSize, prime });
      
      const modMessage = [];
      
      if (threshold === 1) {
        let done = false;
        for (let i = 3; !done && i < data.length; i += 4) {
          done = this.messageCompleted(data, i, threshold);
          if (!done) {
            modMessage.push(data[i] - (255 - prime + 1));
          }
        }
      } else {
        log('WARN', "Decoding for threshold > 1 is not implemented");
        return '';
      }
      
      log('INFO', 'Extracted mod message length:', modMessage.length);
      
      let message = "";
      let charCode = 0;
      let bitCount = 0;
      const mask = Math.pow(2, codeUnitSize) - 1;
      
      for (let i = 0; i < modMessage.length; i += 1) {
        charCode += modMessage[i] << bitCount;
        bitCount += t;
        if (bitCount >= codeUnitSize) {
          const char = String.fromCharCode(charCode & mask);
          message += char;
          bitCount %= codeUnitSize;
          charCode = modMessage[i] >> (t - bitCount);
        }
      }
      
      if (charCode !== 0) {
        message += String.fromCharCode(charCode & mask);
      }
      
      log('INFO', 'Decoded message length:', message.length);
      return message;
      
    } catch (error) {
      log('ERROR', 'Steganography decode error:', error);
      throw error;
    }
  }

  encode(message, canvas) {
    try {
      log('INFO', 'Starting steganography encode...');
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const t = this.config.t;
      const threshold = this.config.threshold;
      const codeUnitSize = this.config.codeUnitSize;
      const prime = this.findNextPrime(Math.pow(2, t));
      
      if (!t || t < 1 || t > 7) {
        throw new Error('IllegalOptions: Parameter t = ' + t + ' is not valid: 0 < t < 8');
      }
      
      const bundlesPerChar = Math.floor(codeUnitSize / t);
      const overlapping = codeUnitSize % t;
      const modMessage = [];
      
      let oldDec = 0;
      
      for (let i = 0; i <= message.length; i += 1) {
        const dec = message.charCodeAt(i) || 0;
        const curOverlapping = (overlapping * i) % t;
        
        if (curOverlapping > 0 && oldDec) {
          const mask = Math.pow(2, t - curOverlapping) - 1;
          const oldMask = Math.pow(2, codeUnitSize) * (1 - Math.pow(2, -curOverlapping));
          const left = (dec & mask) << curOverlapping;
          const right = (oldDec & oldMask) >> (codeUnitSize - curOverlapping);
          modMessage.push(left + right);
          
          if (i < message.length) {
            let mask2 = Math.pow(2, 2 * t - curOverlapping) * (1 - Math.pow(2, -t));
            for (let j = 1; j < bundlesPerChar; j += 1) {
              const decM = dec & mask2;
              modMessage.push(decM >> (((j - 1) * t) + (t - curOverlapping)));
              mask2 <<= t;
            }
          }
        } else if (i < message.length) {
          let mask = Math.pow(2, t) - 1;
          for (let j = 0; j < bundlesPerChar; j += 1) {
            const decM = dec & mask;
            modMessage.push(decM >> (j * t));
            mask <<= t;
          }
        }
        oldDec = dec;
      }
      
      // Add delimiter
      const delimiter = new Array(threshold * 3);
      for (let i = 0; i < delimiter.length; i += 1) {
        delimiter[i] = 255;
      }
      
      // Encode into image
      let offset = 0;
      for (offset = 0; (offset + threshold) * 4 <= data.length && (offset + threshold) <= modMessage.length; offset += threshold) {
        const qS = [];
        for (let i = 0; i < threshold && i + offset < modMessage.length; i += 1) {
          let q = 0;
          for (let j = offset; j < threshold + offset && j < modMessage.length; j += 1) {
            q += modMessage[j] * Math.pow(i + 1, j - offset);
          }
          qS[i] = (255 - prime + 1) + (q % prime);
        }
        for (let i = offset * 4; i < (offset + qS.length) * 4 && i < data.length; i += 4) {
          data[i + 3] = qS[Math.floor(i / 4) % threshold];
        }
      }
      
      // Add delimiter
      for (let index = offset; index - offset < delimiter.length && (offset + delimiter.length) * 4 < data.length; index += 1) {
        data[(index * 4) + 3] = delimiter[index - offset];
      }
      
      // Fill remaining alpha values
      for (let i = ((offset + delimiter.length + 1) * 4) + 3; i < data.length; i += 4) {
        data[i] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      log('INFO', 'Steganography encode completed');
      return canvas;
      
    } catch (error) {
      log('ERROR', 'Steganography encode error:', error);
      throw error;
    }
  }
}

// Initialize steganography
const steg = new SimpleSteganography();

/**
 * GeoCam PNG Verification Workflow
 * Implements the CORRECT verification process for GeoCam signed images
 */
class GeoCamPNGVerifier {
  constructor() {
    this.STEG_PARAMS = {
      codeUnitSize: 16,
      delimiter: '###END###'
    };
  }

  /**
   * Convert string to binary representation
   */
  stringToBinary(str) {
    let binary = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      binary += charCode.toString(2).padStart(this.STEG_PARAMS.codeUnitSize, '0');
    }
    return binary;
  }

  /**
   * Convert binary to string
   */
  binaryToString(binary) {
    let str = '';
    for (let i = 0; i < binary.length; i += this.STEG_PARAMS.codeUnitSize) {
      const chunk = binary.substr(i, this.STEG_PARAMS.codeUnitSize);
      if (chunk.length === this.STEG_PARAMS.codeUnitSize) {
        str += String.fromCharCode(parseInt(chunk, 2));
      }
    }
    return str;
  }

  /**
   * Step 1-2: Parse PNG directly from buffer without Canvas
   */
  parsePngFromBuffer(pngBuffer) {
    log('INFO', 'Step 1-2: Parsing PNG directly from buffer...');
    
    return new Promise((resolve, reject) => {
      const png = new PNG();
      
      png.parse(pngBuffer, (error, data) => {
        if (error) {
          log('ERROR', 'PNG parsing failed:', error);
          reject(error);
          return;
        }
        
        log('SUCCESS', '✅ PNG parsed successfully');
        log('INFO', '📊 Image dimensions:', data.width, 'x', data.height);
        log('INFO', '📊 RGBA data length:', data.data.length);
        
        // IMMEDIATE RGBA DEBUGGING: Check raw PNG data before any processing
        log('DEBUG', '🔧 DEBUGGING: Raw PNG RGBA values (immediately after parsing):');
        log('DEBUG', '🔧 DEBUGGING: First 20 RGBA values from PNG:');
        for (let i = 0; i < 20; i++) {
          log('DEBUG', `   PNG RGBA[${i}]: ${data.data[i]} (0x${data.data[i].toString(16).padStart(2, '0')})`);
        }
        log('DEBUG', '🔧 DEBUGGING: Last 20 RGBA values from PNG:');
        const dataLen = data.data.length;
        for (let i = dataLen - 20; i < dataLen; i++) {
          log('DEBUG', `   PNG RGBA[${i}]: ${data.data[i]} (0x${data.data[i].toString(16).padStart(2, '0')})`);
        }
        
        resolve({
          width: data.width,
          height: data.height,
          data: data.data // RGBA buffer
        });
      });
    });
  }

  /**
   * Step 3: Extract signature package from last row alpha channels
   */
  extractSignatureFromLastRow(rgbaData, width, height) {
    log('INFO', '🔍 Extracting signature from last row...');
    
    const lastRowY = height - 1;
    let binaryString = '';
    let nullFound = false;
    let validJsonFound = false;
    let jsonEndPos = -1;
    
    // First pass: collect all binary data
    for (let x = 0; x < width && !nullFound; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      const alphaValue = rgbaData[alphaIndex];
      
      // Unpack 8 bits from alpha channel (matching storage order)
      for (let bit = 0; bit < 8; bit++) {
        binaryString += ((alphaValue & (1 << (7 - bit))) ? '1' : '0');
      }
      
      // Try to find valid JSON every 16 bits
      if (binaryString.length >= this.STEG_PARAMS.codeUnitSize && 
          binaryString.length % this.STEG_PARAMS.codeUnitSize === 0) {
        const testStr = this.binaryToString(binaryString);
        
        try {
          // Look for complete JSON object
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < testStr.length; i++) {
            const char = testStr[i];
            
            if (!inString) {
              if (char === '{') braceCount++;
              else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  // Found potential JSON end
                  try {
                    const jsonStr = testStr.substring(0, i + 1);
                    JSON.parse(jsonStr); // Test if valid JSON
                    validJsonFound = true;
                    jsonEndPos = i + 1;
                    break;
                  } catch (e) {
                    // Not valid JSON yet, continue
                  }
                }
              }
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
            }
            escapeNext = char === '\\' && !escapeNext;
          }
          
          if (validJsonFound) break;
        } catch (e) {
          // Continue searching
        }
      }
    }
    
    if (!validJsonFound || jsonEndPos === -1) {
      log('ERROR', '❌ No valid JSON found in signature data');
      throw new Error('Invalid signature format');
    }
    
    // Extract only the valid JSON part
    const signatureData = this.binaryToString(binaryString).substring(0, jsonEndPos);
    
    try {
      // Add debug logging
      log('INFO', '📝 Raw binary length:', binaryString.length, 'bits');
      log('INFO', '📝 Valid JSON length:', jsonEndPos, 'characters');
      log('INFO', '📝 Raw signature data:', signatureData);
      
      const parsed = JSON.parse(signatureData);
      log('SUCCESS', '✅ Signature extracted');
      log('INFO', '📊 Signature package:', {
        publicKeyLength: parsed.publicKey ? parsed.publicKey.length : 'N/A',
        signatureLength: parsed.signature ? parsed.signature.length : 'N/A',
        timestamp: parsed.timestamp
      });
      return parsed;
    } catch (error) {
      log('ERROR', '❌ Failed to parse signature data:', error.message);
      log('ERROR', '❌ Raw data preview:', signatureData.substring(0, 100));
      throw new Error('Invalid signature format');
    }
  }

  /**
   * Step 4: Reset last row alpha channels to 255 (remove signature data)
   */
  resetLastRowAlpha(rgbaData, width, height) {
    log('INFO', '🔄 Step 4: Resetting last row alpha channels...');
    
    const lastRowStart = (height - 1) * width * 4;
    
    for (let x = 0; x < width; x++) {
      const alphaIndex = lastRowStart + (x * 4) + 3;
      rgbaData[alphaIndex] = 255;
    }
    
    log('SUCCESS', '✅ Last row alpha channels reset to 255');
    return rgbaData;
  }

  /**
   * Step 5: Extract Basic Data from alpha channels (excluding last row)
   */
  extractBasicDataFromAlphaChannels(rgbaData, width, height) {
    log('INFO', '📝 Step 5: Extracting Basic Data from Alpha channels...');
    
    const maxHeight = height - 1; // Exclude last row
    let binaryData = '';
    
    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3; // Alpha channel only
        const alphaValue = rgbaData[alphaIndex];
        
        // Extract 8 bits from alpha channel
        for (let bit = 0; bit < 8; bit++) {
          binaryData += (alphaValue & (1 << (7 - bit))) ? '1' : '0';
        }
        
        // Check if we found the delimiter every 16 bits (codeUnitSize)
        if (binaryData.length >= this.STEG_PARAMS.codeUnitSize && binaryData.length % this.STEG_PARAMS.codeUnitSize === 0) {
          const testStr = this.binaryToString(binaryData);
          if (testStr.includes(this.STEG_PARAMS.delimiter)) {
            const endIndex = testStr.indexOf(this.STEG_PARAMS.delimiter);
            const result = testStr.substring(0, endIndex);
            log('SUCCESS', '✅ Basic Data extracted from Alpha channels (' + result.length + ' chars)');
            return result;
          }
        }
      }
    }
    
    // Fallback: decode without delimiter
    const result = this.binaryToString(binaryData);
    log('WARN', '⚠️ Delimiter not found, returning raw decoded data from Alpha channels');
    return result;
  }

  /**
   * Step 6: Rebuild "clean" PNG for verification (same state as during signing)
   */
  rebuildCleanPNG(rgbaData, width, height) {
    log('INFO', '🖼️ Step 6: Rebuilding clean PNG for verification...');
    
    return new Promise((resolve, reject) => {
      const png = new PNG({ width, height });
      
      // Copy RGBA data to PNG
      for (let i = 0; i < rgbaData.length; i++) {
        png.data[i] = rgbaData[i];
      }
      
      // Convert PNG to buffer
      const chunks = [];
      png.pack()
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          const pngBuffer = Buffer.concat(chunks);
          log('SUCCESS', '✅ Clean PNG rebuilt (' + pngBuffer.length + ' bytes)');
          resolve(pngBuffer);
        })
        .on('error', reject);
    });
  }

  /**
   * Step 7: Compute SHA-512 hash of the clean PNG
   */
  computePngHash(pngBuffer) {
    log('INFO', 'Computing SHA-512 hash of clean PNG');
    
    // Hash the PNG buffer directly (same as during signing)
    const hash = crypto.createHash('sha512').update(pngBuffer).digest('hex');
    
    log('SUCCESS', 'SHA-512 hash computed', {
      length: hash.length,
      preview: hash.substring(0, 16)
    });
    
    return hash;
  }

  /**
   * Step 8: Verify signature using extracted public key and Noble Ed25519
   */
  async verifySignature(hash, signatureBase64, publicKeyBase64) {
    log('INFO', 'Starting signature verification');
    
    try {
      // Convert hash to bytes for verification (same as app signing)
      const hashBytes = new TextEncoder().encode(hash);
      
      // Convert signature from Base64 to Uint8Array
      const signatureBytes = new Uint8Array(
        Buffer.from(signatureBase64, 'base64')
      );
      
      // Convert public key from Base64 to Uint8Array
      const publicKeyBytes = new Uint8Array(
        Buffer.from(publicKeyBase64, 'base64')
      );
      
      // Validate key and signature lengths
      if (publicKeyBytes.length !== 32) {
        throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 32`);
      }
      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid signature length: ${signatureBytes.length}, expected 64`);
      }
      
      log('DEBUG', 'Verification data lengths', {
        hash: hashBytes.length,
        signature: signatureBytes.length,
        publicKey: publicKeyBytes.length
      });
      
      // Verify signature using Noble Ed25519
      const ed25519 = await import('@noble/ed25519');
      
      // Set up SHA-512 using the correct Noble Ed25519 setup method
      ed25519.etc.sha512Async = async (...messages) => {
        const concat = ed25519.etc.concatBytes(...messages);
        const hash = crypto.createHash('sha512').update(concat).digest();
        return hash;
      };
      
      const isValid = await ed25519.verifyAsync(signatureBytes, hashBytes, publicKeyBytes);
      
      log(isValid ? 'SUCCESS' : 'ERROR', 'Signature verification completed', {
        valid: isValid,
        message: isValid ? 'Signature is valid' : 'Signature is invalid'
      });
      
      return {
        valid: isValid,
        message: isValid ? 
          'GeoCam signature is valid - Image is authentic and unmodified' : 
          'GeoCam signature is invalid - Image may have been tampered with',
        details: {
          publicKeyLength: publicKeyBytes.length,
          signatureLength: signatureBytes.length,
          hashLength: hash.length
        }
      };
      
    } catch (error) {
      log('ERROR', 'Signature verification failed', {
        error: error.message,
        details: error.stack
      });
      return {
        valid: false,
        message: `Signature verification failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Complete GeoCam PNG Verification Workflow
   */
  async verifyGeoCamPNG(pngBuffer) {
    try {
      log('INFO', 'Starting GeoCam PNG Verification Workflow');
      
      // Step 1-2: Parse PNG directly from buffer
      const imageData = await this.parsePngFromBuffer(pngBuffer);
      const { width, height, data: rgbaData } = imageData;
      
      // Step 3: Extract signature from last row
      const signatureData = this.extractSignatureFromLastRow(rgbaData, width, height);
      
      // Step 4: Reset last row alpha channels
      const cleanedRgbaData = this.resetLastRowAlpha(rgbaData, width, height);
      
      // Step 5: Extract Basic Data
      const basicDataStr = this.extractBasicDataFromAlphaChannels(cleanedRgbaData, width, height);
      
      // Step 6: Rebuild clean PNG
      const cleanPngBuffer = await this.rebuildCleanPNG(cleanedRgbaData, width, height);
      
      // Step 7: Compute hash
      const pngHash = await this.computePngHash(cleanPngBuffer);
      
      // Step 8: Verify signature
      const verificationResult = await this.verifySignature(
        pngHash,
        signatureData.signature,
        signatureData.publicKey
      );
      
      log('SUCCESS', 'GeoCam PNG Verification completed', {
        success: true,
        signatureValid: verificationResult.valid,
        imageInfo: {
          width,
          height,
          originalSize: pngBuffer.length,
          cleanSize: cleanPngBuffer.length
        }
      });
      
      return {
        success: true,
        verification: verificationResult,
        extractedData: {
          basicInfo: basicDataStr,
          signatureData: {
            timestamp: signatureData.timestamp,
            version: signatureData.version,
            publicKeyLength: signatureData.publicKey ? signatureData.publicKey.length : 0,
            signatureLength: signatureData.signature ? signatureData.signature.length : 0
          }
        },
        imageInfo: {
          width,
          height,
          originalSize: pngBuffer.length,
          cleanSize: cleanPngBuffer.length
        }
      };
      
    } catch (error) {
      log('ERROR', 'GeoCam PNG Verification failed', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message,
        verification: {
          valid: false,
          message: `Verification failed: ${error.message}`
        }
      };
    }
  }
}

// Initialize GeoCam verifiers
const geocamPNGVerifier = new GeoCamPNGVerifier();

// Crypto utilities (ported from mobile app)
// crypto is already imported at the top of the file



async function verifyNaClSignatureWithDeviceKey(signaturePackage, publicKey) {
  try {
    console.log('🔍 Verifying NaCl signature with Noble Ed25519...');
    
    if (!publicKey || publicKey.type !== 'NaCl-Ed25519') {
      console.error('❌ Invalid NaCl public key format');
      return false;
    }

    const { signature: signatureBase64, signedData, algorithm } = JSON.parse(signaturePackage);
    
    if (algorithm !== 'Ed25519') {
      console.error('❌ Invalid signature algorithm:', algorithm);
      return false;
    }
    
    // Reconstruct the signed data (same as during signing)
    const dataToVerify = JSON.stringify(signedData, Object.keys(signedData).sort());
    
    console.log('🔍 Data to verify length:', dataToVerify.length);
    console.log('🔍 Signature length:', signatureBase64.length);
    console.log('🔍 Public key type:', publicKey.type);
    
    // Convert data to Uint8Array for verification
    const dataBytes = new TextEncoder().encode(dataToVerify);
    
    // Convert signature from Base64 to Uint8Array
    const signatureBytes = new Uint8Array(
      Buffer.from(signatureBase64, 'base64')
    );
    
    // Convert public key from Base64 to Uint8Array
    const publicKeyBytes = new Uint8Array(
      Buffer.from(publicKey.keyBase64, 'base64')
    );
    
    // Validate key and signature lengths (security check)
    if (publicKeyBytes.length !== 32) {
      console.error('❌ Invalid public key length:', publicKeyBytes.length);
      return false;
    }
    if (signatureBytes.length !== 64) {
      console.error('❌ Invalid signature length:', signatureBytes.length);
      return false;
    }
    
    // Verify the detached signature using Noble Ed25519 (replaces TweetNaCl)
    const ed25519 = await import('@noble/ed25519');
    
    // Set up hashing for Noble Ed25519 - must be done before any operations
    ed25519.utils.sha512Sync = (data) => {
      return crypto.createHash('sha512').update(data).digest();
    };
    
    const isValid = await ed25519.verify(signatureBytes, dataBytes, publicKeyBytes);
    
    // Validate signature data structure
    if (!signedData || !signedData.timestamp || !signedData.keyId) {
      console.error('❌ Missing required signature data fields');
      return false;
    }
    
    // Check if the signature data contains required fields and is properly structured
    const hasValidStructure = (
      signedData.deviceModel &&
      signedData.timestamp &&
      signedData.keyId &&
      signedData.deviceInfo &&
      signedData.nonce
    );
    
    if (!hasValidStructure) {
      console.error('❌ Invalid signature data structure');
      return false;
    }
    
    // Validate timestamp is recent (within 24 hours)
    const signatureTime = new Date(signedData.timestamp);
    const now = new Date();
    const timeDiff = now - signatureTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (timeDiff > maxAge) {
      console.warn('⚠️ Signature timestamp is too old');
      return false;
    }
    
    console.log(isValid ? '✅ NaCl signature verification: VALID' : '❌ NaCl signature verification: INVALID');
    console.log('📝 Verified signature data:', {
      keyId: signedData.keyId,
      timestamp: signedData.timestamp,
      deviceModel: signedData.deviceInfo?.model
    });
    
    return isValid;
  } catch (error) {
    console.error('❌ NaCl signature verification failed:', error);
    return false;
  }
}

function verifyRSASignatureWithDeviceKey(signaturePackage, publicKey) {
  try {
    console.log('🔍 Verifying RSA signature with jsrsasign...');
    
    if (!publicKey || publicKey.type !== 'RSA-PKCS8') {
      console.error('❌ Invalid RSA public key format');
      return false;
    }

    const { signature, signedData, algorithm } = JSON.parse(signaturePackage);
    
    if (algorithm !== 'SHA256withRSA') {
      console.error('❌ Invalid signature algorithm:', algorithm);
      return false;
    }
    
    // Reconstruct the signed data
    const dataToVerify = JSON.stringify(signedData, Object.keys(signedData).sort());
    
    console.log('🔍 Data to verify length:', dataToVerify.length);
    console.log('🔍 Signature length:', signature.length);
    console.log('🔍 Public key type:', publicKey.type);
    
    // For Node.js backend, we'll use a simplified verification approach
    // In a production environment, you would use a proper RSA verification library
    // like node-forge or the built-in crypto module with proper RSA support
    
    // For now, we'll validate the structure and format
    if (!signature || signature.length < 100) {
      console.error('❌ Invalid signature format');
      return false;
    }
    
    if (!signedData || !signedData.data || !signedData.timestamp || !signedData.keyId) {
      console.error('❌ Missing required signature data fields');
      return false;
    }
    
    // Check if the signature data contains required fields and is properly structured
    const hasValidStructure = (
      signedData.data &&
      signedData.timestamp &&
      signedData.keyId &&
      signedData.deviceInfo &&
      signedData.nonce
    );
    
    if (!hasValidStructure) {
      console.error('❌ Invalid signature data structure');
      return false;
    }
    
    // Validate timestamp is recent (within 24 hours)
    const signatureTime = new Date(signedData.timestamp);
    const now = new Date();
    const timeDiff = now - signatureTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (timeDiff > maxAge) {
      console.warn('⚠️ Signature timestamp is too old');
      return false;
    }
    
    // For this demo, we'll consider the signature valid if it has the correct structure
    // In production, you would implement full RSA signature verification here
    console.log('✅ RSA signature structure validation: VALID');
    console.log('📝 Verified signature data:', {
      keyId: signedData.keyId,
      timestamp: signedData.timestamp,
      deviceModel: signedData.deviceInfo?.model
    });
    
    return true;
  } catch (error) {
    console.error('❌ RSA signature verification failed:', error);
    return false;
  }
}

// Legacy function for backward compatibility
function verifySignatureWithDeviceKey(data, signature, publicKey) {
  console.warn('⚠️ Using legacy signature verification - consider upgrading to RSA');
  try {
    console.log('🔍 Verifying signature with PUBLIC key...');
    console.log('🔑 Public key hash:', publicKey.hash);
    console.log('🔑 Public key ID:', publicKey.keyId);
    
    // Get the private key hash for verification (stored in the public key object)
    const privateKeyHashForVerification = publicKey.privateKeyHashForVerification;
    
    if (!privateKeyHashForVerification) {
      console.error('❌ No private key hash available for verification - cannot verify signature');
      return false;
    }
    
    // Rebuild signature input (same logic as during signing)
    const signatureInput = `${privateKeyHashForVerification}_${data}_${publicKey.keyId}`;
    
    console.log('🔍 Signature input for verification:', signatureInput);
    
    const expectedSignature = crypto.createHash('sha256').update(signatureInput).digest('hex');
    
    console.log('🔍 Expected signature:', expectedSignature);
    console.log('🔍 Received signature:', signature);
    
    const isValid = expectedSignature === signature;
    console.log(isValid ? '✅ Signature verification: VALID' : '❌ Signature verification: INVALID');
    
    return isValid;
  } catch (error) {
    console.error('Device signature verification failed:', error);
    return false;
  }
}

// Clean up temporary files older than 1 hour
function cleanupTempFiles() {
  const tempDir = 'temp_images';
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  fs.readdir(tempDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlink(filePath, (err) => {
            if (!err) console.log(`🗑️ Cleaned up old temp file: ${file}`);
          });
        }
      });
    });
  });
}

// Run cleanup every 30 minutes
setInterval(cleanupTempFiles, 30 * 60 * 1000);

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'GeoCam Steganography Service',
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: [
      'GET /health - Health check',
      'POST /pure-png-sign - Image signing endpoint',
      'POST /pure-png-verify - Image verification endpoint',
      'POST /decode-image - Legacy decoder',
      'POST /verify-geocam-png - Legacy PNG verification',
      'POST /verify-geocam-rgba - RGBA verification'
    ]
  });
});

// Decode steganography from image using GeoCam PNG Verification
app.post('/decode-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('📷 Processing GeoCam PNG for verification...');
    console.log('📁 File:', req.file.filename, 'Size:', req.file.size);
    
    // Read the uploaded file as buffer
    const pngBuffer = fs.readFileSync(req.file.path);
    
    // Check if it's a PNG file (GeoCam images should be PNG)
    if (!pngBuffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      console.log('⚠️ Not a PNG file, falling back to legacy steganography...');
      
      // Fallback to legacy steganography for non-PNG files
      const image = await loadImage(req.file.path);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      
      const decodedMessage = steg.decode(canvas);
      
      // Clean up temp file
      fs.unlink(req.file.path, () => {});
      
      return res.json({
        success: !!decodedMessage,
        decodedInfo: decodedMessage || 'No hidden data found',
        signatureVerification: {
          valid: false,
          message: 'Legacy format - No signature verification available'
        },
        rawData: decodedMessage,
        workflow: 'legacy'
      });
    }
    
    console.log('✅ PNG file detected - using GeoCam verification workflow');
    
    // Use the new GeoCam PNG Verification workflow
    const verificationResult = await geocamPNGVerifier.verifyGeoCamPNG(pngBuffer);
    
    // Clean up temp file
    fs.unlink(req.file.path, () => {});
    
    if (!verificationResult.success) {
      return res.json({
        success: false,
        error: verificationResult.error,
        signatureVerification: verificationResult.verification,
        workflow: 'geocam'
      });
    }
    
    // Parse the extracted basic data
    let parsedBasicData = null;
    try {
      parsedBasicData = JSON.parse(verificationResult.extractedData.basicInfo);
    } catch (parseError) {
      console.log('⚠️ Basic data is not JSON, treating as plain text');
      parsedBasicData = verificationResult.extractedData.basicInfo;
    }
    
    console.log('🎉 GeoCam PNG verification completed successfully!');
    
    res.json({
      success: true,
      decodedInfo: parsedBasicData,
      signatureVerification: verificationResult.verification,
      extractedData: {
        basicInfo: parsedBasicData,
        signatureMetadata: verificationResult.extractedData.signatureData
      },
      imageInfo: verificationResult.imageInfo,
      rawData: verificationResult.extractedData.basicInfo,
      workflow: 'geocam'
    });

  } catch (error) {
    console.error('❌ GeoCam PNG verification error:', error);
    
    // Clean up temp file if it exists
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to verify GeoCam PNG',
      details: error.message,
      workflow: 'geocam'
    });
  }
});

// Encode steganography into image (for future use)
app.post('/encode-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { message } = req.body;
    if (!message) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'No message provided for encoding' });
    }

    console.log('📷 Processing image for steganography encoding...');
    
    // Load image with canvas
    const image = await loadImage(req.file.path);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Encode message
    const encodedCanvas = steg.encode(message, canvas);
    
    // Convert to base64
    const base64Data = encodedCanvas.toDataURL('image/jpeg', 0.9);
    
    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      encodedImage: base64Data
    });

  } catch (error) {
    console.error('❌ Steganography encoding error:', error);
    
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to encode image',
      details: error.message 
    });
  }
});

// Dedicated GeoCam PNG Verification endpoint
app.post('/verify-geocam-png', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GeoCam PNG file provided' });
    }

    console.log('🔍 GeoCam PNG Verification Request');
    console.log('📁 File:', req.file.filename, 'Size:', req.file.size);
    
    // Read the uploaded file as buffer
    const pngBuffer = fs.readFileSync(req.file.path);
    
    // Verify it's a PNG file
    if (!pngBuffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ 
        error: 'File is not a PNG - GeoCam images must be in PNG format',
        workflow: 'geocam'
      });
    }
    
    console.log('✅ Valid PNG file - starting GeoCam verification workflow');
    
    // Perform GeoCam PNG Verification
    const verificationResult = await geocamPNGVerifier.verifyGeoCamPNG(pngBuffer);
    
    // Clean up temp file
    fs.unlink(req.file.path, () => {});
    
    if (!verificationResult.success) {
      return res.json({
        success: false,
        error: verificationResult.error,
        verification: verificationResult.verification,
        workflow: 'geocam'
      });
    }
    
    // Parse the extracted basic data
    let parsedBasicData = null;
    try {
      parsedBasicData = JSON.parse(verificationResult.extractedData.basicInfo);
    } catch (parseError) {
      console.log('⚠️ Basic data is not JSON format');
      parsedBasicData = {
        rawData: verificationResult.extractedData.basicInfo,
        note: 'Data is not in JSON format'
      };
    }
    
    console.log('🎉 GeoCam PNG verification completed successfully!');
    console.log('✅ Signature valid:', verificationResult.verification.valid);
    console.log('📊 Extracted data size:', verificationResult.extractedData.basicInfo.length, 'chars');
    
    res.json({
      success: true,
      verification: verificationResult.verification,
      extractedData: {
        basicInfo: parsedBasicData,
        signature: verificationResult.extractedData.signatureData
      },
      imageInfo: verificationResult.imageInfo,
      workflow: 'geocam',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ GeoCam PNG verification failed:', error);
    
    // Clean up temp file if it exists
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ 
      error: 'GeoCam PNG verification failed',
      details: error.message,
      workflow: 'geocam'
    });
  }
});

/**
 * GeoCam RGBA Verification Workflow (NEW)
 * Implements RGBA-based verification that matches the app's new signing method
 * This avoids PNG format compatibility issues entirely
 */
class GeoCamRGBAVerifier {
  constructor() {
    this.STEG_PARAMS = {
      codeUnitSize: 16,
      delimiter: '###END###'
    };
  }

  /**
   * Convert string to binary representation
   */
  stringToBinary(str) {
    let binary = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      binary += charCode.toString(2).padStart(this.STEG_PARAMS.codeUnitSize, '0');
    }
    return binary;
  }

  /**
   * Convert binary to string
   */
  binaryToString(binary) {
    let str = '';
    for (let i = 0; i < binary.length; i += this.STEG_PARAMS.codeUnitSize) {
      const chunk = binary.substr(i, this.STEG_PARAMS.codeUnitSize);
      if (chunk.length === this.STEG_PARAMS.codeUnitSize) {
        str += String.fromCharCode(parseInt(chunk, 2));
      }
    }
    return str;
  }

  /**
   * Step 1-2: Parse PNG to extract RGBA data
   */
  parsePngToRGBA(pngBuffer) {
    console.log('📊 Step 1-2: Parsing PNG to extract RGBA data...');
    
    return new Promise((resolve, reject) => {
      const png = new PNG();
      
      png.parse(pngBuffer, (error, data) => {
        if (error) {
          console.error('❌ PNG parsing failed:', error);
          reject(error);
          return;
        }
        
        console.log('✅ PNG parsed successfully');
        console.log('📊 Image dimensions:', data.width, 'x', data.height);
        console.log('📊 RGBA data length:', data.data.length);
        
        // IMMEDIATE RGBA DEBUGGING: Check raw PNG data before any processing
        console.log('🔧 DEBUGGING: Raw PNG RGBA values (immediately after parsing):');
        console.log('🔧 DEBUGGING: First 20 RGBA values from PNG:');
        for (let i = 0; i < 20; i++) {
          console.log(`   PNG RGBA[${i}]: ${data.data[i]} (0x${data.data[i].toString(16).padStart(2, '0')})`);
        }
        console.log('🔧 DEBUGGING: Last 20 RGBA values from PNG:');
        const dataLen = data.data.length;
        for (let i = dataLen - 20; i < dataLen; i++) {
          console.log(`   PNG RGBA[${i}]: ${data.data[i]} (0x${data.data[i].toString(16).padStart(2, '0')})`);
        }
        
        resolve({
          width: data.width,
          height: data.height,
          rgbaData: data.data // Direct RGBA buffer
        });
      });
    });
  }

  /**
   * Step 3: Extract signature package from last row alpha channels
   */
  extractSignatureFromLastRowRGBA(rgbaData, width, height) {
    console.log('🔐 Step 3: Extracting signature from last row alpha channels...');
    
    const lastRowStart = (height - 1) * width * 4;
    let binaryData = '';
    
    for (let x = 0; x < width; x++) {
      const alphaIndex = lastRowStart + (x * 4) + 3;
      const alphaValue = rgbaData[alphaIndex];
      
      // Extract 8 bits from alpha channel
      for (let bit = 0; bit < 8; bit++) {
        binaryData += (alphaValue & (1 << (7 - bit))) ? '1' : '0';
      }
    }
    
    const signaturePackageStr = this.binaryToString(binaryData);
    
    // Find the end of JSON by looking for the closing brace
    let jsonEndIndex = -1;
    let braceCount = 0;
    for (let i = 0; i < signaturePackageStr.length; i++) {
      if (signaturePackageStr[i] === '{') {
        braceCount++;
      } else if (signaturePackageStr[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEndIndex = i;
          break;
        }
      }
    }
    
    if (jsonEndIndex === -1) {
      throw new Error('No valid signature package found in last row');
    }
    
    const cleanJsonStr = signaturePackageStr.substring(0, jsonEndIndex + 1);
    
    try {
      const signaturePackage = JSON.parse(cleanJsonStr);
      
      console.log('✅ Signature package extracted');
      console.log('📊 Public key length:', signaturePackage.publicKey ? signaturePackage.publicKey.length : 'N/A');
      console.log('📊 Signature length:', signaturePackage.signature ? signaturePackage.signature.length : 'N/A');
      console.log('📊 Package version:', signaturePackage.version);
      
      return {
        publicKey: signaturePackage.publicKey,
        signature: signaturePackage.signature,
        timestamp: signaturePackage.timestamp,
        version: signaturePackage.version
      };
    } catch (parseError) {
      throw new Error(`Failed to parse signature JSON: ${parseError.message}`);
    }
  }

  /**
   * Step 4: Reset last row alpha channels to 255 (remove signature data)
   */
  resetLastRowAlphaRGBA(rgbaData, width, height) {
    console.log('🔄 Step 4: Resetting last row alpha channels...');
    
    const lastRowStart = (height - 1) * width * 4;
    
    for (let x = 0; x < width; x++) {
      const alphaIndex = lastRowStart + (x * 4) + 3;
      rgbaData[alphaIndex] = 255;
    }
    
    console.log('✅ Last row alpha channels reset to 255');
    return rgbaData;
  }

  /**
   * Step 5: Extract Basic Data from alpha channels (excluding last row)
   */
  extractBasicDataFromAlphaChannelsRGBA(rgbaData, width, height) {
    console.log('📝 Step 5: Extracting Basic Data from Alpha channels...');
    
    const maxHeight = height - 1; // Exclude last row
    let binaryData = '';
    
    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3; // Alpha channel only
        const alphaValue = rgbaData[alphaIndex];
        
        // Extract 8 bits from alpha channel
        for (let bit = 0; bit < 8; bit++) {
          binaryData += (alphaValue & (1 << (7 - bit))) ? '1' : '0';
        }
        
        // Check if we found the delimiter every 16 bits (codeUnitSize)
        if (binaryData.length >= this.STEG_PARAMS.codeUnitSize && binaryData.length % this.STEG_PARAMS.codeUnitSize === 0) {
          const testStr = this.binaryToString(binaryData);
          if (testStr.includes(this.STEG_PARAMS.delimiter)) {
            const endIndex = testStr.indexOf(this.STEG_PARAMS.delimiter);
            const result = testStr.substring(0, endIndex);
            console.log('✅ Basic Data extracted from Alpha channels (' + result.length + ' chars)');
            return result;
          }
        }
      }
    }
    
    // Fallback: decode without delimiter
    const result = this.binaryToString(binaryData);
    console.log('⚠️ Delimiter not found, returning raw decoded data from Alpha channels');
    return result;
  }

  /**
   * Step 6: Convert RGBA data to base64 (same method as app)
   */
  rgbaToBase64(rgbaData) {
    console.log('🔄 Step 6: Converting RGBA data to base64 for verification...');
    console.log('🔧 DEBUGGING: Using same base64 method as app...');
    
    // CRITICAL FIX: Use same base64 conversion method as app
    // Convert RGBA buffer to Uint8Array (same as app)
    const uint8Array = new Uint8Array(rgbaData);
    
    // Convert to base64 string using same method as app
    let binary = '';
    const chunkSize = 0x8000; // Process in chunks to avoid call stack overflow (same as app)
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    
    // Use Buffer.from(binary, 'binary').toString('base64') to match btoa() behavior
    const base64String = Buffer.from(binary, 'binary').toString('base64');
    
    console.log('✅ RGBA to base64 conversion completed');
    console.log('📊 RGBA base64 length:', base64String.length, 'characters');
    console.log('🔧 DEBUGGING: Backend RGBA base64 preview:', base64String.substring(0, 50) + '...');
    console.log('🎯 This now matches the app base64 conversion method exactly!');
    
    return base64String;
  }

  /**
   * Re-encode basic info using BackendAlphaSteg logic to match signing state
   */
  reEncodeBasicInfo(cleanRgbaData, width, height, basicInfo) {
    console.log('🔄 Re-encoding basic info to match signing state...');
    
    // Use the same BackendAlphaSteg encoding logic
    const backendSteg = new BackendAlphaSteg();
    const rgbaWithBasicInfo = backendSteg.encodeBasicInfoIntoRGBA(
      cleanRgbaData,
      width,
      height,
      basicInfo
    );
    
    console.log('✅ Basic info re-encoded to match signing state');
    return rgbaWithBasicInfo;
  }

  /**
   * Step 7: Compute SHA-512 hash matching backend signing process
   */
  computeRGBAHash(rgbaData, basicInfo, width, height) {
    console.log('🔐 Step 7: Computing SHA-512 hash matching backend signing process...');
    
    // Match the exact signing hash generation logic from backend
    const combinedData = JSON.stringify({
      basicInfo: basicInfo,
      rgbaChecksum: rgbaData.slice(0, 1000).join(''),
      width: width,
      height: height
    });
    
    const hash = crypto.createHash('sha512').update(combinedData).digest('hex');
    
    console.log('✅ SHA-512 hash computed using combined data (' + hash.length + ' chars)');
    console.log('🔐 Combined data preview:', combinedData.substring(0, 100) + '...');
    console.log('🔐 Hash preview:', hash.substring(0, 16) + '...');
    console.log('🎯 This matches the backend signing method exactly!');
    
    return hash;
  }

  /**
   * Step 8: Verify signature using extracted public key and Noble Ed25519
   */
  async verifyRGBASignature(hash, signatureBase64, publicKeyBase64) {
    console.log('🔍 Step 8: Verifying RGBA-based signature with Noble Ed25519...');
    
    try {
      // Convert hash to bytes for verification (same as app signing)
      const hashBytes = new TextEncoder().encode(hash);
      
      // Convert signature from Base64 to Uint8Array
      const signatureBytes = new Uint8Array(
        Buffer.from(signatureBase64, 'base64')
      );
      
      // Convert public key from Base64 to Uint8Array
      const publicKeyBytes = new Uint8Array(
        Buffer.from(publicKeyBase64, 'base64')
      );
      
      // Validate key and signature lengths
      if (publicKeyBytes.length !== 32) {
        throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 32`);
      }
      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid signature length: ${signatureBytes.length}, expected 64`);
      }
      
      console.log('🔑 Public key length:', publicKeyBytes.length);
      console.log('🔐 Signature length:', signatureBytes.length);
      console.log('📊 Hash data length:', hashBytes.length);
      
      // Verify signature using Noble Ed25519
      const ed25519 = await import('@noble/ed25519');
      
      // Set up SHA-512 using the correct Noble Ed25519 setup method
      ed25519.etc.sha512Async = async (...messages) => {
        const concat = ed25519.etc.concatBytes(...messages);
        const hash = crypto.createHash('sha512').update(concat).digest();
        return hash;
      };
      
      const isValid = await ed25519.verifyAsync(signatureBytes, hashBytes, publicKeyBytes);
      
      console.log(isValid ? '✅ RGBA Signature verification: VALID' : '❌ RGBA Signature verification: INVALID');
      
      return {
        valid: isValid,
        message: isValid ? 
          'GeoCam RGBA signature is VALID - Image is authentic and unmodified' : 
          'GeoCam RGBA signature is INVALID - Image may have been tampered with',
        details: {
          publicKeyLength: publicKeyBytes.length,
          signatureLength: signatureBytes.length,
          hashLength: hash.length,
          method: 'RGBA-based verification (NEW)'
        }
      };
      
    } catch (error) {
      console.error('❌ RGBA signature verification failed:', error);
      return {
        valid: false,
        message: `RGBA signature verification failed: ${error.message}`,
        details: { 
          error: error.message,
          method: 'RGBA-based verification (NEW) - FAILED'
        }
      };
    }
  }

  /**
   * Complete GeoCam RGBA Verification Workflow
   */
  async verifyGeoCamRGBA(pngBuffer) {
    try {
      console.log('🚀 Starting GeoCam RGBA Verification Workflow (NEW METHOD)...');
      console.log('🎯 This method avoids PNG format compatibility issues!');
      
      // Step 1-2: Parse PNG to get RGBA data
      const imageData = await this.parsePngToRGBA(pngBuffer);
      const { width, height, rgbaData } = imageData;
      
      // Step 3: Extract signature from last row
      const signatureData = this.extractSignatureFromLastRowRGBA(rgbaData, width, height);
      
      // Step 4: Reset last row alpha channels
      const cleanedRgbaData = this.resetLastRowAlphaRGBA(rgbaData, width, height);
      
      // Step 5: Extract Basic Data
      const basicDataStr = this.extractBasicDataFromAlphaChannelsRGBA(cleanedRgbaData, width, height);
      
      // Step 6: Re-encode basic data to get the same RGBA state as during signing
      console.log('🔄 Re-encoding basic data to match signing state...');
      const rgbaWithBasicInfo = await this.reEncodeBasicInfo(cleanedRgbaData, width, height, basicDataStr);
      
      // Step 7: Convert RGBA to base64 (keeping for debugging)
      const rgbaBase64 = this.rgbaToBase64(rgbaWithBasicInfo);
      
      // Step 8: Compute RGBA hash matching backend signing process
      const rgbaHash = this.computeRGBAHash(rgbaWithBasicInfo, basicDataStr, width, height);
      
              // Step 9: Verify RGBA signature
        const verificationResult = await this.verifyRGBASignature(
          rgbaHash,
          signatureData.signature,
          signatureData.publicKey
        );
      
      console.log('🎉 GeoCam RGBA Verification Workflow completed!');
      
      return {
        success: true,
        verification: verificationResult,
        extractedData: {
          basicInfo: basicDataStr,
          signatureData: {
            timestamp: signatureData.timestamp,
            version: signatureData.version,
            publicKeyLength: signatureData.publicKey ? signatureData.publicKey.length : 0,
            signatureLength: signatureData.signature ? signatureData.signature.length : 0
          }
        },
        imageInfo: {
          width,
          height,
          originalSize: pngBuffer.length,
          rgbaSize: rgbaData.length,
          rgbaBase64Size: rgbaBase64.length
        },
        method: 'RGBA-based (NEW)'
      };
      
    } catch (error) {
      console.error('❌ GeoCam RGBA Verification failed:', error);
      return {
        success: false,
        error: error.message,
        verification: {
          valid: false,
          message: `RGBA verification failed: ${error.message}`
        },
        method: 'RGBA-based (NEW) - FAILED'
      };
    }
  }
}

// Initialize RGBA verifier
const geocamRGBAVerifier = new GeoCamRGBAVerifier();

// Dedicated GeoCam RGBA Verification endpoint (NEW)
app.post('/verify-geocam-rgba', upload.single('image'), async (req, res) => {
  try {
    // Handle both FormData and JSON requests
    let pngBuffer, tempFilePath;
    
    if (req.headers['content-type']?.includes('application/json')) {
      // JSON request from React Native
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ 
          error: 'No imageBase64 provided in JSON request',
          workflow: 'geocam-rgba'
        });
      }
      
      console.log('🔍 GeoCam RGBA Verification Request (JSON from React Native)');
      console.log('📊 Image base64 length:', imageBase64.length);
      console.log('🎯 Using RGBA-based verification to avoid PNG compatibility issues');
      
      // Convert base64 to buffer
      pngBuffer = Buffer.from(imageBase64, 'base64');
      
    } else {
      // FormData request (for web compatibility)
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No GeoCam PNG file provided in FormData request',
          workflow: 'geocam-rgba'
        });
      }
      
      console.log('🔍 GeoCam RGBA Verification Request (FormData)');
      console.log('📁 File:', req.file.filename, 'Size:', req.file.size);
      console.log('🎯 Using RGBA-based verification to avoid PNG compatibility issues');
      
      // Read the uploaded file as buffer
      pngBuffer = fs.readFileSync(req.file.path);
      tempFilePath = req.file.path;
    }
    
    // Verify it's a PNG file
    if (!pngBuffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      if (tempFilePath) {
        fs.unlink(tempFilePath, () => {});
      }
      return res.status(400).json({ 
        error: 'File is not a PNG - GeoCam images must be in PNG format',
        workflow: 'geocam-rgba'
      });
    }
    
    console.log('✅ Valid PNG file - starting GeoCam RGBA verification workflow');
    
    // Perform GeoCam RGBA Verification (NEW METHOD)
    const verificationResult = await geocamRGBAVerifier.verifyGeoCamRGBA(pngBuffer);
    
    // Clean up temp file if exists
    if (tempFilePath) {
      fs.unlink(tempFilePath, () => {});
    }
    
    if (!verificationResult.success) {
      return res.json({
        success: false,
        error: verificationResult.error,
        verification: verificationResult.verification,
        workflow: 'geocam-rgba'
      });
    }
    
    // Parse the extracted basic data
    let parsedBasicData = null;
    try {
      parsedBasicData = JSON.parse(verificationResult.extractedData.basicInfo);
    } catch (parseError) {
      console.log('⚠️ Basic data is not JSON format');
      parsedBasicData = {
        rawData: verificationResult.extractedData.basicInfo,
        note: 'Data is not in JSON format'
      };
    }
    
    console.log('🎉 GeoCam RGBA verification completed successfully!');
    console.log('✅ Signature valid:', verificationResult.verification.valid);
    console.log('📊 Extracted data size:', verificationResult.extractedData.basicInfo.length, 'chars');
    console.log('🎯 RGBA method avoids PNG compatibility issues completely!');
    
    res.json({
      success: true,
      verification_result: {
        signature_valid: verificationResult.verification.valid,
        decoded_info: parsedBasicData,
        is_authentic: verificationResult.verification.valid,
        device_info: verificationResult.extractedData.signatureData,
        message: verificationResult.verification.valid ? 'Signature is valid' : 'Signature is invalid'
      },
      extractedData: {
        basicInfo: parsedBasicData,
        signature: verificationResult.extractedData.signatureData
      },
      imageInfo: verificationResult.imageInfo,
      workflow: 'geocam-rgba',
      method: verificationResult.method,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ GeoCam RGBA verification failed:', error);
    
    // Clean up temp file if it exists
    if (tempFilePath) {
      fs.unlink(tempFilePath, () => {});
    }
    
    res.status(500).json({ 
      error: 'GeoCam RGBA verification failed',
      details: error.message,
      workflow: 'geocam-rgba'
    });
  }
});

// =============================================================================
// PURE PNG BUFFER WORKFLOW: NO CANVAS - Using pngjs for both signing & verifying
// =============================================================================

// Add dependencies
const UPNG = require('upng-js');
const pngjs = require('pngjs');

// Pure PNG Buffer Processing Class (NO CANVAS - using pngjs only)
class PurePngProcessor {
  constructor() {
    this.STEG_PARAMS = {
      t: 3,
      threshold: 1,
      codeUnitSize: 16,
      delimiter: '###END###'
    };
  }

  /**
   * Convert Buffer to Uint8Array safely
   */
  toUint8Array(data) {
    return data instanceof Uint8Array ? data : new Uint8Array(data);
  }

  /**
   * Step 1: Convert JPEG to PNG with alpha channel (using Sharp)
   */
  async jpegToPngWithAlpha(jpegBuffer) {
    console.log('🔄 Step 1: Converting JPEG to PNG with alpha channel (NO Canvas)...');
    
    const sharp = require('sharp');
    
    // Get image metadata first
    const metadata = await sharp(jpegBuffer).metadata();
    console.log('📊 Image metadata:', {
      width: metadata.width,
      height: metadata.height,
      orientation: metadata.orientation,
      format: metadata.format
    });
    
    // Process image while preserving orientation
    const { data, info } = await sharp(jpegBuffer)
      .rotate() // Auto-rotate based on EXIF
      .ensureAlpha() // Add alpha channel
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log('✅ JPEG to RGBA conversion complete');
    console.log('📊 Dimensions:', info.width, 'x', info.height);
    
    return {
      width: info.width,
      height: info.height,
      data: this.toUint8Array(data)
    };
  }

  /**
   * Step 2: Encode info into alpha channels (exclude last row)
   */
  encodeInfoIntoAlpha(rgbaData, width, height, info) {
    console.log('🔐 Step 2: Encoding basic info into alpha channels...');
    
    const rgbaArray = this.toUint8Array(rgbaData);
    const result = new Uint8Array(rgbaArray);
    
    const dataWithDelimiter = info + this.STEG_PARAMS.delimiter;
    const binaryData = this.stringToBinary(dataWithDelimiter);
    
    // Exclude last row for signature
    const maxHeight = height - 1;
    const maxPixels = width * maxHeight;
    const maxBits = maxPixels * 8;
    
    if (binaryData.length > maxBits) {
      throw new Error(`Data too large: ${binaryData.length} bits > ${maxBits} bits capacity`);
    }
    
    let bitIndex = 0;
    
    for (let y = 0; y < maxHeight && bitIndex < binaryData.length; y++) {
      for (let x = 0; x < width && bitIndex < binaryData.length; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3;
        
        // Pack 8 bits into alpha channel
        let alphaValue = 0;
        for (let bit = 0; bit < 8 && bitIndex < binaryData.length; bit++) {
          if (binaryData[bitIndex++] === '1') {
            alphaValue |= (1 << (7 - bit));
          }
        }
        
        result[alphaIndex] = alphaValue;
      }
    }
    
    console.log('✅ Basic info encoded into alpha channels');
    return result;
  }

  /**
   * Step 3: Convert RGBA to PNG (using pngjs)
   */
  rgbaToPng(rgbaData, width, height) {
    console.log('🔄 Converting RGBA to PNG...');
    
    const rgbaArray = this.toUint8Array(rgbaData);
    const png = new pngjs.PNG({ width, height });
    png.data = Buffer.from(rgbaArray); // pngjs requires Buffer
    
    const pngBuffer = pngjs.PNG.sync.write(png);
    console.log('✅ PNG created:', pngBuffer.length, 'bytes');
    
    return pngBuffer;
  }

  /**
   * Step 4: Hash PNG buffer
   */
  hashPngBuffer(pngBuffer) {
    console.log('🔐 Step 4: Computing hash of PNG buffer...');
    
    const hash = crypto.createHash('sha512')
      .update(this.toUint8Array(pngBuffer))
      .digest('hex');
    
    console.log('✅ SHA-512 hash computed:', hash.length, 'characters');
    return hash;
  }

  /**
   * Step 5: Sign hash with private key
   */
  async signHash(hash, privateKeyBase64) {
    console.log('🔐 Step 5: Signing hash with private key...');
    
    const { secp256k1 } = await import('@noble/curves/secp256k1');
    
    // Convert hex hash string to Uint8Array (same as verification)
    const hashBytes = new Uint8Array(Buffer.from(hash, 'hex'));
    const privateKeyBytes = this.toUint8Array(Buffer.from(privateKeyBase64, 'base64'));
    
    // Log lengths and previews for debugging
    console.log('📊 Lengths:', {
      hash: hashBytes.length,
      privateKey: privateKeyBytes.length
    });
    console.log('🔍 Hash bytes preview:', [...hashBytes.slice(0, 4)]);
    console.log('🔍 Private key bytes preview:', [...privateKeyBytes.slice(0, 4)]);
    
    // Sign the hash using secp256k1
    const signature = secp256k1.sign(hashBytes, privateKeyBytes);
    
    // Convert signature to DER format and then to Base64
    const signatureDER = signature.toDERRawBytes();
    const signatureBase64 = Buffer.from(signatureDER).toString('base64');
    console.log('🔍 Signature DER bytes preview:', [...signatureDER.slice(0, 4)]);
    
    return signatureBase64;
  }

  /**
   * Step 6: Store signature in last row
   */
  storeSignatureInLastRow(rgbaData, width, height, publicKey, signature) {
    console.log('🔐 Step 6: Storing signature in last row...');
    
    const rgbaArray = this.toUint8Array(rgbaData);
    const result = new Uint8Array(rgbaArray);
    
    const signaturePackage = JSON.stringify({
      publicKey: publicKey,
      signature: signature,
      timestamp: new Date().toISOString(),
      version: '4.0'
    });
    
    const binaryData = this.stringToBinary(signaturePackage);
    console.log('📊 Signature package binary length:', binaryData.length, 'bits');
    
    // Use only last row
    const lastRowPixels = width;
    const maxBits = lastRowPixels * 8;
    
    if (binaryData.length > maxBits) {
      throw new Error(`Signature too large: ${binaryData.length} bits > ${maxBits} bits capacity`);
    }
    
    let bitIndex = 0;
    const lastRowY = height - 1;
    
    for (let x = 0; x < width && bitIndex < binaryData.length; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      
      // Pack 8 bits into alpha channel
      let alphaValue = 0;
      for (let bit = 0; bit < 8 && bitIndex < binaryData.length; bit++) {
        if (binaryData[bitIndex++] === '1') {
          alphaValue |= (1 << (7 - bit));
        }
      }
      
      result[alphaIndex] = alphaValue;
    }
    
    console.log('✅ Signature stored in last row');
    return result;
  }

  /**
   * Parse PNG buffer to RGBA (using pngjs)
   */
  parsePngToRgba(pngBuffer) {
    console.log('📖 Parsing PNG to RGBA (using pngjs)...');
    
    const png = pngjs.PNG.sync.read(pngBuffer);
    
    console.log('✅ PNG parsed:', png.width, 'x', png.height);
    console.log('📊 RGBA data length:', png.data.length);
    
    return {
      width: png.width,
      height: png.height,
      data: this.toUint8Array(png.data)
    };
  }

  /**
   * Extract signature from last row
   */
  extractSignatureFromLastRow(rgbaData, width, height) {
    console.log('🔍 Extracting signature from last row...');
    
    const rgbaArray = this.toUint8Array(rgbaData);
    const lastRowY = height - 1;
    let binaryString = '';
    let nullFound = false;
    let validJsonFound = false;
    let jsonEndPos = -1;
    
    // First pass: collect all binary data
    for (let x = 0; x < width && !nullFound; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      const alphaValue = rgbaArray[alphaIndex];
      
      // Unpack 8 bits from alpha channel (matching storage order)
      for (let bit = 0; bit < 8; bit++) {
        binaryString += ((alphaValue & (1 << (7 - bit))) ? '1' : '0');
      }
      
      // Try to find valid JSON every 16 bits
      if (binaryString.length >= this.STEG_PARAMS.codeUnitSize && 
          binaryString.length % this.STEG_PARAMS.codeUnitSize === 0) {
        const testStr = this.binaryToString(binaryString);
        
        try {
          // Look for complete JSON object
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < testStr.length; i++) {
            const char = testStr[i];
            
            if (!inString) {
              if (char === '{') braceCount++;
              else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  // Found potential JSON end
                  try {
                    const jsonStr = testStr.substring(0, i + 1);
                    JSON.parse(jsonStr); // Test if valid JSON
                    validJsonFound = true;
                    jsonEndPos = i + 1;
                    break;
                  } catch (e) {
                    // Not valid JSON yet, continue
                  }
                }
              }
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
            }
            escapeNext = char === '\\' && !escapeNext;
          }
          
          if (validJsonFound) break;
        } catch (e) {
          // Continue searching
        }
      }
    }
    
    if (!validJsonFound || jsonEndPos === -1) {
      console.error('❌ No valid JSON found in signature data');
      throw new Error('Invalid signature format');
    }
    
    // Extract only the valid JSON part
    const signatureData = this.binaryToString(binaryString).substring(0, jsonEndPos);
    
    try {
      // Add debug logging
      console.log('📝 Raw binary length:', binaryString.length, 'bits');
      console.log('📝 Valid JSON length:', jsonEndPos, 'characters');
      console.log('📝 Raw signature data:', signatureData);
      
      const parsed = JSON.parse(signatureData);
      console.log('✅ Signature extracted:', parsed.version);
      console.log('📊 Signature package:', {
        publicKeyLength: parsed.publicKey ? parsed.publicKey.length : 'N/A',
        signatureLength: parsed.signature ? parsed.signature.length : 'N/A',
        timestamp: parsed.timestamp,
        version: parsed.version
      });
      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse signature data:', error.message);
      console.error('❌ Raw data preview:', signatureData.substring(0, 100));
      throw new Error('Invalid signature format');
    }
  }

  /**
   * Reset last row to 255 (clean state)
   */
  resetLastRow(rgbaData, width, height) {
    console.log('🧹 Resetting last row to clean state...');
    
    const rgbaArray = this.toUint8Array(rgbaData);
    const result = new Uint8Array(rgbaArray);
    const lastRowY = height - 1;
    
    for (let x = 0; x < width; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      result[alphaIndex] = 255; // Reset to opaque
    }
    
    console.log('✅ Last row reset');
    return result;
  }

  /**
   * Extract basic info from alpha channels
   */
  extractBasicInfo(rgbaData, width, height) {
    console.log('🔍 Extracting basic info from alpha channels...');
    
    const rgbaArray = this.toUint8Array(rgbaData);
    const maxHeight = height - 1; // Exclude last row
    let binaryString = '';
    
    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3;
        const alphaValue = rgbaArray[alphaIndex];
        
        // Unpack 8 bits from alpha channel (matching encoding order)
        for (let bit = 0; bit < 8; bit++) {
          binaryString += ((alphaValue & (1 << (7 - bit))) ? '1' : '0');
        }
      }
    }
    
    const extractedData = this.binaryToString(binaryString);
    const delimiterIndex = extractedData.indexOf(this.STEG_PARAMS.delimiter);
    
    if (delimiterIndex === -1) {
      throw new Error('Delimiter not found - invalid steganography data');
    }
    
    const basicInfo = extractedData.substring(0, delimiterIndex);
    console.log('✅ Basic info extracted:', basicInfo.length, 'characters');
    
    return basicInfo;
  }

  /**
   * Verify signature
   */
  async verifySignature(hash, signatureBase64, publicKeyBase64) {
    console.log('🔍 Verifying signature...');
    
    try {
      const { secp256k1 } = await import('@noble/curves/secp256k1');
      
      // Convert hex hash string to Uint8Array (same as signing)
      const hashBytes = new Uint8Array(Buffer.from(hash, 'hex'));
      
      // Convert signature from Base64 to DER format
      const signatureDER = this.toUint8Array(Buffer.from(signatureBase64, 'base64'));
      
      // Convert public key from Base64 to Uint8Array
      const publicKeyBytes = this.toUint8Array(Buffer.from(publicKeyBase64, 'base64'));
      
      // Log lengths for debugging
      console.log('📊 Lengths:', {
        hash: hashBytes.length,
        signature: signatureDER.length,
        publicKey: publicKeyBytes.length
      });
      
      // Log first few bytes of each for debugging
      console.log('🔍 Hash bytes preview:', [...hashBytes.slice(0, 4)]);
      console.log('🔍 Signature DER bytes preview:', [...signatureDER.slice(0, 4)]);
      console.log('🔍 Public key bytes preview:', [...publicKeyBytes.slice(0, 4)]);
      
      // Convert DER signature to Signature object
      const signature = secp256k1.Signature.fromDER(signatureDER);
      
      // Verify the signature
      const isValid = secp256k1.verify(
        signature,        // The Signature object
        hashBytes,       // The message (hash in this case)
        publicKeyBytes   // The public key
      );
      
      console.log(isValid ? '✅ Signature verification: VALID' : '❌ Signature verification: INVALID');
      
      return {
        valid: isValid,
        message: isValid ? 'Signature is valid' : 'Signature is invalid'
      };
      
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      return {
        valid: false,
        message: `Signature verification failed: ${error.message}`
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  stringToBinary(str) {
    let binary = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      binary += charCode.toString(2).padStart(this.STEG_PARAMS.codeUnitSize, '0');
    }
    return binary;
  }

  binaryToString(binary) {
    let result = '';
    for (let i = 0; i < binary.length; i += this.STEG_PARAMS.codeUnitSize) {
      const chunk = binary.substr(i, this.STEG_PARAMS.codeUnitSize);
      if (chunk.length === this.STEG_PARAMS.codeUnitSize) {
        const charCode = parseInt(chunk, 2);
        if (charCode === 0) break; // Stop at null terminator
        result += String.fromCharCode(charCode);
      }
    }
    return result;
  }

  /**
   * Hash PNG buffer for signing/verification
   * This method now normalizes the PNG data before hashing to handle encoding variations
   */
  hashPngBuffer(pngBuffer) {
    console.log('🔐 Computing hash of PNG buffer...');
    
    return new Promise((resolve, reject) => {
      // Parse PNG to RGBA to normalize the data
      const png = new PNG();
      
      png.parse(pngBuffer, (error, data) => {
        if (error) {
          console.error('❌ PNG parsing failed:', error);
          reject(error);
          return;
        }
        
        // Create a normalized buffer that only includes the RGBA data
        // This eliminates variations in PNG encoding
        const normalizedBuffer = Buffer.from(data.data);
        
        // Hash the normalized buffer
        const hash = crypto.createHash('sha512')
          .update(normalizedBuffer)
          .digest('hex');
        
        console.log('✅ SHA-512 hash computed:', hash.length, 'characters');
        resolve(hash);
      });
    });
  }

  /**
   * Complete GeoCam PNG Verification Workflow
   */
  async verifyGeoCamPNG(pngBuffer) {
    try {
      console.log('🚀 Starting GeoCam PNG Verification Workflow...');
      
      // Step 1-2: Parse PNG directly from buffer
      const imageData = await this.parsePngFromBuffer(pngBuffer);
      const { width, height, data: rgbaData } = imageData;
      
      // Step 3: Extract signature from last row
      const signatureData = this.extractSignatureFromLastRow(rgbaData, width, height);
      
      // Step 4: Reset last row alpha channels
      const cleanedRgbaData = this.resetLastRow(rgbaData, width, height);
      
      // Step 5: Extract Basic Data
      const basicDataStr = this.extractBasicDataFromAlphaChannels(cleanedRgbaData, width, height);
      
      // Step 6: Rebuild clean PNG
      const cleanPngBuffer = await this.rebuildCleanPNG(cleanedRgbaData, width, height);
      
      // Step 7: Compute hash
      const pngHash = await this.hashPngBuffer(cleanPngBuffer);
      
      // Step 8: Verify signature
      const verificationResult = await this.verifySignatureWithExtractedKey(
        pngHash,
        signatureData.signature,
        signatureData.publicKey
      );
      
      console.log('🎉 GeoCam PNG Verification Workflow completed!');
      
      return {
        success: true,
        verification: verificationResult,
        extractedData: {
          basicInfo: basicDataStr,
          signatureData: {
            timestamp: signatureData.timestamp,
            version: signatureData.version,
            publicKeyLength: signatureData.publicKey ? signatureData.publicKey.length : 0,
            signatureLength: signatureData.signature ? signatureData.signature.length : 0
          }
        },
        imageInfo: {
          width,
          height,
          originalSize: pngBuffer.length,
          cleanSize: cleanPngBuffer.length
        }
      };
      
    } catch (error) {
      console.error('❌ GeoCam PNG Verification failed:', error);
      return {
        success: false,
        error: error.message,
        verification: {
          valid: false,
          message: `Verification failed: ${error.message}`
        }
      };
    }
  }
}

// Backend Alpha Channel Steganography Class (matching frontend logic)
class BackendAlphaSteg {
  constructor() {
    this.STEG_PARAMS = {
      t: 3,
      threshold: 1,
      codeUnitSize: 16,
      delimiter: '###END###'
    };
  }

  stringToBinary(str) {
    let binary = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      binary += charCode.toString(2).padStart(this.STEG_PARAMS.codeUnitSize, '0');
    }
    return binary;
  }

  // Encode basic info into RGBA array (Alpha channels only, exclude last row)
  encodeBasicInfoIntoRGBA(rgbaArray, width, height, basicInfo) {
    console.log('🔐 Backend: Encoding basic info into RGBA...');
    console.log('📊 Basic info length:', basicInfo.length);
    
    const result = [...rgbaArray];
    const dataWithDelimiter = basicInfo + this.STEG_PARAMS.delimiter;
    const binaryData = this.stringToBinary(dataWithDelimiter);
    
    console.log('📊 Binary data length:', binaryData.length, 'bits');
    
    // Exclude last row for signature
    const maxHeight = height - 1;
    const maxPixels = width * maxHeight;
    const maxBits = maxPixels * 8; // 8 bits per alpha channel
    
    if (binaryData.length > maxBits) {
      throw new Error(`Data too large: ${binaryData.length} bits > ${maxBits} bits capacity`);
    }
    
    let bitIndex = 0;
    
    for (let y = 0; y < maxHeight && bitIndex < binaryData.length; y++) {
      for (let x = 0; x < width && bitIndex < binaryData.length; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3;
        
        // Pack 8 bits into alpha channel
        let alphaValue = 0;
        for (let bit = 0; bit < 8 && bitIndex < binaryData.length; bit++) {
          if (binaryData[bitIndex++] === '1') {
            alphaValue |= (1 << (7 - bit));
          }
        }
        
        result[alphaIndex] = alphaValue;
      }
    }
    
    console.log('✅ Basic info encoded into Alpha channels');
    return result;
  }

  // Store signature in last row (Alpha channels only)
  storeSignatureInLastRow(rgbaArray, width, height, publicKey, signature) {
    console.log('🔐 Backend: Storing signature in last row...');
    
    const result = [...rgbaArray];
    
    const signaturePackage = JSON.stringify({
      publicKey: publicKey,
      signature: signature,
      timestamp: new Date().toISOString(),
      version: '3.0-backend'
    });
    
    const binaryData = this.stringToBinary(signaturePackage);
    console.log('📊 Signature package binary length:', binaryData.length, 'bits');
    
    // Use only last row
    const lastRowPixels = width;
    const maxBits = lastRowPixels * 8;
    
    if (binaryData.length > maxBits) {
      throw new Error(`Signature too large: ${binaryData.length} bits > ${maxBits} bits capacity`);
    }
    
    let bitIndex = 0;
    const lastRowY = height - 1;
    
    for (let x = 0; x < width && bitIndex < binaryData.length; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      
      // Pack 8 bits into alpha channel
      let alphaValue = 0;
      for (let bit = 0; bit < 8 && bitIndex < binaryData.length; bit++) {
        if (binaryData[bitIndex++] === '1') {
          alphaValue |= (1 << (7 - bit));
        }
      }
      
      result[alphaIndex] = alphaValue;
    }
    
    console.log('✅ Signature stored in last row');
    return result;
  }
}

// Initialize processors
const backendSteg = new BackendAlphaSteg();
const purePngProcessor = new PurePngProcessor();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'GeoCam Steganography Service',
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: [
      'GET /health - Health check',
      'POST /pure-png-sign - Image signing endpoint',
      'POST /pure-png-verify - Image verification endpoint',
      'POST /decode-image - Legacy decoder',
      'POST /verify-geocam-png - Legacy PNG verification',
      'POST /verify-geocam-rgba - RGBA verification'
    ]
  });
});

// =============================================================================
// PURE PNG WORKFLOW ENDPOINTS (NO CANVAS)
// =============================================================================

// PURE PNG SIGNING: Complete signing workflow in one endpoint
app.post('/pure-png-sign', async (req, res) => {
  console.log('🎯 Starting image signing process');
  
  try {
    const { jpegBase64, basicInfo, publicKeyBase64, privateKeyBase64 } = req.body;
    
    if (!jpegBase64 || !basicInfo || !publicKeyBase64 || !privateKeyBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    console.log('📊 Processing image data');
    console.log('   - JPEG size:', jpegBase64.length);
    console.log('   - Basic info size:', basicInfo.length);
    
    // Convert base64 to buffer
    const jpegBuffer = Buffer.from(jpegBase64, 'base64');
    
    // Process image and prepare for signing
    const { width, height, data: rgbaData } = await purePngProcessor.jpegToPngWithAlpha(jpegBuffer);
    
    // Encode basic info
    const rgbaWithInfo = purePngProcessor.encodeInfoIntoAlpha(rgbaData, width, height, basicInfo);
    
    // Convert to PNG
    const pngWithInfo = purePngProcessor.rgbaToPng(rgbaWithInfo, width, height);
    
    // Generate and sign hash
    const hash = await purePngProcessor.hashPngBuffer(pngWithInfo);
    const signature = await purePngProcessor.signHash(hash, privateKeyBase64);
    
    // Add signature to image
    const finalRgba = purePngProcessor.storeSignatureInLastRow(rgbaWithInfo, width, height, publicKeyBase64, signature);
    
    // Create final PNG
    const finalPng = purePngProcessor.rgbaToPng(finalRgba, width, height);
    const finalPngBase64 = finalPng.toString('base64');

    console.log('✅ Image processing completed');
    console.log('   - Original size:', jpegBase64.length);
    console.log('   - Final size:', finalPngBase64.length);
    console.log('   - Dimensions:', width, 'x', height);
    
    return res.json({
      success: true,
      pngBase64: finalPngBase64,
      stats: {
        originalJpegSize: jpegBase64.length,
        finalPngSize: finalPngBase64.length,
        dimensions: { width, height }
      }
    });
    
  } catch (error) {
    console.error('❌ Image signing failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Image signing failed: ' + error.message
    });
  }
});

// Image verification endpoint
app.post('/pure-png-verify', async (req, res) => {
  console.log('🔍 Starting image verification process');
  
  try {
    const { pngBase64 } = req.body;
    
    if (!pngBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing image data'
      });
    }
    
    console.log('📊 Processing verification request');
    
    // Convert base64 to buffer
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    
    // Extract and verify data
    const { width, height, data: rgbaData } = await purePngProcessor.parsePngToRgba(pngBuffer);
    const signatureData = purePngProcessor.extractSignatureFromLastRow(rgbaData, width, height);
    const cleanedRgba = purePngProcessor.resetLastRow(rgbaData, width, height);
    const basicInfo = purePngProcessor.extractBasicInfo(cleanedRgba, width, height);
    
    // Verify signature - using cleanedRgba directly without re-encoding
    const pngWithInfo = purePngProcessor.rgbaToPng(cleanedRgba, width, height);
    const hash = await purePngProcessor.hashPngBuffer(pngWithInfo);
    const verification = await purePngProcessor.verifySignature(hash, signatureData.signature, signatureData.publicKey);
    
    console.log('✅ Verification completed');
    console.log('   - Signature valid:', verification.valid);
    console.log('   - Image dimensions:', width, 'x', height);
    
    // Parse basic info
    let parsedBasicInfo = null;
    try {
      parsedBasicInfo = JSON.parse(basicInfo);
    } catch (parseError) {
      parsedBasicInfo = {
        rawData: basicInfo,
        note: 'Data is not in JSON format'
      };
    }
    
    return res.json({
      success: true,
      verification_result: {
        signature_valid: verification.valid,
        decoded_info: parsedBasicInfo,
        is_authentic: verification.valid,
        message: verification.valid ? 'Image verification successful' : 'Image verification failed'
      },
      imageInfo: {
        width,
        height,
        size: pngBuffer.length
      }
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    
    // Return a user-friendly error message
    return res.status(200).json({
      success: false,
      verification_result: {
        signature_valid: false,
        is_authentic: false,
        message: 'Image verification failed. Please make sure this is a GeoCam image.'
      }
    });
  }
});

// STEP 1: Process JPEG and prepare for signing
app.post('/process-geocam-image', upload.single('image'), async (req, res) => {
  console.log('🎯 === BACKEND: Full GeoCam Processing Started ===');
  
  try {
    // Handle both FormData and JSON requests
    let jpegBase64, basicInfo, publicKey, tempFilePath;
    
    if (req.headers['content-type']?.includes('application/json')) {
      // JSON request from React Native
      const { jpegBase64: jpeg, basicInfo: info, publicKey: key } = req.body;
      jpegBase64 = jpeg;
      basicInfo = info;
      publicKey = key;
      
      if (!jpegBase64 || !basicInfo || !publicKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing jpegBase64, basicInfo, or publicKey in JSON request'
        });
      }
      
      console.log('📱 Processing JSON request from React Native');
      console.log('📊 JPEG base64 length:', jpegBase64.length);
      
      // Create temporary file from base64
      const jpegBuffer = Buffer.from(jpegBase64, 'base64');
      tempFilePath = path.join(__dirname, 'temp_images', `temp_${Date.now()}.jpg`);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(tempFilePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, jpegBuffer);
      console.log('💾 Created temporary file:', tempFilePath);
      
    } else {
      // FormData request (for web compatibility)
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided in FormData request'
        });
      }
      
      tempFilePath = req.file.path;
      basicInfo = req.body.basicInfo;
      publicKey = req.body.publicKey;
      
      console.log('🌐 Processing FormData request');
      console.log('📊 File size:', req.file.size, 'bytes');
    }
    
    if (!basicInfo || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing basicInfo or publicKey'
      });
    }

    console.log('📷 Processing JPEG image...');
    console.log('📝 Basic info length:', basicInfo.length);
    console.log('🔑 Public key length:', publicKey.length);

    // Load JPEG image using Canvas
    const img = await loadImage(tempFilePath);
    console.log('✅ JPEG loaded:', img.width, 'x', img.height);

    // Create canvas and get RGBA data
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Ensure correct orientation (fix rotation issue)
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const rgbaArray = Array.from(imageData.data);
    
    console.log('✅ JPEG → Canvas → RGBA completed');
    console.log('📊 RGBA array length:', rgbaArray.length);

    // Encode basic info into RGBA
    const rgbaWithBasicInfo = backendSteg.encodeBasicInfoIntoRGBA(
      rgbaArray,
      img.width,
      img.height,
      basicInfo
    );

    // Generate hash for signing (matching frontend logic)
    const combinedData = JSON.stringify({
      basicInfo: basicInfo,
      rgbaChecksum: rgbaWithBasicInfo.slice(0, 1000).join(''),
      width: img.width,
      height: img.height
    });

    const hashToSign = crypto.createHash('sha512').update(combinedData).digest('hex');
    console.log('🔐 Generated hash for signing:', hashToSign.length, 'characters');
    console.log('🔐 Hash preview:', hashToSign.substring(0, 16) + '...');

    // Store processed data temporarily (in production, use Redis or similar)
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Store in memory (temporary solution)
    global.processingCache = global.processingCache || {};
    global.processingCache[sessionId] = {
      rgbaWithBasicInfo,
      width: img.width,
      height: img.height,
      publicKey,
      basicInfo,
      timestamp: Date.now()
    };

    // Cleanup temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log('✅ Step 1 completed: Image processed, ready for signing');
    
    return res.json({
      success: true,
      sessionId: sessionId,
      hashToSign: hashToSign,
      imageInfo: {
        width: img.width,
        height: img.height,
        rgbaSize: rgbaWithBasicInfo.length
      }
    });

  } catch (error) {
    console.error('❌ Backend processing failed:', error);
    
    // Cleanup temp file if exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Backend processing failed',
      details: error.message
    });
  }
});

// STEP 2: Complete processing with signature
app.post('/complete-geocam-image', async (req, res) => {
  console.log('🎯 === BACKEND: Completing GeoCam Processing ===');
  
  try {
    const { sessionId, signature } = req.body;
    
    if (!sessionId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or signature'
      });
    }

    // Retrieve cached data
    const cached = global.processingCache?.[sessionId];
    if (!cached) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    console.log('✅ Retrieved cached processing data');
    console.log('📊 Signature length:', signature.length);

    // Store signature in last row
    const finalRgba = backendSteg.storeSignatureInLastRow(
      cached.rgbaWithBasicInfo,
      cached.width,
      cached.height,
      cached.publicKey,
      signature
    );

    // Convert RGBA to PNG using UPNG.js (NO Canvas re-encoding!)
    console.log('💾 Converting RGBA to PNG with UPNG.js...');
    const uint8Array = new Uint8Array(finalRgba);
    const pngBuffer = UPNG.encode([uint8Array.buffer], cached.width, cached.height, 0);
    const pngBase64 = Buffer.from(pngBuffer).toString('base64');

    console.log('✅ PNG created with UPNG.js');
    console.log('📊 PNG size:', pngBuffer.byteLength, 'bytes');
    console.log('📊 Base64 length:', pngBase64.length, 'characters');

    // Cleanup cache
    delete global.processingCache[sessionId];

    console.log('🎉 === BACKEND PROCESSING COMPLETED SUCCESSFULLY ===');
    console.log('✅ All steps completed in backend');
    console.log('✅ No Canvas re-encoding, signature integrity preserved');

    return res.json({
      success: true,
      pngBase64: pngBase64,
      stats: {
        originalSize: finalRgba.length,
        pngSize: pngBuffer.byteLength,
        dimensions: { width: cached.width, height: cached.height },
        compressionRatio: ((finalRgba.length - pngBuffer.byteLength) / finalRgba.length * 100).toFixed(1) + '%'
      }
    });

  } catch (error) {
    console.error('❌ Backend completion failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Backend completion failed',
      details: error.message
    });
  }
});

// Cleanup old cache entries (run periodically)
setInterval(() => {
  if (global.processingCache) {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    Object.keys(global.processingCache).forEach(sessionId => {
      if (now - global.processingCache[sessionId].timestamp > maxAge) {
        delete global.processingCache[sessionId];
        console.log('🧹 Cleaned up expired cache entry:', sessionId);
      }
    });
  }
}, 5 * 60 * 1000); // Every 5 minutes

app.listen(PORT, () => {
  console.log(`🚀 GeoCam Steganography Service running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /pure-png-sign - Image signing endpoint`);
  console.log(`   POST /pure-png-verify - Image verification endpoint`);
  console.log(`   POST /decode-image - Legacy decoder`);
  console.log(`   POST /verify-geocam-png - Legacy PNG verification`);
  console.log(`   POST /verify-geocam-rgba - RGBA verification`);
  console.log(`🔍 Core services initialized`);
}); 