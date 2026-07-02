/**
 * @fileoverview GLSL ES 3.00 shader sources. The scene renders in two passes:
 * a depth-only pass into a framebuffer-attached shadow map, then a main
 * Blinn-Phong pass that samples that shadow map with a 3x3 PCF kernel.
 */

/** Vertex shader for the depth-only shadow pass. */
export const SHADOW_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;

uniform mat4 uLightViewProj;
uniform mat4 uModel;

void main() {
  gl_Position = uLightViewProj * uModel * vec4(aPosition, 1.0);
}
`;

/** Fragment shader for the shadow pass; only depth is written. */
export const SHADOW_FS = `#version 300 es
precision highp float;

void main() {}
`;

/** Vertex shader for the main lighting pass. */
export const MAIN_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat4 uLightViewProj;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;
out vec4 vShadowCoord;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  // Model matrices here are rotation + translation (sizes are baked into the
  // geometry), so the upper 3x3 is a valid normal transform.
  vNormal = mat3(uModel) * aNormal;
  vUv = aUv;
  vShadowCoord = uLightViewProj * world;
  gl_Position = uProj * uView * world;
}
`;

/**
 * Fragment shader for the main pass: Blinn-Phong with a shadowed directional
 * key light, an attenuated warm point light, ambient, and an emissive term
 * for the LED scoreboard.
 */
export const MAIN_FS = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;
in vec4 vShadowCoord;

uniform sampler2D uTexture;
uniform sampler2D uShadowMap;
uniform vec3 uColor;
uniform bool uUseTexture;
uniform float uSpecular;
uniform float uShininess;
uniform float uEmissive;
uniform float uAmbient;
uniform bool uKeyOn;
uniform vec3 uKeyDir;
uniform vec3 uKeyColor;
uniform bool uFillOn;
uniform vec3 uFillPos;
uniform vec3 uFillColor;
uniform bool uShadowsOn;
uniform vec3 uEyePos;

out vec4 outColor;

float shadowFactor(vec3 n, vec3 l) {
  vec3 coord = vShadowCoord.xyz / vShadowCoord.w * 0.5 + 0.5;
  if (coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 ||
      coord.z > 1.0) {
    return 1.0;
  }
  float bias = max(0.0008, 0.0025 * (1.0 - dot(n, l)));
  vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float depth = texture(uShadowMap, coord.xy + vec2(x, y) * texel).r;
      lit += (coord.z - bias) <= depth ? 1.0 : 0.0;
    }
  }
  return lit / 9.0;
}

void main() {
  vec3 base = uColor;
  if (uUseTexture) {
    base *= texture(uTexture, vUv).rgb;
  }
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(uEyePos - vWorldPos);
  vec3 color = base * uAmbient;

  if (uKeyOn) {
    vec3 l = normalize(-uKeyDir);
    float diff = max(dot(n, l), 0.0);
    vec3 h = normalize(l + viewDir);
    float spec = pow(max(dot(n, h), 0.0), uShininess) * uSpecular;
    float shadow = uShadowsOn ? shadowFactor(n, l) : 1.0;
    color += shadow * (base * diff + vec3(spec)) * uKeyColor;
  }

  if (uFillOn) {
    vec3 toLight = uFillPos - vWorldPos;
    float dist = length(toLight);
    vec3 l = toLight / dist;
    float atten = 1.0 / (1.0 + 0.25 * dist + 0.12 * dist * dist);
    float diff = max(dot(n, l), 0.0);
    vec3 h = normalize(l + viewDir);
    float spec = pow(max(dot(n, h), 0.0), uShininess) * uSpecular;
    color += atten * (base * diff + vec3(spec)) * uFillColor;
  }

  color += base * uEmissive;
  outColor = vec4(color, 1.0);
}
`;
