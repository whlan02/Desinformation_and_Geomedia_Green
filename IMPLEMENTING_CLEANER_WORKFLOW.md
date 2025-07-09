# Implementing Cleaner Workflow

## Current Problem
The current workflow has a fundamental architectural issue:
- Hash is created of the complete processed image
- During verification, the image is cleaned and re-processed
- Subtle differences in image processing between signing and verification cause hash mismatches

## Your Suggested Workflow (Better Architecture)

### Step 1: Initial Processing
**App → Backend**: Send image + public key
**Backend processes**: 
- JPEG → PNG conversion
- Embed metadata in alpha channels (exclude last row)
- Create hash of this clean image
- Return hash to app

### Step 2: Signing
**App receives hash**:
- Sign hash with private key
- Return signature to backend

### Step 3: Final Assembly
**Backend**:
- Embed public key + signature in last row only
- Return final PNG

### Step 4: Verification
**Verification**:
- Extract signature from last row
- Clean last row
- Hash the cleaned image (same as Step 1)
- Verify signature

## Benefits
1. ✅ **Identical processing**: Same image processing pipeline for signing and verification
2. ✅ **Clean separation**: Signature only protects content, not itself
3. ✅ **Predictable**: Hash being signed = hash being verified
4. ✅ **Robust**: No subtle image processing differences

## Implementation Plan
1. Create new backend endpoint for your workflow
2. Update mobile app to use new workflow
3. Test signature verification
4. Clean up old workflow once confirmed working

Let me implement this now...
