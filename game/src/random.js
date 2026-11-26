// Seeded random numbers (mulberry32) so a leg, its terrain and its rings are the
// same for a given seed, and a screenshot staged from a seed always matches.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A smooth 1D value-noise field: sample it at any x, get rolling hills. */
export function makeNoise(random, spacing, amplitude) {
  const knots = [];
  const count = 64;
  for (let i = 0; i < count; i += 1) knots.push(random() * 2 - 1);
  return function noise(x) {
    const p = x / spacing;
    const i = Math.floor(p);
    const f = p - i;
    const a = knots[((i % count) + count) % count];
    const b = knots[(((i + 1) % count) + count) % count];
    const s = f * f * (3 - 2 * f);
    return (a + (b - a) * s) * amplitude;
  };
}
