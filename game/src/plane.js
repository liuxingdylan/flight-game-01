// The aeroplane: one state, one step. Arcade physics with real trade-offs —
// throttle buys speed, pitch trades speed for height, and below stall speed the
// wing quits and she sinks. Fuel, wind and damage ride along.
import { PLANE, STEP } from './config.js';

export function createPlane() {
  return {
    x: 60,
    alt: 120,
    speed: 52,
    pitch: 0,
    throttle: 0.62,
    fuel: 100,
    vspeed: 0,
    groundSpeed: 52,
    propAngle: 0,
  };
}

/**
 * Advance the plane one fixed step.
 * `control` is { pitchTarget (-1..1, -1 = dive, 1 = climb), throttleTarget (0..1) }
 * and `wind` is the wind at the plane in m/s (positive = tailwind).
 * Returns the vertical speed, so the world can judge landings.
 */
export function stepPlane(plane, control, wind, dt = STEP) {
  const p = plane;
  const outOfFuel = p.fuel <= 0;
  const throttleTarget = outOfFuel ? 0 : control.throttleTarget;
  p.throttle += Math.max(-PLANE.throttleRate * dt, Math.min(PLANE.throttleRate * dt, throttleTarget - p.throttle));

  const pitchTarget = control.pitchTarget * PLANE.pitchMax;
  const authority = 0.4 + Math.min(1, p.speed / 70);
  const pitchRate = PLANE.pitchRate * authority;
  p.pitch += Math.max(-pitchRate * dt, Math.min(pitchRate * dt, pitchTarget - p.pitch));

  const thrust = p.throttle * PLANE.maxThrust;
  const drag = PLANE.dragCoef * p.speed * p.speed;
  const climbPenalty = 9.8 * Math.sin(p.pitch) * PLANE.climbFactor;
  p.speed += (thrust - drag - climbPenalty) * dt;
  if (p.speed < 0) p.speed = 0;

  let sink = PLANE.sinkBase;
  if (p.speed < PLANE.stallSpeed) sink += (PLANE.stallSpeed - p.speed) * PLANE.sinkStall;
  p.vspeed = p.speed * Math.sin(p.pitch) - sink;
  p.alt += p.vspeed * dt;
  p.groundSpeed = p.speed * Math.cos(p.pitch) + wind;
  p.x += p.groundSpeed * dt;

  p.fuel = Math.max(0, p.fuel - (PLANE.fuelBurnBase + p.throttle * PLANE.fuelBurnThrottle) * dt);
  p.propAngle += (2 + p.throttle * 26) * dt * 6;
  return p.vspeed;
}

/** True when the wing is flying: enough speed to hold altitude on the glide. */
export function isFlying(plane) {
  return plane.speed >= PLANE.stallSpeed * 0.8;
}
