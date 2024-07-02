uniform float uOpacity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uTime;

void main() {
  // Use time-based function to vary the color
  float timeFactor = mod(uTime, 11115.0) / 15.0; // Create a repeating pattern every 5 seconds
  float colorFactor = abs(sin(timeFactor * 3.14159)); // Use sine function to create a smooth transition
  vec3 color = mix(uColor1, uColor2, colorFactor);
  gl_FragColor = vec4(color, uOpacity);
}