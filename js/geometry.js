/**
 * @fileoverview Procedural geometry builders. Every function returns a plain
 * object of typed arrays ({positions, normals, uvs, indices}) that the
 * renderer uploads into a vertex array object. Cylindrical shapes are built
 * with their axis along +Y; callers orient them with a model matrix.
 */

/**
 * @typedef {{positions: !Float32Array, normals: !Float32Array,
 *     uvs: !Float32Array, indices: !Uint16Array}}
 */
export let Geometry;

/**
 * Builds an axis-aligned box centered at the origin.
 * @param {number} w Size along x.
 * @param {number} h Size along y.
 * @param {number} d Size along z.
 * @return {!Geometry} Box geometry.
 */
export function createBox(w, h, d) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  // Each face: four corners (CCW seen from outside) and its outward normal.
  const faces = [
    {n: [0, 0, 1], c: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]},
    {n: [0, 0, -1], c: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]},
    {n: [1, 0, 0], c: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]},
    {n: [-1, 0, 0], c: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]},
    {n: [0, 1, 0], c: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]},
    {n: [0, -1, 0], c: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]},
  ];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  faces.forEach((face, f) => {
    const base = f * 4;
    face.c.forEach((corner, i) => {
      positions.push(...corner);
      normals.push(...face.n);
      uvs.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return toGeometry(positions, normals, uvs, indices);
}

/**
 * Builds a capped cylinder with its axis along +Y, centered at the origin.
 * @param {number} radius Cylinder radius.
 * @param {number} height Cylinder height.
 * @param {number} segments Radial segment count.
 * @param {{caps: (boolean|undefined), uRepeat: (number|undefined),
 *     vRepeat: (number|undefined)}=} opts Texture tiling and cap options.
 * @return {!Geometry} Cylinder geometry.
 */
export function createCylinder(radius, height, segments, opts = {}) {
  const caps = opts.caps !== false;
  const uRepeat = opts.uRepeat || 1;
  const vRepeat = opts.vRepeat || 1;
  const h = height / 2;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // Side wall: two rings of segments + 1 vertices so UVs can wrap cleanly.
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    positions.push(radius * c, -h, radius * s, radius * c, h, radius * s);
    normals.push(c, 0, s, c, 0, s);
    const u = (i / segments) * uRepeat;
    uvs.push(u, 0, u, vRepeat);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  if (caps) {
    for (const side of [1, -1]) {
      const center = positions.length / 3;
      positions.push(0, side * h, 0);
      normals.push(0, side, 0);
      uvs.push(0.5, 0.5);
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        positions.push(radius * c, side * h, radius * s);
        normals.push(0, side, 0);
        uvs.push(c * 0.5 + 0.5, s * 0.5 + 0.5);
      }
      for (let i = 0; i < segments; i++) {
        const v0 = center + 1 + i;
        const v1 = center + 1 + i + 1;
        if (side > 0) {
          indices.push(center, v1, v0);
        } else {
          indices.push(center, v0, v1);
        }
      }
    }
  }
  return toGeometry(positions, normals, uvs, indices);
}

/**
 * Builds a flat rectangle in the XZ plane with a +Y normal.
 * @param {number} width Size along x.
 * @param {number} depth Size along z.
 * @param {number=} uRepeat Texture repeats along x.
 * @param {number=} vRepeat Texture repeats along z.
 * @return {!Geometry} Plane geometry.
 */
export function createPlane(width, depth, uRepeat = 1, vRepeat = 1) {
  const x = width / 2;
  const z = depth / 2;
  const positions = [-x, 0, -z, x, 0, -z, x, 0, z, -x, 0, z];
  const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const uvs = [0, 0, uRepeat, 0, uRepeat, vRepeat, 0, vRepeat];
  const indices = [0, 3, 2, 0, 2, 1];
  return toGeometry(positions, normals, uvs, indices);
}

/**
 * Builds the two annular faces of a weight plate (axis +Y). UVs map the full
 * face texture planarly so painted numbers land on the disc.
 * @param {number} outerR Outer radius.
 * @param {number} innerR Center-hole radius.
 * @param {number} thickness Plate thickness.
 * @param {number} segments Radial segment count.
 * @return {!Geometry} Plate face geometry.
 */
export function createPlateFaces(outerR, innerR, thickness, segments) {
  const h = thickness / 2;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (const side of [1, -1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      positions.push(outerR * c, side * h, outerR * s,
          innerR * c, side * h, innerR * s);
      normals.push(0, side, 0, 0, side, 0);
      // The back face mirrors u so the painted label reads correctly from
      // either side of the plate, like a real bumper printed on both faces.
      uvs.push(side * c * 0.5 + 0.5, s * 0.5 + 0.5,
          (innerR / outerR) * side * c * 0.5 + 0.5,
          (innerR / outerR) * s * 0.5 + 0.5);
    }
    for (let i = 0; i < segments; i++) {
      const o0 = base + i * 2;
      const i0 = base + i * 2 + 1;
      const o1 = base + i * 2 + 2;
      const i1 = base + i * 2 + 3;
      if (side > 0) {
        indices.push(o0, i0, o1, i0, i1, o1);
      } else {
        indices.push(o0, o1, i0, i0, o1, i1);
      }
    }
  }
  return toGeometry(positions, normals, uvs, indices);
}

/**
 * Builds the outer and inner cylindrical walls of a weight plate (axis +Y).
 * The outer wall tiles a groove texture around the circumference.
 * @param {number} outerR Outer radius.
 * @param {number} innerR Center-hole radius.
 * @param {number} thickness Plate thickness.
 * @param {number} segments Radial segment count.
 * @return {!Geometry} Plate rim geometry.
 */
export function createPlateRim(outerR, innerR, thickness, segments) {
  const h = thickness / 2;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (const wall of [{r: outerR, dir: 1, rep: 10}, {r: innerR, dir: -1,
    rep: 2}]) {
    const base = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      positions.push(wall.r * c, -h, wall.r * s, wall.r * c, h, wall.r * s);
      normals.push(wall.dir * c, 0, wall.dir * s, wall.dir * c, 0,
          wall.dir * s);
      const u = (i / segments) * wall.rep;
      uvs.push(u, 0, u, 1);
    }
    for (let i = 0; i < segments; i++) {
      const a = base + i * 2;
      if (wall.dir > 0) {
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      } else {
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  return toGeometry(positions, normals, uvs, indices);
}

/**
 * Packs plain arrays into the typed-array geometry record.
 * @param {!Array<number>} positions Vertex positions.
 * @param {!Array<number>} normals Vertex normals.
 * @param {!Array<number>} uvs Texture coordinates.
 * @param {!Array<number>} indices Triangle indices.
 * @return {!Geometry} Geometry record.
 */
function toGeometry(positions, normals, uvs, indices) {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}
