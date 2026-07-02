/**
 * @fileoverview The barbell rig: bar geometry, animated plate loading, and
 * all of the plate-math bookkeeping. Plates are always added in symmetric
 * pairs (one per side), so the rig stores a single per-side list and mirrors
 * it across the bar.
 */

import {BAR_TYPES, LAYOUT, LB_PER_KG, hexToRgb} from './config.js';
import {createCylinder, createPlateFaces, createPlateRim} from './geometry.js';
import {mat4Chain, mat4RotationY, mat4RotationZ,
  mat4Translation} from './math3d.js';
import {makePlateFaceCanvas} from './textures.js';

/** Radius of the plate center hole (matches the bar sleeve). */
const HOLE_RADIUS = 0.026;

/** Distance beyond the bar tip where new plates slide in from. */
const SLIDE_IN_DISTANCE = 0.35;

/** Barbell with animated, symmetric plate loading. */
export class BarbellRig {
  /**
   * @param {!Object} renderer Renderer from renderer.js.
   * @param {!Object<string, !WebGLTexture>} textures Shared scene textures
   *     (uses `knurl`, `metal`, and `rubberRim`).
   */
  constructor(renderer, textures) {
    /** @private @const {!Object} */
    this.renderer_ = renderer;
    /** @private @const {!Object<string, !WebGLTexture>} */
    this.textures_ = textures;

    /** Current unit system, 'lb' or 'kg'. */
    this.unit = 'lb';
    /** Current bar spec from BAR_TYPES. */
    this.bar = BAR_TYPES.olympic;
    /** @private {string} */
    this.mode_ = 'rack';
    /**
     * Plates loaded on one side, inner to outer.
     * @private {!Array<{spec: !Object, slide: number, removing: boolean}>}
     */
    this.plates_ = [];
    /** @private {number} */
    this.currentY_ = LAYOUT.rackBarY;

    /** @private @const {!Object<string, !Object>} */
    this.barMeshCache_ = {};
    /** @private @const {!Object<string, !Object>} */
    this.plateCache_ = {};
  }

  /**
   * Lazily builds the shaft/sleeve/collar meshes for a bar type.
   * @param {!Object} bar Bar spec.
   * @return {!Object} Cached mesh set.
   * @private
   */
  getBarMeshes_(bar) {
    if (!this.barMeshCache_[bar.id]) {
      const shaftLen =
          bar.length - 2 * bar.sleeveLength - 2 * LAYOUT.collarWidth;
      this.barMeshCache_[bar.id] = {
        shaftLen,
        shaft: this.renderer_.createMesh(createCylinder(
            bar.shaftRadius, shaftLen, 24, {uRepeat: 2, vRepeat: 16})),
        sleeve: this.renderer_.createMesh(createCylinder(
            bar.sleeveRadius, bar.sleeveLength, 24,
            {uRepeat: 2, vRepeat: 3})),
        collar: this.renderer_.createMesh(createCylinder(
            0.038, LAYOUT.collarWidth, 24)),
      };
    }
    return this.barMeshCache_[bar.id];
  }

  /**
   * Lazily builds meshes and the face texture for one plate spec.
   * @param {!Object} spec Plate spec.
   * @return {!Object} Cached plate resources.
   * @private
   */
  getPlateResources_(spec) {
    const key = `${this.unit}:${spec.value}`;
    if (!this.plateCache_[key]) {
      const canvas = makePlateFaceCanvas(
          spec, this.unit.toUpperCase(), HOLE_RADIUS / spec.radius);
      this.plateCache_[key] = {
        faces: this.renderer_.createMesh(createPlateFaces(
            spec.radius, HOLE_RADIUS, spec.thickness, 48)),
        rim: this.renderer_.createMesh(createPlateRim(
            spec.radius, HOLE_RADIUS, spec.thickness, 48)),
        faceTex: this.renderer_.createTexture(canvas),
      };
    }
    return this.plateCache_[key];
  }

  /**
   * Tries to add one plate to each side of the bar.
   * @param {!Object} spec Plate spec from PLATE_SPECS.
   * @return {boolean} False if the sleeves are full.
   */
  addPlate(spec) {
    const usable = this.bar.sleeveLength - LAYOUT.sleeveReserve;
    const used = this.plates_.filter((p) => !p.removing)
        .reduce((sum, p) => sum + p.spec.thickness, 0);
    if (used + spec.thickness > usable) {
      return false;
    }
    this.plates_.push({spec, slide: 0, removing: false});
    return true;
  }

  /** Starts the slide-out animation for the outermost plate pair. */
  removeLast() {
    for (let i = this.plates_.length - 1; i >= 0; i--) {
      if (!this.plates_[i].removing) {
        this.plates_[i].removing = true;
        return;
      }
    }
  }

  /** Slides every plate off the bar. */
  clearPlates() {
    for (const plate of this.plates_) {
      plate.removing = true;
    }
  }

  /**
   * Switches unit systems. Loaded plates are cleared because lb and kg
   * plates are physically different discs.
   * @param {string} unit 'lb' or 'kg'.
   */
  setUnit(unit) {
    this.unit = unit;
    this.plates_ = [];
  }

  /**
   * Switches bar type, keeping any loaded plates.
   * @param {string} barId Key into BAR_TYPES.
   */
  setBarType(barId) {
    this.bar = BAR_TYPES[barId];
  }

  /**
   * @param {string} mode Scene configuration id.
   */
  setMode(mode) {
    this.mode_ = mode;
  }

  /**
   * @return {!Array<!Object>} Specs of loaded (non-removing) plates, inner
   *     to outer, for one side.
   */
  getLoadedSpecs() {
    return this.plates_.filter((p) => !p.removing).map((p) => p.spec);
  }

  /**
   * Computes the weight readout.
   * @return {{total: number, barWeight: number, perSide: number,
   *     unit: string, totalOther: number, otherUnit: string}}
   */
  getTotalInfo() {
    const barWeight =
        this.unit === 'lb' ? this.bar.weightLb : this.bar.weightKg;
    const perSide = this.getLoadedSpecs()
        .reduce((sum, spec) => sum + spec.value, 0);
    const total = barWeight + 2 * perSide;
    const totalOther =
        this.unit === 'lb' ? total / LB_PER_KG : total * LB_PER_KG;
    return {
      total,
      barWeight,
      perSide,
      unit: this.unit,
      totalOther,
      otherUnit: this.unit === 'lb' ? 'kg' : 'lb',
    };
  }

  /**
   * Advances plate slide animations and the bar height.
   * @param {number} dt Seconds since last frame.
   */
  update(dt) {
    for (const plate of this.plates_) {
      plate.slide += (plate.removing ? -1 : 1) * dt * 2.4;
      plate.slide = Math.min(1, plate.slide);
    }
    this.plates_ = this.plates_.filter((p) => p.slide > 0 || !p.removing);

    const loaded = this.getLoadedSpecs();
    const maxRadius = loaded.length ?
        Math.max(...loaded.map((s) => s.radius)) : this.bar.shaftRadius;
    let targetY = LAYOUT.platformTopY + maxRadius;
    if (this.mode_ === 'rack') {
      targetY = LAYOUT.rackBarY;
    } else if (this.mode_ === 'bench') {
      targetY = LAYOUT.benchBarY;
    }
    this.currentY_ += (targetY - this.currentY_) * Math.min(1, dt * 5);
  }

  /**
   * Builds this frame's drawable instances for the bar and plates.
   * @return {!Array<!Object>} Instance records for the renderer.
   */
  getInstances() {
    const bar = this.bar;
    const meshes = this.getBarMeshes_(bar);
    const y = this.currentY_;
    const rot = mat4RotationZ(-Math.PI / 2);
    // Left-side plates turn 180° about Y so their painted face (and its
    // weight text) reads correctly from outside the bar on both ends.
    const rotLeft = mat4Chain(mat4RotationY(Math.PI), rot);
    const out = [];
    const metal = (mesh, x, color) => ({
      mesh,
      texture: this.textures_.metal,
      color: hexToRgb(color),
      specular: 0.9,
      shininess: 64,
      emissive: 0,
      model: mat4Chain(mat4Translation(x, y, 0), rot),
      castShadow: true,
    });

    const shaft = metal(meshes.shaft, 0, '#d8dbe0');
    shaft.texture = this.textures_.knurl;
    shaft.specular = 0.7;
    shaft.shininess = 48;
    out.push(shaft);

    const collarX = meshes.shaftLen / 2 + LAYOUT.collarWidth / 2;
    const sleeveX = bar.length / 2 - bar.sleeveLength / 2;
    for (const side of [-1, 1]) {
      out.push(metal(meshes.collar, side * collarX, '#c2c6cd'));
      out.push(metal(meshes.sleeve, side * sleeveX, '#d8dbe0'));
    }

    const innerX = meshes.shaftLen / 2 + LAYOUT.collarWidth;
    let stack = 0;
    for (const plate of this.plates_) {
      const spec = plate.spec;
      const res = this.getPlateResources_(spec);
      const seatX = innerX + stack + spec.thickness / 2;
      if (!plate.removing) {
        stack += spec.thickness;
      }
      const eased = 1 - Math.pow(1 - Math.max(0, plate.slide), 3);
      const startX = bar.length / 2 + SLIDE_IN_DISTANCE;
      const x = startX + (seatX - startX) * eased;
      for (const side of [-1, 1]) {
        const model = mat4Chain(mat4Translation(side * x, y, 0),
            side < 0 ? rotLeft : rot);
        out.push({
          mesh: res.faces,
          texture: res.faceTex,
          color: [1, 1, 1],
          specular: 0.25,
          shininess: 14,
          emissive: 0,
          model,
          castShadow: true,
        });
        out.push({
          mesh: res.rim,
          texture: this.textures_.rubberRim,
          color: hexToRgb(spec.color),
          specular: 0.25,
          shininess: 14,
          emissive: 0,
          model,
          castShadow: true,
        });
      }
    }
    return out;
  }
}
