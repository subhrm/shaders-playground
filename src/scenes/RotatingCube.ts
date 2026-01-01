import type { Scene } from '../webgpu/types';
import shaderCode from '../shaders/cube.wgsl?raw';
import { mat4 } from 'gl-matrix';

// Cube data
// position (x, y, z), color (r, g, b, a)
const cubeVertexData = new Float32Array([
    // Front face
    -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 1.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 1.0, // Repeat for triangle list? Index buffer is better but let's keep it simple
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,

    // Back face
    -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 1.0,
    -1.0, 1.0, -1.0, 1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, -1.0, 0.0, 0.0, 1.0, 1.0,
    -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 1.0,
    1.0, 1.0, -1.0, 0.0, 0.0, 1.0, 1.0,
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 1.0,

    // Top face
    -1.0, 1.0, -1.0, 1.0, 1.0, 0.0, 1.0,
    -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    -1.0, 1.0, -1.0, 1.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    1.0, 1.0, -1.0, 0.0, 0.0, 1.0, 1.0,

    // Bottom face
    -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 1.0,
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1.0,
    -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 1.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1.0,
    -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 1.0,

    // Right face
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
    1.0, 1.0, -1.0, 0.0, 0.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1.0,

    // Left face
    -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 1.0,
    -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 1.0,
    -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,
    -1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 1.0,
    -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,
    -1.0, 1.0, -1.0, 1.0, 1.0, 0.0, 1.0,
]);

export default class RotatingCube implements Scene {
    name = "Rotating Cube";
    description = "A 3D rotating cube.";
    id = "rotating-cube";

    device!: GPUDevice;
    context!: GPUCanvasContext;
    pipeline!: GPURenderPipeline;
    uniformBuffer!: GPUBuffer;
    vertexBuffer!: GPUBuffer;
    bindGroup!: GPUBindGroup;
    depthTexture!: GPUTexture;

    projectionMatrix = mat4.create();
    modelViewMatrix = mat4.create();
    mvpMatrix = mat4.create();

    rotation = 0;

    async init(device: GPUDevice, format: GPUTextureFormat, canvas: HTMLCanvasElement): Promise<void> {
        this.device = device;
        const context = canvas.getContext('webgpu');
        if (!context) throw new Error("Context lost");
        this.context = context;

        // Create buffers
        this.vertexBuffer = device.createBuffer({
            size: cubeVertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(cubeVertexData);
        this.vertexBuffer.unmap();

        this.uniformBuffer = device.createBuffer({
            size: 64, // mat4x4<f32> = 16 floats * 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Depth texture
        this.depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        // Pipeline
        const shaderModule = device.createShaderModule({
            code: shaderCode
        });

        this.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 28, // 3 pos + 4 color = 7 floats * 4 bytes
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
                        { shaderLocation: 1, offset: 12, format: 'float32x4' } // color
                    ]
                }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: { buffer: this.uniformBuffer }
            }]
        });
    }

    draw(dt: number): void {
        this.rotation += dt;

        // Update matrices
        const canvas = this.context.canvas as HTMLCanvasElement;
        const aspect = canvas.width / canvas.height;

        mat4.perspective(this.projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

        mat4.identity(this.modelViewMatrix);
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, -5]);
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.rotation, [1, 1, 0]); // axis (1,1,0)

        mat4.multiply(this.mvpMatrix, this.projectionMatrix, this.modelViewMatrix);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array(this.mvpMatrix));

        // Draw
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        // Resize depth texture if needed (simple check)
        if (this.depthTexture.width !== canvas.width || this.depthTexture.height !== canvas.height) {
            this.depthTexture.destroy();
            this.depthTexture = this.device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
        }
        const depthView = this.depthTexture.createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.05, g: 0.05, b: 0.05, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: depthView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.draw(36);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    destroy(): void {
        this.vertexBuffer.destroy();
        this.uniformBuffer.destroy();
        this.depthTexture.destroy();
    }
}
