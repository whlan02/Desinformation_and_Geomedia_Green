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

// Initialize GeoCam verifier
const geocamPNGVerifier = new GeoCamPNGVerifier();

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GeoCam Steganography Service running on port ${PORT}`);
  console.log(`🌐 Listening on all interfaces (0.0.0.0:${PORT})`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /pure-png-verify - Image verification endpoint`);
  console.log(`🔍 Core services initialized`);
});