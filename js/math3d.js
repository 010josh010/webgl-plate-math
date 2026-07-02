/**
 * @fileoverview Minimal column-major 4x4 matrix and vec3 helpers for WebGL.
 * Matrices are Float32Array(16) in OpenGL column-major layout, so they can be
 * passed straight to gl.uniformMatrix4fv without transposition.
 */

/**
 * @return {!Float32Array} A new identity matrix.
 */
export function mat4Identity() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/**
 * Multiplies two matrices (a * b).
 * @param {!Float32Array} a Left operand.
 * @param {!Float32Array} b Right operand.
 * @return {!Float32Array} New product matrix.
 */
export function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/**
 * Multiplies any number of matrices left to right.
 * @param {...!Float32Array} mats Matrices to chain.
 * @return {!Float32Array} The combined matrix.
 */
export function mat4Chain(...mats) {
  return mats.reduce((acc, m) => mat4Multiply(acc, m));
}

/**
 * @param {number} x Translation on x.
 * @param {number} y Translation on y.
 * @param {number} z Translation on z.
 * @return {!Float32Array} Translation matrix.
 */
export function mat4Translation(x, y, z) {
  const m = mat4Identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/**
 * @param {number} x Scale on x.
 * @param {number} y Scale on y.
 * @param {number} z Scale on z.
 * @return {!Float32Array} Scaling matrix.
 */
export function mat4Scaling(x, y, z) {
  const m = mat4Identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}

/**
 * @param {number} rad Angle in radians.
 * @return {!Float32Array} Rotation matrix about the x axis.
 */
export function mat4RotationX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = mat4Identity();
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

/**
 * @param {number} rad Angle in radians.
 * @return {!Float32Array} Rotation matrix about the y axis.
 */
export function mat4RotationY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = mat4Identity();
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

/**
 * @param {number} rad Angle in radians.
 * @return {!Float32Array} Rotation matrix about the z axis.
 */
export function mat4RotationZ(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = mat4Identity();
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

/**
 * Builds a perspective projection matrix.
 * @param {number} fovY Vertical field of view in radians.
 * @param {number} aspect Viewport width / height.
 * @param {number} near Near clip distance.
 * @param {number} far Far clip distance.
 * @return {!Float32Array} Projection matrix.
 */
export function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

/**
 * Builds an orthographic projection matrix (used for the shadow pass).
 * @param {number} left Left plane.
 * @param {number} right Right plane.
 * @param {number} bottom Bottom plane.
 * @param {number} top Top plane.
 * @param {number} near Near plane.
 * @param {number} far Far plane.
 * @return {!Float32Array} Projection matrix.
 */
export function mat4Ortho(left, right, bottom, top, near, far) {
  const m = mat4Identity();
  m[0] = 2 / (right - left);
  m[5] = 2 / (top - bottom);
  m[10] = -2 / (far - near);
  m[12] = -(right + left) / (right - left);
  m[13] = -(top + bottom) / (top - bottom);
  m[14] = -(far + near) / (far - near);
  return m;
}

/**
 * Builds a view matrix looking from `eye` toward `center`.
 * @param {!Array<number>} eye Camera position.
 * @param {!Array<number>} center Look-at target.
 * @param {!Array<number>} up World up vector.
 * @return {!Float32Array} View matrix.
 */
export function mat4LookAt(eye, center, up) {
  const zAxis = vec3Normalize(vec3Sub(eye, center));
  const xAxis = vec3Normalize(vec3Cross(up, zAxis));
  const yAxis = vec3Cross(zAxis, xAxis);
  const m = mat4Identity();
  m[0] = xAxis[0];
  m[1] = yAxis[0];
  m[2] = zAxis[0];
  m[4] = xAxis[1];
  m[5] = yAxis[1];
  m[6] = zAxis[1];
  m[8] = xAxis[2];
  m[9] = yAxis[2];
  m[10] = zAxis[2];
  m[12] = -vec3Dot(xAxis, eye);
  m[13] = -vec3Dot(yAxis, eye);
  m[14] = -vec3Dot(zAxis, eye);
  return m;
}

/**
 * @param {!Array<number>} a Left vector.
 * @param {!Array<number>} b Right vector.
 * @return {!Array<number>} a - b.
 */
export function vec3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * @param {!Array<number>} a Left vector.
 * @param {!Array<number>} b Right vector.
 * @return {!Array<number>} Cross product a x b.
 */
export function vec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * @param {!Array<number>} a Left vector.
 * @param {!Array<number>} b Right vector.
 * @return {number} Dot product.
 */
export function vec3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * @param {!Array<number>} v Input vector.
 * @return {!Array<number>} Unit-length copy of v.
 */
export function vec3Normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
