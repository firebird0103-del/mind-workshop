// One art direction for every WebGL backend. Hardware detection only limits render resolution/rate.
export const RENDER_PROFILE = Object.freeze({
  id: 'indoor-miniature-v1',
  exposure: 0.96,
  metalnessLimit: 0.58,
  metalEnvironment: 0.40,
  otherEnvironment: 0.24,
  woodNormal: 0.12,
  plasterNormal: 0.22,
  metalNormal: 0.16
});

export function materialStyle(prefix, originalMetalness, originalRoughness) {
  const wood = prefix.startsWith('wood_');
  const plaster = prefix.startsWith('plaster_');
  const metal = prefix.startsWith('metal_');
  return {
    metalness: Math.min(originalMetalness ?? 0.05, RENDER_PROFILE.metalnessLimit),
    // Three.js multiplies this factor by the ORM roughness channel; do not darken/smooth it twice.
    roughness: wood || metal || plaster ? 1 : (originalRoughness ?? 0.65),
    normalScale: wood ? RENDER_PROFILE.woodNormal : plaster ? RENDER_PROFILE.plasterNormal : metal ? RENDER_PROFILE.metalNormal : 0.2,
    envMapIntensity: (originalMetalness ?? 0) > 0.5 ? RENDER_PROFILE.metalEnvironment : RENDER_PROFILE.otherEnvironment
  };
}
