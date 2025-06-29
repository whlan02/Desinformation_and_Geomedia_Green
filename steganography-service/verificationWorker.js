const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const { PNG } = require('pngjs');

class VerificationWorker {
  constructor() {
    this.STEG_PARAMS = {
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

  extractSignatureFromLastRow(rgbaData, width, height) {
    const lastRowY = height - 1;
    let binaryString = '';
    
    for (let x = 0; x < width; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      const alphaValue = rgbaData[alphaIndex];
      
      for (let bit = 0; bit < 8; bit++) {
        binaryString += ((alphaValue & (1 << (7 - bit))) ? '1' : '0');
      }
    }
    
    const signaturePackageStr = this.binaryToString(binaryString);
    let braceCount = 0;
    let jsonEndIndex = -1;
    
    for (let i = 0; i < signaturePackageStr.length; i++) {
      if (signaturePackageStr[i] === '{') braceCount++;
      else if (signaturePackageStr[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEndIndex = i + 1;
          break;
        }
      }
    }
    
    if (jsonEndIndex === -1) {
      throw new Error('No valid signature package found');
    }
    
    const cleanJsonStr = signaturePackageStr.substring(0, jsonEndIndex);
    return JSON.parse(cleanJsonStr);
  }

  resetLastRow(rgbaData, width, height) {
    const lastRowY = height - 1;
    const result = new Uint8Array(rgbaData);
    
    for (let x = 0; x < width; x++) {
      const pixelIndex = (lastRowY * width + x) * 4;
      const alphaIndex = pixelIndex + 3;
      result[alphaIndex] = 255;
    }
    
    return result;
  }

  extractBasicInfo(rgbaData, width, height) {
    const maxHeight = height - 1;
    let binaryString = '';
    
    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alphaIndex = pixelIndex + 3;
        const alphaValue = rgbaData[alphaIndex];
        
        for (let bit = 0; bit < 8; bit++) {
          binaryString += ((alphaValue & (1 << (7 - bit))) ? '1' : '0');
        }
        
        const testStr = this.binaryToString(binaryString);
        if (testStr.includes(this.STEG_PARAMS.delimiter)) {
          return testStr.substring(0, testStr.indexOf(this.STEG_PARAMS.delimiter));
        }
      }
    }
    
    return this.binaryToString(binaryString);
  }

  async verifySignature(hash, signatureBase64, publicKeyBase64) {
    try {
      const { secp256k1 } = await import('@noble/curves/secp256k1');
      
      const hashBytes = new Uint8Array(Buffer.from(hash, 'hex'));
      const signatureDER = new Uint8Array(Buffer.from(signatureBase64, 'base64'));
      const publicKeyBytes = new Uint8Array(Buffer.from(publicKeyBase64, 'base64'));
      
      const signature = secp256k1.Signature.fromDER(signatureDER);
      const isValid = secp256k1.verify(signature, hashBytes, publicKeyBytes);
      
      return {
        valid: isValid,
        message: isValid ? 'Signature is valid' : 'Signature is invalid'
      };
    } catch (error) {
      return {
        valid: false,
        message: `Signature verification failed: ${error.message}`
      };
    }
  }

  async processChunk(chunk) {
    const { rgbaData, width, height } = chunk;
    
    try {
      // Extract signature
      const signatureData = this.extractSignatureFromLastRow(rgbaData, width, height);
      
      // Reset last row
      const cleanedRgba = this.resetLastRow(rgbaData, width, height);
      
      // Extract basic info
      const basicInfo = this.extractBasicInfo(cleanedRgba, width, height);
      
      // Create PNG from cleaned RGBA
      const png = new PNG({ width, height });
      png.data = Buffer.from(cleanedRgba);
      
      // Hash the PNG
      const pngBuffer = PNG.sync.write(png);
      const hash = crypto.createHash('sha512').update(pngBuffer).digest('hex');
      
      // Verify signature
      const verificationResult = await this.verifySignature(
        hash,
        signatureData.signature,
        signatureData.publicKey
      );
      
      return {
        success: true,
        verification: verificationResult,
        extractedData: {
          basicInfo,
          signatureData: {
            timestamp: signatureData.timestamp,
            version: signatureData.version,
            publicKeyLength: signatureData.publicKey?.length || 0,
            signatureLength: signatureData.signature?.length || 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Handle messages from main thread
parentPort.on('message', async (chunk) => {
  const worker = new VerificationWorker();
  const result = await worker.processChunk(chunk);
  parentPort.postMessage(result);
}); 