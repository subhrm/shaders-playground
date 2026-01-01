export interface Scene {
    name: string;
    description: string;
    id: string; // Identifier for routing
    init(device: GPUDevice, format: GPUTextureFormat, canvas: HTMLCanvasElement): Promise<void>;
    draw(dt: number): void;
    destroy(): void;
}
