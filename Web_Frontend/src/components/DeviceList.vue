<template>
  <div class="device-list">
    <div class="device-list-header">
      <h2>Registered Devices</h2>
      <button @click="refreshDevices" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <!-- Summary -->
    <div class="card summary-card">
      <h3>Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Total Devices:</span>
          <span class="summary-value">{{ deviceCount }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Operating Systems:</span>
          <span class="summary-value">{{ Object.keys(devicesByOS).length }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Last Updated:</span>
          <span class="summary-value">{{ lastUpdatedFormatted }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Loading devices...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card error-card">
      <h3>Error Loading Devices</h3>
      <p>{{ error }}</p>
      <button @click="refreshDevices" class="btn btn-primary">Try Again</button>
      <button @click="clearError" class="btn">Dismiss</button>
    </div>

    <!-- Device Table -->
    <div v-else-if="hasDevices" class="card">
      <div class="table-header">
        <h3>Device List</h3>
        
        <!-- OS Filter -->
        <div v-if="Object.keys(devicesByOS).length > 1" class="filter-section">
          <label>Filter by OS: </label>
          <select v-model="selectedOS">
            <option :value="null">All ({{ deviceCount }})</option>
            <option v-for="(devices, os) in devicesByOS" :key="os" :value="os">
              {{ os }} ({{ devices.length }})
            </option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="device-table">
          <thead>
            <tr>
              <th>Device Model</th>
              <th>Operating System</th>
              <th>Installation ID</th>
              <th>App Version</th>
              <th>Registered Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in formattedDevices" :key="device.id">
              <td><strong>{{ device.model }}</strong></td>
              <td>{{ device.os }}</td>
              <td class="monospace">{{ device.installationId }}</td>
              <td>{{ device.appVersion }}</td>
              <td>{{ formatDate(device.registeredAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card">
      <h3>No Devices Found</h3>
      <p>No devices have been registered with the backend yet.</p>
      <p>Use the GeoCam mobile app to register a device.</p>
      <button @click="refreshDevices" class="btn btn-primary">Check Again</button>
    </div>
  </div>
</template>

<script>
import { useDeviceStore } from '../stores/deviceStore.js'

export default {
  name: 'DeviceList',
  setup() {
    const deviceStore = useDeviceStore()
    return { deviceStore }
  },
  
  data() {
    return {
      selectedOS: null
    }
  },

  computed: {
    loading() {
      return this.deviceStore.loading
    },
    error() {
      return this.deviceStore.error
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
      const devices = this.deviceStore.formattedDevices
      if (this.selectedOS) {
        return devices.filter(device => device.os === this.selectedOS)
      }
      return devices
    },
    lastUpdatedFormatted() {
      if (!this.deviceStore.lastUpdated) return 'Never'
      return new Date(this.deviceStore.lastUpdated).toLocaleString()
    }
  },

  async mounted() {
    if (!this.hasDevices) {
      await this.refreshDevices()
    }
  },

  methods: {
    async refreshDevices() {
      await this.deviceStore.fetchDevices()
    },
    clearError() {
      this.deviceStore.clearError()
    },
    formatDate(dateStr) {
      if (!dateStr || dateStr === 'Unknown') return 'Unknown'
      try {
        return new Date(dateStr).toLocaleDateString()
      } catch (e) {
        return dateStr
      }
    }
  }
}
</script>

<style scoped>
.device-list {
  max-width: 100%;
  margin: 0 auto;
}

.device-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.device-list-header h2 {
  font-size: 24px;
  font-weight: normal;
}

.summary-card {
  margin-bottom: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 10px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f8f8f8;
  border: 1px solid #eee;
}

.summary-label {
  font-weight: bold;
}

.summary-value {
  font-weight: bold;
  color: #333;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-section label {
  font-weight: bold;
  white-space: nowrap;
}

.filter-section select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  font-size: 14px;
  min-width: 150px;
}

.table-container {
  overflow-x: auto;
}

.device-table {
  width: 100%;
  margin-top: 0;
  min-width: 800px;
}

.device-table th {
  background-color: #f0f0f0;
  font-weight: bold;
  text-align: left;
  padding: 12px 8px;
  border-bottom: 2px solid #ddd;
}

.device-table td {
  vertical-align: top;
  padding: 12px 8px;
  border-bottom: 1px solid #eee;
}

.device-table tr:hover {
  background-color: #f9f9f9;
}

.monospace {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  word-break: break-all;
  max-width: 200px;
}

@media (max-width: 768px) {
  .device-list-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .device-table {
    font-size: 12px;
    min-width: 600px;
  }
  
  .device-table th,
  .device-table td {
    padding: 8px 6px;
  }
  
  .monospace {
    font-size: 10px;
    max-width: 150px;
  }
}
</style> 