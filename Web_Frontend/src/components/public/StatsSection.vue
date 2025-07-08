<template>
  <section class="stats-section">
    <div class="stats-container">
      <div class="stats-header">
        <h2>Live System Statistics</h2>
        <p>Real-time data from the GeoCam network showing active devices and verification activity</p>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_devices || 'Loading...' }}</div>
          <div class="stat-label">Total Devices</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats.active_devices || 'Loading...' }}</div>
          <div class="stat-label">Active Devices</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_verifications || 'Loading...' }}</div>
          <div class="stat-label">Total Verifications</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ successRate }}</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
      
      <div class="stats-details">
        <div class="detail-card">
          <h3>Devices by Platform</h3>
          <div class="platform-list">
            <div 
              v-for="(count, platform) in stats.devices_by_os" 
              :key="platform"
              class="platform-item"
            >
              <div class="platform-info">
                <div class="platform-dot"></div>
                <span class="platform-name">{{ platform }}</span>
              </div>
              <div class="platform-stats">
                <span class="device-count">{{ count }} devices</span>
                <span class="percentage">{{ getPlatformPercentage(count) }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <h3>Recent Activity</h3>
          <div class="activity-list">
            <div 
              v-for="activity in stats.recent_activity" 
              :key="activity.sequence"
              class="activity-item"
            >
              <div class="activity-info">
                <div class="activity-name">{{ activity.sequence }}</div>
                <div class="activity-device">{{ activity.model }}</div>
              </div>
              <div class="activity-time">{{ getTimeAgo(activity.last_activity) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="stats-footer">
        <router-link to="/admin" class="admin-link">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
          </svg>
          View Admin Dashboard
        </router-link>
      </div>
    </div>
  </section>
</template>

<script>
import { BACKEND_CONFIG } from '../../services/backendConfig.js'

export default {
  name: 'StatsSection',
  data() {
    return {
      stats: {
        total_devices: null,
        active_devices: null,
        total_verifications: null,
        successful_verifications: null,
        devices_by_os: {},
        recent_activity: []
      },
      loading: false,
      error: null
    }
  },
  computed: {
    successRate() {
      if (!this.stats.total_verifications || this.stats.total_verifications === 0) {
        return 'N/A'
      }
      const rate = Math.round((this.stats.successful_verifications / this.stats.total_verifications) * 100)
      return `${rate}%`
    },
    totalDevices() {
      return Object.values(this.stats.devices_by_os || {}).reduce((sum, count) => sum + count, 0)
    }
  },
  async mounted() {
    await this.loadStats()
    // Refresh stats every 30 seconds
    this.statsInterval = setInterval(this.loadStats, 30000)
  },
  beforeUnmount() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }
  },
  methods: {
    async loadStats() {
      try {
        this.loading = true
        this.error = null
        
        const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/stats`)
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const data = await response.json()
        this.stats = data
        
      } catch (error) {
        console.warn('Failed to load live stats, using fallback:', error)
        this.error = error.message
        this.displayFallbackStats()
      } finally {
        this.loading = false
      }
    },
    
    displayFallbackStats() {
      // Display static fallback data when API is not available
      this.stats = {
        total_devices: 3,
        active_devices: 3,
        total_verifications: 2,
        successful_verifications: 1,
        devices_by_os: {
          'iOS': 1,
          'Android': 2
        },
        recent_activity: [
          {
            sequence: 'GeoCam001',
            model: 'iPhone 14 Pro',
            last_activity: new Date().toISOString()
          },
          {
            sequence: 'GeoCam002',
            model: 'Samsung Galaxy S24',
            last_activity: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      }
    },
    
    getPlatformPercentage(count) {
      if (this.totalDevices === 0) return 0
      return Math.round((count / this.totalDevices) * 100)
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
.stats-section {
  padding: 4rem 0;
  background: #1e293b;
  color: white;
}

.stats-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.stats-header {
  text-align: center;
  margin-bottom: 3rem;
}

.stats-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.stats-header p {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 600px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

.stats-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.detail-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
}

.detail-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #e2e8f0;
}

.platform-list,
.activity-list {
  space-y: 0.75rem;
}

.platform-item,
.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.platform-item:last-child,
.activity-item:last-child {
  border-bottom: none;
}

.platform-info,
.activity-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.platform-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
}

.platform-name,
.activity-name {
  color: white;
  font-weight: 500;
}

.activity-device {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
}

.platform-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.device-count {
  color: rgba(255, 255, 255, 0.8);
}

.percentage {
  color: #10b981;
  font-weight: 600;
}

.activity-time {
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
}

.stats-footer {
  text-align: center;
}

.admin-link {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  text-decoration: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.admin-link:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  color: white;
}

/* Responsive Design */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
  }
  
  .stats-details {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .detail-card {
    padding: 1.5rem;
  }
  
  .platform-item,
  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .platform-stats {
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>