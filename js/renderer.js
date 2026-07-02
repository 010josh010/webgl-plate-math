/**
 * @fileoverview WebGL2 renderer. Owns the GL context, shader programs, mesh
 * and texture uploads, and the shadow-map framebuffer object. Each frame it
 * runs a depth-only pass into the framebuffer, then the main lit pass that
 * samples the resulting shadow map.
 */

import {LIGHTS} from './config.js';
import {mat4LookAt, mat4Multiply, mat4Ortho, mat4Perspective, vec3Normalize,
  vec3Sub} from './math3d.js';
import {MAIN_FS, MAIN_VS, SHADOW_FS, SHADOW_VS} from './shaders.js';

/** Shadow map resolution in texels. */
const SHADOW_SIZE = 2048;

/** Uniform names looked up for the main program. */
const MAIN_UNIFORMS = [
  'uProj', 'uView', 'uModel', 'uLightViewProj', 'uTexture', 'uShadowMap',
  'uColor', 'uUseTexture', 'uSpecular', 'uShininess', 'uEmissive', 'uAmbient',
  'uKeyOn', 'uKeyDir', 'uKeyColor', 'uFillOn', 'uFillPos', 'uFillColor',
  'uShadowsOn', 'uEyePos',
];

/**
 * A drawable scene entry.
 * @typedef {{mesh: {vao: !WebGLVertexArrayObject, count: number},
 *     texture: ?WebGLTexture, color: !Array<number>, specular: number,
 *     shininess: number, emissive: number, model: !Float32Array,
 *     castShadow: boolean}}
 */
export let Instance;

/** WebGL2 renderer for the plate-math scene. */
export class Renderer {
  /**
   * @param {!HTMLCanvasElement} canvas Target canvas.
   */
  constructor(canvas) {
    /** @private @const {!HTMLCanvasElement} */
    this.canvas_ = canvas;
    const gl = canvas.getContext('webgl2', {antialias: true});
    if (!gl) {
      throw new Error('WebGL2 is not supported by this browser.');
    }
    /** @const {!WebGL2RenderingContext} */
    this.gl = gl;

    /** @private @const {!WebGLProgram} */
    this.mainProgram_ = this.buildProgram_(MAIN_VS, MAIN_FS);
    /** @private @const {!WebGLProgram} */
    this.shadowProgram_ = this.buildProgram_(SHADOW_VS, SHADOW_FS);
    /** @private @const {!Object<string, ?WebGLUniformLocation>} */
    this.mainLoc_ = {};
    for (const name of MAIN_UNIFORMS) {
      this.mainLoc_[name] = gl.getUniformLocation(this.mainProgram_, name);
    }
    /** @private @const {?WebGLUniformLocation} */
    this.shadowModelLoc_ =
        gl.getUniformLocation(this.shadowProgram_, 'uModel');
    /** @private @const {?WebGLUniformLocation} */
    this.shadowVpLoc_ =
        gl.getUniformLocation(this.shadowProgram_, 'uLightViewProj');

    this.initShadowFbo_();

    /**
     * Light view-projection used by both passes.
     * @private @const {!Float32Array}
     */
    this.lightViewProj_ = mat4Multiply(
        mat4Ortho(-2.4, 2.4, -2.4, 2.4, 0.5, 14),
        mat4LookAt(LIGHTS.keyPos, LIGHTS.keyTarget, [0, 1, 0]));
    /** @private @const {!Array<number>} */
    this.keyDir_ = vec3Normalize(vec3Sub(LIGHTS.keyTarget, LIGHTS.keyPos));

    /** @private {?EXTTextureFilterAnisotropic} */
    this.anisoExt_ = gl.getExtension('EXT_texture_filter_anisotropic');

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.075, 0.08, 0.10, 1.0);
  }

  /**
   * Compiles and links a shader program.
   * @param {string} vsSource Vertex shader source.
   * @param {string} fsSource Fragment shader source.
   * @return {!WebGLProgram} Linked program.
   * @private
   */
  buildProgram_(vsSource, fsSource) {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source.trim());
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile failed: ' +
            gl.getShaderInfoLog(shader));
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
    }
    return program;
  }

  /**
   * Creates the depth texture and framebuffer object for the shadow pass.
   * @private
   */
  initShadowFbo_() {
    const gl = this.gl;
    /** @private @const {!WebGLTexture} */
    this.shadowTexture_ = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture_);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_SIZE,
        SHADOW_SIZE, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /** @private @const {!WebGLFramebuffer} */
    this.shadowFbo_ = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo_);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D, this.shadowTexture_, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !==
        gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Shadow framebuffer is incomplete.');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Uploads geometry into a vertex array object.
   * @param {!Object} geom Geometry record from geometry.js.
   * @return {{vao: !WebGLVertexArrayObject, count: number}} Mesh handle.
   */
  createMesh(geom) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attribs = [
      {data: geom.positions, size: 3, loc: 0},
      {data: geom.normals, size: 3, loc: 1},
      {data: geom.uvs, size: 2, loc: 2},
    ];
    for (const a of attribs) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, a.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a.loc);
      gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, 0, 0);
    }
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return {vao, count: geom.indices.length};
  }

  /**
   * Uploads a canvas as a mipmapped texture.
   * @param {!HTMLCanvasElement} canvas Source canvas.
   * @param {{repeat: (boolean|undefined)}=} opts Set repeat for tiling.
   * @return {!WebGLTexture} Texture handle.
   */
  createTexture(canvas, opts = {}) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (this.anisoExt_) {
      gl.texParameterf(gl.TEXTURE_2D,
          this.anisoExt_.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }
    return texture;
  }

  /**
   * Re-uploads a canvas into an existing texture (used by the scoreboard).
   * @param {!WebGLTexture} texture Texture to update.
   * @param {!HTMLCanvasElement} canvas New contents.
   */
  updateTexture(texture, canvas) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  /**
   * Resizes the drawing buffer to match CSS size and device pixel ratio.
   * @private
   */
  resize_() {
    const canvas = this.canvas_;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /**
   * Renders one frame: shadow pass into the FBO, then the main pass.
   * @param {!Array<!Instance>} instances Drawables for this frame.
   * @param {!Array<number>} eye Camera world position.
   * @param {!Float32Array} view Camera view matrix.
   * @param {{keyLight: boolean, fillLight: boolean, shadows: boolean,
   *     ambient: number, texturesOn: boolean}} state UI lighting state.
   */
  render(instances, eye, view, state) {
    const gl = this.gl;
    this.resize_();

    // Pass 1: depth into the shadow framebuffer.
    if (state.shadows && state.keyLight) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo_);
      gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.shadowProgram_);
      gl.uniformMatrix4fv(this.shadowVpLoc_, false, this.lightViewProj_);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(2, 4);
      for (const inst of instances) {
        if (!inst.castShadow) {
          continue;
        }
        gl.uniformMatrix4fv(this.shadowModelLoc_, false, inst.model);
        gl.bindVertexArray(inst.mesh.vao);
        gl.drawElements(gl.TRIANGLES, inst.mesh.count, gl.UNSIGNED_SHORT, 0);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Pass 2: lit scene to the default framebuffer.
    gl.viewport(0, 0, this.canvas_.width, this.canvas_.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.mainProgram_);
    const loc = this.mainLoc_;
    const aspect = this.canvas_.width / Math.max(1, this.canvas_.height);
    gl.uniformMatrix4fv(loc['uProj'], false,
        mat4Perspective(Math.PI / 4, aspect, 0.05, 40));
    gl.uniformMatrix4fv(loc['uView'], false, view);
    gl.uniformMatrix4fv(loc['uLightViewProj'], false, this.lightViewProj_);
    gl.uniform3fv(loc['uEyePos'], eye);
    gl.uniform1f(loc['uAmbient'], state.ambient);
    gl.uniform1i(loc['uKeyOn'], state.keyLight ? 1 : 0);
    gl.uniform3fv(loc['uKeyDir'], this.keyDir_);
    gl.uniform3fv(loc['uKeyColor'], LIGHTS.keyColor);
    gl.uniform1i(loc['uFillOn'], state.fillLight ? 1 : 0);
    gl.uniform3fv(loc['uFillPos'], LIGHTS.fillPos);
    gl.uniform3fv(loc['uFillColor'], LIGHTS.fillColor);
    gl.uniform1i(loc['uShadowsOn'], state.shadows && state.keyLight ? 1 : 0);
    gl.uniform1i(loc['uTexture'], 0);
    gl.uniform1i(loc['uShadowMap'], 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture_);

    for (const inst of instances) {
      gl.uniformMatrix4fv(loc['uModel'], false, inst.model);
      gl.uniform3fv(loc['uColor'], inst.color);
      gl.uniform1f(loc['uSpecular'], inst.specular);
      gl.uniform1f(loc['uShininess'], inst.shininess);
      gl.uniform1f(loc['uEmissive'], inst.emissive);
      const useTexture = state.texturesOn && inst.texture;
      gl.uniform1i(loc['uUseTexture'], useTexture ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, useTexture ? inst.texture : null);
      gl.bindVertexArray(inst.mesh.vao);
      gl.drawElements(gl.TRIANGLES, inst.mesh.count, gl.UNSIGNED_SHORT, 0);
    }
    gl.bindVertexArray(null);
  }
}
