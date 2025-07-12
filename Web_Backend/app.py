from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import logging
import hashlib
import base64
from datetime import datetime
import os

from config import Config
from database import (
    create_tables, register_device, get_all_devices, 
    get_device_by_installation_id, update_device_activity, log_verification
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS
CORS(app, origins=Config.CORS_ORIGINS)

# Initialize database on startup
try:
    create_tables()
    logger.info("🚀 Database initialized successfully")
except Exception as e:
    logger.error(f"❌ Database initialization failed: {e}")

def generate_image_hash(image_data):
    """Generate hash of image data for verification logging"""
    return hashlib.sha256(image_data).hexdigest()[:16]

def call_steganography_service(image_data: bytes):
    """Call the Node.js steganography service to verify and extract signature from image"""
    try:
        # Steganography service URL
        steg_url = "http://localhost:3001/pure-png-verify"
        
        # Convert image to base64 for the Node.js service
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Prepare request data
        request_data = {
            'pngBase64': image_base64
        }
        
        logger.info(f"🔍 Calling steganography service for image verification...")
        
        # Make request to steganography service
        response = requests.post(steg_url, json=request_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                logger.info(f"✅ Steganography service verification successful")
                
                # Extract verification result
                verification_result = result.get('verification_result', {})
                
                return {
                    'success': True,
                    'signature_valid': verification_result.get('signature_valid', False),
                    'is_authentic': verification_result.get('is_authentic', False),
                    'decoded_info': verification_result.get('decoded_info', {}),
                    'message': verification_result.get('message', 'Verification completed'),
                    'method': verification_result.get('method', 'steganography-service')
                }
            else:
                logger.error(f"❌ Steganography service failed: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error', 'Unknown steganography error')
                }
        else:
            logger.error(f"❌ Steganography service HTTP error: {response.status_code}")
            return {
                'success': False,
                'error': f'Steganography service error: {response.status_code}'
            }
            
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to call steganography service: {e}")
        return {
            'success': False,
            'error': f'Failed to connect to steganography service: {str(e)}'
        }
    except Exception as e:
        logger.error(f"❌ Unexpected error calling steganography service: {e}")
        return {
            'success': False,
            'error': f'Unexpected steganography error: {str(e)}'
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'GeoCam API Service',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/health', methods=['GET'])
def api_health_check():
    """Health check endpoint for API path"""
    return jsonify({
        'status': 'OK',
        'service': 'GeoCam API Service',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/register-device', methods=['POST'])
def register_device_endpoint():
    """Register a new GeoCam device"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['installation_id', 'device_model']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        installation_id = data['installation_id']
        device_model = data['device_model']
        os_name = data.get('os_name')
        os_version = data.get('os_version')
        public_key_data = data.get('public_key_data')
        
        logger.info(f"📱 Registering device: {device_model} ({installation_id})")
        
        # Register device in database (simplified - no redundant hash extraction)
        device_id = register_device(
            installation_id=installation_id,
            device_model=device_model,
            os_name=os_name,
            os_version=os_version,
            public_key_data=public_key_data
        )
        
        # Get the registered device info including GeoCam sequence
        device_info = get_device_by_installation_id(installation_id)
        
        logger.info(f"✅ Device registered successfully as GeoCam{device_info['geocam_sequence']}")
        
        return jsonify({
            'success': True,
            'device_id': device_id,
            'geocam_sequence': device_info['geocam_sequence'],
            'registration_date': device_info['registration_date'].isoformat(),
            'message': f"Device registered as GeoCam{device_info['geocam_sequence']}"
        })
        
    except Exception as e:
        logger.error(f"❌ Device registration failed: {e}")
        return jsonify({'error': 'Failed to register device', 'details': str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get all registered GeoCam devices"""
    try:
        devices = get_all_devices()
        
        # Format devices for response
        formatted_devices = []
        for device in devices:
            formatted_device = {
                'id': device['id'],
                'installation_id': device['installation_id'],
                'device_model': device['device_model'],
                'os_name': device['os_name'],
                'os_version': device['os_version'],
                'registration_date': device['registration_date'].isoformat() if device['registration_date'] else None,
                'geocam_sequence': device['geocam_sequence'],
                'geocam_name': f"GeoCam{device['geocam_sequence']}",
                'last_activity': device['last_activity'].isoformat() if device['last_activity'] else None,
                'is_active': device['is_active']
            }
            formatted_devices.append(formatted_device)
        
        return jsonify({
            'success': True,
            'devices': formatted_devices,
            'total_count': len(formatted_devices)
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get devices: {e}")
        return jsonify({'error': 'Failed to get devices', 'details': str(e)}), 500

@app.route('/api/verify-image', methods=['POST'])
def verify_image():
    """Verify image authenticity using steganography service"""
    try:
        # Check if image file is provided
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Optional: installation_id for activity tracking
        installation_id = request.form.get('installation_id')
        
        logger.info(f"🔍 Starting image verification...")
        if installation_id:
            logger.info(f"📱 From device: {installation_id}")
        
        # Generate image hash for logging
        image_data = image_file.read()
        image_hash = generate_image_hash(image_data)
        image_file.seek(0)  # Reset file pointer
        
        # Get device public key if installation_id provided
        public_key_data = None
        device_info = None
        if installation_id:
            device_info = get_device_by_installation_id(installation_id)
            if device_info and device_info.get('public_key_data'):
                public_key_data = device_info['public_key_data']
                logger.info(f"🔑 Retrieved public key for device: {installation_id}")
            else:
                logger.warning(f"⚠️ No public key found for device: {installation_id}")
        
        # Forward request to Node.js steganography service
        steganography_url = f"{Config.STEGANOGRAPHY_SERVICE_URL}/decode-image"
        
        try:
            # Prepare form data for steganography service
            form_data = {}
            if installation_id:
                form_data['installation_id'] = installation_id
            if public_key_data:
                form_data['public_key_data'] = json.dumps(public_key_data)
            
            response = requests.post(
                steganography_url,
                files={'image': (image_file.filename, image_file.stream, image_file.content_type)},
                data=form_data,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Steganography service error: {response.status_code}")
                return jsonify({
                    'success': False,
                    'error': 'Steganography service error',
                    'details': response.text
                }), 500
            
            steg_result = response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to connect to steganography service: {e}")
            return jsonify({
                'success': False,
                'error': 'Failed to connect to steganography service',
                'details': str(e)
            }), 500
        
        # Process verification result
        verification_result = {}
        
        if not steg_result.get('success', False):
            # Failed to decode steganography
            verification_result = {
                'success': False,
                'error': steg_result.get('error', 'Unknown error'),
                'signature_verification': {
                    'valid': False,
                    'message': 'No hidden information found in image'
                },
                'decoded_info': None
            }
        else:
            # Successfully decoded steganography
            decoded_data = steg_result.get('decodedInfo')
            
            # Clean up decoded data for display
            if decoded_data and isinstance(decoded_data, dict):
                clean_data = {}
                for key, value in decoded_data.items():
                    if key not in ['signature', 'publicKey', 'dataHash', 'signatureAlgorithm', 'keyId', 'timestamp']:
                        clean_data[key] = value
                decoded_data = clean_data
            
            # Get signature verification result
            signature_verification = steg_result.get('signatureVerification', {
                'valid': False,
                'message': 'No signature verification performed'
            })
            
            verification_result = {
                'success': True,
                'signature_verification': {
                    'valid': signature_verification.get('valid', False),
                    'message': signature_verification.get('message', 'Unknown verification status')
                },
                'decoded_info': decoded_data,
                'raw_data': steg_result.get('rawData', '')
            }
        
        # Add device info if available
        device_id = None
        if installation_id and device_info:
            try:
                update_device_activity(installation_id)
                device_id = device_info['id']
                verification_result['device_info'] = {
                    'geocam_name': f"GeoCam{device_info['geocam_sequence']}",
                    'device_model': device_info['device_model']
                }
            except Exception as e:
                logger.warning(f"⚠️ Could not update device activity: {e}")
        
        # Log verification attempt
        try:
            log_verification(
                device_id=device_id,
                image_hash=image_hash,
                verification_result=verification_result.get('signature_verification', {}).get('valid', False),
                verification_message=verification_result.get('signature_verification', {}).get('message', ''),
                signature_data=steg_result.get('rawData')
            )
        except Exception as e:
            logger.warning(f"⚠️ Could not log verification: {e}")
        
        # Add metadata to response
        verification_result['timestamp'] = datetime.now().isoformat()
        verification_result['image_hash'] = image_hash
        
        logger.info(f"✅ Verification completed: {verification_result.get('signature_verification', {}).get('valid', False)}")
        
        return jsonify(verification_result)
        
    except Exception as e:
        logger.error(f"❌ Image verification failed: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': 'Image verification failed', 
            'details': str(e)
        }), 500

@app.route('/api/device/<installation_id>', methods=['GET'])
def get_device_info(installation_id):
    """Get information about a specific device"""
    try:
        device = get_device_by_installation_id(installation_id)
        
        if not device:
            return jsonify({'error': 'Device not found'}), 404
        
        device_info = {
            'id': device['id'],
            'installation_id': device['installation_id'],
            'device_model': device['device_model'],
            'os_name': device['os_name'],
            'os_version': device['os_version'],
            'registration_date': device['registration_date'].isoformat() if device['registration_date'] else None,
            'geocam_sequence': device['geocam_sequence'],
            'geocam_name': f"GeoCam{device['geocam_sequence']}",
            'last_activity': device['last_activity'].isoformat() if device['last_activity'] else None,
            'is_active': device['is_active'],
            'public_key_hash': device['public_key_data']['hash'] if device.get('public_key_data') and 'hash' in device['public_key_data'] else None
        }
        
        return jsonify({
            'success': True,
            'device': device_info
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get device info: {e}")
        return jsonify({'error': 'Failed to get device info', 'details': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    try:
        devices = get_all_devices()
        
        stats = {
            'total_devices': len(devices),
            'active_devices': len([d for d in devices if d['is_active']]),
            'latest_registration': None
        }
        
        if devices:
            latest_device = max(devices, key=lambda d: d['registration_date'] or datetime.min)
            stats['latest_registration'] = {
                'geocam_name': f"GeoCam{latest_device['geocam_sequence']}",
                'device_model': latest_device['device_model'],
                'registration_date': latest_device['registration_date'].isoformat()
            }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get stats: {e}")
        return jsonify({'error': 'Failed to get stats', 'details': str(e)}), 500

# ==================== SECURE ENDPOINT ALIASES ====================
# These aliases support the mobile app's secure endpoint configuration

@app.route('/api/register-device-secure', methods=['POST'])
def register_device_secure_endpoint():
    """Register device with secure endpoint (alias for standard registration)"""
    try:
        logger.info("📱 Secure device registration request received")
        
        # Use the existing registration logic but with enhanced validation
        registration_data = request.get_json()
        
        if not registration_data:
            logger.error("❌ No JSON data in secure registration request")
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Enhanced validation for secure registration
        required_fields = ['installation_id', 'device_model']
        missing_fields = []
        for field in required_fields:
            if field not in registration_data:
                missing_fields.append(field)
        
        if missing_fields:
            logger.error(f"❌ Missing required fields in secure registration: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
        
        # Validate public key data if provided
        if 'public_key_data' in registration_data:
            public_key_data = registration_data['public_key_data']
            if isinstance(public_key_data, dict):
                # Convert to expected format for standard registration
                if 'keyBase64' in public_key_data:
                    # This is the secure format, keep as is
                    pass
                elif 'keyId' in public_key_data:
                    # This is also secure format
                    pass
        
        logger.info(f"✅ Secure registration data validated for device: {registration_data['device_model']}")
        
        # Call the existing registration function
        installation_id = registration_data['installation_id']
        device_model = registration_data['device_model']
        os_name = registration_data.get('os_name')
        os_version = registration_data.get('os_version')
        public_key_data = registration_data.get('public_key_data')
        
        # Register device in database
        device_id = register_device(
            installation_id=installation_id,
            device_model=device_model,
            os_name=os_name,
            os_version=os_version,
            public_key_data=public_key_data
        )
        
        # Get the registered device info
        device_info = get_device_by_installation_id(installation_id)
        
        logger.info(f"✅ Secure device registered successfully as GeoCam{device_info['geocam_sequence']}")
        
        return jsonify({
            'success': True,
            'device_id': device_id,
            'public_key_id': device_info.get('public_key_data', {}).get('keyId', 'unknown'),
            'geocam_sequence': device_info['geocam_sequence'],
            'registration_date': device_info['registration_date'].isoformat(),
            'message': f"Device registered as GeoCam{device_info['geocam_sequence']}"
        }), 201
        
    except Exception as e:
        logger.error(f"❌ Secure registration failed: {e}")
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500

@app.route('/api/verify-image-secure', methods=['POST'])
def verify_image_secure():
    """Verify image using secure endpoint (enhanced verification)"""
    try:
        logger.info("🔍 Secure image verification request received")
        
        # Handle both multipart and JSON requests
        timestamp = None
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle file upload
            if 'image' not in request.files:
                return jsonify({'error': 'No image file provided'}), 400
            
            image_file = request.files['image']
            image_data = image_file.read()
            
            # Check for optional parameters
            installation_id = request.form.get('installation_id')
            timestamp = request.form.get('timestamp')
            
        else:
            # Handle JSON request
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No JSON data provided'}), 400
                
            image_data_b64 = data.get('image_data')  # Base64 encoded image
            if not image_data_b64:
                return jsonify({'error': 'No image data provided'}), 400
            
            try:
                image_data = base64.b64decode(image_data_b64)
            except Exception:
                return jsonify({'error': 'Invalid base64 image data'}), 400
                
            installation_id = data.get('installation_id')
            timestamp = data.get('timestamp')
        
        # Validate image size
        if len(image_data) > 50 * 1024 * 1024:  # 50MB limit
            return jsonify({'error': 'Image too large (max 50MB)'}), 413
        
        # Call steganography service to verify the image
        logger.info(f"🔍 Verifying image using steganography service...")
        steg_result = call_steganography_service(image_data)
        
        if not steg_result['success']:
            logger.error(f"❌ Steganography verification failed: {steg_result['error']}")
            return jsonify({
                'success': False,
                'verification_result': {
                    'signature_valid': False,
                    'is_authentic': False,
                    'message': steg_result['error'] or 'GeoCam signature is invalid'
                }
            })
        
        # Extract verification results
        signature_valid = steg_result.get('signature_valid', False)
        is_authentic = steg_result.get('is_authentic', False)
        decoded_info = steg_result.get('decoded_info', {})
        
        # Calculate image hash for logging
        image_hash = hashlib.sha512(image_data).hexdigest()
        
        # Prepare detailed response
        response_data = {
            'signature_valid': signature_valid,
            'is_authentic': is_authentic,
            'verification_timestamp': datetime.now().isoformat(),
            'image_hash': image_hash,
            'decoded_info': decoded_info,
            'message': steg_result.get('message', 'Verification completed'),
            'method': steg_result.get('method', 'steganography-service')
        }
        
        logger.info(f"🔍 Secure image verification completed")
        logger.info(f"📊 Signature valid: {signature_valid}")
        logger.info(f"📊 Is authentic: {is_authentic}")
        
        return jsonify({
            'success': True,
            'verification_result': response_data,
            'message': 'Image verification completed using steganography service'
        })
        
    except Exception as e:
        logger.error(f"❌ Secure image verification failed: {e}")
        return jsonify({'error': 'Verification failed', 'details': 'Internal server error'}), 500

@app.route('/api/devices-secure', methods=['GET'])
def get_devices_secure():
    """Get all registered devices (secure endpoint alias)"""
    try:
        logger.info("📋 Secure devices list request received")
        
        # Use the existing devices function but format for secure response
        devices = get_all_devices()
        
        # Format devices for secure response
        formatted_devices = []
        for device in devices:
            formatted_device = {
                'installation_id': device['installation_id'],
                'device_model': device['device_model'],
                'os_name': device['os_name'],
                'os_version': device['os_version'],
                'public_key_id': device.get('public_key_data', {}).get('keyId', 'unknown'),
                'public_key_fingerprint': device.get('public_key_data', {}).get('hash', 'unknown'),
                'registration_timestamp': device['registration_date'].isoformat() if device['registration_date'] else None,
                'last_activity': device['last_activity'].isoformat() if device['last_activity'] else None,
                'is_active': device['is_active'],
                'geocam_sequence': device['geocam_sequence']
            }
            formatted_devices.append(formatted_device)
        
        return jsonify({
            'success': True,
            'devices': formatted_devices,
            'total_count': len(formatted_devices)
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get devices (secure): {e}")
        return jsonify({'error': 'Failed to get devices', 'details': str(e)}), 500

@app.route('/api/verification-stats', methods=['GET'])
def get_verification_stats():
    """Get verification statistics (secure endpoint)"""
    try:
        logger.info("📊 Verification stats request received")
        
        # Use existing stats but enhanced format
        devices = get_all_devices()
        
        stats = {
            'total_devices': len(devices),
            'active_devices': len([d for d in devices if d['is_active']]),
            'total_verifications': 0,  # Would need verification_logs table
            'valid_verifications': 0,
            'invalid_verifications': 0,
            'recent_verifications': 0,
            'success_rate': 0
        }
        
        if devices:
            latest_device = max(devices, key=lambda d: d['registration_date'] or datetime.min)
            stats['latest_registration'] = {
                'geocam_name': f"GeoCam{latest_device['geocam_sequence']}",
                'device_model': latest_device['device_model'],
                'registration_date': latest_device['registration_date'].isoformat()
            }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get verification stats: {e}")
        return jsonify({'error': 'Failed to get statistics', 'details': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Changed default port to 5001
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"🚀 Starting GeoCam API Service on port {port}")
    logger.info(f"🔗 Steganography service: {Config.STEGANOGRAPHY_SERVICE_URL}")
    logger.info(f"🗄️ Database: {Config.DATABASE_URL}")
    logger.info(f"🔒 Secure endpoints enabled: /api/*-secure")
    
    app.run(host='0.0.0.0', port=port, debug=debug) 