/**
 * @fileoverview Central configuration for the Plate Math scene. Bar and plate
 * specifications, scene layout constants, light rig values, and material
 * colors all live here so the other modules stay free of magic numbers.
 * Lengths are in meters; weights are in the unit named by the field.
 */

/** Pounds per kilogram, used for the secondary weight readout. */
export const LB_PER_KG = 2.2046226;

/**
 * Barbell specifications. Weights follow gym convention (an Olympic bar is
 * sold as 45 lb or 20 kg, a women's bar as 33 lb or 15 kg) and the physical
 * dimensions approximate real IWF bars.
 * @const {!Object<string, {id: string, label: string, weightLb: number,
 *     weightKg: number, length: number, shaftRadius: number,
 *     sleeveRadius: number, sleeveLength: number}>}
 */
export const BAR_TYPES = {
  olympic: {
    id: 'olympic',
    label: 'Olympic bar',
    weightLb: 45,
    weightKg: 20,
    length: 2.2,
    shaftRadius: 0.014,
    sleeveRadius: 0.025,
    sleeveLength: 0.415,
  },
  womens: {
    id: 'womens',
    label: 'Women’s Olympic bar',
    weightLb: 33,
    weightKg: 15,
    length: 2.01,
    shaftRadius: 0.0125,
    sleeveRadius: 0.025,
    sleeveLength: 0.32,
  },
};

/**
 * Plate specifications per unit system. `value` is the weight of one plate,
 * `radius`/`thickness` size the 3D disc, and colors follow common bumper
 * plate conventions (IWF colors for kilograms).
 * @const {!Object<string, !Array<{value: number, label: string,
 *     color: string, textColor: string, radius: number, thickness: number}>>}
 */
export const PLATE_SPECS = {
  lb: [
    {value: 55, label: '55', color: '#c8332f', textColor: '#f4f6fa',
      radius: 0.225, thickness: 0.064},
    {value: 45, label: '45', color: '#2b62c4', textColor: '#f4f6fa',
      radius: 0.225, thickness: 0.056},
    {value: 35, label: '35', color: '#e0b52a', textColor: '#2a2a2e',
      radius: 0.200, thickness: 0.050},
    {value: 25, label: '25', color: '#2f9e57', textColor: '#f4f6fa',
      radius: 0.175, thickness: 0.044},
    {value: 10, label: '10', color: '#212125', textColor: '#f4f6fa',
      radius: 0.140, thickness: 0.030},
    {value: 5, label: '5', color: '#2d2d32', textColor: '#f4f6fa',
      radius: 0.115, thickness: 0.026},
    {value: 2.5, label: '2.5', color: '#212125', textColor: '#f4f6fa',
      radius: 0.090, thickness: 0.020},
  ],
  kg: [
    {value: 25, label: '25', color: '#c8332f', textColor: '#f4f6fa',
      radius: 0.225, thickness: 0.064},
    {value: 20, label: '20', color: '#2b62c4', textColor: '#f4f6fa',
      radius: 0.225, thickness: 0.054},
    {value: 15, label: '15', color: '#e0b52a', textColor: '#2a2a2e',
      radius: 0.225, thickness: 0.044},
    {value: 10, label: '10', color: '#2f9e57', textColor: '#f4f6fa',
      radius: 0.225, thickness: 0.034},
    {value: 5, label: '5', color: '#e4e4e8', textColor: '#2a2a2e',
      radius: 0.114, thickness: 0.026},
    {value: 2.5, label: '2.5', color: '#c8332f', textColor: '#f4f6fa',
      radius: 0.095, thickness: 0.022},
    {value: 1.25, label: '1.25', color: '#b8bcc2', textColor: '#2a2a2e',
      radius: 0.080, thickness: 0.018},
  ],
};

/**
 * The three scene configurations selectable in the UI.
 * @const {!Array<{id: string, label: string}>}
 */
export const CONFIG_MODES = [
  {id: 'floor', label: 'Floor (deadlift)'},
  {id: 'rack', label: 'Squat rack'},
  {id: 'bench', label: 'Bench press'},
];

/**
 * Scene layout constants shared by the scene builder and the barbell rig.
 * @const {!Object<string, number>}
 */
export const LAYOUT = {
  // Resting height for plates in the floor configuration.
  platformTopY: 0.048,
  // Bar-center height on the squat rack J-hooks (~60% of the uprights).
  rackBarY: 1.30,
  // Bar-center height on the bench uprights.
  benchBarY: 0.94,
  // Half-distance between squat rack uprights.
  rackUprightX: 0.60,
  // Half-distance between bench uprights.
  benchUprightX: 0.55,
  // Width of the fixed collar flange on the bar.
  collarWidth: 0.03,
  // Radius of the collar flange; an unloaded bar rests on these.
  collarRadius: 0.038,
  // Sleeve length kept free for a bar clamp.
  sleeveReserve: 0.04,
  // Back wall position.
  wallZ: -2.6,
};

/**
 * Light rig: a cool key light that casts shadows plus a warm fill point
 * light, both toggleable from the UI.
 * @const {!Object<string, !Array<number>>}
 */
export const LIGHTS = {
  keyPos: [3.0, 4.5, 3.5],
  keyTarget: [0, 0.9, 0],
  keyColor: [1.0, 0.98, 0.92],
  fillPos: [-2.4, 1.8, 2.0],
  fillColor: [1.3, 0.85, 0.55],
};

/**
 * Converts a `#rrggbb` hex string to normalized [r, g, b] floats.
 * @param {string} hex Color such as '#2b62c4'.
 * @return {!Array<number>} Components in the 0..1 range.
 */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
