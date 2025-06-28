<template>
  <div class="build-page">
    <section class="page-hero">
      <div class="container">
        <h1>Build with GeoCam</h1>
        <p>SDK and development resources for GeoCam integration</p>
      </div>
    </section>
    
    <section class="content-section">
      <div class="container">
        <h2>GeoCam SDK</h2>
        <p>Coming soon - SDK documentation and examples</p>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'BuildPage'
}
</script>

<style scoped>
.page-hero {
  background: linear-gradient(135deg, #1e40af, #059669);
  color: white;
  padding: 5rem 0 3rem;
  text-align: center;
}

.content-section {
  padding: 4rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>