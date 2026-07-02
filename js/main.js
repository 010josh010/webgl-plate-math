/**
 * @fileoverview Application entry point. Creates the renderer, camera,
 * scene, and barbell rig, wires the UI, and runs the animation loop.
 */

import {BarbellRig} from './barbell.js';
import {OrbitCamera} from './camera.js';
import {Renderer} from './renderer.js';
import {Scene} from './scene.js';
import {initUi} from './ui.js';

/**
 * Shared mutable state driven by the UI widgets and read every frame.
 * @const {!Object}
 */
const state = {
  keyLight: true,
  fillLight: true,
  shadows: true,
  texturesOn: true,
  ambient: 0.35,
  autoRotate: false,
  rotateSpeed: 1.0,
};

/** Boots the application. */
function start() {
  const canvas = document.getElementById('glCanvas');
  let renderer;
  try {
    renderer = new Renderer(canvas);
  } catch (err) {
    document.getElementById('fallback').textContent =
        'Unable to start: ' + err.message;
    return;
  }

  const camera = new OrbitCamera(canvas);
  const scene = new Scene(renderer);
  const rig = new BarbellRig(renderer, scene.tex);
  rig.setMode('rack');

  initUi(state, rig, {
    onModeChange: (mode) => {
      scene.setMode(mode);
      rig.setMode(mode);
    },
    onWeightChange: (mainText, subText) => {
      scene.updateSign(mainText, subText);
    },
  });

  let last = performance.now();
  /**
   * Renders one animation frame.
   * @param {number} now Timestamp from requestAnimationFrame.
   */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    camera.update(dt, state.autoRotate, state.rotateSpeed);
    scene.update(dt);
    rig.update(dt);
    renderer.render(
        [...scene.getInstances(), ...rig.getInstances()],
        camera.getEye(), camera.getView(), state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
