<script setup lang="ts">
</script>

<template>
  <nav class="navbar">
    <router-link to="/" class="nav-brand">
      <span>WebGPU Playground</span>
    </router-link>
    <div class="nav-links">
      <router-link to="/">Home</router-link>
      <a href="https://github.com/subhendu/shaders-playground" target="_blank">GitHub</a>
    </div>
  </nav>
  
  <main>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
