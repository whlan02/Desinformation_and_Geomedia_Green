<template>
  <section id="admin" class="admin-section">
    <div class="admin-container">
      <div class="admin-header">
        <h2>Device Management & Analytics</h2>
        <p>Real-time overview of registered GeoCam devices and system statistics</p>
      </div>
      
      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-card">
          <div class="stat-icon">📱</div>
          <div class="stat-content">
            <div class="stat-value">{{ deviceCount }}</div>
            <div class="stat-label">Total Devices</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.active_devices || deviceCount }}</div>
            <div class="stat-label">Active Devices</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔍</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total_verifications || 'N/A' }}</div>
            <div class="stat-label">Verifications</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🌐</div>
          <div class="stat-content">
            <div class="stat-value">{{ Object.keys(devicesByOS).length }}</div>
            <div class="stat-label">Platforms</div>
          </div>
        </div>
      </div>
      
      <!-- Main Content Grid -->
      <div class="admin-content">
        <!-- Device List -->
        <div class="admin-card devices-card">
          <div class="card-header">
            <h3>Registered Devices</h3>
            <button @click="refreshData" class="refresh-btn" :disabled="loading">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
              </svg>
              {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
          
          <!-- OS Filter -->
          <div v-if="Object.keys(devicesByOS).length > 1" class="filter-section">
            <label>Filter by OS:</label>
            <select v-model="selectedOS" class="os-filter">
              <option :value="null">All ({{ deviceCount }})</option>
              <option v-for="(devices, os) in devicesByOS" :key="os" :value="os">
                {{ os }} ({{ devices.length }})
              </option>
            </select>
          </div>
          
          <!-- Device Table -->
          <div v-if="hasDevices && !loading" class="device-table-container">
            <div class="table-wrapper">
              <table class="device-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Platform</th>
                    <th>Version</th>
                    <th>Registered</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="device in filteredDevices" :key="device.id" class="device-row">
                    <td class="device-info">
                      <div class="device-details">
                        <div class="device-name">{{ device.model }}</div>
                        <div class="device-id">{{ device.installationId.substring(0, 8) }}...</div>
                      </div>
                    </td>
                    <td>
                      <span class="platform-badge" :class="getPlatformClass(device.os)">
                        {{ device.os }}
                      </span>
                    </td>
                    <td class="version">{{ device.appVersion }}</td>
                    <td class="registered-date">{{ formatDate(device.registeredAt) }}</td>
                    <td>
                      <span class="status-badge active">Active</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Loading State -->
          <div v-else-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading device data...</p>
          </div>
          
          <!-- Empty State -->
          <div v-else-if="!hasDevices" class="empty-state">
            <div class="empty-icon">📱</div>
            <h4>No Devices Registered</h4>
            <p>No GeoCam devices have been registered yet. Use the mobile app to register your first device.</p>
          </div>
          
          <!-- Error State -->
          <div v-if="error" class="error-state">
            <div class="error-icon">⚠️</div>
            <h4>Unable to Load Device Data</h4>
            <p>{{ error }}</p>
            <button @click="refreshData" class="retry-btn">Try Again</button>
          </div>
        </div>
        
        <!-- Platform Analytics -->
        <div class="admin-card analytics-card">
          <div class="card-header">
            <h3>Platform Distribution</h3>
          </div>
          
          <div v-if="hasDevices" class="platform-analytics">
            <div 
              v-for="(devices, os) in devicesByOS" 
              :key="os"
              class="platform-stat"
            >
              <div class="platform-info">
                <div class="platform-dot" :class="getPlatformClass(os)"></div>
                <div class="platform-details">
                  <div class="platform-name">{{ os }}</div>
                  <div class="platform-count">{{ devices.length }} device{{ devices.length !== 1 ? 's' : '' }}</div>
                </div>
              </div>
              <div class="platform-percentage">
                {{ getPlatformPercentage(devices.length) }}%
              </div>
            </div>
          </div>
          
          <div v-else class="no-analytics">
            <p>Platform analytics will appear once devices are registered.</p>
          </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="admin-card activity-card">
          <div class="card-header">
            <h3>Recent Activity</h3>
          </div>
          
          <div v-if="hasDevices" class="activity-list">
            <div 
              v-for="device in recentDevices" 
              :key="device.id"
              class="activity-item"
            >
              <div class="activity-info">
                <div class="activity-device">{{ device.model }}</div>
                <div class="activity-action">Device registered</div>
              </div>
              <div class="activity-time">{{ getTimeAgo(device.registeredAt) }}</div>
            </div>
          </div>
          
          <div v-else class="no-activity">
            <p>Recent activity will appear here as devices interact with the system.</p>
          </div>
        </div>
      </div>
      
      <!-- Admin Actions -->
      <div class="admin-actions">
        <button @click="refreshData" class="refresh-main-btn" :disabled="loading">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
          {{ loading ? 'Refreshing...' : 'Refresh Device Management' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { useDeviceStore } from '../../stores/deviceStore.js'
import { BACKEND_CONFIG } from '../../services/backendConfig.js'

export default {
  name: 'AdminSection',
  setup() {
    const deviceStore = useDeviceStore()
    return { deviceStore }
  },
  
  data() {
    return {
      selectedOS: null,
      stats: {
        total_devices: null,
        active_devices: null,
        total_verifications: null,
        successful_verifications: null
      },
      error: null,
      statsInterval: null
    }
  },

  computed: {
    loading() {
      return this.deviceStore.loading
    },
    deviceCount() {
      return this.deviceStore.deviceCount
    },
    hasDevices() {
      return this.deviceStore.hasDevices
    },
    devicesByOS() {
      return this.deviceStore.devicesByOS
    },
    formattedDevices() {
      return this.deviceStore.formattedDevices
    },
    filteredDevices() {
      if (this.selectedOS) {
        return this.formattedDevices.filter(device => device.os === this.selectedOS)
      }
      return this.formattedDevices
    },
    recentDevices() {
      return [...this.formattedDevices]
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
        .slice(0, 5)
    }
  },

  async mounted() {
    console.log('🔄 AdminSection mounted, refreshing data...')
    await this.refreshData()
    console.log('📊 After refresh - Device count:', this.deviceCount, 'Has devices:', this.hasDevices)
    console.log('📋 Devices:', this.formattedDevices)
    console.log('🗂️ Devices by OS:', this.devicesByOS)
    // Refresh data every 30 seconds
    this.statsInterval = setInterval(this.loadStats, 30000)
  },

  beforeUnmount() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }
  },

  methods: {
    async refreshData() {
      console.log('🔄 Starting refreshData...')
      console.log('📊 Before fetch - Store state:', {
        devices: this.deviceStore.devices,
        deviceCount: this.deviceStore.deviceCount,
        loading: this.deviceStore.loading,
        error: this.deviceStore.error
      })
      
      await Promise.all([
        this.deviceStore.fetchDevices(),
        this.loadStats()
      ])
      
      console.log('✅ After fetch - Store state:', {
        devices: this.deviceStore.devices,
        deviceCount: this.deviceStore.deviceCount,
        loading: this.deviceStore.loading,
        error: this.deviceStore.error,
        hasDevices: this.hasDevices,
        formattedDevices: this.formattedDevices
      })
    },

    async loadStats() {
      try {
        const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/stats`)
        if (response.ok) {
          const data = await response.json()
          this.stats = data
        }
      } catch (error) {
        console.warn('Failed to load stats:', error)
      }
    },

    formatDate(dateStr) {
      if (!dateStr || dateStr === 'Unknown') return 'Unknown'
      try {
        return new Date(dateStr).toLocaleDateString()
      } catch (e) {
        return dateStr
      }
    },

    getPlatformClass(os) {
      const osLower = os.toLowerCase()
      if (osLower.includes('ios')) return 'ios'
      if (osLower.includes('android')) return 'android'
      if (osLower.includes('windows')) return 'windows'
      return 'other'
    },

    getPlatformPercentage(count) {
      if (this.deviceCount === 0) return 0
      return Math.round((count / this.deviceCount) * 100)
    },

    getTimeAgo(dateString) {
      const now = new Date()
      const date = new Date(dateString)
      const diffInSeconds = Math.floor((now - date) / 1000)
      
      if (diffInSeconds < 60) return 'Just now'
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
      return `${Math.floor(diffInSeconds / 2592000)}mo ago`
    }
  }
}
</script>

<style scoped>
.admin-section {
  padding: 4rem 0;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: white;
}

.admin-container {
  max-width: 1566.9px; /* match original HTML width */
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .admin-container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .admin-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.admin-header {
  text-align: center;
  margin-bottom: 3rem;
}

.admin-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.admin-header p {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 600px;
  margin: 0 auto;
}

/* Quick Stats */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 90vw), 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

/* Main Content */
.admin-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(400px, 90vw), 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.admin-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
}

.devices-card {
  grid-column: 1 / 2;
  grid-row: 1 / 3;
}

.analytics-card {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
}

.activity-card {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Filter Section */
.filter-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-section label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  white-space: nowrap;
}

.os-filter {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

/* Device Table */
.device-table-container {
  overflow-x: auto;
}

.table-wrapper {
  min-width: 600px;
}

.device-table {
  width: 100%;
  border-collapse: collapse;
}

.device-table th {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.875rem;
}

.device-table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
}

.device-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.device-info {
  min-width: 180px;
}

.device-name {
  color: white;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.device-id {
  color: rgba(255, 255, 255, 0.6);
  font-family: monospace;
  font-size: 0.75rem;
}

.platform-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.platform-badge.ios {
  background: rgba(0, 122, 255, 0.2);
  color: #5ac8fa;
}

.platform-badge.android {
  background: rgba(76, 175, 80, 0.2);
  color: #81c784;
}

.platform-badge.other {
  background: rgba(156, 163, 175, 0.2);
  color: #d1d5db;
}

.version {
  color: rgba(255, 255, 255, 0.8);
}

.registered-date {
  color: rgba(255, 255, 255, 0.7);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

/* Platform Analytics */
.platform-analytics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.platform-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.platform-stat:last-child {
  border-bottom: none;
}

.platform-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.platform-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.platform-dot.ios {
  background: #5ac8fa;
}

.platform-dot.android {
  background: #81c784;
}

.platform-dot.other {
  background: #d1d5db;
}

.platform-name {
  color: white;
  font-weight: 500;
}

.platform-count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.platform-percentage {
  color: #10b981;
  font-weight: 600;
  font-size: 0.875rem;
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-device {
  color: white;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.activity-action {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.activity-time {
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
}

/* States */
.loading-state,
.empty-state,
.error-state {
  text-align: center;
  padding: 3rem 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-icon,
.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.empty-state h4,
.error-state h4 {
  color: white;
  margin-bottom: 0.5rem;
}

.empty-state p,
.error-state p {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
}

.retry-btn {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: #b91c1c;
}

.no-analytics,
.no-activity {
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Admin Actions */
.admin-actions {
  text-align: center;
}

.refresh-main-btn {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-main-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
}

.refresh-main-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .admin-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .devices-card,
  .analytics-card,
  .activity-card {
    grid-column: 1;
    grid-row: auto;
  }
}

@media (max-width: 768px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
  
  .admin-card {
    padding: 1.5rem;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .device-table th,
  .device-table td {
    padding: 0.5rem;
    font-size: 0.75rem;
  }
  
  .platform-stat,
  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .quick-stats {
    grid-template-columns: 1fr;
  }
  
  .table-wrapper {
    min-width: 500px;
  }
}
</style>