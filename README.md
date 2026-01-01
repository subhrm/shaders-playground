# WebGPU Shaders Playground

A modern web application built with **Vue 3**, **TypeScript**, and **Vite** to demonstrate the power of **WebGPU** and **WGSL** (WebGPU Shading Language).

This project features a premium, glassmorphism-styled UI and a collection of interactive shader scenes.

## 🌟 Features

- **WebGPU Powered**: Utilizes the modern WebGPU API for high-performance graphics.
- **WGSL Shaders**: Custom vertex and fragment shaders written in WGSL.
- **Premium UI**: Dark mode visuals with glassmorphism effects.
- **Modular Scenes**: Extensible architecture to easily add new scenes.
- **TypeScript**: Fully typed for better developer experience.

## 🎨 Scenes Implemented

1.  **Hello Triangle**: A classic graphics "hello world" rendering a simple colored triangle.
2.  **Gradient Pattern**: A dynamic, time-based plasma gradient using fragment shaders.
3.  **Rotating Cube**: A 3D rendered cube featuring perspective projection, matrix transformations, and depth buffering.

## 🛠️ Technologies

-   [Vue 3](https://vuejs.org/)
-   [Vite](https://vitejs.dev/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [WebGPU](https://www.w3.org/TR/webgpu/)
-   [gl-matrix](https://glmatrix.net/) (for 3D math)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v16+)
-   A browser with WebGPU support (Chrome 113+, Edge 113+, Firefox Nightly).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/subhendu/shaders-playground.git
    cd shaders-playground
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## 📦 Building for Production

To build the project for production:

```bash
npm run build
```

This will create a `dist` folder ready for deployment.
