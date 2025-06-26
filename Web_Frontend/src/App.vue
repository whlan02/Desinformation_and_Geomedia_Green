<script>
export default {
  name: 'App'
}
</script>

<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <div class="app-brand">
          <img src="/geocam-logo.png" alt="GeoCam" class="app-logo">
          <h1 class="app-title">GeoCam Device Manager</h1>
        </div>
        <nav class="app-nav">
          <router-link to="/" class="nav-link" active-class="active">Dashboard</router-link>
          <router-link to="/devices" class="nav-link" active-class="active">Devices</router-link>
          <a href="http://localhost:8000" class="nav-link external" target="_blank">Main Website</a>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <div class="container">
        <router-view />
      </div>
    </main>

    <footer class="app-footer">
      <div class="container">
        <p>GeoCam Device Manager - Connected to Backend</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* Reset and Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1e293b;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
}

.container {
  max-width: 95%;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  padding: 15px 0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.app-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.app-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-link:hover {
  color: #1e40af;
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}

.nav-link.active {
  color: #1e40af;
  background-color: #eff6ff;
  border-color: #bfdbfe;
  font-weight: 600;
}

.nav-link.external {
  background: linear-gradient(135deg, #1e40af, #059669);
  color: white;
  border-color: transparent;
}

.nav-link.external:hover {
  background: linear-gradient(135deg, #1d4ed8, #047857);
  color: white;
}

/* Main Content */
.app-main {
  min-height: calc(100vh - 120px);
  padding: 20px 0;
}

/* Footer */
.app-footer {
  background-color: #fff;
  border-top: 1px solid #ddd;
  text-align: center;
  padding: 15px 0;
  color: #666;
  font-size: 14px;
}

/* Basic Components */
.card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #374151;
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.btn:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #ffffff;
  border-color: transparent;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  transform: translateY(-1px);
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-card {
  border-color: #d00;
  background-color: #ffeaea;
}

.status-healthy {
  color: #059669;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-healthy::before {
  content: "●";
  color: #10b981;
}

.status-unhealthy {
  color: #dc2626;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-unhealthy::before {
  content: "●";
  color: #ef4444;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

/* Responsive */
@media (max-width: 768px) {
  .app-header .container {
    flex-direction: column;
    gap: 15px;
  }
  
  .app-nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  
  .container {
    padding: 0 15px;
  }
  
  .card {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .app-title {
    font-size: 18px;
  }
  
  .app-logo {
    width: 32px;
    height: 32px;
  }
}
</style>
