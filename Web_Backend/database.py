import psycopg2
from psycopg2.extras import RealDictCursor, Json
from config import Config
import logging
import json

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.connection = None
        self.connect()
        
    def connect(self):
        try:
            self.connection = psycopg2.connect(
                Config.DATABASE_URL,
                cursor_factory=RealDictCursor
            )
            logger.info("✅ Database connected successfully")
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise
            
    def get_cursor(self):
        if not self.connection or self.connection.closed:
            self.connect()
        return self.connection.cursor()
        
    def commit(self):
        if self.connection:
            self.connection.commit()
            
    def rollback(self):
        if self.connection:
            self.connection.rollback()
            
    def close(self):
        if self.connection:
            self.connection.close()

# Database schema
def create_tables():
    """Create database tables if they don't exist"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        # GeoCam devices table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS geocam_devices (
                id SERIAL PRIMARY KEY,
                installation_id VARCHAR(255) UNIQUE NOT NULL,
                device_model VARCHAR(255) NOT NULL,
                os_name VARCHAR(100),
                os_version VARCHAR(100),
                public_key_data JSONB,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                geocam_sequence INTEGER UNIQUE,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
        """)
        
        # Verification history table (optional, for auditing)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verification_history (
                id SERIAL PRIMARY KEY,
                device_id INTEGER REFERENCES geocam_devices(id),
                verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                image_hash VARCHAR(255),
                verification_result BOOLEAN,
                verification_message TEXT,
                signature_data JSONB
            );
        """)
        
        # Create indexes for better performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_installation_id ON geocam_devices(installation_id);
            CREATE INDEX IF NOT EXISTS idx_geocam_sequence ON geocam_devices(geocam_sequence);
            CREATE INDEX IF NOT EXISTS idx_registration_date ON geocam_devices(registration_date);
            CREATE INDEX IF NOT EXISTS idx_verification_timestamp ON verification_history(verification_timestamp);
        """)
        
        db.commit()
        logger.info("✅ Database tables created successfully")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to create tables: {e}")
        raise
    finally:
        db.close()

def get_next_geocam_sequence():
    """Get the next GeoCam sequence number"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        cursor.execute("SELECT COALESCE(MAX(geocam_sequence), 0) + 1 AS next_sequence FROM geocam_devices")
        result = cursor.fetchone()
        return result['next_sequence'] if result else 1
    except Exception as e:
        logger.error(f"❌ Failed to get next GeoCam sequence: {e}")
        return 1
    finally:
        db.close()

def register_device(installation_id, device_model, os_name=None, os_version=None, 
                   public_key_data=None):
    """Register a new GeoCam device"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        # Check if device already exists
        cursor.execute("SELECT id FROM geocam_devices WHERE installation_id = %s", 
                      (installation_id,))
        existing = cursor.fetchone()
        
        if existing:
            logger.info(f"📱 Device {installation_id} already registered")
            return existing['id']
        
        # Get next sequence number within the same transaction to avoid race conditions
        cursor.execute("SELECT COALESCE(MAX(geocam_sequence), 0) + 1 AS next_sequence FROM geocam_devices")
        result = cursor.fetchone()
        geocam_sequence = result['next_sequence'] if result else 1
        
        # Convert public_key_data to proper JSONB format using psycopg2's Json adapter
        public_key_json = None
        if public_key_data:
            public_key_json = Json(public_key_data)  # Use psycopg2's Json adapter
        
        # Insert new device with retry logic for sequence conflicts
        max_retries = 3
        for attempt in range(max_retries):
            try:
                cursor.execute("""
                    INSERT INTO geocam_devices 
                    (installation_id, device_model, os_name, os_version, 
                     public_key_data, geocam_sequence)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (installation_id, device_model, os_name, os_version, 
                      public_key_json, geocam_sequence))
                
                device_id = cursor.fetchone()['id']
                db.commit()
                
                logger.info(f"✅ Device registered: {installation_id} as GeoCam{geocam_sequence}")
                return device_id
                
            except Exception as insert_error:
                if "duplicate key value violates unique constraint" in str(insert_error) and "geocam_sequence" in str(insert_error):
                    # Sequence conflict, get next available sequence and retry
                    db.rollback()
                    cursor = db.get_cursor()  # Get fresh cursor after rollback
                    cursor.execute("SELECT COALESCE(MAX(geocam_sequence), 0) + 1 AS next_sequence FROM geocam_devices")
                    result = cursor.fetchone()
                    geocam_sequence = result['next_sequence'] if result else 1
                    logger.warning(f"⚠️ Sequence conflict, retrying with sequence {geocam_sequence} (attempt {attempt + 1})")
                    if attempt == max_retries - 1:
                        raise insert_error
                else:
                    raise insert_error
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to register device: {e}")
        raise
    finally:
        db.close()

def get_all_devices():
    """Get all registered GeoCam devices"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        cursor.execute("""
            SELECT id, installation_id, device_model, os_name, os_version,
                   registration_date, geocam_sequence, last_activity, is_active
            FROM geocam_devices 
            ORDER BY geocam_sequence ASC
        """)
        
        devices = cursor.fetchall()
        return [dict(device) for device in devices]
        
    except Exception as e:
        logger.error(f"❌ Failed to get devices: {e}")
        return []
    finally:
        db.close()

def get_device_by_installation_id(installation_id):
    """Get device by installation ID"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM geocam_devices 
            WHERE installation_id = %s
        """, (installation_id,))
        
        device = cursor.fetchone()
        return dict(device) if device else None
        
    except Exception as e:
        logger.error(f"❌ Failed to get device: {e}")
        return None
    finally:
        db.close()

def update_device_activity(installation_id):
    """Update last activity timestamp for a device"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        cursor.execute("""
            UPDATE geocam_devices 
            SET last_activity = CURRENT_TIMESTAMP 
            WHERE installation_id = %s
        """, (installation_id,))
        
        db.commit()
        
    except Exception as e:
        logger.error(f"❌ Failed to update device activity: {e}")
    finally:
        db.close()

def delete_device_by_installation_id(installation_id):
    """Delete device by installation ID (for fresh start/reset)"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        # First check if device exists
        cursor.execute("SELECT id, geocam_sequence FROM geocam_devices WHERE installation_id = %s", (installation_id,))
        device = cursor.fetchone()
        
        if not device:
            logger.info(f"ℹ️ Device {installation_id} not found in database")
            return {'found': False, 'deleted': False, 'geocam_sequence': None}
        
        device_id = device['id']
        geocam_sequence = device['geocam_sequence']
        
        # Delete verification history first (foreign key constraint)
        cursor.execute("DELETE FROM verification_history WHERE device_id = %s", (device_id,))
        deleted_verifications = cursor.rowcount
        
        # Delete the device
        cursor.execute("DELETE FROM geocam_devices WHERE installation_id = %s", (installation_id,))
        deleted_devices = cursor.rowcount
        
        db.commit()
        
        logger.info(f"✅ Device deleted: {installation_id} (GeoCam{geocam_sequence}), {deleted_verifications} verification records")
        return {
            'found': True, 
            'deleted': True, 
            'geocam_sequence': geocam_sequence,
            'deleted_verifications': deleted_verifications
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to delete device {installation_id}: {e}")
        raise
    finally:
        db.close()

def delete_device_by_fingerprint(key_fingerprint):
    """Delete device by public key fingerprint (alternative identifier)"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        # Search for device by fingerprint in public_key_data
        cursor.execute("""
            SELECT id, installation_id, geocam_sequence 
            FROM geocam_devices 
            WHERE public_key_data->>'hash' = %s 
               OR public_key_data->>'fingerprint' = %s
        """, (key_fingerprint, key_fingerprint))
        
        device = cursor.fetchone()
        
        if not device:
            logger.info(f"ℹ️ Device with fingerprint {key_fingerprint} not found")
            return {'found': False, 'deleted': False, 'installation_id': None}
        
        # Use the installation_id to delete (reuse existing function)
        installation_id = device['installation_id']
        result = delete_device_by_installation_id(installation_id)
        result['installation_id'] = installation_id
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to delete device by fingerprint {key_fingerprint}: {e}")
        raise
    finally:
        db.close()

def log_verification(device_id, image_hash, verification_result, verification_message, signature_data=None):
    """Log verification attempt"""
    db = Database()
    cursor = db.get_cursor()
    
    try:
        # Convert signature_data to proper JSONB format using psycopg2's Json adapter
        signature_json = None
        if signature_data:
            if isinstance(signature_data, str):
                # If it's already a string, try to parse it first
                try:
                    parsed_data = json.loads(signature_data)
                    signature_json = Json(parsed_data)
                except:
                    # If parsing fails, store as string
                    signature_json = signature_data
            else:
                signature_json = Json(signature_data)
        
        cursor.execute("""
            INSERT INTO verification_history 
            (device_id, image_hash, verification_result, verification_message, signature_data)
            VALUES (%s, %s, %s, %s, %s)
        """, (device_id, image_hash, verification_result, verification_message, signature_json))
        
        db.commit()
        
    except Exception as e:
        logger.error(f"❌ Failed to log verification: {e}")
    finally:
        db.close() 