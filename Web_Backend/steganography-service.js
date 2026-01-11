const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');
const sharp = require('sharp');
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
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for temporary file uploads
const upload = multer({
  dest: 'temp_images/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Ensure temp directory exists
if (!fs.existsSync('temp_images')) {
  fs.mkdirSync('temp_images');
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
   * Compute SHA-512 hex hash over the full "clean" RGBA byte sequence.
   *
   * "Clean" means:
   * - basicInfo may be embedded in alpha LSBs (excluding last row)
   * - last-row alpha must already be reset to 255 (signature removed / not yet written)
   *
   * Versioning/metadata is stored in the steganography JSON package.
   */
  computeFullRgbaHash(cleanRgba) {
    log('INFO', 'Computing SHA-512 hash over full clean RGBA bytes');

    const rgbaBytes =
      cleanRgba instanceof Uint8Array
        ? cleanRgba
        : Uint8Array.from(cleanRgba);

    const hash = crypto.createHash('sha512').update(Buffer.from(rgbaBytes)).digest('hex');

    log('SUCCESS', 'SHA-512 full-RGBA hash computed', {
      length: hash.length,
      preview: hash.substring(0, 16)
    });

    return hash;
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
   * Step 7: Compute SHA-512 hash of the clean image+info (FULL RGBA) - MATCHING SIGNING PROCESS
   */
  computePngHash(cleanedRgbaData) {
    // Backward compatibility intentionally removed: always use full clean RGBA hash
    return this.computeFullRgbaHash(cleanedRgbaData);
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

      // Step 6: Compute hash over full clean RGBA bytes (matching signing process)
      const pngHash = this.computePngHash(cleanedRgbaData);
      
      // Step 7: Verify signature
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
      version: '4.0-full-rgba-sha512'
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

// STEP 1: Process JPEG and prepare for signing
app.post('/process-geocam-image', upload.single('image'), async (req, res) => {
  console.log('🎯 === BACKEND: Full GeoCam Processing Started ===');
  
  let tempFilePath = null; // Initialize to null
  
  try {
    // Handle both FormData and JSON requests
    let jpegBuffer, basicInfo, publicKey;
    
    if (req.headers['content-type']?.includes('application/json')) {
      // JSON request from React Native
      const { jpegBase64: jpeg, basicInfo: info, publicKey: key } = req.body;
      if (!jpeg || !info || !key) {
        return res.status(400).json({
          success: false,
          error: 'Missing jpegBase64, basicInfo, or publicKey in JSON request'
        });
      }
      
      console.log('📱 Processing JSON request from React Native');
      console.log('📊 JPEG base64 length:', jpeg.length);
      
      jpegBuffer = Buffer.from(jpeg, 'base64');
      basicInfo = info;
      publicKey = key;
      
    } else {
      // FormData request (for web compatibility)
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided in FormData request'
        });
      }
      
      jpegBuffer = fs.readFileSync(req.file.path);
      basicInfo = req.body.basicInfo;
      publicKey = req.body.publicKey;
      tempFilePath = req.file.path;
      
      console.log('🌐 Processing FormData request');
      console.log('📊 File size:', jpegBuffer.length, 'bytes');
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

    // Process image using Sharp
    let sharpImage = sharp(jpegBuffer);
    
    // Get image metadata including orientation
    const metadata = await sharpImage.metadata();
    console.log('📊 Original dimensions:', metadata.width, 'x', metadata.height);
    console.log('📊 Orientation:', metadata.orientation);

    // Normalize orientation
    sharpImage = sharpImage.rotate(); // Auto-rotate based on EXIF

    // Convert to raw RGBA pixels
    const { data: rgbaArray, info } = await sharpImage
      .ensureAlpha() // Ensure alpha channel exists
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log('✅ Image processed with Sharp');
    console.log('📊 Processed dimensions:', info.width, 'x', info.height);

    let finalWidth = info.width;
    let finalHeight = info.height;
    let finalRgbaArray = new Uint8Array(rgbaArray);

    // If width is greater than height, rotate to portrait
    if (finalWidth > finalHeight) {
      console.log('🔄 Image is landscape, rotating to portrait...');
      
      // Use Sharp to rotate 90 degrees CCW
      const rotated = await sharp(Buffer.from(rgbaArray), {
        raw: {
          width: finalWidth,
          height: finalHeight,
          channels: 4
        }
      })
      .rotate(90)
      .raw()
      .toBuffer({ resolveWithObject: true });

      finalRgbaArray = new Uint8Array(rotated.data);
      finalWidth = rotated.info.width;
      finalHeight = rotated.info.height;
      
      console.log('✅ Image rotated to portrait');
      console.log('📊 Final dimensions:', finalWidth, 'x', finalHeight);
    }

    // Convert Uint8Array to regular array for compatibility with existing code
    const rgbaArrayForEncoding = Array.from(finalRgbaArray);

    // Encode basic info into RGBA
    const rgbaWithInfo = backendSteg.encodeBasicInfoIntoRGBA(
      rgbaArrayForEncoding,
      finalWidth,
      finalHeight,
      basicInfo
    );

    // Ensure the signature row is "empty" for hashing/signing.
    // Protocol: last-row alpha must be 255 when computing the image+info hash.
    const lastRowStart = (finalHeight - 1) * finalWidth * 4;
    for (let x = 0; x < finalWidth; x++) {
      const alphaIndex = lastRowStart + (x * 4) + 3;
      rgbaWithInfo[alphaIndex] = 255;
    }

    // Generate hash for signing: FULL clean RGBA bytes (image+embedded info, signature row empty)
    const hashToSign = geocamPNGVerifier.computeFullRgbaHash(rgbaWithInfo);
    console.log('🔐 Generated hash for signing:', hashToSign.length, 'characters');
    console.log('🔐 Hash preview:', hashToSign.substring(0, 16) + '...');

    // Store processed data temporarily
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    global.processingCache = global.processingCache || {};
    global.processingCache[sessionId] = {
      rgbaWithBasicInfo: rgbaWithInfo,
      width: finalWidth,
      height: finalHeight,
      publicKey,
      basicInfo,
      originalOrientation: metadata.orientation,
      originalDimensions: { width: metadata.width, height: metadata.height },
      timestamp: Date.now()
    };

    // Cleanup temp file if exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log('✅ Step 1 completed: Image processed, ready for signing');
    
    return res.json({
      success: true,
      sessionId,
      hashToSign,
      imageInfo: {
        width: finalWidth,
        height: finalHeight,
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

    // Convert RGBA to PNG using Sharp (faster than UPNG.js)
    console.log('💾 Converting RGBA to PNG with Sharp...');
    
    const pngBuffer = await sharp(Buffer.from(finalRgba), {
      raw: {
        width: cached.width,
        height: cached.height,
        channels: 4
      }
    })
    .png({
      compressionLevel: 6, // Balanced between speed and size
      effort: 7,          // Higher effort = better compression but slower
      palette: false      // Keep full color information
    })
    .toBuffer();

    const pngBase64 = pngBuffer.toString('base64');

    console.log('✅ PNG created with Sharp');
    console.log('📊 PNG size:', pngBuffer.byteLength, 'bytes');
    console.log('📊 Base64 length:', pngBase64.length, 'characters');

    // Cleanup cache
    delete global.processingCache[sessionId];

    console.log('🎉 === BACKEND PROCESSING COMPLETED SUCCESSFULLY ===');
    console.log('✅ All steps completed in backend');
    console.log('✅ Using Sharp for fast PNG encoding');

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
  console.log(`   POST /complete-geocam-image - Image completion endpoint`);
  console.log(`   POST /process-geocam-image - Image processing endpoint`);
  console.log(`🔍 Core services initialized`);
});