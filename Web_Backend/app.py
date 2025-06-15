from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import logging
import hashlib
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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
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
                    'error': 'Steganography service error',
                    'details': response.text
                }), 500
            
            steg_result = response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to connect to steganography service: {e}")
            return jsonify({
                'error': 'Failed to connect to steganography service',
                'details': str(e)
            }), 500
        
        # Process verification result
        if not steg_result.get('success', False):
            verification_result = {
                'success': False,
                'error': steg_result.get('error', 'Unknown error'),
                'verification_result': {
                    'is_authentic': False,
                    'message': 'No hidden information found in image'
                }
            }
        else:
            # Parse the decoded data to extract information
            decoded_data = None
            try:
                import json
                raw_data = steg_result.get('rawData', '')
                if raw_data:
                    parsed_data = json.loads(raw_data)
                    # Extract the original data (excluding signature-related fields)
                    decoded_data = {
                        'deviceModel': parsed_data.get('deviceModel'),
                        'Time': parsed_data.get('Time'),
                        'location': parsed_data.get('location')
                    }
            except:
                decoded_data = None
            
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
                'decoded_info': decoded_data,  # Return parsed JSON data instead of string
                'raw_data': steg_result.get('rawData', '')
            }
        
        # Update device activity if installation_id provided
        device_id = None
        if installation_id:
            try:
                update_device_activity(installation_id)
                device_info = get_device_by_installation_id(installation_id)
                if device_info:
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
        
        # Add timestamp to response
        verification_result['timestamp'] = datetime.now().isoformat()
        verification_result['image_hash'] = image_hash
        
        logger.info(f"✅ Verification completed: {verification_result.get('signature_verification', {}).get('valid', False)}")
        
        return jsonify(verification_result)
        
    except Exception as e:
        logger.error(f"❌ Image verification failed: {e}")
        return jsonify({'error': 'Image verification failed', 'details': str(e)}), 500

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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"🚀 Starting GeoCam API Service on port {port}")
    logger.info(f"🔗 Steganography service: {Config.STEGANOGRAPHY_SERVICE_URL}")
    logger.info(f"🗄️ Database: {Config.DATABASE_URL}")
    
    app.run(host='0.0.0.0', port=port, debug=debug) 