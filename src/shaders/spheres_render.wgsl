struct Uniforms {
  projectionMatrix : mat4x4<f32>,
  viewMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
  time : f32,
  pad0 : f32,
  pad1 : f32,
  pad2 : f32,
}

struct Particle {
  position : vec4<f32>,
  velocity : vec4<f32>,
  color : vec4<f32>,
  radius : f32,
  pad0 : f32,
  pad1 : f32,
  pad2 : f32,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<storage, read> particles : array<Particle>;

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) color : vec4<f32>,
  @location(2) center : vec3<f32>,
  @location(3) radius : f32,
  @location(4) fragPos : vec3<f32>,
}

@vertex
fn vs_main(
  @builtin(instance_index) instanceIdx : u32,
  @builtin(vertex_index) vertexIdx : u32
) -> VertexOutput {
  var output : VertexOutput;
  let p = particles[instanceIdx];

  var pos = vec2<f32>(0.0, 0.0);
  if (vertexIdx == 0u) { pos = vec2<f32>(-1.0, -1.0); }
  else if (vertexIdx == 1u) { pos = vec2<f32>(1.0, -1.0); }
  else if (vertexIdx == 2u) { pos = vec2<f32>(-1.0, 1.0); }
  else if (vertexIdx == 3u) { pos = vec2<f32>(-1.0, 1.0); }
  else if (vertexIdx == 4u) { pos = vec2<f32>(1.0, -1.0); }
  else if (vertexIdx == 5u) { pos = vec2<f32>(1.0, 1.0); }
  
  output.uv = pos;
  output.color = p.color;
  output.center = p.position.xyz;
  output.radius = p.radius;

  let viewRight = vec3<f32>(uniforms.viewMatrix[0].x, uniforms.viewMatrix[1].x, uniforms.viewMatrix[2].x);
  let viewUp = vec3<f32>(uniforms.viewMatrix[0].y, uniforms.viewMatrix[1].y, uniforms.viewMatrix[2].y);
  
  let worldPos = p.position.xyz 
      + viewRight * pos.x * p.radius 
      + viewUp * pos.y * p.radius;

  output.fragPos = worldPos;
  output.position = uniforms.projectionMatrix * uniforms.viewMatrix * vec4<f32>(worldPos, 1.0);
  
  return output;
}

@fragment
fn fs_main(input : VertexOutput) -> @location(0) vec4<f32> {
  let distSq = dot(input.uv, input.uv);
  if (distSq > 1.0) {
    discard;
  }

  let z = sqrt(1.0 - distSq);
  let localNormal = vec3<f32>(input.uv, z);
  
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let diff = max(dot(localNormal, lightDir), 0.0);
  let ambient = 0.3;
  let viewDir = vec3<f32>(0.0, 0.0, 1.0);
  let reflectDir = reflect(-lightDir, localNormal);
  let spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

  let lighting = ambient + diff + spec * 0.5;

  return vec4<f32>(input.color.rgb * lighting, input.color.a);
}
