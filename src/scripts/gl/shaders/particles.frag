uniform float uOpacity;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
  vec3 color = mix(uColor1, uColor2, gl_PointCoord.x);
  gl_FragColor = vec4(color, uOpacity);
}