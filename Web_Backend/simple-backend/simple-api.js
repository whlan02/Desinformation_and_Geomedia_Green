// Simplified API service for testing without canvas dependencies
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Mock database (in production, this would be PostgreSQL)
let devices = [
  {
    id: 1,
    installation_id: 'install_demo_001',
    device_model: 'iPhone 14 Pro',
    os_name: 'iOS',
    os_version: '17.0',
    registration_date: new Date('2024-01-15').toISOString(),
    geocam_sequence: 'GeoCam001',
    last_activity: new Date().toISOString(),
    is_active: true
  },
  {
    id: 2,
    installation_id: 'install_demo_002', 
    device_model: 'Samsung Galaxy S24',
    os_name: 'Android',
    os_version: '14.0',
    registration_date: new Date('2024-02-20').toISOString(),
    geocam_sequence: 'GeoCam002',
    last_activity: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    is_active: true
  },
  {
    id: 3,
    installation_id: 'install_demo_003',
    device_model: 'Google Pixel 8',
    os_name: 'Android', 
    os_version: '14.0',
    registration_date: new Date('2024-03-10').toISOString(),
    geocam_sequence: 'GeoCam003',
    last_activity: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    is_active: true
  }
];

let verificationHistory = [
  {
    id: 1,
    device_id: 1,
    verification_timestamp: new Date().toISOString(),
    image_hash: 'abc123def456',
    verification_result: 'valid',
    verification_message: 'Signature verified successfully'
  },
  {
    id: 2,
    device_id: 2,
    verification_timestamp: new Date(Date.now() - 3600000).toISOString(),
    image_hash: 'def456ghi789',
    verification_result: 'invalid',
    verification_message: 'Signature verification failed'
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'GeoCam API service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get all devices
app.get('/api/devices', (req, res) => {
  const formattedDevices = devices.map(device => ({
    id: device.id,
    installationId: device.installation_id,
    model: device.device_model,
    os: `${device.os_name} ${device.os_version}`,
    registeredAt: device.registration_date,
    sequence: device.geocam_sequence,
    lastActivity: device.last_activity,
    isActive: device.is_active
  }));
  
  res.json({
    devices: formattedDevices,
    total: formattedDevices.length,
    timestamp: new Date().toISOString()
  });
});

// Register a new device
app.post('/api/register-device', (req, res) => {
  const { installation_id, device_model, os_name, os_version, public_key_data } = req.body;
  
  if (!installation_id || !device_model || !os_name || !os_version) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['installation_id', 'device_model', 'os_name', 'os_version']
    });
  }
  
  // Check if device already exists
  const existingDevice = devices.find(d => d.installation_id === installation_id);
  if (existingDevice) {
    return res.status(409).json({
      error: 'Device already registered',
      device_id: existingDevice.id
    });
  }
  
  // Create new device
  const newDevice = {
    id: devices.length + 1,
    installation_id,
    device_model,
    os_name,
    os_version,
    registration_date: new Date().toISOString(),
    geocam_sequence: `GeoCam${String(devices.length + 1).padStart(3, '0')}`,
    last_activity: new Date().toISOString(),
    is_active: true,
    public_key_data: public_key_data || null
  };
  
  devices.push(newDevice);
  
  res.status(201).json({
    message: 'Device registered successfully',
    device: {
      id: newDevice.id,
      sequence: newDevice.geocam_sequence,
      registration_date: newDevice.registration_date
    }
  });
});

// Get device by installation ID
app.get('/api/device/:installation_id', (req, res) => {
  const { installation_id } = req.params;
  const device = devices.find(d => d.installation_id === installation_id);
  
  if (!device) {
    return res.status(404).json({
      error: 'Device not found'
    });
  }
  
  res.json({
    device: {
      id: device.id,
      installationId: device.installation_id,
      model: device.device_model,
      os: `${device.os_name} ${device.os_version}`,
      registeredAt: device.registration_date,
      sequence: device.geocam_sequence,
      lastActivity: device.last_activity,
      isActive: device.is_active
    }
  });
});

// Verify image (simplified version without steganography)
app.post('/api/verify-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No image file provided'
    });
  }
  
  const { installation_id } = req.body;
  
  // Simulate verification process
  const isValid = Math.random() > 0.3; // 70% chance of valid
  const hasLocation = Math.random() > 0.2; // 80% chance of location
  const spoofingDetected = Math.random() < 0.1; // 10% chance of spoofing
  
  const result = {
    verification_result: isValid && !spoofingDetected ? 'valid' : 'invalid',
    signature_valid: isValid,
    location_detected: hasLocation,
    spoofing_detected: spoofingDetected,
    file_info: {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    },
    metadata: {
      timestamp: new Date().toISOString(),
      coordinates: hasLocation ? {
        latitude: 52.5200 + (Math.random() - 0.5) * 0.1,
        longitude: 13.4050 + (Math.random() - 0.5) * 0.1,
        accuracy: Math.floor(Math.random() * 10) + 1
      } : null,
      device_info: installation_id ? devices.find(d => d.installation_id === installation_id) : null
    },
    verification_timestamp: new Date().toISOString()
  };
  
  // Add to verification history
  if (installation_id) {
    const device = devices.find(d => d.installation_id === installation_id);
    if (device) {
      verificationHistory.push({
        id: verificationHistory.length + 1,
        device_id: device.id,
        verification_timestamp: result.verification_timestamp,
        image_hash: `hash_${Date.now()}`,
        verification_result: result.verification_result,
        verification_message: result.verification_result === 'valid' 
          ? 'Image verified successfully' 
          : 'Verification failed - signature or location invalid'
      });
      
      // Update device last activity
      device.last_activity = new Date().toISOString();
    }
  }
  
  res.json(result);
});

// Get system statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    total_devices: devices.length,
    active_devices: devices.filter(d => d.is_active).length,
    total_verifications: verificationHistory.length,
    successful_verifications: verificationHistory.filter(v => v.verification_result === 'valid').length,
    devices_by_os: devices.reduce((acc, device) => {
      acc[device.os_name] = (acc[device.os_name] || 0) + 1;
      return acc;
    }, {}),
    recent_activity: devices
      .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))
      .slice(0, 5)
      .map(device => ({
        sequence: device.geocam_sequence,
        model: device.device_model,
        last_activity: device.last_activity
      }))
  };
  
  res.json(stats);
});

// Get verification history
app.get('/api/verifications', (req, res) => {
  const { device_id, limit = 50 } = req.query;
  
  let history = verificationHistory;
  
  if (device_id) {
    history = history.filter(v => v.device_id === parseInt(device_id));
  }
  
  history = history
    .sort((a, b) => new Date(b.verification_timestamp) - new Date(a.verification_timestamp))
    .slice(0, parseInt(limit));
  
  res.json({
    verifications: history,
    total: history.length,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 GeoCam API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Devices API: http://localhost:${PORT}/api/devices`);
  console.log(`🔍 Verify API: http://localhost:${PORT}/api/verify-image`);
});

module.exports = app;