<template>
  <div class="verify-page">
    <section class="page-hero">
      <div class="container">
        <h1>Verify GeoCam Images</h1>
        <p>Upload any GeoCam image to verify its authenticity and location data</p>
      </div>
    </section>
    
    <section class="verification-tool">
      <div class="container">
        <div class="upload-area">
          <h3>Image Verification Tool</h3>
          <p>Drag and drop a GeoCam image here or click to browse</p>
          <input type="file" accept="image/*" class="file-input">
          <button class="upload-btn">Upload Image</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'VerifyPage'
}
</script>

<style scoped>
.page-hero {
  background: linear-gradient(135deg, #1e40af, #059669);
  color: white;
  padding: 5rem 0 3rem;
  text-align: center;
}

.verification-tool {
  padding: 4rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.upload-area {
  background: #f8fafc;
  border: 2px dashed #3b82f6;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.file-input {
  margin: 1rem 0;
}

.upload-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
}
</style>