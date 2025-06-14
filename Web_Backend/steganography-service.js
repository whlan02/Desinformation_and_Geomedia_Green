const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
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
      console.log('🔍 Starting steganography decode...');
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const t = this.config.t;
      const threshold = this.config.threshold;
      const codeUnitSize = this.config.codeUnitSize;
      const prime = this.findNextPrime(Math.pow(2, t));
      
      console.log('🔍 Decode parameters:', { t, threshold, codeUnitSize, prime });
      
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
        console.warn("Decoding for threshold > 1 is not implemented");
        return '';
      }
      
      console.log('🔍 Extracted mod message length:', modMessage.length);
      
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
      
      console.log('🔍 Decoded message length:', message.length);
      return message;
      
    } catch (error) {
      console.error('❌ Steganography decode error:', error);
      throw error;
    }
  }

  encode(message, canvas) {
    try {
      console.log('🔍 Starting steganography encode...');
      
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
      console.log('🔍 Steganography encode completed');
      return canvas;
      
    } catch (error) {
      console.error('❌ Steganography encode error:', error);
      throw error;
    }
  }
}

// Initialize steganography
const steg = new SimpleSteganography();

// Crypto utilities (ported from mobile app)
const crypto = require('crypto');

function generateDataHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function verifySignatureWithDeviceKey(data, signature, publicKey) {
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
  res.json({ status: 'OK', service: 'GeoCam Steganography Service' });
});

// Decode steganography from image
app.post('/decode-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('📷 Processing image for steganography decoding...');
    console.log('📁 File:', req.file.filename, 'Size:', req.file.size);

    // Load image with canvas
    const image = await loadImage(req.file.path);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Decode steganography
    const decodedMessage = steg.decode(canvas);
    
    console.log('🔍 Decoded message length:', decodedMessage ? decodedMessage.length : 0);

    if (!decodedMessage || decodedMessage.trim() === '') {
      // Clean up temp file
      fs.unlink(req.file.path, () => {});
      return res.json({
        success: false,
        error: 'No hidden information found in the image'
      });
    }

    // Parse decoded data and verify signature
    let parsedData = null;
    let verificationResult = {
      valid: false,
      message: 'No signature found'
    };

    try {
      parsedData = JSON.parse(decodedMessage);
      console.log('📋 Parsed data keys:', Object.keys(parsedData));
      
      // Check if signature information is included
      if (parsedData.signature && parsedData.publicKey && parsedData.dataHash) {
        console.log('🔍 Found signature data in image');
        
        // Reconstruct original data (excluding signature-related fields)
        const { signature, publicKey, dataHash, ...originalData } = parsedData;
        const originalDataStr = JSON.stringify(originalData);
        
        console.log('📝 Original data for verification:', originalDataStr);
        console.log('🔐 Stored data hash:', dataHash);
        
        // Recalculate hash
        const recalculatedHash = generateDataHash(originalDataStr);
        console.log('🔍 Recalculated hash:', recalculatedHash);
        
        if (recalculatedHash === dataHash) {
          console.log('✅ Data hash verification passed');
          // Verify signature
          const isSignatureValid = verifySignatureWithDeviceKey(dataHash, signature, publicKey);
          verificationResult = {
            valid: isSignatureValid,
            message: isSignatureValid ? 
              'Digital signature is valid - Image is authentic' : 
              'Digital signature is invalid - Image may have been tampered with'
          };
        } else {
          console.log('❌ Data hash verification failed');
          verificationResult = {
            valid: false,
            message: 'Data hash mismatch - Image has been modified'
          };
        }
      } else {
        console.log('❌ Missing signature components');
        verificationResult = {
          valid: false,
          message: 'No digital signature found - Image authenticity cannot be verified'
        };
      }
    } catch (parseError) {
      console.log('❌ JSON parsing failed, treating as legacy format');
      verificationResult = {
        valid: false,
        message: 'Legacy format detected - No signature verification available'
      };
    }

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    // Format display data (exclude signature-related fields for readability)
    let formattedInfo = '';
    if (parsedData) {
      for (const key in parsedData) {
        if (parsedData.hasOwnProperty(key) && !['signature', 'publicKey', 'dataHash'].includes(key)) {
          if (key === 'location' && parsedData[key]) {
            formattedInfo += `Location:\\nLat: ${parsedData[key].latitude}\\nLon: ${parsedData[key].longitude}\\n`;
          } else {
            formattedInfo += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${parsedData[key]}\\n`;
          }
        }
      }
    }

    res.json({
      success: true,
      decodedInfo: formattedInfo.trim() || `Decoded (raw): ${decodedMessage}`,
      signatureVerification: verificationResult,
      rawData: decodedMessage
    });

  } catch (error) {
    console.error('❌ Steganography decoding error:', error);
    
    // Clean up temp file if it exists
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to decode image',
      details: error.message 
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

app.listen(PORT, () => {
  console.log(`🚀 GeoCam Steganography Service running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /decode-image - Decode steganography from image`);
  console.log(`   POST /encode-image - Encode message into image`);
  console.log(`🔍 Steganography library initialized successfully`);
}); 