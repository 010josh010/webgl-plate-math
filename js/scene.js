/**
 * @fileoverview Scene builder. Creates the gym environment (floor, lifting
 * platform, wall, LED scoreboard, clock) plus the squat rack and bench
 * groups, which rise out of the platform when their configuration is
 * selected. The barbell itself lives in barbell.js.
 */

import {LAYOUT, hexToRgb} from './config.js';
import {createBox, createCylinder, createPlane} from './geometry.js';
import {mat4Chain, mat4Multiply, mat4RotationX, mat4RotationZ,
  mat4Translation} from './math3d.js';
import {drawSign, makeClockCanvas, makeConcreteCanvas, makeFloorCanvas,
  makeKnurlCanvas, makeMetalCanvas, makeRubberRimCanvas, makeSignCanvas,
  makeUpholsteryCanvas, makeWoodCanvas} from './textures.js';

/** Platform top surface height, from config. */
const TOP = 0.04;

/** Gym scene with animated equipment groups. */
export class Scene {
  /**
   * @param {!Object} renderer Renderer from renderer.js.
   */
  constructor(renderer) {
    /** @private @const {!Object} */
    this.renderer_ = renderer;

    /**
     * Textures shared with the barbell rig.
     * @const {!Object<string, !WebGLTexture>}
     */
    this.tex = {
      floor: renderer.createTexture(makeFloorCanvas(), {repeat: true}),
      wood: renderer.createTexture(makeWoodCanvas(), {repeat: true}),
      metal: renderer.createTexture(makeMetalCanvas(), {repeat: true}),
      knurl: renderer.createTexture(makeKnurlCanvas(), {repeat: true}),
      upholstery: renderer.createTexture(makeUpholsteryCanvas()),
      concrete: renderer.createTexture(makeConcreteCanvas(), {repeat: true}),
      rubberRim: renderer.createTexture(makeRubberRimCanvas(), {repeat: true}),
      clock: renderer.createTexture(makeClockCanvas()),
    };

    /** @private @const {!HTMLCanvasElement} */
    this.signCanvas_ = makeSignCanvas();
    drawSign(this.signCanvas_, 'TOTAL 45 LB', 'BAR ONLY');
    this.tex.sign = renderer.createTexture(this.signCanvas_);

    /** @private @const {!Array<!Object>} */
    this.statics_ = this.buildEnvironment_();
    /** @private @const {!Object} */
    this.rack_ = this.buildRack_();
    /** @private @const {!Object} */
    this.bench_ = this.buildBench_();
    this.rack_.rise = this.rack_.target = 1;
    this.applyRise_(this.rack_);
  }

  /**
   * Creates one drawable instance record.
   * @param {!Object} mesh Mesh handle.
   * @param {?WebGLTexture} texture Texture or null for flat color.
   * @param {string} colorHex Material tint.
   * @param {!Float32Array} model Model matrix.
   * @param {{specular: (number|undefined), shininess: (number|undefined),
   *     emissive: (number|undefined), castShadow: (boolean|undefined)}=} opts
   *     Material options.
   * @return {!Object} Instance record for the renderer.
   * @private
   */
  make_(mesh, texture, colorHex, model, opts = {}) {
    return {
      mesh,
      texture,
      color: hexToRgb(colorHex),
      specular: opts.specular ?? 0.25,
      shininess: opts.shininess ?? 16,
      emissive: opts.emissive ?? 0,
      model,
      base: model,
      castShadow: opts.castShadow ?? true,
    };
  }

  /**
   * Builds the always-visible environment objects.
   * @return {!Array<!Object>} Static instances.
   * @private
   */
  buildEnvironment_() {
    const r = this.renderer_;
    const t = this.tex;
    const list = [];

    const floorMesh = r.createMesh(createPlane(14, 14, 7, 7));
    list.push(this.make_(floorMesh, t.floor, '#ffffff',
        mat4Translation(0, 0, 0), {specular: 0.05, shininess: 8}));

    const platformMesh = r.createMesh(createBox(3.0, TOP, 2.4));
    list.push(this.make_(platformMesh, t.wood, '#ffffff',
        mat4Translation(0, TOP / 2, 0), {specular: 0.15, shininess: 12}));

    const stripMesh = r.createMesh(createBox(0.75, 0.008, 2.4));
    for (const side of [-1, 1]) {
      list.push(this.make_(stripMesh, t.floor, '#8a8f99',
          mat4Translation(side * 0.85, TOP + 0.004, 0),
          {specular: 0.05, shininess: 8}));
    }

    const wallMesh = r.createMesh(createPlane(14, 5, 4, 1.5));
    list.push(this.make_(wallMesh, t.concrete, '#ffffff',
        mat4Chain(mat4Translation(0, 2.5, LAYOUT.wallZ),
            mat4RotationX(Math.PI / 2)),
        {specular: 0.02, shininess: 4, castShadow: false}));

    const signMesh = r.createMesh(createPlane(1.8, 0.45));
    list.push(this.make_(signMesh, t.sign, '#ffffff',
        mat4Chain(mat4Translation(0, 2.1, LAYOUT.wallZ + 0.03),
            mat4RotationX(Math.PI / 2)),
        {specular: 0, shininess: 4, emissive: 1.0, castShadow: false}));

    const clockMesh = r.createMesh(createCylinder(0.24, 0.05, 32));
    list.push(this.make_(clockMesh, t.clock, '#ffffff',
        mat4Chain(mat4Translation(-2.4, 2.2, LAYOUT.wallZ + 0.05),
            mat4RotationX(Math.PI / 2)),
        {specular: 0.3, shininess: 24, castShadow: false}));

    return list;
  }

  /**
   * Builds the minimal squat rack: two uprights on feet, J-hook cups with
   * safety lips, and a pull-up bar across the top.
   * @return {!Object} Rack group.
   * @private
   */
  buildRack_() {
    const r = this.renderer_;
    const t = this.tex;
    const list = [];
    const upright = r.createMesh(createBox(0.09, 2.10, 0.09));
    const foot = r.createMesh(createBox(0.14, 0.05, 0.90));
    const cup = r.createMesh(createBox(0.08, 0.06, 0.22));
    const lip = r.createMesh(createBox(0.08, 0.10, 0.025));
    const dark = {specular: 0.5, shininess: 24};
    for (const s of [-1, 1]) {
      const x = s * LAYOUT.rackUprightX;
      list.push(this.make_(upright, t.metal, '#3a3d44',
          mat4Translation(x, TOP + 1.05, -0.10), dark));
      list.push(this.make_(foot, t.metal, '#2c2e34',
          mat4Translation(x, TOP + 0.025, -0.10), dark));
      list.push(this.make_(cup, t.metal, '#3a3d44',
          mat4Translation(x, LAYOUT.rackBarY - 0.044, -0.02), dark));
      list.push(this.make_(lip, t.metal, '#3a3d44',
          mat4Translation(x, LAYOUT.rackBarY - 0.024, 0.0775), dark));
    }
    const pullup = r.createMesh(createCylinder(0.02, 1.32, 20));
    list.push(this.make_(pullup, t.metal, '#c9ccd2',
        mat4Chain(mat4Translation(0, TOP + 2.01, -0.10),
            mat4RotationZ(-Math.PI / 2)),
        {specular: 0.9, shininess: 64}));
    return {list, rise: 0, target: 0, drop: 2.4};
  }

  /**
   * Builds the flat bench with uprights that hold the bar for bench presses.
   * @return {!Object} Bench group.
   * @private
   */
  buildBench_() {
    const r = this.renderer_;
    const t = this.tex;
    const list = [];
    const dark = {specular: 0.5, shininess: 24};

    const pad = r.createMesh(createBox(0.32, 0.07, 1.15));
    list.push(this.make_(pad, t.upholstery, '#ffffff',
        mat4Translation(0, 0.415, 0.495), {specular: 0.35, shininess: 14}));
    const rail = r.createMesh(createBox(0.10, 0.05, 0.95));
    list.push(this.make_(rail, t.metal, '#b9bec6',
        mat4Translation(0, 0.355, 0.495), dark));
    const column = r.createMesh(createBox(0.08, 0.29, 0.08));
    const benchFoot = r.createMesh(createBox(0.42, 0.05, 0.10));
    for (const z of [0.10, 0.89]) {
      list.push(this.make_(column, t.metal, '#b9bec6',
          mat4Translation(0, 0.235, z), dark));
      list.push(this.make_(benchFoot, t.metal, '#2c2e34',
          mat4Translation(0, TOP + 0.025, z), dark));
    }

    const upright = r.createMesh(createBox(0.08, 0.93, 0.08));
    const cup = r.createMesh(createBox(0.07, 0.05, 0.24));
    const lip = r.createMesh(createBox(0.07, 0.09, 0.025));
    const upFoot = r.createMesh(createBox(0.30, 0.05, 0.55));
    for (const s of [-1, 1]) {
      const x = s * LAYOUT.benchUprightX;
      list.push(this.make_(upright, t.metal, '#b9bec6',
          mat4Translation(x, TOP + 0.465, -0.15), dark));
      list.push(this.make_(cup, t.metal, '#3a3d44',
          mat4Translation(x, LAYOUT.benchBarY - 0.039, -0.05), dark));
      list.push(this.make_(lip, t.metal, '#3a3d44',
          mat4Translation(x, LAYOUT.benchBarY - 0.005, 0.0575), dark));
      list.push(this.make_(upFoot, t.metal, '#2c2e34',
          mat4Translation(x, TOP + 0.025, -0.15), dark));
    }
    const brace = r.createMesh(createBox(1.10, 0.06, 0.08));
    list.push(this.make_(brace, t.metal, '#b9bec6',
        mat4Translation(0, TOP + 0.075, -0.15), dark));
    return {list, rise: 0, target: 0, drop: 1.5};
  }

  /**
   * Selects which equipment group is present for the given configuration.
   * @param {string} mode One of 'floor', 'rack', 'bench'.
   */
  setMode(mode) {
    this.rack_.target = mode === 'rack' ? 1 : 0;
    this.bench_.target = mode === 'bench' ? 1 : 0;
  }

  /**
   * Redraws the LED scoreboard texture with new totals.
   * @param {string} mainText Big total line.
   * @param {string} subText Secondary breakdown line.
   */
  updateSign(mainText, subText) {
    drawSign(this.signCanvas_, mainText, subText);
    this.renderer_.updateTexture(this.tex.sign, this.signCanvas_);
  }

  /**
   * Advances the rise/sink animation of the equipment groups.
   * @param {number} dt Seconds since last frame.
   */
  update(dt) {
    for (const group of [this.rack_, this.bench_]) {
      const before = group.rise;
      if (group.rise < group.target) {
        group.rise = Math.min(group.target, group.rise + dt * 2.6);
      } else if (group.rise > group.target) {
        group.rise = Math.max(group.target, group.rise - dt * 2.6);
      }
      if (group.rise !== before) {
        this.applyRise_(group);
      }
    }
  }

  /**
   * Applies the vertical rise offset to every instance in a group.
   * @param {!Object} group Rack or bench group.
   * @private
   */
  applyRise_(group) {
    const eased = 1 - Math.pow(1 - group.rise, 3);
    const offset = mat4Translation(0, -(1 - eased) * group.drop, 0);
    for (const inst of group.list) {
      inst.model = mat4Multiply(offset, inst.base);
    }
  }

  /**
   * @return {!Array<!Object>} All currently visible scene instances.
   */
  getInstances() {
    const out = [...this.statics_];
    for (const group of [this.rack_, this.bench_]) {
      if (group.rise > 0.001) {
        out.push(...group.list);
      }
    }
    return out;
  }
}
