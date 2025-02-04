
import * as THREE from 'three';

export default class FBO {
  constructor(width, height, renderer, simulationMaterial, renderMaterial) {
    this.width = width;
    this.height = height; 
    this.renderer = renderer;
    this.simulationMaterial = simulationMaterial;
    this.renderMaterial = renderMaterial;

    this.gl = this.renderer.getContext();

    this.init();
  }

  init() {
    this.checkHardware();
    this.createTarget();
    this.simSetup();
    this.createParticles();
  }

  checkHardware() {
    // Check if  float textures is supported
    if(!this.gl.getExtension('OES_texture_float')) {
      throw new Error('float textures not supported');
    }

    // Check if reading textures inside the vertex shader is supported
    if(this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0) {
      throw new Error('vertex shader cannot read textures');
    }    
  }    

  createTarget() {
    // Render target's scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1);

    // Create a render target texture
    this.rtt = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBFormat,
      type: THREE.FloatType
    });

    // Check framebuffer completeness
    const gl = this.renderer.getContext();
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      switch (status) {
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
          console.error('Framebuffer incomplete: FRAMEBUFFER_INCOMPLETE_ATTACHMENT');
          break;
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
          console.error('Framebuffer incomplete: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
          break;
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
          console.error('Framebuffer incomplete: FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
          break;
        case gl.FRAMEBUFFER_UNSUPPORTED:
          console.error('Framebuffer incomplete: FRAMEBUFFER_UNSUPPORTED');
          break;
        default:
          console.error('Framebuffer incomplete: ' + status);
      }
    }
  }

  simSetup() {
    // Simulation
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([
        -1, -1, 0,
         1, -1, 0,
         1,  1, 0,

        -1, -1, 0,
         1,  1, 0,
        -1,  1, 0
      ]),
      3
    ));

    geometry.setAttribute('uv', new THREE.BufferAttribute(
      new Float32Array([
        0,1,
        1,1,
        1,0,

        0,1,
        1,0,
        0,0
      ]),
      2
    ));

    this.mesh = new THREE.Mesh(geometry, this.simulationMaterial);
    
    this.scene.add(this.mesh);        
  }

  createParticles() {
    const length = this.width * this.height; 
    let vertices = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      let i3 = i * 3;
      vertices[i3 + 0] = (i % this.width) / this.width;
      vertices[i3 + 1] = (i / this.width) / this.height;
    }    
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));  
    
    this.particles = new THREE.Points(geometry, this.renderMaterial);    
  }

  update(time) {
    this.renderer.setRenderTarget(this.rtt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    
    this.particles.material.uniforms.positions.value = this.rtt.texture;    

    this.simulationMaterial.uniforms.uTime.value = time;
  }
}
