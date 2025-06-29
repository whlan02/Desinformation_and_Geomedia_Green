import { defineStore } from 'pinia';
import { getRegisteredDevices, getBackendHealth, getBackendStatus, formatDeviceInfo } from '../services/backendService.js';

export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [],
    loading: false,
    error: null,
    lastUpdated: null,
    backendHealth: {
      healthy: false,
      message: 'Not checked',
      lastChecked: null,
    },
    deviceCount: 0,
  }),

  getters: {
    formattedDevices: (state) => {
      return state.devices.map(device => formatDeviceInfo(device));
    },
    
    isBackendHealthy: (state) => {
      return state.backendHealth.healthy;
    },
    
    hasDevices: (state) => {
      return state.devices.length > 0;
    },
    
    devicesByOS: (state) => {
      const formatted = state.devices.map(device => formatDeviceInfo(device));
      return formatted.reduce((acc, device) => {
        const os = device.os || 'Unknown';
        if (!acc[os]) {
          acc[os] = [];
        }
        acc[os].push(device);
        return acc;
      }, {});
    },
  },

  actions: {
    async fetchDevices() {
      this.loading = true;
      this.error = null;
      
      try {
        console.log('🔄 Fetching devices from store...');
        const result = await getRegisteredDevices();
        console.log('📥 Raw API result:', result);
        
        if (result.success) {
          this.devices = result.devices;
          this.deviceCount = result.devices.length;
          this.lastUpdated = new Date().toISOString();
          console.log('✅ Store updated with devices:', this.devices.length);
          console.log('📋 Devices in store:', this.devices);
          console.log('🏪 Full store state:', {
            devices: this.devices,
            deviceCount: this.deviceCount,
            loading: this.loading,
            error: this.error
          });
        } else {
          this.error = result.message;
          console.error('❌ Failed to fetch devices:', result.message);
        }
      } catch (error) {
        this.error = error.message || 'Failed to fetch devices';
        console.error('❌ Store fetch error:', error);
      } finally {
        this.loading = false;
      }
    },

    async checkBackendHealth() {
      try {
        console.log('🏥 Checking backend health from store...');
        const result = await getBackendHealth();
        
        this.backendHealth = {
          healthy: result.healthy,
          message: result.message,
          lastChecked: new Date().toISOString(),
          data: result.data,
        };
        
        console.log('✅ Backend health updated:', this.backendHealth);
      } catch (error) {
        this.backendHealth = {
          healthy: false,
          message: error.message || 'Health check failed',
          lastChecked: new Date().toISOString(),
        };
        console.error('❌ Health check error:', error);
      }
    },

    async refreshAll() {
      console.log('🔄 Refreshing all data...');
      await Promise.all([
        this.fetchDevices(),
        this.checkBackendHealth()
      ]);
    },

    async getStatus() {
      try {
        const status = await getBackendStatus();
        this.backendHealth = status.health;
        this.deviceCount = status.deviceCount;
        return status;
      } catch (error) {
        console.error('❌ Failed to get status:', error);
        throw error;
      }
    },

    clearError() {
      this.error = null;
    },

    // Helper action to get device by ID
    getDeviceById(id) {
      return this.formattedDevices.find(device => 
        device.id === id || device.installationId === id
      );
    },
  },
}); 