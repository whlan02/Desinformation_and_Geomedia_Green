<template>
  <div class="admin-layout">
    <!-- Admin Header -->
    <header class="admin-header">
      <div class="admin-container">
        <div class="admin-brand">
          <router-link to="/admin" class="brand-link">
            <img src="/geocam-logo.png" alt="GeoCam" class="admin-logo">
            <h1 class="admin-title">GeoCam Admin</h1>
          </router-link>
        </div>
        
        <nav class="admin-nav">
          <router-link to="/admin" class="admin-nav-link" active-class="active">
            Dashboard
          </router-link>
          <router-link to="/admin/devices" class="admin-nav-link" active-class="active">
            Devices
          </router-link>
          <router-link to="/" class="admin-nav-link public-link">
            ← Public Site
          </router-link>
        </nav>
      </div>
    </header>

    <!-- Admin Main Content -->
    <main class="admin-main">
      <div class="admin-container">
        <router-view />
      </div>
    </main>

    <!-- Admin Footer -->
    <footer class="admin-footer">
      <div class="admin-container">
        <p>GeoCam Admin Dashboard - Connected to Backend</p>
        <div class="admin-status">
          <span class="status-indicator" :class="backendStatus"></span>
          Backend {{ backendStatus === 'healthy' ? 'Connected' : 'Disconnected' }}
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { useDeviceStore } from '../../stores/deviceStore.js'

export default {
  name: 'AdminLayout',
  setup() {
    const deviceStore = useDeviceStore()
    return { deviceStore }
  },
  computed: {
    backendStatus() {
      return this.deviceStore.isBackendHealthy ? 'healthy' : 'unhealthy'
    }
  },
  async mounted() {
    // Check backend status when admin is accessed
    await this.deviceStore.checkBackendHealth()
  }
}
</script>

<style scoped>
/* Admin Layout Styles */
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* Admin Header */
.admin-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  padding: 15px 0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.admin-container {
  max-width: 95%;
  margin: 0 auto;
  padding: 0 20px;
}

.admin-header .admin-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-brand {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #1e293b;
}

.admin-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.admin-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.admin-nav {
  display: flex;
  gap: 20px;
  align-items: center;
}

.admin-nav-link {
  color: #64748b;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  font-weight: 500;
}

.admin-nav-link:hover {
  color: #1e40af;
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}

.admin-nav-link.active {
  color: #1e40af;
  background-color: #eff6ff;
  border-color: #bfdbfe;
  font-weight: 600;
}

.public-link {
  background: linear-gradient(135deg, #1e40af, #059669);
  color: white !important;
  border-color: transparent;
}

.public-link:hover {
  background: linear-gradient(135deg, #1d4ed8, #047857);
  color: white !important;
  transform: translateX(-2px);
}

/* Admin Main */
.admin-main {
  flex: 1;
  padding: 40px 0;
}

/* Admin Footer */
.admin-footer {
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 20px 0;
  margin-top: auto;
}

.admin-footer .admin-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #64748b;
  font-size: 14px;
}

.admin-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.healthy {
  background: #10b981;
}

.status-indicator.unhealthy {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-header .admin-container {
    flex-direction: column;
    gap: 15px;
  }
  
  .admin-nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  
  .admin-footer .admin-container {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .admin-main {
    padding: 20px 0;
  }
}
</style>