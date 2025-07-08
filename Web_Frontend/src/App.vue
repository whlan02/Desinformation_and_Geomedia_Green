<script>
export default {
  name: 'App'
}
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
/* Global Styles - Full Edge Background */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1e293b;
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Hide horizontal scrollbar if any */
::-webkit-scrollbar-horizontal {
  display: none;
}

#app {
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  margin: 0;
}

/* Responsive Images like original */
img {
  max-width: 100%;
  height: auto;
}

/* Focus styles for accessibility */
button:focus,
a:focus,
input:focus {
  outline: 2px solid #1e40af;
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  html {
    scroll-behavior: auto;
  }
}
</style>