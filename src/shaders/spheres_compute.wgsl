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
@group(0) @binding(1) var<storage, read_write> particles : array<Particle>;

fn rand(co: vec2<f32>) -> f32 {
    return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&particles)) {
    return;
  }

  var p = particles[index];
  
  // Update position
  p.position = vec4<f32>(p.position.xyz + p.velocity.xyz * 0.016, 1.0);

  let bounds = 20.0;
  
  if (abs(p.position.x) > bounds || abs(p.position.y) > bounds || abs(p.position.z) > bounds) {
       let seed = uniforms.time + f32(index);
       p.position = vec4<f32>(
           (rand(vec2<f32>(seed, 1.0)) - 0.5) * 10.0,
           (rand(vec2<f32>(seed, 2.0)) - 0.5) * 10.0,
           (rand(vec2<f32>(seed, 3.0)) - 0.5) * 10.0,
           1.0
       );
       p.velocity = vec4<f32>(
           (rand(vec2<f32>(seed, 4.0)) - 0.5) * 5.0,
           (rand(vec2<f32>(seed, 5.0)) - 0.5) * 5.0,
           (rand(vec2<f32>(seed, 6.0)) - 0.5) * 5.0,
           0.0
       );
  }

  // Collision
  let num_particles = arrayLength(&particles);
  for (var i = 0u; i < num_particles; i++) {
    if (i == index) { continue; }
    var other = particles[i];
    let distVec = p.position.xyz - other.position.xyz;
    let dist = length(distVec);
    let minDist = p.radius + other.radius;

    if (dist < minDist) {
        let normal = normalize(distVec);
        let relativeVelocity = p.velocity.xyz - other.velocity.xyz;
        let velAlongNormal = dot(relativeVelocity, normal);

        if (velAlongNormal < 0.0) {
            let j = -(1.0 + 0.9) * velAlongNormal;
            let impulse = j * normal * 0.5;
            p.velocity = vec4<f32>(p.velocity.xyz + impulse, 0.0);
        }
        
        let push = (minDist - dist) * 0.5;
        p.position = vec4<f32>(p.position.xyz + normal * push, 1.0);
    }
  }

  particles[index] = p;
}
