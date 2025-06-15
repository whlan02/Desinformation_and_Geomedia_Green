<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>Dashboard</h2>
      <button @click="refreshData" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <!-- Backend Status -->
    <div class="card">
      <h3>Backend Status</h3>
      <table>
        <tr>
          <td>Connection:</td>
          <td class="status-healthy" v-if="isBackendHealthy">Healthy</td>
          <td class="status-unhealthy" v-else>Unhealthy</td>
        </tr>
        <tr>
          <td>Backend URL:</td>
          <td>{{ backendUrl || 'localhost (proxied)' }}</td>
        </tr>
        <tr>
          <td>Last Checked:</td>
          <td>{{ lastCheckedFormatted }}</td>
        </tr>
        <tr>
          <td>Message:</td>
          <td>{{ backendHealth.message }}</td>
        </tr>
      </table>
    </div>

    <!-- Device Summary -->
    <div class="card">
      <h3>Device Summary</h3>
      <table>
        <tr>
          <td>Total Devices:</td>
          <td><strong>{{ deviceCount }}</strong></td>
        </tr>
        <tr>
          <td>Operating Systems:</td>
          <td><strong>{{ Object.keys(devicesByOS).length }}</strong></td>
        </tr>
        <tr>
          <td>Last Updated:</td>
          <td>{{ lastUpdatedFormatted }}</td>
        </tr>
      </table>
    </div>

    <!-- Recent Devices -->
    <div class="card" v-if="hasDevices">
      <h3>Recent Devices</h3>
      <table>
        <thead>
          <tr>
            <th>Device Model</th>
            <th>Operating System</th>
            <th>Installation ID</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in recentDevices" :key="device.id">
            <td>{{ device.model }}</td>
            <td>{{ device.os }}</td>
            <td class="monospace">{{ device.installationId.substring(0, 12) }}...</td>
            <td>{{ formatDate(device.registeredAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top: 15px;">
        <router-link to="/devices" class="btn">View All Devices</router-link>
      </p>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="card error-card">
      <h3>Error</h3>
      <p>{{ error }}</p>
      <button @click="clearError" class="btn">Dismiss</button>
    </div>

    <!-- No Devices -->
    <div v-if="!hasDevices && !loading && !error" class="card">
      <h3>No Devices Registered</h3>
      <p>No devices have been registered with the backend yet.</p>
      <button @click="refreshData" class="btn btn-primary">Check Again</button>
    </div>
  </div>
</template>

<script>
import { useDeviceStore } from '../stores/deviceStore.js'
import { BACKEND_CONFIG } from '../services/backendConfig.js'

export default {
  name: 'Dashboard',
  setup() {
    const deviceStore = useDeviceStore()
    return { deviceStore }
  },
  
  computed: {
    loading() {
      return this.deviceStore.loading
    },
    error() {
      return this.deviceStore.error
    },
    devices() {
      return this.deviceStore.formattedDevices
    },
    deviceCount() {
      return this.deviceStore.deviceCount
    },
    hasDevices() {
      return this.deviceStore.hasDevices
    },
    isBackendHealthy() {
      return this.deviceStore.isBackendHealthy
    },
    backendHealth() {
      return this.deviceStore.backendHealth
    },
    devicesByOS() {
      return this.deviceStore.devicesByOS
    },
    backendUrl() {
      return BACKEND_CONFIG.BASE_URL
    },
    lastCheckedFormatted() {
      if (!this.backendHealth.lastChecked) return 'Never'
      return new Date(this.backendHealth.lastChecked).toLocaleString()
    },
    lastUpdatedFormatted() {
      if (!this.deviceStore.lastUpdated) return 'Never'
      return new Date(this.deviceStore.lastUpdated).toLocaleString()
    },
    recentDevices() {
      return this.devices
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
        .slice(0, 5)
    }
  },

  async mounted() {
    await this.refreshData()
  },

  methods: {
    async refreshData() {
      await this.deviceStore.refreshAll()
    },
    clearError() {
      this.deviceStore.clearError()
    },
    formatDate(dateStr) {
      if (!dateStr) return 'Unknown'
      return new Date(dateStr).toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 100%;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  font-size: 24px;
  font-weight: normal;
}

.monospace {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 10px;
  }
  
  table {
    font-size: 14px;
  }
  
  .monospace {
    font-size: 11px;
  }
}
</style> 