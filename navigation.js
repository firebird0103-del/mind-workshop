// Camera navigation and cutaway view controls tailored for the 3D cutaway dollhouse workshop.
import {WORKSHOP} from './layout.js';

export const PAN_BOUNDS = {
  x: WORKSHOP.rx * 0.78,
  z: WORKSHOP.rz * 0.72,
  yMin: 0.5,
  yMax: 4.8
};

// Cutaway camera angle limits:
// Keep azimuth within [-1.18, 1.18] rad (~±68 deg from front) so the player never orbits
// behind the back wall where only a blank exterior would be visible.
export const CAMERA_LIMITS = {
  minAngle: -1.18,
  maxAngle: 1.18,
  minPolar: 0.18,
  maxPolar: 1.05,
  minDistance: 6.8,
  maxDistance: 80.0
};

export function clampCameraAngle(angle) {
  return Math.max(CAMERA_LIMITS.minAngle, Math.min(CAMERA_LIMITS.maxAngle, angle));
}

export function clampCameraPolar(polar) {
  return Math.max(CAMERA_LIMITS.minPolar, Math.min(CAMERA_LIMITS.maxPolar, polar));
}

export function clampCameraDistance(distance) {
  return Math.max(CAMERA_LIMITS.minDistance, Math.min(CAMERA_LIMITS.maxDistance, distance));
}

// Ground-plane & vertical pan: preserve camera angle; scale speed to view distance.
export function panDelta(dx, dy, distance, height, fov, angle, polar) {
  const unit = 2 * distance * Math.tan((fov * Math.PI) / 360) / Math.max(1, height);
  const across = -dx * unit;
  const vertical = dy * unit * 0.65;
  const along = -dy * unit * 0.45 / Math.max(0.45, Math.cos(polar * 0.5));
  return {
    x: Math.cos(angle) * across + Math.sin(angle) * along,
    y: vertical,
    z: -Math.sin(angle) * across + Math.cos(angle) * along
  };
}

export function boundedPan(target, delta) {
  const radius = Math.hypot(target.x / PAN_BOUNDS.x, target.z / PAN_BOUNDS.z);
  const outward = (target.x * delta.x) / (PAN_BOUNDS.x ** 2) + (target.z * delta.z) / (PAN_BOUNDS.z ** 2) > 0;
  const ease = outward ? Math.max(0.14, Math.min(1, (1 - radius) / 0.24)) : 1;
  let x = target.x + delta.x * ease;
  let z = target.z + delta.z * ease;
  let r = Math.hypot(x / PAN_BOUNDS.x, z / PAN_BOUNDS.z);
  if (r > 1) {
    x /= r;
    z /= r;
  }
  const y = Math.max(PAN_BOUNDS.yMin, Math.min(PAN_BOUNDS.yMax, (target.y ?? 2.2) + (delta.y || 0)));
  return {x, y, z};
}

// Compute roof/eave opacity so upper trims fade gracefully when the camera zooms in or views from above.
export function computeCutawayOpacity(distance, polar, userCutaway = true) {
  if (!userCutaway) return 1.0;
  if (distance < 12.5 || polar > 0.72) {
    const dFactor = Math.max(0.18, Math.min(1, (distance - 7.5) / 5.5));
    const pFactor = polar > 0.72 ? Math.max(0.22, 1 - (polar - 0.72) * 2.2) : 1;
    return Math.min(dFactor, pFactor);
  }
  return 1.0;
}
