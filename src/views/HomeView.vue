<script setup lang="ts">
import { scenes } from '../scenes';
import { useRouter } from 'vue-router';

const router = useRouter();

function navigate(id: string) {
  router.push({ name: 'scene', params: { id } });
}
</script>

<template>
  <div class="container">
    <h1 class="title">WebGPU Shaders</h1>
    <p class="subtitle">Explore a collection of WebGPU experiments and shaders.</p>
    
    <div class="grid">
      <div 
        v-for="scene in scenes" 
        :key="scene.id" 
        class="card"
        @click="navigate(scene.id)"
      >
        <h3>{{ scene.name }}</h3>
        <p>{{ scene.description }}</p>
        <button class="btn">View Scene</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles if specifically needed, but global card styles are in style.css */
</style>
