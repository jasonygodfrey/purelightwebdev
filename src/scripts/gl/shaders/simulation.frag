uniform sampler2D positions; // Data Texture containing original positions
uniform float uTime;
uniform float uSpeed;
uniform float uCurlFreq;

varying vec2 vUv;

#define PI 3.1415926538

#pragma glslify: curl = require(glsl-curl-noise)
#pragma glslify: noise = require(glsl-noise/classic/3d)

mat4 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
    0.0,                                0.0,                                0.0,                                1.0
  );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  return (rotation3d(axis, angle) * vec4(v, 1.0)).xyz;
}

void main() {
  float t = uTime * 0.15 * uSpeed;

  vec2 uv = vUv;

  vec3 pos = texture2D(positions, uv).rgb; // basic simulation: displays the particles in place.
  vec3 curlPos = texture2D(positions, uv).rgb;
  vec3 finalPos = vec3(0.0);

  // Oscillate the curl frequency 3x slower
  float oscillatingCurlFreq = uCurlFreq * (1.0 + 0.5 * sin(uTime / 9.0));

  // Move the particles here
  pos = curl(pos * oscillatingCurlFreq + t);

  // Apply a triangular movement pattern
  float angle = mod(t, PI * 2.0) * 3.0; // Adjust the multiplier to control the speed and direction
  vec3 axis = vec3(0.0, 1.0, 0.0); // Rotate around the Y-axis
  pos = rotate(pos, axis, angle);

  curlPos = curl(curlPos * oscillatingCurlFreq + t);
  curlPos += curl(curlPos * oscillatingCurlFreq * 2.0) * 0.5;
  curlPos += curl(curlPos * oscillatingCurlFreq * 4.0) * 0.25;
  curlPos += curl(curlPos * oscillatingCurlFreq * 8.0) * 0.125;
  curlPos += curl(pos * oscillatingCurlFreq * 16.0) * 0.0625;

  finalPos = mix(pos, curlPos, noise(pos + t));
  
  gl_FragColor = vec4(finalPos, 1.0);
}