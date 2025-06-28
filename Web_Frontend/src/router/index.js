import { createRouter, createWebHistory } from 'vue-router'

// Layout Components
import PublicLayout from '../components/layout/PublicLayout.vue'
import AdminLayout from '../components/layout/AdminLayout.vue'

// Public Views
import Home from '../views/public/Home.vue'

// Admin Views
import Dashboard from '../views/admin/Dashboard.vue'
import DeviceList from '../views/admin/DeviceList.vue'

const routes = [
  // Public Website Routes - Single Page
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
        meta: { title: 'GeoCam - Every Photo Tells a Story. GeoCam Makes It True.' }
      }
    ]
  },
  
  // Admin Dashboard Routes
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: Dashboard,
        meta: { 
          title: 'GeoCam Admin Dashboard',
          requiresAuth: true // Future authentication
        }
      },
      {
        path: 'devices',
        name: 'AdminDevices',
        component: DeviceList,
        meta: { 
          title: 'Device Management - GeoCam Admin',
          requiresAuth: true
        }
      }
    ]
  },

  // Redirect old admin routes
  {
    path: '/dashboard',
    redirect: '/admin'
  },
  {
    path: '/devices',
    redirect: '/admin/devices'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { 
        el: to.hash, 
        behavior: 'smooth',
        top: 80 // Account for fixed navbar
      }
    } else {
      return { top: 0 }
    }
  }
})

// Global navigation guards
router.beforeEach((to, from, next) => {
  // Update page title
  document.title = to.meta.title || 'GeoCam'
  
  // Future: Check authentication for admin routes
  if (to.meta.requiresAuth) {
    // Add authentication logic here
    console.log('Admin route accessed:', to.path)
  }
  
  next()
})

export default router