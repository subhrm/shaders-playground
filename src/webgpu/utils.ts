export async function getWebGPUDevice(): Promise<GPUDevice> {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported on this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No appropriate GridAdapter found.");
  }

  const device = await adapter.requestDevice();
  return device;
}

export function configureContext(
  device: GPUDevice,
  canvas: HTMLCanvasElement
): GPUCanvasContext {
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Could not get WebGPU context from canvas.");
  }

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  return context;
}
