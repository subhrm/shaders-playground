struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord.xy / uniforms.resolution;
  let t = uniforms.time;

  // Simple plasma-like gradient
  let color1 = vec3<f32>(
      0.5 + 0.5 * cos(t + uv.x),
      0.5 + 0.5 * sin(t + uv.y),
      0.5 + 0.5 * sin(t + uv.x + uv.y)
  );
  
  // Mix with a second wave
  let color2 = vec3<f32>(
      0.5 + 0.5 * sin(t * 0.5 + uv.y * 3.0),
      0.2,
      0.5 + 0.5 * cos(t * 0.3 + uv.x * 2.0)
  );

  let finalColor = mix(color1, color2, 0.5);

  return vec4<f32>(finalColor, 1.0);
}
