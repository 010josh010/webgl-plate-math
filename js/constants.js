/**
 * @fileoverview Shared literal constants for the Plate Math scene. Any hex
 * color or material value used in more than one place lives here so the plate
 * specs, procedural textures, and scene hardware stay in sync. Colors that
 * appear at exactly one call site are left inline there.
 *
 * Colors are `#rrggbb` strings; convert with hexToRgb() from config.js when a
 * normalized [r, g, b] triple is needed.
 */

/**
 * Calibrated plate colors, shared by the pound and kilogram plate specs. The
 * accent red is also reused for the wall clock's center pin.
 */
export const RED = '#c8332f';
export const BLUE = '#2b62c4';
export const YELLOW = '#e0b52a';
export const GREEN = '#2f9e57';
/** Black rubber used for the small pound plates. */
export const PLATE_BLACK = '#212125';

/** Weight number text stamped on plate faces. */
export const TEXT_LIGHT = '#f4f6fa'; // reads on dark-colored plates
export const TEXT_DARK = '#2a2a2e'; // reads on light-colored plates

/** Steel finishes for the bar, rack, and bench hardware. */
export const STEEL = '#b9bec6'; // brushed-steel base
export const STEEL_LIGHT = '#c9ccd2'; // polished (knurl, pull-up bar)
export const STEEL_DARK = '#3a3d44'; // painted uprights and J-hooks
export const STEEL_FOOT = '#2c2e34'; // darker cast feet
export const BAR_STEEL = '#d8dbe0'; // bar shaft and sleeves

/** Neutral tint that leaves a texture's own colors unchanged. */
export const UNTINTED = '#ffffff';

/**
 * Reused surface material presets: specular strength and shininess exponent.
 * @const {!Object<string, {specular: number, shininess: number}>}
 */
export const MATERIAL = {
  // Chromed bar and pull up bar: bright, tight highlight.
  polishedSteel: {specular: 0.9, shininess: 64},
  // Painted rack/bench hardware: softer highlight.
  hardware: {specular: 0.5, shininess: 24},
};
