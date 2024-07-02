import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { Events } from '../events';

import store from '../store';

import FBO from './FBO';

import simVertex from './shaders/simulation.vert';
import simFragment from './shaders/simulation.frag';
import particlesVertex from './shaders/particles.vert';
import particlesFragment from './shaders/particles.frag';
import fullScreenVertex from './shaders/fullscreen.vert';
import fullScreenFragment from './shaders/fullscreen.frag';

import { getRandomSpherePoint } from '../utils';

import GUI from '../gui';

export default new class {
  constructor() {
    this.renderer = new THREE.WebGL1Renderer({ 
      antialias: true, 
      alpha: true, 
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(store.bounds.ww, store.bounds.wh);
    this.renderer.setClearColor(0x07070c, 1); // Set background color to #07070c

    this.camera = new THREE.PerspectiveCamera(
      45,
      store.bounds.ww / store.bounds.wh,
       0.1,
      1000
    );
    this.camera.position.set(0, 0, 2.5);

    this.scene = new THREE.Scene();

    this.canvas = null;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 2.5;
    this.controls.zoomSpeed = 0.5;

    this.clock = new THREE.Clock();
    this.time = null;

    this.init();
  }

  init() {
    this.addCanvas();
    this.addEvents();
    this.setGui();
    this.createFBO();
    this.createScreenQuad();
    this.hideGui(); // Hide the GUI
  }

  addCanvas() {
    this.canvas = this.renderer.domElement;
    this.canvas.classList.add('webgl');
    document.body.appendChild(this.canvas);
  }

  addEvents() {
    Events.on('tick', this.render.bind(this));
    Events.on('resize', this.resize.bind(this));
  }

  hideGui() {
    const guiElement = document.querySelector('.dg.ac');
    if (guiElement) {
      guiElement.style.display = 'none';
    }
  }

  setGui() {
    this.tweaks = {
      pointSize: 1.2,
      speed: 0.3,
      curlFreq: 0.25,
      opacity: 0.35,
      color1: [1.0, 1.0, 0.0], // Yellow
      color2: [0.0, 0.0, 1.0], // Blue
    };

    GUI.add(this.tweaks, 'pointSize', 1, 3, 0.1)
       .name('particle size')
       .onChange(() => this.renderMaterial.uniforms.uPointSize.value = this.tweaks.pointSize);

    GUI.add(this.tweaks, 'speed', 0.0, 1, 0.001)
       .onChange(() => this.simMaterial.uniforms.uSpeed.value = this.tweaks.speed);

    GUI.add(this.tweaks, 'curlFreq', 0, 0.6, 0.01)
       .name('noise frequency')
       .onChange(() => this.simMaterial.uniforms.uCurlFreq.value = this.tweaks.curlFreq);

    GUI.add(this.tweaks, 'opacity', 0.1, 1.0, 0.01)
       .onChange(() => this.renderMaterial.uniforms.uOpacity.value = this.tweaks.opacity);

    GUI.addColor(this.tweaks, 'color1')
       .name('color 1')
       .onChange(() => this.renderMaterial.uniforms.uColor1.value.setRGB(
         this.tweaks.color1[0], this.tweaks.color1[1], this.tweaks.color1[2]
       ));

    GUI.addColor(this.tweaks, 'color2')
       .name('color 2')
       .onChange(() => this.renderMaterial.uniforms.uColor2.value.setRGB(
         this.tweaks.color2[0], this.tweaks.color2[1], this.tweaks.color2[2]
       ));
  }

  createFBO() {
    const width = 512;
    const height = 512;
    let length = width * height * 3;
    let data = new Float32Array(length);
    for (let i = 0; i < length; i += 3) {
      const point = getRandomSpherePoint();
      data[i + 0] = point.x;
      data[i + 1] = point.y;
      data[i + 2] = point.z;
    }

    const positions = new THREE.DataTexture(data, width, height, THREE.RGBFormat, THREE.FloatType);
    positions.needsUpdate = true;

    this.simMaterial = new THREE.ShaderMaterial({
      vertexShader: simVertex,
      fragmentShader: simFragment,
      uniforms: {
        positions: { value: positions },
        uTime: { value: 0 },
        uSpeed: { value: this.tweaks.speed },
        uCurlFreq: { value: this.tweaks.curlFreq },
      },
    });

    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: particlesVertex,
      fragmentShader: particlesFragment,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uPointSize: { value: this.tweaks.pointSize },
        uOpacity: { value: this.tweaks.opacity },
        uColor1: { value: new THREE.Color(...this.tweaks.color1) },
        uColor2: { value: new THREE.Color(...this.tweaks.color2) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.fbo = new FBO(width, height, this.renderer, this.simMaterial, this.renderMaterial);
    this.scene.add(this.fbo.particles);

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

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      console.log('Vendor:', vendor);
      console.log('Renderer:', renderer);
    }

    const ext = gl.getExtension('OES_texture_float');
    if (!ext) {
      console.error('OES_texture_float extension not supported');
    }
  }

  createScreenQuad() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: fullScreenVertex,
      fragmentShader: fullScreenFragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(store.bounds.ww, store.bounds.wh) },
      },
      depthTest: false,
      blending: THREE.AdditiveBlending      
    });

    this.fullScreenQuad = new THREE.Mesh(geometry, material);
    this.scene.add(this.fullScreenQuad);
  }

  resize() {
    let width = store.bounds.ww;
    let height = store.bounds.wh;

    this.camera.aspect = width / height;
    this.renderer.setSize(width, height);

    this.camera.updateProjectionMatrix();

    this.fullScreenQuad.material.uniforms.uResolution.value.x = store.bounds.ww;
    this.fullScreenQuad.material.uniforms.uResolution.value.y = store.bounds.wh;
  }

  render() {
    this.controls.update();

    this.time = this.clock.getElapsedTime();

    this.fbo.update(this.time);

    // Update the uTime uniform for the render material
    this.renderMaterial.uniforms.uTime.value = this.time;

    this.fullScreenQuad.material.uniforms.uTime.value = this.time;

    this.renderer.render(this.scene, this.camera);
  }
}