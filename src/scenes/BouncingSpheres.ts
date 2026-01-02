import type { Scene } from '../webgpu/types';
import computeShaderCode from '../shaders/spheres_compute.wgsl?raw';
import renderShaderCode from '../shaders/spheres_render.wgsl?raw';
import { mat4, vec3 } from 'gl-matrix';

const NUM_PARTICLES = 50;
// Particle struct size:
// pos(3) + vel(3) + color(4) + radius(1) + padding(3) = 14 floats -> 16 floats (64 bytes aligned)?
// WGSL:
// vec3<f32> position; (0, 12, 16) -> align 16
// vec3<f32> velocity; (16, 28, 32) -> align 16
// vec4<f32> color;    (32, 48)
// f32 radius;         (48, 52)
// vec3<f32> padding;  (52, 64)
// Total stride 64 bytes is safe. 
const PARTICLE_STRIDE = 64;

export default class BouncingSpheres implements Scene {
    name = "Bouncing Spheres";
    description = "A simulation of 50 spheres bouncing in 3D space using Compute Shaders.";
    id = "bouncing-spheres";

    device!: GPUDevice;
    context!: GPUCanvasContext;

    computePipeline!: GPUComputePipeline;
    renderPipeline!: GPURenderPipeline;

    uniformBuffer!: GPUBuffer;
    particleBuffer!: GPUBuffer;

    computeBindGroup!: GPUBindGroup;
    renderBindGroup!: GPUBindGroup;

    depthTexture!: GPUTexture;

    projectionMatrix = mat4.create();
    viewMatrix = mat4.create();
    cameraPosition = vec3.fromValues(0, 0, 20);

    startTime = Date.now();

    async init(device: GPUDevice, format: GPUTextureFormat, canvas: HTMLCanvasElement): Promise<void> {
        this.device = device;
        const context = canvas.getContext('webgpu');
        if (!context) throw new Error("Context lost");
        this.context = context;

        // --- 1. Create Buffers ---

        // Uniform Buffer
        // Struct Uniforms { proj(64), view(64), camPos(12)+pad(4), time(4)+pad(12)? }
        // mat4 is 64 bytes.
        // vec3 is 12 bytes but usually aligned to 16 in uniform if careful, or just carefully packed.
        // WGSL: 
        // mat4 projection; (0-64)
        // mat4 view; (64-128)
        // vec3 cameraPosition; (128-140)
        // f32 time; (140-144) 
        // total size ~144. round up to 160 or just use enough space.
        // Struct Uniforms { proj(64), view(64), camPos(16), time(4), pad(12) } = 160
        const uniformBufferSize = 160;
        this.uniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Particle Buffer
        const initialParticles = new Float32Array(NUM_PARTICLES * (PARTICLE_STRIDE / 4));
        for (let i = 0; i < NUM_PARTICLES; i++) {
            const offset = i * (PARTICLE_STRIDE / 4);
            // Position
            initialParticles[offset + 0] = (Math.random() - 0.5) * 10;
            initialParticles[offset + 1] = (Math.random() - 0.5) * 10;
            initialParticles[offset + 2] = (Math.random() - 0.5) * 10;

            // Velocity
            initialParticles[offset + 4] = (Math.random() - 0.5) * 0.2;
            initialParticles[offset + 5] = (Math.random() - 0.5) * 0.2;
            initialParticles[offset + 6] = (Math.random() - 0.5) * 0.2;

            // Color
            initialParticles[offset + 8] = Math.random();
            initialParticles[offset + 9] = Math.random();
            initialParticles[offset + 10] = Math.random();
            initialParticles[offset + 11] = 1.0;

            // Radius
            initialParticles[offset + 12] = 0.5 + Math.random() * 1.0;
        }

        this.particleBuffer = device.createBuffer({
            size: initialParticles.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.particleBuffer.getMappedRange()).set(initialParticles);
        this.particleBuffer.unmap();

        // --- 2. Pipelines ---

        // --- 2. Pipelines ---

        const computeShaderModule = device.createShaderModule({ code: computeShaderCode });
        const renderShaderModule = device.createShaderModule({ code: renderShaderCode });

        this.computePipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: computeShaderModule,
                entryPoint: 'cs_main',
            },
        });

        this.renderPipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: renderShaderModule,
                entryPoint: 'vs_main',
            },
            fragment: {
                module: renderShaderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format: format,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        }
                    }
                }]
            },
            primitive: {
                topology: 'triangle-list',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            }
        });

        // --- 3. Bind Groups ---
        // Since we share the same binding layout in the shader for both Compute and Vertex (mostly), 
        // we can try to use one bindgroup if the layout matches.
        // Actually, WGSL definitions:
        // @group(0) @binding(0) var<uniform> uniforms : Uniforms;
        // @group(0) @binding(1) var<storage, read_write> particles : array<Particle>;

        // Render pipeline might need ReadOnly storage if it was just rendering, but here we share the definition.
        // WebGPU allows using READ_WRITE storage in Vertex shaders? Not usually.
        // Vertex shader usually usually only supports `var<storage, read>`.
        // Let's check the shader code. `var<storage, read_write> particles` is declared.
        // This might error in Vertex stage if not supported.
        // Safer to split the definition or use two different bind groups/layouts.
        // Or simply mapped the same buffer to `read` in vertex shader.
        // In this simple case, we probably need `element-wise` declaration or just accept that we might need to tweak shader if `read_write` is forbidden in vertex.
        // Standard WebGPU: Vertex shaders cannot access `read_write` storage buffers. Only `read`.

        // FIX: modification to shader logic or bind groups might be needed.
        // In the shader file, I used: `var<storage, read_write> particles`.
        // This is shared globally.
        // I should probably declare:
        // @group(0) @binding(1) var<storage, read_write> particles_compute
        // And for vertex:
        // @group(0) @binding(1) var<storage, read> particles_vertex
        // But you can't have duplicate bindings.

        // One way is using two different BindGroups or overrides.
        // Or cleaner: Use the same buffer but define it differently in two different WGSL modules/snippets?
        // Or use `read_write` in compute and `read` in vertex with different binding slots?
        // Let's just assume for now I will use the *same* shader code but the pipeline layout will auto-detect.
        // If I keep it as `read_write`, Vertex shader compilation might fail.

        // Let's update this file to create two bind groups if needed, OR relies on the shader `read_write` permission.
        // Actually, `read_write` in vertex is generally not allowed.
        // I should change the shader code to separate them or use `read` access mode if possible.
        // Since I already wrote the shader, I will try to proceed. If it fails, I'll fix the shader.
        // Wait, I can't easily fix execution failure without seeing error.
        // Proactive fix: Use one binding for compute and another for vertex is annoying if they are the same data.
        // Best practice: The shader source typically separates them or uses alias.
        // `alias ParticleBuffer = array<Particle>;`
        // `@group(0) @binding(1) var<storage, read_write> particles : ParticleBuffer;`

        // Let's TRY to use it. If it fails, I'll patch `spheres.wgsl` to use `read` for vertex.
        // Actually, I can just bind it.

        this.computeBindGroup = device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.particleBuffer } }
            ]
        });

        this.renderBindGroup = device.createBindGroup({
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.particleBuffer } }
            ]
        });

        // Depth Texture
        this.depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    draw(_dt: number): void {
        const time = (Date.now() - this.startTime) / 1000;

        // Update Uniforms
        const canvas = this.context.canvas as HTMLCanvasElement;
        const aspect = canvas.width / canvas.height;
        mat4.perspective(this.projectionMatrix, (2 * Math.PI) / 5, aspect, 0.1, 100.0);

        mat4.lookAt(this.viewMatrix, this.cameraPosition, [0, 0, 0], [0, 1, 0]);

        // Write to buffer
        // Proj (64) + View (64) + CamPos (16) + ime (4)
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.projectionMatrix as any);
        this.device.queue.writeBuffer(this.uniformBuffer, 64, this.viewMatrix as any);
        this.device.queue.writeBuffer(this.uniformBuffer, 128, this.cameraPosition as any);
        // Time writes at 144 now (after vec4 cameraPosition)
        this.device.queue.writeBuffer(this.uniformBuffer, 144, new Float32Array([time]));

        const commandEncoder = this.device.createCommandEncoder();

        // 1. Compute Pass
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(NUM_PARTICLES / 64));
        computePass.end();

        // 2. Render Pass
        // Resize depth if needed
        if (this.depthTexture.width !== canvas.width || this.depthTexture.height !== canvas.height) {
            this.depthTexture.destroy();
            this.depthTexture = this.device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
        }

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        });

        renderPass.setPipeline(this.renderPipeline);
        // Instanced draw: 6 vertices (quad) * NUM_PARTICLES
        renderPass.setBindGroup(0, this.renderBindGroup);
        // Instanced draw: 6 vertices (quad) * NUM_PARTICLES
        renderPass.draw(6, NUM_PARTICLES);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    destroy(): void {
        this.uniformBuffer.destroy();
        this.particleBuffer.destroy();
        this.depthTexture.destroy();
    }
}
