<script>
export default {
  name: 'App'
}
</script>

<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <h1 class="app-title">GeoCam Device Manager</h1>
        <nav class="app-nav">
          <router-link to="/" class="nav-link" active-class="active">Dashboard</router-link>
          <router-link to="/devices" class="nav-link" active-class="active">Devices</router-link>
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
  font-family: Arial, sans-serif;
  line-height: 1.4;
  color: #333;
  background-color: #f9f9f9;
}

.container {
  max-width: 95%;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  padding: 15px 0;
}

.app-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 20px;
  font-weight: normal;
  color: #333;
}

.app-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: #666;
  text-decoration: none;
  padding: 8px 12px;
  border: 1px solid transparent;
}

.nav-link:hover {
  color: #333;
  border-color: #ddd;
}

.nav-link.active {
  color: #333;
  border-color: #333;
  font-weight: bold;
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
  background: #fff;
  border: 1px solid #ddd;
  padding: 20px;
  margin-bottom: 20px;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  border: 1px solid #333;
  background-color: #fff;
  color: #333;
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover {
  background-color: #f5f5f5;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #333;
  color: #fff;
}

.btn-primary:hover {
  background-color: #555;
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
  color: #060;
  font-weight: bold;
}

.status-unhealthy {
  color: #d00;
  font-weight: bold;
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
    gap: 10px;
  }
  
  .container {
    padding: 0 15px;
  }
}
</style>
