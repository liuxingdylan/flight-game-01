// The world: legs, rings, landings, crashes, score and messages. One step moves
// the plane, checks the rings and the ground, and reports what happened as events.
import { LEGS, PLANE, RUNWAY, STEP, RING_RADIUS, RING_CENTER, RING_POINTS, CENTER_BONUS, CRASH_PENALTY, LANDING_BASE, LANDING_QUALITY } from './config.js';
import { createTerrain } from './terrain.js';
import { createPlane, stepPlane } from './plane.js';
import { createRandom } from './random.js';

export const EVENT_RING = 1;
export const EVENT_LAND = 2;
export const EVENT_CRASH = 4;
export const EVENT_LEG = 8;
export const EVENT_OVER = 16;
export const EVENT_GOAROUND = 32;

export function createWorld(seed) {
  const state = {
    seed,
    legIndex: 0,
    terrain: null,
    plane: null,
    phase: 'title', // title | play | legdone | over | win
    score: 0,
    best: 0,
    airframes: PLANE.airframes,
    ringsTaken: 0,
    ringsTotal: 0,
    legTime: 0,
    legScore: 0,
    phaseTime: 0,
    messages: [], // {text, ttl}
    particles: [], // {x, y, vx, vy, life, max, color, size}
    muted: false,
    landed: null, // {quality, timeBonus, fuelBonus} for the leg-complete screen
    goArounds: 0,
  };
  loadLeg(state, 0);
  return { state, loadLeg: (i) => loadLeg(state, i) };
}

function loadLeg(state, index) {
  const leg = LEGS[index];
  state.legIndex = index;
  state.terrain = createTerrain(leg);
  state.plane = createPlane();
  state.plane.fuel = leg.fuel;
  state.ringsTotal = leg.rings;
  state.ringsTaken = 0;
  state.legTime = 0;
  state.legScore = 0;
  state.phase = 'play';
  state.phaseTime = 0;
  state.landed = null;
  state.particles = [];
  state.messages = [];
  say(state, `${leg.name} — deliver the mail, mind the fuel`, 4);
}

function say(state, text, ttl = 2.5) {
  state.messages = state.messages.filter((m) => m.ttl > 0);
  // Same warning twice is one warning: refresh it instead of stacking it.
  const same = state.messages.find((m) => m.text === text);
  if (same) {
    same.ttl = ttl;
    return;
  }
  state.messages.push({ text, ttl });
  if (state.messages.length > 3) state.messages.shift();
}

function burst(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, color, size: 2 + Math.random() * 3 });
  }
}

function windAt(state, x, t) {
  const leg = LEGS[state.legIndex];
  return leg.wind + leg.gust * Math.sin(x / 260 + t * 0.6) + leg.gust * 0.5 * Math.sin(x / 97 + t * 1.7);
}

/** Start a fresh run from leg 1. */
export function resetRun(world) {
  const s = world.state;
  s.score = 0;
  s.airframes = PLANE.airframes;
  s.goArounds = 0;
  loadLeg(s, 0);
}

/**
 * Advance the world one fixed step. `control` is the pilot's pitch/throttle.
 * `attract` runs the title-screen demo flight (no scoring, no crashing).
 * Returns an event bitmask.
 */
export function stepWorld(world, control, attract = false) {
  const s = world.state;
  const p = s.plane;
  const t = s.terrain;
  s.phaseTime += STEP;
  for (const m of s.messages) m.ttl -= STEP;
  for (const pt of s.particles) {
    pt.life -= STEP;
    pt.x += pt.vx * STEP;
    pt.y += pt.vy * STEP;
    pt.vy -= 6 * STEP;
  }
  s.particles = s.particles.filter((pt) => pt.life > 0);
  if (s.phase === 'legdone' || s.phase === 'over' || s.phase === 'win') return 0;

  const prevX = p.x;
  const wind = windAt(s, p.x, s.legTime);
  if (s.phase === 'play') s.legTime += STEP;
  const vspeed = stepPlane(p, control, wind);
  let events = 0;

  // Exhaust puffs behind the prop.
  if (Math.random() < 0.35 && p.throttle > 0.15) {
    s.particles.push({ x: p.x - 14, y: p.alt + 1, vx: -14 - Math.random() * 8, vy: (Math.random() - 0.5) * 4, life: 0.5, max: 0.5, color: 'rgba(220,220,220,0.5)', size: 2 });
  }

  // Rings: crossing the ring's x inside its circle scores. (Not in the demo.)
  if (!attract) for (const ring of t.rings) {
    if (ring.taken || prevX >= ring.x || p.x < ring.x) continue;
    const dy = Math.abs(p.alt - ring.y);
    if (dy <= ring.r) {
      ring.taken = true;
      ring.centre = dy <= RING_CENTER;
      const pts = RING_POINTS + (ring.centre ? CENTER_BONUS : 0);
      s.score += pts;
      s.legScore += pts;
      s.ringsTaken += 1;
      burst(s, ring.x, ring.y, ring.centre ? '#ffd94a' : '#7ee787', ring.centre ? 26 : 16, 26);
      say(s, ring.centre ? `DEAD CENTRE! +${pts}` : `Ring! +${pts}`, 1.6);
      events |= EVENT_RING;
    }
  }

  const ground = t.ground(p.x);
  const onStrip = Math.abs(p.x - t.runwayX) < RUNWAY.halfLength;
  const overWater = ground < 12 && Math.abs(p.x - t.riverX) < t.riverHalf;

  if (attract) {
    // Title demo: bounce gently off an invisible floor, never crash.
    if (p.alt < ground + 40) p.alt = ground + 40;
    return events;
  }

  // Low warnings.
  if (p.alt - ground < 26 && p.vspeed < -2) say(s, 'PULL UP', 0.6);
  else if (p.fuel < 20 && p.fuel > 0) say(s, 'LOW FUEL', 0.6);
  else if (p.speed < 30 && p.alt > ground + 10) say(s, 'STALL — ADD THROTTLE', 0.6);

  // Touching down.
  if (p.alt <= ground + 1.5) {
    if (onStrip && Math.abs(vspeed) <= RUNWAY.maxTouchVSpeed && p.speed <= RUNWAY.maxTouchSpeed && p.speed >= RUNWAY.minTouchSpeed && !overWater) {
      const quality = Math.max(0, 1 - Math.abs(vspeed) / RUNWAY.maxTouchVSpeed);
      const timeBonus = Math.max(0, Math.round(300 - s.legTime * 2));
      const fuelBonus = Math.round(p.fuel * 2);
      const landing = LANDING_BASE + Math.round(quality * LANDING_QUALITY);
      s.score += landing + timeBonus + fuelBonus;
      s.legScore += landing + timeBonus + fuelBonus;
      s.landed = { quality, timeBonus, fuelBonus, landing };
      s.phase = 'legdone';
      s.phaseTime = 0;
      burst(s, p.x, p.alt + 2, 'rgba(255,255,255,0.8)', 18, 18);
      s.messages = [];
      say(s, 'DELIVERED!', 3);
      return events | EVENT_LAND;
    }
    // Anything else that touches the ground is a crash.
    s.airframes -= 1;
    s.score = Math.max(0, s.score - CRASH_PENALTY);
    burst(s, p.x, p.alt, '#ff7b54', 34, 42);
    burst(s, p.x, p.alt, '#3a3a3a', 20, 26);
    s.messages = [];
    say(s, overWater ? 'DITCHED IN THE RIVER!' : 'CRASHED!', 3);
    events |= EVENT_CRASH;
    if (s.airframes <= 0) {
      s.phase = 'over';
      s.phaseTime = 0;
      return events | EVENT_OVER;
    }
    // New airframe, same leg: rings already taken stay taken.
    const taken = t.rings.map((r) => r.taken);
    const centre = t.rings.map((r) => r.centre);
    s.plane = createPlane();
    s.plane.fuel = LEGS[s.legIndex].fuel;
    t.rings.forEach((r, i) => {
      r.taken = taken[i];
      r.centre = centre[i];
    });
    say(s, `${s.airframes} airframe${s.airframes === 1 ? '' : 's'} left — back to the start of the leg`, 3);
    return events;
  }

  // Overshot the strip: go around for another try.
  if (p.x > t.runwayX + RUNWAY.halfLength + 260) {
    s.goArounds += 1;
    s.score = Math.max(0, s.score - 50);
    s.plane = createPlane();
    s.plane.x = t.runwayX - 1600;
    s.plane.alt = 170;
    s.plane.speed = 55;
    s.plane.fuel = Math.max(25, p.fuel);
    say(s, 'OVERSHOT — go around, line up again (-50)', 3);
    return events | EVENT_GOAROUND;
  }
  return events;
}

/** Move on after a delivery: next leg, or the win screen after the last one. */
export function nextLeg(world) {
  const s = world.state;
  if (s.legIndex + 1 >= LEGS.length) {
    s.phase = 'win';
    s.phaseTime = 0;
    if (s.score > s.best) s.best = s.score;
    return;
  }
  loadLeg(s, s.legIndex + 1);
}
