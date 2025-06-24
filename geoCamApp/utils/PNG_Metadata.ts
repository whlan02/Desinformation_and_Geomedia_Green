/**
 * PNG_Metadata.ts
 * Simple utility for embedding and extracting metadata (public key, signature) in PNG files
 */

export interface PNGMetadata {
  publicKey: string;
  signature: string;
  algorithm: string;
  timestamp: string;
  keyId: string;
}

// PNG chunk types
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const CHUNK_TYPE_IEND = new Uint8Array([0x49, 0x45, 0x4E, 0x44]); // "IEND"
const CHUNK_TYPE_TEXT = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"

// GeoCam metadata keys
const GEOCAM_PUBLIC_KEY = "GeoCam-PublicKey";
const GEOCAM_SIGNATURE = "GeoCam-Signature";
const GEOCAM_ALGORITHM = "GeoCam-Algorithm";
const GEOCAM_TIMESTAMP = "GeoCam-Timestamp";
const GEOCAM_KEY_ID = "GeoCam-KeyId";

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

/**
 * Calculate CRC32 for PNG chunk
 */
function crc32(data: Uint8Array): number {
  const CRC_TABLE = new Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create a PNG tEXt chunk
 */
function createTextChunk(keyword: string, text: string): Uint8Array {
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(text);
  const dataLength = keywordBytes.length + 1 + textBytes.length; // +1 for null separator
  
  // Create chunk data (type + keyword + null + text)
  const chunkData = new Uint8Array(4 + dataLength);
  chunkData.set(CHUNK_TYPE_TEXT, 0);
  chunkData.set(keywordBytes, 4);
  chunkData[4 + keywordBytes.length] = 0; // null separator
  chunkData.set(textBytes, 4 + keywordBytes.length + 1);
  
  // Calculate CRC for type + data
  const crc = crc32(chunkData);
  
  // Create full chunk: length + type + data + crc
  const fullChunk = new Uint8Array(4 + 4 + dataLength + 4);
  const dataView = new DataView(fullChunk.buffer);
  
  // Length (big-endian)
  dataView.setUint32(0, dataLength, false);
  
  // Type + Data
  fullChunk.set(chunkData, 4);
  
  // CRC (big-endian)
  dataView.setUint32(4 + 4 + dataLength, crc, false);
  
  return fullChunk;
}

/**
 * Find IEND position in PNG
 */
function findIENDPosition(pngData: Uint8Array): number {
  // More efficient approach: search for IEND signature from the end
  // IEND chunk is always at the end and has signature: length(4) + "IEND"(4) + data(0) + crc(4) = 12 bytes
  const iendSignature = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44]); // length=0 + "IEND"
  
  // Search from end backwards for efficiency
  for (let i = pngData.length - 12; i >= 8; i--) {
    if (pngData.slice(i, i + 8).every((byte, index) => byte === iendSignature[index])) {
      console.log('✅ Found IEND chunk at position:', i);
      return i;
    }
  }
  
  // Fallback to traditional chunk scanning if reverse search fails
  console.log('⚠️ Reverse IEND search failed, using traditional scanning...');
  let position = 8; // Skip PNG signature
  let chunkCount = 0;
  
  while (position < pngData.length - 12) {
    const dataView = new DataView(pngData.buffer, pngData.byteOffset + position);
    const chunkLength = dataView.getUint32(0, false); // big-endian
    const chunkType = pngData.slice(position + 4, position + 8);
    const chunkTypeStr = String.fromCharCode(...chunkType);
    
    chunkCount++;
    // Only log first 5 chunks and every 50th chunk to reduce noise
    if (chunkCount <= 5 || chunkCount % 50 === 0 || chunkTypeStr === 'IEND') {
      console.log(`📦 Chunk ${chunkCount}: ${chunkTypeStr} (length: ${chunkLength}, position: ${position})`);
    }
    
    // Check if this is IEND chunk
    if (chunkType.every((byte, index) => byte === CHUNK_TYPE_IEND[index])) {
      console.log('✅ Found IEND chunk via scanning at position:', position);
      return position;
    }
    
    // Safety check for corrupted chunk length
    if (chunkLength > pngData.length || chunkLength < 0) {
      throw new Error(`Invalid chunk length ${chunkLength} at position ${position} for chunk ${chunkTypeStr}`);
    }
    
    // Move to next chunk
    position += 4 + 4 + chunkLength + 4; // length + type + data + crc
    
    // Increased safety limit for steganography PNGs
    if (chunkCount > 1000) {
      console.error('❌ PNG has over 1000 chunks, this is unusual');
      throw new Error(`Too many chunks found (${chunkCount}), possible PNG corruption`);
    }
  }
  
  throw new Error(`IEND chunk not found in PNG after scanning ${chunkCount} chunks`);
}

/**
 * Extract text chunks from PNG
 */
function extractTextChunks(pngData: Uint8Array): Map<string, string> {
  const textChunks = new Map<string, string>();
  let position = 8; // Skip PNG signature
  
  while (position < pngData.length - 12) {
    const dataView = new DataView(pngData.buffer, pngData.byteOffset + position);
    const chunkLength = dataView.getUint32(0, false); // big-endian
    const chunkType = pngData.slice(position + 4, position + 8);
    
    // Check if this is a tEXt chunk
    if (chunkType.every((byte, index) => byte === CHUNK_TYPE_TEXT[index])) {
      const chunkData = pngData.slice(position + 8, position + 8 + chunkLength);
      
      // Find null separator
      const nullIndex = chunkData.indexOf(0);
      if (nullIndex > 0) {
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIndex));
        const text = new TextDecoder().decode(chunkData.slice(nullIndex + 1));
        textChunks.set(keyword, text);
      }
    }
    
    // Check if this is IEND chunk
    if (chunkType.every((byte, index) => byte === CHUNK_TYPE_IEND[index])) {
      break;
    }
    
    // Move to next chunk
    position += 4 + 4 + chunkLength + 4; // length + type + data + crc
  }
  
  return textChunks;
}

/**
 * Embed metadata into PNG file
 */
export const embedMetadataIntoPNG = async (
  base64PNGData: string, 
  metadata: PNGMetadata
): Promise<string> => {
  try {
    console.log('📝 Embedding metadata into PNG...');
    
    // Convert base64 to Uint8Array
    const pngData = base64ToUint8Array(base64PNGData);
    
    // Verify PNG signature
    if (!pngData.slice(0, 8).every((byte, index) => byte === PNG_SIGNATURE[index])) {
      throw new Error('Invalid PNG signature');
    }
    
    console.log('✅ PNG signature verified');
    console.log('📊 PNG data length:', pngData.length);
    
    // Find IEND position
    console.log('🔍 Searching for IEND chunk...');
    const iendPosition = findIENDPosition(pngData);
    console.log('✅ IEND chunk found at position:', iendPosition);
    
    // Create metadata chunks
    const publicKeyChunk = createTextChunk(GEOCAM_PUBLIC_KEY, metadata.publicKey);
    const signatureChunk = createTextChunk(GEOCAM_SIGNATURE, metadata.signature);
    const algorithmChunk = createTextChunk(GEOCAM_ALGORITHM, metadata.algorithm);
    const timestampChunk = createTextChunk(GEOCAM_TIMESTAMP, metadata.timestamp);
    const keyIdChunk = createTextChunk(GEOCAM_KEY_ID, metadata.keyId);
    
    // Calculate total size for new PNG
    const totalMetadataSize = publicKeyChunk.length + signatureChunk.length + 
                             algorithmChunk.length + timestampChunk.length + keyIdChunk.length;
    const newPngData = new Uint8Array(pngData.length + totalMetadataSize);
    
    // Copy data before IEND
    newPngData.set(pngData.slice(0, iendPosition), 0);
    
    // Insert metadata chunks
    let insertPosition = iendPosition;
    newPngData.set(publicKeyChunk, insertPosition);
    insertPosition += publicKeyChunk.length;
    
    newPngData.set(signatureChunk, insertPosition);
    insertPosition += signatureChunk.length;
    
    newPngData.set(algorithmChunk, insertPosition);
    insertPosition += algorithmChunk.length;
    
    newPngData.set(timestampChunk, insertPosition);
    insertPosition += timestampChunk.length;
    
    newPngData.set(keyIdChunk, insertPosition);
    insertPosition += keyIdChunk.length;
    
    // Copy IEND chunk and any remaining data
    newPngData.set(pngData.slice(iendPosition), insertPosition);
    
    console.log('✅ Metadata embedded successfully');
    
    return uint8ArrayToBase64(newPngData);
    
  } catch (error) {
    console.error('❌ Failed to embed metadata into PNG:', error);
    throw new Error(`PNG metadata embedding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Extract metadata from PNG file
 */
export const extractMetadataFromPNG = async (
  base64PNGData: string
): Promise<PNGMetadata | null> => {
  try {
    console.log('🔍 Extracting metadata from PNG...');
    
    // Convert base64 to Uint8Array
    const pngData = base64ToUint8Array(base64PNGData);
    
    // Verify PNG signature
    if (!pngData.slice(0, 8).every((byte, index) => byte === PNG_SIGNATURE[index])) {
      throw new Error('Invalid PNG signature');
    }
    
    // Extract all text chunks
    const textChunks = extractTextChunks(pngData);
    
    // Check if we have all required GeoCam metadata
    const publicKey = textChunks.get(GEOCAM_PUBLIC_KEY);
    const signature = textChunks.get(GEOCAM_SIGNATURE);
    const algorithm = textChunks.get(GEOCAM_ALGORITHM);
    const timestamp = textChunks.get(GEOCAM_TIMESTAMP);
    const keyId = textChunks.get(GEOCAM_KEY_ID);
    
    if (!publicKey || !signature || !algorithm || !timestamp || !keyId) {
      console.log('⚠️ GeoCam metadata not found in PNG');
      return null;
    }
    
    const metadata: PNGMetadata = {
      publicKey,
      signature,
      algorithm,
      timestamp,
      keyId
    };
    
    console.log('✅ Metadata extracted successfully');
    
    return metadata;
    
  } catch (error) {
    console.error('❌ Failed to extract metadata from PNG:', error);
    return null;
  }
}; 