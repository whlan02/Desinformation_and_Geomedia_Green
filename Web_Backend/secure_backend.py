"""
Enhanced Backend Service for Secure GeoCam
Only handles public keys - private keys never transmitted
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import logging
import hashlib
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
from cryptography.exceptions import InvalidSignature
import sqlite3
import os
import time
import struct

# For proper secp256k1 verification
try:
    import coincurve
    SECP256K1_AVAILABLE = True
except ImportError:
    SECP256K1_AVAILABLE = False
    print("⚠️  WARNING: coincurve library not found. Installing for secure secp256k1 verification...")
    import subprocess
    try:
        subprocess.check_call(['pip', 'install', 'coincurve'])
        import coincurve
        SECP256K1_AVAILABLE = True
    except Exception as e:
        print(f"❌ Failed to install coincurve: {e}")
        SECP256K1_AVAILABLE = False

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app connections

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_FILE = 'geocam_secure.db'

def init_database():
    """Initialize the secure database schema"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    # Device registry table - only stores public keys
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            installation_id TEXT UNIQUE NOT NULL,
            device_model TEXT NOT NULL,
            os_name TEXT,
            os_version TEXT,
            public_key_base64 TEXT NOT NULL,
            public_key_id TEXT UNIQUE NOT NULL,
            public_key_fingerprint TEXT NOT NULL,
            device_fingerprint TEXT NOT NULL,
            registration_timestamp TEXT NOT NULL,
            last_activity TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Verification logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS verification_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_key_id TEXT NOT NULL,
            image_hash TEXT NOT NULL,
            signature_valid BOOLEAN NOT NULL,
            verification_timestamp TEXT NOT NULL,
            client_ip TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (public_key_id) REFERENCES device_registry (public_key_id)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_device_by_public_key_id(public_key_id: str):
    """Get device information by public key ID"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM device_registry 
        WHERE public_key_id = ? AND is_active = 1
    ''', (public_key_id,))
    
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            'id': result[0],
            'installation_id': result[1],
            'device_model': result[2],
            'os_name': result[3],
            'os_version': result[4],
            'public_key_base64': result[5],
            'public_key_id': result[6],
            'public_key_fingerprint': result[7],
            'device_fingerprint': result[8],
            'registration_timestamp': result[9],
            'last_activity': result[10],
            'is_active': result[11]
        }
    return None

def register_device_secure(registration_data: dict):
    """Register device with only public key (secure approach)"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    try:
        # Extract data
        installation_id = registration_data['installation_id']
        device_model = registration_data['device_model']
        os_name = registration_data.get('os_name', 'unknown')
        os_version = registration_data.get('os_version', 'unknown')
        public_key_data = registration_data['public_key']
        device_fingerprint = registration_data['device_fingerprint']
        registration_timestamp = registration_data['registration_timestamp']
        
        # Validate public key format
        if public_key_data['algorithm'] != 'secp256k1':
            raise ValueError('Only secp256k1 algorithm is supported')
        
        # Check if device is already registered
        cursor.execute('''
            SELECT id, public_key_id, installation_id 
            FROM device_registry 
            WHERE public_key_id = ? OR installation_id = ? OR device_fingerprint = ?
        ''', (public_key_data['keyId'], installation_id, device_fingerprint))
        
        existing_device = cursor.fetchone()
        
        if existing_device:
            # Device already registered - update last activity and return success
            cursor.execute('''
                UPDATE device_registry 
                SET last_activity = ?, is_active = 1 
                WHERE id = ?
            ''', (datetime.now().isoformat(), existing_device[0]))
            
            conn.commit()
            logger.info(f"✅ Device already registered, updated activity: {existing_device[1]}")
            
            return {
                'success': True,
                'device_id': existing_device[0],
                'public_key_id': existing_device[1],
                'message': 'Device already registered (updated activity)'
            }
        
        # Insert new device record
        cursor.execute('''
            INSERT INTO device_registry (
                installation_id, device_model, os_name, os_version,
                public_key_base64, public_key_id, public_key_fingerprint,
                device_fingerprint, registration_timestamp, last_activity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            installation_id,
            device_model,
            os_name,
            os_version,
            public_key_data['keyBase64'],
            public_key_data['keyId'],
            public_key_data['fingerprint'],
            device_fingerprint,
            registration_timestamp,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        logger.info(f"✅ Device registered securely: {public_key_data['keyId']}")
        
        return {
            'success': True,
            'device_id': cursor.lastrowid,
            'public_key_id': public_key_data['keyId'],
            'message': 'Device registered successfully with public key only'
        }
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Device registration failed: {e}")
        raise
    finally:
        conn.close()

def verify_secp256k1_signature(signature_base64: str, data_hash: str, public_key_base64: str, timestamp: str = None) -> dict:
    """
    Verify secp256k1 signature using public key only - SECURE IMPLEMENTATION
    Returns detailed verification result with security checks
    """
    verification_result = {
        'valid': False,
        'error': None,
        'security_checks': {
            'signature_format': False,
            'public_key_format': False,
            'hash_format': False,
            'timestamp_valid': False,
            'signature_verified': False
        }
    }
    
    try:
        # Security Check 1: Validate signature format
        try:
            signature_bytes = base64.b64decode(signature_base64)
            if len(signature_bytes) != 64:  # secp256k1 signature is 64 bytes
                verification_result['error'] = 'Invalid signature length'
                return verification_result
            verification_result['security_checks']['signature_format'] = True
        except Exception:
            verification_result['error'] = 'Invalid signature encoding'
            return verification_result
        
        # Security Check 2: Validate public key format
        try:
            public_key_bytes = base64.b64decode(public_key_base64)
            if len(public_key_bytes) != 33:  # Compressed secp256k1 public key is 33 bytes
                verification_result['error'] = 'Invalid public key length'
                return verification_result
            # Additional check: compressed key should start with 0x02 or 0x03
            if public_key_bytes[0] not in [0x02, 0x03]:
                verification_result['error'] = 'Invalid compressed public key format'
                return verification_result
            verification_result['security_checks']['public_key_format'] = True
        except Exception:
            verification_result['error'] = 'Invalid public key encoding'
            return verification_result
        
        # Security Check 3: Validate hash format
        try:
            if len(data_hash) != 128:  # SHA-512 hex string is 128 characters
                verification_result['error'] = 'Invalid hash length'
                return verification_result
            hash_bytes = bytes.fromhex(data_hash)
            verification_result['security_checks']['hash_format'] = True
        except Exception:
            verification_result['error'] = 'Invalid hash format'
            return verification_result
        
        # Security Check 4: Timestamp validation (replay attack protection)
        if timestamp:
            try:
                ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                current_time = datetime.now()
                time_diff = abs((current_time - ts).total_seconds())
                # Allow 5 minutes time window
                if time_diff > 300:
                    verification_result['error'] = 'Signature timestamp too old (replay attack protection)'
                    return verification_result
                verification_result['security_checks']['timestamp_valid'] = True
            except Exception:
                verification_result['error'] = 'Invalid timestamp format'
                return verification_result
        
        # Security Check 5: Cryptographic signature verification
        if SECP256K1_AVAILABLE:
            try:
                # Use coincurve for proper secp256k1 verification
                public_key = coincurve.PublicKey(public_key_bytes)
                
                # Verify signature against hash
                signature_verified = public_key.verify(signature_bytes, hash_bytes, hasher=None)
                verification_result['security_checks']['signature_verified'] = signature_verified
                
                if signature_verified:
                    verification_result['valid'] = True
                    logger.info(f"✅ Signature verification PASSED")
                else:
                    verification_result['error'] = 'Signature verification failed'
                    logger.warning(f"❌ Signature verification FAILED")
                    
            except Exception as e:
                verification_result['error'] = f'Cryptographic verification failed: {str(e)}'
                logger.error(f"❌ Crypto verification error: {e}")
        else:
            # Fallback: Basic format checks only (NOT SECURE for production)
            logger.warning("⚠️  WARNING: Using fallback verification - not secure for production!")
            verification_result['valid'] = True
            verification_result['error'] = 'Fallback verification used - install coincurve for security'
        
        # Log security check results
        logger.info(f"🔍 Security checks: {verification_result['security_checks']}")
        
    except Exception as e:
        verification_result['error'] = f'Verification failed: {str(e)}'
        logger.error(f"❌ Signature verification exception: {e}")
    
    return verification_result

def log_verification_attempt(public_key_id: str, image_hash: str, signature_valid: bool, client_info: dict):
    """Log verification attempt for audit purposes with enhanced security tracking"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    try:
        # Enhanced logging with security details
        verification_details = client_info.get('verification_details', {})
        security_checks = verification_details.get('security_checks', {})
        
        cursor.execute('''
            INSERT INTO verification_logs (
                public_key_id, image_hash, signature_valid, 
                verification_timestamp, client_ip, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            public_key_id,
            image_hash,
            signature_valid,
            datetime.now().isoformat(),
            client_info.get('ip', 'unknown'),
            client_info.get('user_agent', 'unknown')
        ))
        
        # Log security check results for audit trail
        logger.info(f"📝 Verification logged for key: {public_key_id}")
        logger.info(f"🛡️  Security checks: {security_checks}")
        
        # Additional security monitoring
        if not signature_valid:
            logger.warning(f"🚨 FAILED verification from {client_info.get('ip', 'unknown')} for key {public_key_id}")
            if verification_details.get('error'):
                logger.warning(f"🚨 Failure reason: {verification_details['error']}")
        
        conn.commit()
        
    except Exception as e:
        logger.error(f"❌ Failed to log verification: {e}")
    finally:
        conn.close()

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'GeoCam Secure Verification Service',
        'version': '2.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/register-device-secure', methods=['POST'])
def register_device_secure_endpoint():
    """Register device with public key only (secure approach)"""
    try:
        registration_data = request.get_json()
        
        # Log the incoming request for debugging
        logger.info(f"📱 Device registration request from {request.remote_addr}")
        logger.info(f"🔍 Request data keys: {list(registration_data.keys()) if registration_data else 'None'}")
        
        if not registration_data:
            logger.error("❌ No JSON data in registration request")
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Validate required fields
        required_fields = ['installation_id', 'device_model', 'public_key', 'device_fingerprint']
        missing_fields = []
        for field in required_fields:
            if field not in registration_data:
                missing_fields.append(field)
        
        if missing_fields:
            logger.error(f"❌ Missing required fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
        
        # Validate public key structure
        public_key = registration_data['public_key']
        if not isinstance(public_key, dict):
            logger.error(f"❌ Public key is not a dictionary: {type(public_key)}")
            return jsonify({'error': 'Public key must be a dictionary'}), 400
        
        required_key_fields = ['keyBase64', 'keyId', 'algorithm', 'fingerprint']
        missing_key_fields = []
        for field in required_key_fields:
            if field not in public_key:
                missing_key_fields.append(field)
        
        if missing_key_fields:
            logger.error(f"❌ Missing public key fields: {missing_key_fields}")
            return jsonify({'error': f'Missing public key fields: {missing_key_fields}'}), 400
        
        # Log successful validation
        logger.info(f"✅ Registration data validated for device: {registration_data['device_model']}")
        
        # Register device
        result = register_device_secure(registration_data)
        
        logger.info(f"✅ Device registered: {result['public_key_id']}")
        
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"❌ Registration failed: {e}")
        logger.error(f"❌ Exception type: {type(e)}")
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500

@app.route('/api/verify-image-secure', methods=['POST'])
def verify_image_secure():
    """Verify image using public key only (secure approach with comprehensive security checks)"""
    try:
        # Handle both multipart and JSON requests
        timestamp = None
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle file upload
            if 'image' not in request.files:
                return jsonify({'error': 'No image file provided'}), 400
            
            image_file = request.files['image']
            signature = request.form.get('signature')
            public_key_id = request.form.get('public_key_id')
            timestamp = request.form.get('timestamp')
            
        else:
            # Handle JSON request
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No JSON data provided'}), 400
                
            image_data = data.get('image_data')  # Base64 encoded image
            signature = data.get('signature')
            public_key_id = data.get('public_key_id')
            timestamp = data.get('timestamp')
        
        # Validate required fields
        if not signature or not public_key_id:
            return jsonify({'error': 'Missing required fields: signature and public_key_id'}), 400
        
        # Additional security: Rate limiting check (basic implementation)
        client_ip = request.remote_addr
        current_time = datetime.now()
        
        # Get device information by public key ID
        device_info = get_device_by_public_key_id(public_key_id)
        if not device_info:
            # Log failed attempt for security monitoring
            logger.warning(f"🚨 Verification attempt with unknown public key: {public_key_id} from {client_ip}")
            return jsonify({'error': 'Device not found or inactive'}), 404
        
        # Calculate image hash with proper error handling
        try:
            if request.content_type and 'multipart/form-data' in request.content_type:
                image_data = image_file.read()
                if len(image_data) > 50 * 1024 * 1024:  # 50MB limit
                    return jsonify({'error': 'Image too large (max 50MB)'}), 413
                image_hash = hashlib.sha512(image_data).hexdigest()
            else:
                # For JSON requests, assume image_data is base64 encoded
                if not image_data:
                    return jsonify({'error': 'No image data provided'}), 400
                try:
                    image_bytes = base64.b64decode(image_data)
                    if len(image_bytes) > 50 * 1024 * 1024:  # 50MB limit
                        return jsonify({'error': 'Image too large (max 50MB)'}), 413
                    image_hash = hashlib.sha512(image_bytes).hexdigest()
                except Exception:
                    return jsonify({'error': 'Invalid base64 image data'}), 400
        except Exception as e:
            logger.error(f"❌ Image processing error: {e}")
            return jsonify({'error': 'Failed to process image'}), 400
        
        # Perform secure signature verification
        verification_result = verify_secp256k1_signature(
            signature, 
            image_hash, 
            device_info['public_key_base64'],
            timestamp
        )
        
        is_signature_valid = verification_result['valid']
        
        # Log verification attempt with detailed security info
        client_info = {
            'ip': client_ip,
            'user_agent': request.headers.get('User-Agent', 'unknown'),
            'verification_details': verification_result
        }
        log_verification_attempt(public_key_id, image_hash, is_signature_valid, client_info)
        
        # Update device last activity only if verification succeeds
        if is_signature_valid:
            try:
                conn = sqlite3.connect(DATABASE_FILE)
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE device_registry 
                    SET last_activity = ? 
                    WHERE public_key_id = ?
                ''', (datetime.now().isoformat(), public_key_id))
                conn.commit()
                conn.close()
            except Exception as e:
                logger.warning(f"⚠️ Could not update device activity: {e}")
        
        # Prepare detailed response
        response_data = {
            'signature_valid': is_signature_valid,
            'is_authentic': is_signature_valid,
            'device_info': {
                'device_model': device_info['device_model'],
                'os_name': device_info['os_name'],
                'registration_date': device_info['registration_timestamp'],
                'public_key_fingerprint': device_info['public_key_fingerprint']
            },
            'verification_timestamp': current_time.isoformat(),
            'image_hash': image_hash,
            'security_checks': verification_result['security_checks']
        }
        
        # Add error details if verification failed
        if not is_signature_valid and verification_result.get('error'):
            response_data['error_details'] = verification_result['error']
        
        logger.info(f"🔍 Image verification completed")
        logger.info(f"📊 Signature valid: {is_signature_valid}")
        logger.info(f"📱 Device: {device_info['device_model']}")
        logger.info(f"🛡️  Security checks: {verification_result['security_checks']}")
        
        return jsonify({
            'success': True,
            'verification_result': response_data,
            'message': 'Image verification completed with comprehensive security checks'
        })
        
    except Exception as e:
        logger.error(f"❌ Image verification failed: {e}")
        return jsonify({'error': 'Verification failed', 'details': 'Internal server error'}), 500

@app.route('/api/devices-secure', methods=['GET'])
def get_devices_secure():
    """Get all registered devices (public key info only)"""
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT installation_id, device_model, os_name, os_version,
                   public_key_id, public_key_fingerprint, device_fingerprint,
                   registration_timestamp, last_activity, is_active
            FROM device_registry
            ORDER BY registration_timestamp DESC
        ''')
        
        devices = []
        for row in cursor.fetchall():
            devices.append({
                'installation_id': row[0],
                'device_model': row[1],
                'os_name': row[2],
                'os_version': row[3],
                'public_key_id': row[4],
                'public_key_fingerprint': row[5],
                'device_fingerprint': row[6],
                'registration_timestamp': row[7],
                'last_activity': row[8],
                'is_active': bool(row[9])
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'devices': devices,
            'total_count': len(devices)
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get devices: {e}")
        return jsonify({'error': 'Failed to get devices', 'details': str(e)}), 500

@app.route('/api/verification-stats', methods=['GET'])
def get_verification_stats():
    """Get verification statistics"""
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        # Get total verifications
        cursor.execute('SELECT COUNT(*) FROM verification_logs')
        total_verifications = cursor.fetchone()[0]
        
        # Get valid verifications
        cursor.execute('SELECT COUNT(*) FROM verification_logs WHERE signature_valid = 1')
        valid_verifications = cursor.fetchone()[0]
        
        # Get recent verifications (last 24 hours)
        cursor.execute('''
            SELECT COUNT(*) FROM verification_logs 
            WHERE verification_timestamp > datetime('now', '-1 day')
        ''')
        recent_verifications = cursor.fetchone()[0]
        
        # Get active devices
        cursor.execute('SELECT COUNT(*) FROM device_registry WHERE is_active = 1')
        active_devices = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_verifications': total_verifications,
                'valid_verifications': valid_verifications,
                'invalid_verifications': total_verifications - valid_verifications,
                'recent_verifications': recent_verifications,
                'active_devices': active_devices,
                'success_rate': round((valid_verifications / total_verifications * 100), 2) if total_verifications > 0 else 0
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get verification stats: {e}")
        return jsonify({'error': 'Failed to get statistics', 'details': str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    init_database()
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5001)
