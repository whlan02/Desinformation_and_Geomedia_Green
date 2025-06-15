import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Import components for routing
import Dashboard from './components/Dashboard.vue'
import DeviceList from './components/DeviceList.vue'

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/devices',
      name: 'DeviceList',
      component: DeviceList
    }
  ]
})

// Create app
const app = createApp(App)

// Use plugins
app.use(createPinia())
app.use(router)

// Mount app
app.mount('#app')
