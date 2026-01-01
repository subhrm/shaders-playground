import type { Scene } from '../webgpu/types';
import shaderCode from '../shaders/gradient.wgsl?raw';

export default class GradientPattern implements Scene {
    name = "Gradient Pattern";
    description = "A dynamic gradient driven by time.";
    id = "gradient-pattern";

    device!: GPUDevice;
    context!: GPUCanvasContext;
    pipeline!: GPURenderPipeline;
    uniformBuffer!: GPUBuffer;
    bindGroup!: GPUBindGroup;

    time: number = 0;

    async init(device: GPUDevice, format: GPUTextureFormat, canvas: HTMLCanvasElement): Promise<void> {
        this.device = device;
        const context = canvas.getContext('webgpu');
        if (!context) throw new Error("Context lost");
        this.context = context;

        const shaderModule = device.createShaderModule({
            label: 'Gradient Shader',
            code: shaderCode
        });

        // Uniforms: time (f32) + resolution (vec2<f32>) + padding (f32) = 16 bytes aligned
        // Struct alignment rules: vec2 is 8-byte aligned.
        // struct { time: f32, resolution: vec2<f32> }
        // offset 0: time (4 bytes)
        // offset 4: padding (4 bytes) because vec2 needs 8-byte alignment?
        // offset 8: resolution (8 bytes)
        // Total size: 16 bytes.

        const uniformBufferSize = 16;
        this.uniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {}
            }]
        });

        this.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.uniformBuffer }
            }]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        this.pipeline = device.createRenderPipeline({
            label: 'Gradient Pipeline',
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

    draw(dt: number): void {
        this.time += dt;

        // Update uniforms
        const canvas = this.context.canvas as HTMLCanvasElement;
        const uniformData = new Float32Array([
            this.time,           // time
            0,                   // padding
            canvas.width,        // resolution.x
            canvas.height        // resolution.y
        ]);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.draw(6); // Draw full screen quad (2 triangles)
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    destroy(): void {
        // clean up
    }
}
