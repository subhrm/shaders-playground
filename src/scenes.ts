export interface SceneMetadata {
    id: string;
    name: string;
    description: string;
}

export const scenes: SceneMetadata[] = [
    {
        id: 'hello-triangle',
        name: 'Hello Triangle',
        description: 'A simple colored triangle to verify the WebGPU pipeline.',
    },
    {
        id: 'gradient-pattern',
        name: 'Gradient Pattern',
        description: 'Dynamic gradient generation using fragment shaders and time.',
    },
    {
        id: 'rotating-cube',
        name: 'Rotating Cube',
        description: 'A 3D cube with perspective projection and matrix transformations.',
    },
    {
        id: 'bouncing-spheres',
        name: 'Bouncing Spheres',
        description: '3D Simulation of moving spheres with collision detection using Compute Shaders.',
    },
];
