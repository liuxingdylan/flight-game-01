// Screenshot scenes behind ?shot=start|play|land|end. Each one plays the real
// rules forward from a fresh world for a fixed time, steered by a simple autopilot
// (pitch toward the next ring or the glide path, throttle to hold cruise speed),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { STEP, PLANE } from './config.js';
import { stepWorld, EVENT_LAND } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 30;
const LAND_SECONDS = 200;
const END_SECONDS = 300;
const SAMPLE = 1 / 30;

/** Steer toward `targetAlt` at `targetSpeed`, flaring gently near the strip. */
function autopilot(world, targetAlt, targetSpeed) {
  const p = world.state.plane;
  const altErr = targetAlt - p.alt;
  const pitch = Math.max(-1, Math.min(1, altErr / 55));
  const speedErr = targetSpeed - p.speed;
  const throttle = Math.max(0.2, Math.min(1, p.throttle + speedErr * 0.02));
  return { pitchTarget: pitch, throttleTarget: throttle };
}

function nextTarget(world) {
  const s = world.state;
  const t = s.terrain;
  const p = s.plane;
  // On final: follow a glide path to the threshold, but never below the hills
  // ahead — stay 40 m clear of the ground until the flat approach corridor.
  // The path ends at 24 m, below the touchdown line, so the flare actually lands.
  const distToStrip = t.runwayX - p.x;
  if (distToStrip < 1200 && distToStrip > -100) {
    const glide = 24 + distToStrip * 0.09;
    const clearance = t.ground(p.x + 300) + 40;
    return { alt: Math.max(glide, distToStrip > 450 ? clearance : glide), speed: 42 };
  }
  for (const ring of t.rings) {
    if (!ring.taken && ring.x > p.x) return { alt: ring.y, speed: PLANE.cruiseSpeed };
  }
  return { alt: 120, speed: PLANE.cruiseSpeed };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a demo flight. play: mid-flight through the rings.
 * land: on final approach, gear down, strip ahead. end: just delivered.
 */
export function stageShot(name, world) {
  const s = world.state;
  if (name !== 'play' && name !== 'land' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) {
      const t = nextTarget(world);
      stepWorld(world, autopilot(world, t.alt, t.speed), true);
    }
    return { screen: SCREEN_TITLE };
  }
  const limit = name === 'play' ? PLAY_SECONDS : name === 'land' ? LAND_SECONDS : END_SECONDS;
  let landed = false;
  for (let i = 0; i < limit / STEP; i += 1) {
    const t = nextTarget(world);
    const events = stepWorld(world, autopilot(world, t.alt, t.speed), false);
    if (events & EVENT_LAND) {
      landed = true;
      break;
    }
    // The land scene stops on final: 400 m out, lined up, strip ahead.
    if (name === 'land' && s.terrain.runwayX - s.plane.x <= 420 && s.plane.alt < 130) break;
    if (s.phase === 'over' || s.phase === 'win') break;
  }
  if (landed) return { screen: 'legdone' };
  return { screen: SCREEN_PLAY };
}
