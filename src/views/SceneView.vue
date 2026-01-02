<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getWebGPUDevice, configureContext } from '../webgpu/utils';
import type { Scene } from '../webgpu/types';
import HelloTriangle from '../scenes/HelloTriangle';
import GradientPattern from '../scenes/GradientPattern';
import RotatingCube from '../scenes/RotatingCube';
import BouncingSpheres from '../scenes/BouncingSpheres';

// Simple registry for now - will expand as scenes are added
const sceneRegistry: Record<string, any> = {
  'hello-triangle': HelloTriangle,
  'gradient-pattern': GradientPattern,
  'rotating-cube': RotatingCube,
  'bouncing-spheres': BouncingSpheres
};

const route = useRoute();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const error = ref<string | null>(null);
const loading = ref(true);

let currentScene: Scene | null = null;
let animationFrameId: number;

async function loadScene(id: string) {
  if (!canvasRef.value) return;
  
  // Cleanup previous scene
  if (currentScene) {
    cancelAnimationFrame(animationFrameId);
    currentScene.destroy();
    currentScene = null;
  }
  
  loading.value = true;
  error.value = null;
  
  const SceneClass = sceneRegistry[id];
  if (!SceneClass) {
    error.value = `Scene '${id}' not found or not yet implemented.`;
    loading.value = false;
    return;
  }

  try {
    const device = await getWebGPUDevice();
    configureContext(device, canvasRef.value);
    
    currentScene = new SceneClass();
    if (currentScene) { // Check needed for TS narrowing if SceneClass is valid
         await currentScene.init(device, navigator.gpu.getPreferredCanvasFormat(), canvasRef.value);
         startLoop();
    }

  } catch (err: any) {
    error.value = err.message;
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function startLoop() {
  let lastTime = performance.now();
  
  function loop(now: number) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    
    if (currentScene) {
      currentScene.draw(dt);
    }
    
    animationFrameId = requestAnimationFrame(loop);
  }
  
  animationFrameId = requestAnimationFrame(loop);
}

onMounted(() => {
  loadScene(route.params.id as string);
});

onUnmounted(() => {
  if (currentScene) {
    cancelAnimationFrame(animationFrameId);
    currentScene.destroy();
  }
});

watch(() => route.params.id, (newId) => {
  loadScene(newId as string);
});
</script>

<template>
  <div class="scene-container">
    <div v-if="error" class="error-overlay">
      <div class="error-box">
        <h3>Error</h3>
        <p>{{ error }}</p>
        <router-link to="/" class="btn">Go Back</router-link>
      </div>
    </div>
    
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Initializing WebGPU...</p>
    </div>

    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.scene-container {
  width: 100%;
  height: calc(100vh - 80px); /* Adjust based on navbar height */
  position: relative;
  background: #000;
}

.error-overlay, .loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.8);
  z-index: 10;
}

.error-box {
  background: #2a0000;
  border: 1px solid #ff3e00;
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
