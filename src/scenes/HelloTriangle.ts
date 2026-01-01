import type { Scene } from '../webgpu/types';
import shaderCode from '../shaders/triangle.wgsl?raw';

export default class HelloTriangle implements Scene {
    name = "Hello Triangle";
    description = "A basic hello world for WebGPU.";
    id = "hello-triangle";

    device!: GPUDevice;
    context!: GPUCanvasContext;
    pipeline!: GPURenderPipeline;
    format!: GPUTextureFormat;

    async init(device: GPUDevice, format: GPUTextureFormat, canvas: HTMLCanvasElement): Promise<void> {
        this.device = device;
        this.format = format;

        // Get context if not passed, but SceneView actually configures it.
        // Wait, SceneView configures context but doesn't pass it to init directly?
        // Ah, I need to get the context from the canvas again or just rely on the view logic.
        // The interface says init(device, format, canvas).
        // I can get context from canvas.
        const context = canvas.getContext('webgpu');
        if (!context) throw new Error("Context lost");
        this.context = context;

        const shaderModule = device.createShaderModule({
            label: 'Hello Triangle Shader',
            code: shaderCode
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: []
        });

        this.pipeline = device.createRenderPipeline({
            label: 'Hello Triangle Pipeline',
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format: format
                }]
            },
            primitive: {
                topology: 'triangle-list'
            }
        });
    }

    draw(_dt: number): void {
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // Dark grey background
                loadOp: 'clear',
                storeOp: 'store'
            }]
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.draw(3); // Draw 3 vertices
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    destroy(): void {
        // Cleanup resources if handy, WebGPU objects are mostly GC'd but good practice if using manual buffers
    }
}
