/**
 * @fileoverview Procedural texture painters. Each function draws onto an
 * offscreen 2D canvas and returns it; the renderer uploads the canvas as a
 * WebGL texture. Keeping textures procedural means the app needs no image
 * downloads and every texture stays perfectly power-of-two.
 */

import {RED, STEEL, STEEL_LIGHT} from './constants.js';

/**
 * Creates a square canvas with a 2D context.
 * @param {number} size Width and height in pixels.
 * @return {{canvas: !HTMLCanvasElement, ctx: !CanvasRenderingContext2D}}
 */
function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return {canvas, ctx: canvas.getContext('2d')};
}

/**
 * Sprinkles random rectangles over a canvas for a noisy material look.
 * @param {!CanvasRenderingContext2D} ctx Target context.
 * @param {number} size Canvas size.
 * @param {number} count Speck count.
 * @param {!Array<string>} colors Fill styles to choose from.
 * @param {number} maxDim Max speck size in pixels.
 */
function speckle(ctx, size, count, colors, maxDim) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.fillRect(Math.random() * size, Math.random() * size,
        1 + Math.random() * maxDim, 1 + Math.random() * maxDim);
  }
}

/**
 * Rubber gym-floor tile: dark base with colored specks and mat seams.
 * @return {!HTMLCanvasElement} Tileable floor texture.
 */
export function makeFloorCanvas() {
  const {canvas, ctx} = makeCanvas(512);
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 2600, ['rgba(255,255,255,0.10)', 'rgba(120,150,220,0.12)',
    'rgba(220,120,120,0.10)', 'rgba(0,0,0,0.22)'], 2.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 510, 510);
  return canvas;
}

/**
 * Wooden platform: horizontal planks with grain streaks.
 * @return {!HTMLCanvasElement} Wood texture.
 */
export function makeWoodCanvas() {
  const {canvas, ctx} = makeCanvas(512);
  const planks = 8;
  for (let p = 0; p < planks; p++) {
    const shade = 158 + ((p * 37) % 5) * 9 - 18;
    ctx.fillStyle = `rgb(${shade}, ${(shade * 0.66) | 0}, ${(shade * 0.4) |
        0})`;
    ctx.fillRect(0, p * 64, 512, 64);
    for (let g = 0; g < 34; g++) {
      ctx.strokeStyle = `rgba(70, 40, 20, ${0.05 + Math.random() * 0.08})`;
      ctx.lineWidth = 1;
      const y = p * 64 + Math.random() * 64;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + Math.random() * 6 - 3, 340,
          y + Math.random() * 6 - 3, 512, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40, 22, 10, 0.55)';
    ctx.fillRect(0, p * 64, 512, 2);
  }
  return canvas;
}

/**
 * Brushed steel: light base with fine horizontal streaks.
 * @return {!HTMLCanvasElement} Metal texture.
 */
export function makeMetalCanvas() {
  const {canvas, ctx} = makeCanvas(256);
  ctx.fillStyle = STEEL;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const bright = Math.random() > 0.5;
    ctx.fillStyle = bright ? 'rgba(255,255,255,0.10)' : 'rgba(60,64,72,0.10)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256,
        30 + Math.random() * 90, 1);
  }
  return canvas;
}

/**
 * Bar knurling: crosshatched diagonal grooves over steel.
 * @return {!HTMLCanvasElement} Knurl texture.
 */
export function makeKnurlCanvas() {
  const {canvas, ctx} = makeCanvas(256);
  ctx.fillStyle = STEEL_LIGHT;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(50, 54, 62, 0.28)';
  ctx.lineWidth = 1.6;
  for (let d = -256; d < 512; d += 7) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(d + 256, 0);
    ctx.lineTo(d, 256);
    ctx.stroke();
  }
  return canvas;
}

/**
 * Bench upholstery: maroon vinyl with noise and a center seam.
 * @return {!HTMLCanvasElement} Upholstery texture.
 */
export function makeUpholsteryCanvas() {
  const {canvas, ctx} = makeCanvas(512);
  ctx.fillStyle = '#6e2430';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 2400, ['rgba(255,220,220,0.05)', 'rgba(20,0,0,0.10)'], 3);
  ctx.strokeStyle = 'rgba(30, 8, 12, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(240, 210, 200, 0.35)';
  ctx.lineWidth = 2;
  for (const x of [244, 268]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  return canvas;
}

/**
 * Concrete back wall with panel grooves.
 * @return {!HTMLCanvasElement} Concrete texture.
 */
export function makeConcreteCanvas() {
  const {canvas, ctx} = makeCanvas(512);
  ctx.fillStyle = '#8d9196';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 3200, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'], 4);
  ctx.strokeStyle = 'rgba(40, 42, 48, 0.35)';
  ctx.lineWidth = 4;
  for (const p of [170, 340]) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }
  return canvas;
}

/**
 * Grayscale grooved rubber for plate rims; the renderer tints it with the
 * plate color so one texture serves every plate size.
 * @return {!HTMLCanvasElement} Rim texture.
 */
export function makeRubberRimCanvas() {
  const {canvas, ctx} = makeCanvas(256);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(x, 0, 3, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + 3, 0, 2, 256);
  }
  speckle(ctx, 256, 500, ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.06)'], 2);
  return canvas;
}

/**
 * Painted face of one weight plate: colored rubber, steel hub, and the
 * weight value stamped twice like a real bumper plate.
 * @param {{color: string, textColor: string, label: string, radius: number}}
 *     spec Plate spec from config.
 * @param {string} unitLabel 'LB' or 'KG'.
 * @param {number} holeRatio Center-hole radius / plate radius.
 * @return {!HTMLCanvasElement} Plate face texture.
 */
export function makePlateFaceCanvas(spec, unitLabel, holeRatio) {
  const {canvas, ctx} = makeCanvas(512);
  const c = 256;
  ctx.fillStyle = spec.color;
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 1500, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.07)'], 3);

  // Raised ring detail near the edge.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(c, c, 226, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(c, c, 160, 0, Math.PI * 2);
  ctx.stroke();

  // Steel hub around the center hole.
  const hub = Math.max(holeRatio * 256 * 2.6, 46);
  const grad = ctx.createRadialGradient(c - 8, c - 8, 4, c, c, hub);
  grad.addColorStop(0, '#eef0f4');
  grad.addColorStop(0.7, '#aab0ba');
  grad.addColorStop(1, '#7c828c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, hub, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17181c';
  ctx.beginPath();
  ctx.arc(c, c, holeRatio * 256, 0, Math.PI * 2);
  ctx.fill();

  // Weight value stamped at the top and bottom of the disc.
  ctx.fillStyle = spec.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const flip of [0, Math.PI]) {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(flip + Math.PI / 2);
    ctx.font = '700 84px Arial, sans-serif';
    ctx.fillText(spec.label, 0, -186);
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillText(unitLabel, 0, -128);
    ctx.restore();
  }
  return canvas;
}

/**
 * LED scoreboard canvas; redrawn whenever the total weight changes.
 * @return {!HTMLCanvasElement} Sign canvas (1024x256).
 */
export function makeSignCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  return canvas;
}

/**
 * Redraws the scoreboard with the current totals.
 * @param {!HTMLCanvasElement} canvas Sign canvas from makeSignCanvas().
 * @param {string} mainText Big line, e.g. 'TOTAL 135 LB'.
 * @param {string} subText Small line, e.g. '61.2 KG  •  BAR 45 + 90'.
 */
export function drawSign(canvas, mainText, subText) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c0e12';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#2a2f3a';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd54a';
  ctx.font = '700 110px "Courier New", monospace';
  ctx.fillText(mainText, 512, 100);
  ctx.fillStyle = '#7fd4ff';
  ctx.font = '700 46px "Courier New", monospace';
  ctx.fillText(subText, 512, 198);
}

/**
 * Wall clock face frozen at a classic 10:10.
 * @return {!HTMLCanvasElement} Clock texture.
 */
export function makeClockCanvas() {
  const {canvas, ctx} = makeCanvas(256);
  ctx.fillStyle = '#23262c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#f2f3f5';
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2e34';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.strokeStyle = '#2b2e34';
    ctx.lineWidth = i % 3 === 0 ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96);
    ctx.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
    ctx.stroke();
  }
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-Math.PI * 0.83) * 58,
      128 + Math.sin(-Math.PI * 0.83) * 58);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-Math.PI * 0.17) * 82,
      128 + Math.sin(-Math.PI * 0.17) * 82);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(128, 128, 7, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}
