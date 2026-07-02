/**
 * @fileoverview Orbit camera. Dragging on the canvas rotates around a fixed
 * target, the mouse wheel (or pinch-zoom trackpad gesture) zooms, and an
 * optional auto-rotate mode spins the view for the idle animation.
 */

import {mat4LookAt} from './math3d.js';

/** Camera that orbits the barbell station. */
export class OrbitCamera {
  /**
   * @param {!HTMLCanvasElement} canvas Canvas to listen on.
   */
  constructor(canvas) {
    /** Horizontal orbit angle in radians. */
    this.theta = 0.55;
    /** Elevation angle in radians, clamped to stay above the floor. */
    this.phi = 0.32;
    /** Distance from the target point. */
    this.radius = 3.4;
    /** Orbit target (roughly bar height at the rack). */
    this.target = [0, 0.85, 0];

    /** @private {boolean} */
    this.dragging_ = false;
    /** @private {number} */
    this.lastX_ = 0;
    /** @private {number} */
    this.lastY_ = 0;

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging_ = true;
      this.lastX_ = e.clientX;
      this.lastY_ = e.clientY;
      if (canvas.hasPointerCapture && e.pointerId !== undefined) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {
          // Synthetic pointer events have no active pointer to capture.
        }
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging_) {
        return;
      }
      this.theta -= (e.clientX - this.lastX_) * 0.005;
      this.phi += (e.clientY - this.lastY_) * 0.005;
      this.phi = Math.min(1.35, Math.max(0.06, this.phi));
      this.lastX_ = e.clientX;
      this.lastY_ = e.clientY;
    });
    canvas.addEventListener('pointerup', () => {
      this.dragging_ = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.radius *= 1 + e.deltaY * 0.001;
      this.radius = Math.min(7.5, Math.max(1.3, this.radius));
    }, {passive: false});
  }

  /**
   * Advances the idle auto-rotation.
   * @param {number} dt Seconds since last frame.
   * @param {boolean} autoRotate Whether auto-rotate is enabled.
   * @param {number} speed Rotation speed multiplier.
   */
  update(dt, autoRotate, speed) {
    if (autoRotate && !this.dragging_) {
      this.theta += dt * 0.3 * speed;
    }
  }

  /**
   * @return {!Array<number>} Camera position in world space.
   */
  getEye() {
    const cp = Math.cos(this.phi);
    return [
      this.target[0] + this.radius * cp * Math.sin(this.theta),
      this.target[1] + this.radius * Math.sin(this.phi),
      this.target[2] + this.radius * cp * Math.cos(this.theta),
    ];
  }

  /**
   * @return {!Float32Array} View matrix for the current orbit position.
   */
  getView() {
    return mat4LookAt(this.getEye(), this.target, [0, 1, 0]);
  }
}
