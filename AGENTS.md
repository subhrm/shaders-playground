# AGENTS.md

## Project Overview
This is a **WebGPU Shaders Playground** built with **Vue 3**, **TypeScript**, and **Vite**.
The goal is to demonstrate WebGPU capabilities with high-performance, interactive scenes.
The UI follows a **premium, dark-mode aesthetic** with glassmorphism effects.

## Tech Stack
-   **Framework**: Vue 3 (Composition API, `<script setup lang="ts">`)
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Graphics API**: WebGPU (`navigator.gpu`) with WGSL shaders
-   **3D Math**: `gl-matrix` library
-   **Styling**: Vanilla CSS (Global variables in `src/style.css`, scoped Vue styles for components)

## Directory Structure
-   `src/webgpu/`: Core WebGPU utilities (`utils.ts`) and types (`types.ts`).
-   `src/scenes/`: Scene implementations. Each scene implements the `Scene` interface.
-   `src/shaders/`: WGSL shader files (`.wgsl`).
-   `src/views/`: Vue views (`HomeView.vue`, `SceneView.vue`).
-   `src/components/`: Reusable Vue components (currently minimal).

## Development Guidelines

### 1. Creating New Scenes
To add a new scene:
1.  **Shader**: Create a new `.wgsl` file in `src/shaders/`.
2.  **Implementation**: Create a new class in `src/scenes/` implementing the `Scene` interface:
    ```typescript
    import type { Scene } from '../webgpu/types';
    export default class MyScene implements Scene { ... }
    ```
    -   Must implement `init(device, format, canvas)`, `draw(dt)`, and `destroy()`.
3.  **Registration**:
    -   Add metadata to `src/scenes.ts`.
    -   Register the class in `src/views/SceneView.vue` inside `sceneRegistry`.

### 2. Styling
-   **Theme**: Strict usage of CSS variables defined in `:root` (e.g., `--bg-color`, `--accent-color`).
-   **Glassmorphism**: Use `backdrop-filter: blur(...)` and semi-transparent backgrounds for cards and overlays.
-   **Responsiveness**: Ensure layouts work on desktop and mobile.

### 3. WebGPU Patterns
-   Use `device.createBuffer` and `device.createTexture` for resources.
-   Handle window resizing if necessary (currently canvas matches container).
-   Use `requestAnimationFrame` loop in `SceneView` (handled automatically, scenes just implement `draw`).

## Commands
-   **Dev Server**: `npm run dev`
-   **Build**: `npm run build`
-   **Type Check**: `vue-tsc --noEmit`
