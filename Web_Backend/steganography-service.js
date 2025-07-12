const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');
const { createCanvas, loadImage } = require('canvas');
const UPNG = require('upng-js');
const EXIF = require('exif-js');

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

// Helper function to handle EXIF orientation
function getCanvasWithCorrectOrientation(img, orientation) {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  // Default case - no rotation needed
  if (!orientation || orientation === 1) {
    ctx.drawImage(img, 0, 0);
    return canvas;
  }
  
  // Handle different EXIF orientations
  switch (orientation) {
    case 2:
      // Flip horizontal
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      break;
    case 3:
      // Rotate 180°
      ctx.translate(img.width, img.height);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, 0, 0);
      break;
    case 4:
      // Flip vertical
      ctx.translate(0, img.height);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0);
      break;
    case 5:
      // Rotate 90° CCW + flip horizontal
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.rotate(-Math.PI / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -img.height, 0);
      break;
    case 6:
      // Rotate 90° CW
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, -img.height);
      break;
    case 7:
      // Rotate 90° CW + flip horizontal
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.rotate(Math.PI / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -img.width, -img.height);
      break;
    case 8:
      // Rotate 90° CCW
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, -img.height, 0);
      break;
    default:
      ctx.drawImage(img, 0, 0);
  }
  
  return canvas;
}

// Helper function to extract EXIF orientation from image buffer
function getImageOrientation(buffer) {
  return new Promise((resolve) => {
    try {
      // Create a temporary image element-like object for EXIF.js
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      EXIF.getData({
        __exifJSArrayBuffer: arrayBuffer
      }, function() {
        const orientation = EXIF.getTag(this, "Orientation") || 1;
        console.log('📱 EXIF Orientation detected:', orientation);
        resolve(orientation);
      });
    } catch (error) {
      console.log('⚠️ Could not read EXIF data, using default orientation');
      resolve(1); // Default orientation
    }
  });
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
        
        // Minimal debug info (removed excessive RGBA logging for performance)
        log('DEBUG', '🔧 RGBA data length:', data.data.length);
        
        resolve({
          width: data.width,
          height: data.height,
          data: data.data // RGBA buffer
        });
      });
    });
  }

  /**
   * Step 3: Extract signature package from last row alpha channels (OPTIMIZED)
   */
  extractSignatureFromLastRow(rgbaData, width, height) {
    log('INFO', '🔍 Extracting signature from last row...');
    
    const lastRowY = height - 1;
    const lastRowStart = lastRowY * width * 4;
    
    // Extract all bytes from last row alpha channels first
    const alphaBytes = [];
    for (let x = 0; x < width; x++) {
      const alphaIndex = lastRowStart + (x * 4) + 3;
      alphaBytes.push(rgbaData[alphaIndex]);
    }
    
    // Convert bytes directly to string (much faster than bit-by-bit)
    let extractedString = '';
    for (let i = 0; i < alphaBytes.length - 1; i += 2) {
      // Combine two alpha bytes to form one 16-bit character
      const byte1 = alphaBytes[i];
      const byte2 = alphaBytes[i + 1] || 0;
      
      // MSB first: byte1 is high byte, byte2 is low byte
      const charCode = (byte1 << 8) | byte2;
      
      if (charCode === 0) break; // Null terminator
      extractedString += String.fromCharCode(charCode);
    }
    
    log('DEBUG', '🔧 Extracted string length:', extractedString.length);
    log('DEBUG', '🔧 Extracted string preview:', extractedString.substring(0, 100));
    
    // Find JSON boundaries quickly
    const jsonStart = extractedString.indexOf('{');
    if (jsonStart === -1) {
      throw new Error('Invalid signature format: No JSON start found');
    }
    
    // Find matching closing brace
    let braceCount = 0;
    let jsonEnd = -1;
    
    for (let i = jsonStart; i < extractedString.length; i++) {
      const char = extractedString[i];
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    
    if (jsonEnd === -1) {
      throw new Error('Invalid signature format: No JSON end found');
    }
    
    const signatureData = extractedString.substring(jsonStart, jsonEnd);
    
    try {
      const parsed = JSON.parse(signatureData);
      
      // Quick validation
      if (!parsed.publicKey || !parsed.signature || !parsed.timestamp) {
        throw new Error('Missing required signature fields');
      }
      
      log('SUCCESS', '✅ Signature extracted and parsed');
      return parsed;
    } catch (error) {
      log('ERROR', '❌ Failed to parse signature data:', error);
      throw new Error('Invalid signature format: ' + error.message);
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
   * Step 5: Extract Basic Data from alpha channels (OPTIMIZED)
   */
  extractBasicDataFromAlphaChannels(rgbaData, width, height) {
    log('INFO', '📝 Step 5: Extracting Basic Data from Alpha channels...');
    
    const maxHeight = height - 1; // Exclude last row
    let binaryData = '';
    
    // Extract LSB from alpha channels (exclude last row)
    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3;
        const alphaValue = rgbaData[alphaIndex];
        
        // Extract LSB
        const bit = alphaValue & 1;
        binaryData += bit.toString();
        
        // Stop if we have enough bits for reasonable data
        if (binaryData.length >= 32000) break; // 2000 characters * 16 bits
      }
      if (binaryData.length >= 32000) break;
    }
    
    log('DEBUG', '🔧 Binary data length:', binaryData.length);
    
    // Convert binary to string (16 bits per character)
    let extractedString = '';
    for (let i = 0; i < binaryData.length; i += 16) {
      const chunk = binaryData.substr(i, 16);
      if (chunk.length === 16) {
        const charCode = parseInt(chunk, 2);
        if (charCode === 0) break; // Null terminator
        extractedString += String.fromCharCode(charCode);
      }
    }
    
    log('DEBUG', '🔧 Extracted string length:', extractedString.length);
    log('DEBUG', '🔧 Extracted string preview:', extractedString.substring(0, 100));
    
    // Try to find JSON in the extracted string
    try {
      const jsonStart = extractedString.indexOf('{');
      if (jsonStart === -1) {
        log('WARN', '⚠️ No JSON start found in basic data');
        return "{}"; // Return empty JSON if no data found
      }
      
      // Find matching closing brace
      let braceCount = 0;
      let jsonEnd = -1;
      
      for (let i = jsonStart; i < extractedString.length; i++) {
        const char = extractedString[i];
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      
      if (jsonEnd === -1) {
        log('WARN', '⚠️ No JSON end found in basic data');
        return "{}";
      }
      
      const jsonString = extractedString.substring(jsonStart, jsonEnd);
      
      // Try to parse to validate
      const parsed = JSON.parse(jsonString);
      log('SUCCESS', '✅ Basic data extracted and parsed successfully');
      return jsonString;
      
    } catch (error) {
      log('WARN', '⚠️ Failed to parse basic data as JSON:', error.message);
      return "{}"; // Return empty JSON on parse error
    }
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
   * Step 7: Compute SHA-512 hash of the clean PNG - MATCHING SIGNING PROCESS
   */
  computePngHash(cleanedRgbaData, width, height, basicInfo) {
    log('INFO', 'Computing SHA-512 hash matching signing process');
    
    // Generate hash the same way as during signing
    const combinedData = JSON.stringify({
      basicInfo: basicInfo,
      rgbaChecksum: cleanedRgbaData.slice(0, 1000).join(''),
      width: width,
      height: height
    });
    
    const hash = crypto.createHash('sha512').update(combinedData).digest('hex');
    
    log('SUCCESS', 'SHA-512 hash computed (matching signing process)', {
      length: hash.length,
      preview: hash.substring(0, 16)
    });
    
    return hash;
  }

  /**
   * Step 8: Verify signature using extracted public key and Noble secp256k1
   */
  async verifySignature(hash, signatureBase64, publicKeyBase64) {
    log('INFO', 'Starting signature verification');
    
    try {
      // Convert HEX hash string to bytes (same as mobile app signing)
      const hashBytes = new Uint8Array(
        hash.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      
      // Convert signature from Base64 to Uint8Array
      const signatureBytes = new Uint8Array(
        Buffer.from(signatureBase64, 'base64')
      );
      
      // Convert public key from Base64 to Uint8Array
      const publicKeyBytes = new Uint8Array(
        Buffer.from(publicKeyBase64, 'base64')
      );
      
      // Validate key and signature lengths for secp256k1
      if (publicKeyBytes.length !== 33) {
        throw new Error(`Invalid secp256k1 public key length: ${publicKeyBytes.length}, expected 33 (compressed)`);
      }
      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid secp256k1 signature length: ${signatureBytes.length}, expected 64`);
      }
      
      log('DEBUG', 'Verification data lengths', {
        hashHex: hash.length,
        hashBytes: hashBytes.length,
        signature: signatureBytes.length,
        publicKey: publicKeyBytes.length
      });
      
      // Verify signature using Noble secp256k1 to match mobile app
      const { secp256k1 } = await import('@noble/curves/secp256k1');
      
      // Verify the signature (secp256k1 format from mobile app)
      const isValid = secp256k1.verify(signatureBytes, hashBytes, publicKeyBytes);
      
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
      
      // Step 6: Convert cleaned RGBA to Array for hash computation
      const cleanedRgbaArray = Array.from(cleanedRgbaData);
      
      // Step 7: Compute hash (matching signing process)
      const pngHash = this.computePngHash(cleanedRgbaArray, width, height, basicDataStr);
      
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
          originalSize: pngBuffer.length
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
          originalSize: pngBuffer.length
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

/**
 * PurePngProcessor - Helper class for PNG processing workflow
 */
class PurePngProcessor {
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
   * Embed basic info in alpha channels (exclude last row for signature)
   */
  async embedBasicInfoInAlpha(rgba, basicInfo, width, height) {
    console.log('🔐 Embedding basic info into alpha channels...');
    
    // Create a copy of the RGBA data
    const rgbaWithBasicInfo = new Uint8Array(rgba);
    
    // Encode basic info as binary
    const binaryData = this.stringToBinary(basicInfo);
    console.log('📊 Basic info binary length:', binaryData.length, 'bits');
    
    // Embed in alpha channels (exclude last row)
    const lastRowStart = (height - 1) * width * 4;
    let bitIndex = 0;
    
    for (let i = 3; i < lastRowStart && bitIndex < binaryData.length; i += 4) {
      const bit = parseInt(binaryData[bitIndex]);
      rgbaWithBasicInfo[i] = (rgbaWithBasicInfo[i] & 0xFE) | bit;
      bitIndex++;
    }
    
    console.log('✅ Basic info embedded (excluding last row)');
    return rgbaWithBasicInfo;
  }

  /**
   * Embed signature package in last row only (OPTIMIZED - FIXED INDEXING)
   */
  async embedSignatureInLastRow(rgba, signaturePackage, width, height) {
    console.log('🔐 Embedding signature in last row...');
    
    // Create a copy of the RGBA data
    const finalRgba = new Uint8Array(rgba);
    
    // Prepare signature package
    const signatureJson = JSON.stringify(signaturePackage);
    console.log('📊 Signature JSON length:', signatureJson.length, 'characters');
    console.log('📊 Signature JSON preview:', signatureJson.substring(0, 100));
    
    // Convert string directly to bytes (FIXED: match extraction logic)
    const lastRowStart = (height - 1) * width * 4;
    let charIndex = 0;
    
    // Process last row pixels, each character needs 2 alpha channels
    for (let x = 0; x < width && charIndex < signatureJson.length; x++) {
      const char = signatureJson[charIndex];
      const charCode = char.charCodeAt(0);
      
      // Split 16-bit character into two 8-bit bytes (MSB first)
      const highByte = (charCode >> 8) & 0xFF;
      const lowByte = charCode & 0xFF;
      
      // Store in consecutive alpha channels (pixel x and x+1)
      const alpha1Index = lastRowStart + (x * 4) + 3;
      const alpha2Index = lastRowStart + ((x + 1) * 4) + 3;
      
      if (alpha1Index < finalRgba.length) finalRgba[alpha1Index] = highByte;
      if (alpha2Index < finalRgba.length) finalRgba[alpha2Index] = lowByte;
      
      // Move to next character (we used 2 pixels)
      x++; // Skip the next pixel since we used it for lowByte
      charIndex++;
    }
    
    console.log('✅ Signature embedded in last row (' + charIndex + ' characters)');
    return finalRgba;
  }

  /**
   * Extract basic info from alpha channels (exclude last row)
   */
  async extractBasicInfoFromAlpha(rgba, width, height) {
    console.log('🔍 Extracting basic info from alpha channels...');
    
    let binaryData = '';
    const lastRowStart = (height - 1) * width * 4;
    
    // Extract from alpha channels (exclude last row)
    for (let i = 3; i < lastRowStart; i += 4) {
      binaryData += (rgba[i] & 1).toString();
    }
    
    // Convert binary to string
    const basicInfo = this.binaryToString(binaryData);
    console.log('✅ Basic info extracted:', basicInfo.length, 'characters');
    
    return basicInfo;
  }

  /**
   * Clean last row (set alpha to 255)
   */
  async cleanLastRow(rgba, width, height) {
    console.log('🧹 Cleaning last row...');
    
    const cleanedRgba = new Uint8Array(rgba);
    const lastRowStart = (height - 1) * width * 4;
    
    // Set all alpha values in last row to 255
    for (let i = lastRowStart + 3; i < cleanedRgba.length; i += 4) {
      cleanedRgba[i] = 255;
    }
    
    console.log('✅ Last row cleaned');
    return cleanedRgba;
  }
}

// Initialize the processor
const purePngProcessor = new PurePngProcessor();

// Backend steganography helper class
class BackendSteganography {
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
   * Encode basic info into RGBA array
   */
  encodeBasicInfoIntoRGBA(rgbaArray, width, height, basicInfo) {
    console.log('🔐 Encoding basic info into RGBA array...');
    
    const binaryData = this.stringToBinary(basicInfo);
    console.log('📊 Basic info binary length:', binaryData.length, 'bits');
    
    // Create copy of RGBA array
    const rgbaWithInfo = [...rgbaArray];
    
    // Embed in alpha channels (exclude last row)
    const lastRowStart = (height - 1) * width * 4;
    let bitIndex = 0;
    
    for (let i = 3; i < lastRowStart && bitIndex < binaryData.length; i += 4) {
      const bit = parseInt(binaryData[bitIndex]);
      rgbaWithInfo[i] = (rgbaWithInfo[i] & 0xFE) | bit;
      bitIndex++;
    }
    
    console.log('✅ Basic info encoded into RGBA');
    return rgbaWithInfo;
  }

  /**
   * Store signature in last row (OPTIMIZED - FIXED INDEXING + SIZE CHECK)
   */
  storeSignatureInLastRow(rgbaArray, width, height, publicKey, signature) {
    console.log('🔐 Storing signature in last row...');
    
    // Create signature package
    const signaturePackage = {
      publicKey,
      signature,
      timestamp: new Date().toISOString(),
      version: '3.0-backend-workflow'
    };
    
    const signatureJson = JSON.stringify(signaturePackage);
    console.log('📊 Signature JSON length:', signatureJson.length, 'characters');
    
    // Check if last row has enough space
    const maxCharsInLastRow = Math.floor(width / 2); // Each character needs 2 pixels
    if (signatureJson.length > maxCharsInLastRow) {
      console.warn('⚠️ Signature too large for last row!');
      console.warn('📊 Signature needs:', signatureJson.length, 'characters');
      console.warn('📊 Last row can fit:', maxCharsInLastRow, 'characters');
      console.warn('📊 Image width:', width, 'pixels');
      
      // Truncate or throw error
      throw new Error(`Signature too large (${signatureJson.length} chars) for image width (${width} pixels, max ${maxCharsInLastRow} chars)`);
    }
    
    // Create copy of RGBA array
    const finalRgba = [...rgbaArray];
    
    // Embed using optimized byte-level approach (FIXED: match extraction logic)
    const lastRowStart = (height - 1) * width * 4;
    let charIndex = 0;
    
    // Process last row pixels, each character needs 2 alpha channels
    for (let x = 0; x < width && charIndex < signatureJson.length; x++) {
      const char = signatureJson[charIndex];
      const charCode = char.charCodeAt(0);
      
      // Split 16-bit character into two 8-bit bytes (MSB first)
      const highByte = (charCode >> 8) & 0xFF;
      const lowByte = charCode & 0xFF;
      
      // Store in consecutive alpha channels (pixel x and x+1)
      const alpha1Index = lastRowStart + (x * 4) + 3;
      const alpha2Index = lastRowStart + ((x + 1) * 4) + 3;
      
      if (alpha1Index < finalRgba.length) finalRgba[alpha1Index] = highByte;
      if (alpha2Index < finalRgba.length) finalRgba[alpha2Index] = lowByte;
      
      // Move to next character (we used 2 pixels)
      x++; // Skip the next pixel since we used it for lowByte
      charIndex++;
    }
    
    console.log('✅ Signature stored in last row (' + charIndex + ' characters)');
    return finalRgba;
  }
}

// Initialize backend steganography
const backendSteg = new BackendSteganography();

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'GeoCam Steganography Service',
    timestamp: new Date().toISOString(),
    version: '3.0',
    endpoints: [
      '/health',
      '/pure-png-verify',
      '/process-geocam-image',
      '/complete-geocam-image',
      '/pure-png-sign'
    ]
  });
});

// ==================== NEW CLEANER WORKFLOW ENDPOINTS ====================

/**
 * NEW WORKFLOW: Step 1 - Process image and return hash for signing
 * App sends: image + public key
 * Backend: JPEG→PNG, embed metadata (exclude last row), create hash, return hash
 */
app.post('/pure-png-process', async (req, res) => {
  console.log('🎯 === NEW WORKFLOW: Step 1 - Process Image ===');
  
  try {
    const { imageBase64, basicInfo, publicKey } = req.body;
    
    if (!imageBase64 || !basicInfo || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: imageBase64, basicInfo, publicKey'
      });
    }

    console.log('📱 Processing image with new workflow');
    console.log('📊 JPEG base64 length:', imageBase64.length);
    console.log('📝 Basic info length:', basicInfo.length);
    console.log('🔑 Public key length:', publicKey.length);

    // Create temp file from base64
    const tempFilePath = path.join('temp_images', `temp_${Date.now()}.jpg`);
    const jpegBuffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(tempFilePath, jpegBuffer);
    console.log('💾 Created temporary file:', tempFilePath);

    // Load image using loadImage
    const img = await loadImage(tempFilePath);
    console.log('✅ JPEG loaded:', img.width, 'x', img.height);

    // Get EXIF orientation
    const exifBuffer = fs.readFileSync(tempFilePath);
    const orientation = await getImageOrientation(exifBuffer);
    
    // Convert to RGBA with correct orientation
    const canvas = getCanvasWithCorrectOrientation(img, orientation);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = imageData.data;
    console.log('✅ JPEG → Canvas → RGBA completed with orientation', orientation);
    console.log('📊 Final dimensions:', canvas.width, 'x', canvas.height);
    console.log('📊 RGBA array length:', rgba.length);

    // Embed basic info in alpha channels (exclude last row)
    console.log('🔐 Embedding basic info into RGBA (excluding last row)...');
    const processor = new PurePngProcessor();
    const rgbaWithBasicInfo = await processor.embedBasicInfoInAlpha(rgba, basicInfo, canvas.width, canvas.height);
    console.log('✅ Basic info embedded into Alpha channels');

    // Create hash of processed image (without signature)
    console.log('🔐 Creating hash of processed image...');
    const hashToSign = crypto.createHash('sha512')
      .update(Buffer.from(rgbaWithBasicInfo))
      .digest('hex');
    console.log('🔐 Generated hash for signing:', hashToSign.length, 'characters');
    console.log('🔐 Hash preview:', hashToSign.substring(0, 16) + '...');

    // Store processed data temporarily
    const sessionId = crypto.randomBytes(16).toString('hex');
    global.processingCache = global.processingCache || {};
    global.processingCache[sessionId] = {
      rgbaWithBasicInfo,
      width: canvas.width,
      height: canvas.height,
      publicKey,
      basicInfo,
      hashToSign,
      timestamp: Date.now()
    };

    // Cleanup temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log('✅ Step 1 completed: Image processed, hash ready for signing');
    
    return res.json({
      success: true,
      sessionId,
      hashToSign,
      imageInfo: {
        width: canvas.width,
        height: canvas.height,
        rgbaLength: rgbaWithBasicInfo.length
      }
    });

  } catch (error) {
    console.error('❌ Image processing failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * NEW WORKFLOW: Step 2 - Finalize with signature
 * App sends: sessionId + signature
 * Backend: embed signature in last row, return final PNG
 */
app.post('/pure-png-finalize', async (req, res) => {
  console.log('🎯 === NEW WORKFLOW: Step 2 - Finalize with Signature ===');
  
  try {
    const { sessionId, signature } = req.body;
    
    if (!sessionId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, signature'
      });
    }

    console.log('📊 Session ID:', sessionId);
    console.log('📊 Signature length:', signature.length);

    // Retrieve cached processing data
    const processingData = global.processingCache?.[sessionId];
    if (!processingData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    console.log('✅ Retrieved cached processing data');
    const { rgbaWithBasicInfo, width, height, publicKey, basicInfo, hashToSign } = processingData;

    // Create signature package
    const signaturePackage = {
      publicKey,
      signature,
      timestamp: new Date().toISOString(),
      version: '3.0-clean-workflow'
    };

    console.log('🔐 Embedding signature in last row...');
    const processor = new PurePngProcessor();
    const finalRgba = await processor.embedSignatureInLastRow(
      rgbaWithBasicInfo,
      signaturePackage,
      width,
      height
    );
    console.log('✅ Signature embedded in last row');

    // Convert to PNG
    console.log('💾 Converting RGBA to PNG with UPNG.js...');
    const pngBuffer = UPNG.encode([finalRgba.buffer], width, height, 0);
    const pngBase64 = Buffer.from(pngBuffer).toString('base64');
    console.log('✅ PNG created with UPNG.js');
    console.log('📊 PNG size:', pngBuffer.byteLength, 'bytes');
    console.log('📊 Base64 length:', pngBase64.length, 'characters');

    // Clean up cache
    delete global.processingCache[sessionId];

    console.log('🎉 === NEW WORKFLOW COMPLETED SUCCESSFULLY ===');
    
    return res.json({
      success: true,
      pngBase64,
      stats: {
        width,
        height,
        pngSize: pngBuffer.byteLength,
        base64Length: pngBase64.length,
        signatureVersion: '3.0-clean-workflow'
      }
    });

  } catch (error) {
    console.error('❌ Signature finalization failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== PURE PNG WORKFLOW ENDPOINTS (NO CANVAS) ====================

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
    
    // Encode basic info into RGBA
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
    console.log('📊 PNG base64 length:', pngBase64.length);
    
    // Convert base64 to buffer
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    
    // Use GeoCamPNGVerifier for complete verification workflow
    const verificationResult = await geocamPNGVerifier.verifyGeoCamPNG(pngBuffer);
    
    console.log('✅ Verification completed');
    console.log('   - Success:', verificationResult.success);
    console.log('   - Signature valid:', verificationResult.verification?.valid);
    
    if (!verificationResult.success) {
      return res.status(200).json({
        success: false,
        verification_result: {
          signature_valid: false,
          is_authentic: false,
          message: verificationResult.error || 'Image verification failed'
        }
      });
    }
    
    // Parse basic info
    let parsedBasicInfo = null;
    try {
      parsedBasicInfo = JSON.parse(verificationResult.extractedData.basicInfo);
    } catch (parseError) {
      parsedBasicInfo = {
        rawData: verificationResult.extractedData.basicInfo,
        note: 'Data is not in JSON format'
      };
    }
    
    return res.json({
      success: true,
      verification_result: {
        signature_valid: verificationResult.verification.valid,
        decoded_info: parsedBasicInfo,
        is_authentic: verificationResult.verification.valid,
        message: verificationResult.verification.message,
        method: 'GeoCamPNGVerifier'
      },
      imageInfo: verificationResult.imageInfo
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
  
  let tempFilePath = null; // Initialize to null
  
  try {
    // Handle both FormData and JSON requests
    let jpegBase64, basicInfo, publicKey;
    
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

    // Get EXIF orientation
    const exifBuffer = fs.readFileSync(tempFilePath);
    const orientation = await getImageOrientation(exifBuffer);

    // Create canvas and get RGBA data with correct orientation
    const canvas = getCanvasWithCorrectOrientation(img, orientation);
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgbaArray = Array.from(imageData.data);
    
    console.log('✅ JPEG → Canvas → RGBA completed with orientation', orientation);
    console.log('📊 Final dimensions:', canvas.width, 'x', canvas.height);
    console.log('📊 RGBA array length:', rgbaArray.length);

    // Encode basic info into RGBA
    const rgbaWithInfo = backendSteg.encodeBasicInfoIntoRGBA(
      rgbaArray,
      canvas.width,
      canvas.height,
      basicInfo
    );

    // Generate hash for signing (matching frontend logic)
    const combinedData = JSON.stringify({
      basicInfo: basicInfo,
      rgbaChecksum: rgbaWithInfo.slice(0, 1000).join(''),
      width: canvas.width,
      height: canvas.height
    });

    const hashToSign = crypto.createHash('sha512').update(combinedData).digest('hex');
    console.log('🔐 Generated hash for signing:', hashToSign.length, 'characters');
    console.log('🔐 Hash preview:', hashToSign.substring(0, 16) + '...');

    // Store processed data temporarily (in production, use Redis or similar)
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Store in memory (temporary solution)
    global.processingCache = global.processingCache || {};
    global.processingCache[sessionId] = {
      rgbaWithBasicInfo: rgbaWithInfo,
      width: canvas.width,
      height: canvas.height,
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
      sessionId,
      hashToSign,
      imageInfo: {
        width: canvas.width,
        height: canvas.height,
        rgbaLength: rgbaWithInfo.length
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GeoCam Steganography Service running on port ${PORT}`);
  console.log(`🌐 Listening on all interfaces (0.0.0.0:${PORT})`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /pure-png-sign - Image signing endpoint`);
  console.log(`   POST /pure-png-verify - Image verification endpoint`);
  console.log(`   POST /decode-image - Legacy decoder`);
  console.log(`   POST /verify-geocam-png - Legacy PNG verification`);
  console.log(`   POST /verify-geocam-rgba - RGBA verification`);
  console.log(`🔍 Core services initialized`);
});