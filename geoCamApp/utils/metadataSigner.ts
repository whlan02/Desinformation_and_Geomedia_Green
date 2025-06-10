import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nacl from 'tweetnacl';
import { Base64 } from 'js-base64';
import piexif from 'piexifjs';
import exifr from 'exifr';

const PRIVATE_KEY_KEY = 'metadata_signer_private_key';
const PUBLIC_KEY_KEY = 'metadata_signer_public_key';

async function getKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
  const storedSk = await AsyncStorage.getItem(PRIVATE_KEY_KEY);
  if (storedSk) {
    const skBytes = Base64.toUint8Array(storedSk);
    const keyPair = nacl.sign.keyPair.fromSecretKey(skBytes);
    return keyPair;
  }
  const keyPair = nacl.sign.keyPair();
  const skBase64 = Base64.fromUint8Array(keyPair.secretKey);
  const pkBase64 = Base64.fromUint8Array(keyPair.publicKey);
  await AsyncStorage.setItem(PRIVATE_KEY_KEY, skBase64);
  await AsyncStorage.setItem(PUBLIC_KEY_KEY, pkBase64);
  return keyPair;
}

/**
 * Detects image format from base64 data
 */
function detectImageFormat(base64: string): 'jpeg' | 'png' | 'webp' | 'unknown' {
  try {
    const header = base64.substring(0, 16);
    const binary = global.atob(header);
    
    // JPEG magic bytes: FF D8 FF
    if (binary.charCodeAt(0) === 0xFF && binary.charCodeAt(1) === 0xD8 && binary.charCodeAt(2) === 0xFF) {
      return 'jpeg';
    }
    
    // PNG magic bytes: 89 50 4E 47
    if (binary.charCodeAt(0) === 0x89 && binary.charCodeAt(1) === 0x50 && 
        binary.charCodeAt(2) === 0x4E && binary.charCodeAt(3) === 0x47) {
      return 'png';
    }
    
    // WebP magic bytes: starts with "RIFF" and contains "WEBP"
    if (binary.substring(0, 4) === 'RIFF' && binary.substring(8, 12) === 'WEBP') {
      return 'webp';
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Optimized fast image signing - prioritizes speed over format detection
 * @param uri Local file URI of the image
 * @returns URI of the signed image file
 */
async function signImage(uri: string): Promise<string> {
  const keyPair = await getKeyPair();
  
  try {
    // Read image as base64 - single operation
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Quick format detection - only check first few bytes
    const isJPEG = base64.startsWith('/9j/') || base64.startsWith('R0lG'); // Common JPEG base64 start
    
    // Optimized byte conversion for signature
    const signature = nacl.sign.detached(base64ToUint8Array(base64), keyPair.secretKey);
    const sigBase64 = Base64.fromUint8Array(signature);
    
    if (isJPEG) {
      // Fast JPEG EXIF embedding
      try {
        const dataUri = `data:image/jpeg;base64,${base64}`;
        const exifObj = { 'Exif': { [piexif.ExifIFD.UserComment]: sigBase64 }, '0th': {}, '1st': {}, 'thumbnail': null, 'GPS': {} };
        
        const exifBytes = piexif.dump(exifObj);
        const newData = piexif.insert(exifBytes, dataUri);
        const newBase64 = newData.substring(23); // Remove "data:image/jpeg;base64,"
        
        await FileSystem.writeAsStringAsync(uri, newBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('Fast JPEG EXIF signature');
        return uri;
        
      } catch (exifError) {
        console.warn('Fast EXIF failed, using companion file');
      }
    }
    
    // Fast companion file creation
    await createCompanionSignatureFileSync(uri, sigBase64);
    console.log('Fast companion file signature');
    
    return uri;
  } catch (error) {
    console.error('Error signing image:', error);
    throw new Error(`Failed to sign image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Optimized base64 to Uint8Array conversion
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = global.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  
  // Optimized loop - process in chunks
  for (let i = 0; i < len; i += 8) {
    const end = Math.min(i + 8, len);
    for (let j = i; j < end; j++) {
      bytes[j] = binary.charCodeAt(j);
    }
  }
  
  return bytes;
}

/**
 * Creates a companion .sig file containing the signature
 */
async function createCompanionSignatureFile(imageUri: string, signature: string): Promise<void> {
  const sigUri = imageUri.replace(/\.[^.]+$/, '.sig');
  const signatureData = JSON.stringify({
    signature,
    algorithm: 'Ed25519',
    version: '1.0',
    timestamp: new Date().toISOString()
  });
  
  await FileSystem.writeAsStringAsync(sigUri, signatureData, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/**
 * Fast companion signature file creation
 */
async function createCompanionSignatureFileSync(imageUri: string, signature: string): Promise<void> {
  const sigUri = imageUri.replace(/\.[^.]+$/, '.sig');
  // Minimal JSON for speed
  const signatureData = `{"signature":"${signature}","algorithm":"Ed25519"}`;
  
  await FileSystem.writeAsStringAsync(sigUri, signatureData, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/**
 * Fast image signature verification
 */
async function verifyImageSignature(imageUri: string): Promise<{ valid: boolean; method: string; error?: string }> {
  try {
    const [publicKeyBase64, base64] = await Promise.all([
      getPublicKey(),
      FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 })
    ]);
    
    const publicKey = Base64.toUint8Array(publicKeyBase64);
    const imageBytes = base64ToUint8Array(base64);
    
    // Quick check for JPEG EXIF first
    const isJPEG = base64.startsWith('/9j/');
    
    if (isJPEG) {
      try {
        const dataUri = `data:image/jpeg;base64,${base64}`;
        const exifObj = piexif.load(dataUri);
        
        if (exifObj?.['Exif']?.[piexif.ExifIFD.UserComment]) {
          const signature = Base64.toUint8Array(exifObj['Exif'][piexif.ExifIFD.UserComment]);
          const isValid = nacl.sign.detached.verify(imageBytes, signature, publicKey);
          return { valid: isValid, method: 'EXIF' };
        }
      } catch (exifError) {
        // Silently fall through to companion file
      }
    }
    
    // Check companion file
    const sigUri = imageUri.replace(/\.[^.]+$/, '.sig');
    try {
      const signatureData = await FileSystem.readAsStringAsync(sigUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      const sigObj = JSON.parse(signatureData);
      const signature = Base64.toUint8Array(sigObj.signature);
      
      const isValid = nacl.sign.detached.verify(imageBytes, signature, publicKey);
      return { valid: isValid, method: 'companion' };
    } catch {
      // No companion file or invalid
    }
    
    return { valid: false, method: 'none', error: 'No signature found' };
    
  } catch (error) {
    return { valid: false, method: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Retrieves the Base64-encoded public key for signature verification.
 */
async function getPublicKey(): Promise<string> {
  const storedPk = await AsyncStorage.getItem(PUBLIC_KEY_KEY);
  if (storedPk) {
    return storedPk;
  }
  const keyPair = await getKeyPair();
  return Base64.fromUint8Array(keyPair.publicKey);
}

export { signImage, verifyImageSignature, getPublicKey };