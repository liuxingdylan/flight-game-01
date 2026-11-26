// Terrain: one seeded valley per leg — rolling ground, a river dip, fields, trees,
// a little town by the strip, and the rings strung along the route.
import { createRandom, makeNoise } from './random.js';

export function createTerrain(leg) {
  const random = createRandom(leg.seed);
  const hills = makeNoise(random, 420, leg.name === 'Mountain Pass' ? 95 : 42);
  const bumps = makeNoise(random, 130, 14);
  const runwayX = leg.length - 500;
  const riverX = leg.length * (0.42 + random() * 0.12);
  const riverHalf = 55 + random() * 30;

  // Field patches: [startX, width, shade] — the quilt the valley wears.
  const fields = [];
  for (let x = 300; x < leg.length - 600; x += 260 + random() * 260) {
    fields.push({ x, w: 180 + random() * 220, shade: random() });
  }
  // Trees: [x, size] scattered where the ground is not a field edge or the strip.
  const trees = [];
  for (let x = 150; x < leg.length - 350; x += 40 + random() * 90) {
    if (Math.abs(x - runwayX) < 260 || Math.abs(x - riverX) < riverHalf + 30) continue;
    trees.push({ x, s: 0.8 + random() * 0.7 });
  }
  // Town: a row of houses hugging the strip.
  const houses = [];
  for (let i = 0; i < 7; i += 1) {
    houses.push({ x: runwayX - 330 + i * 52 + random() * 18, w: 30 + random() * 14, h: 20 + random() * 16, roof: random() });
  }

  function ground(x) {
    if (x < 0) return 18;
    if (x > leg.length) return 18;
    // The strip and its approach corridor are bulldozed flat.
    if (Math.abs(x - runwayX) < 500) return 26;
    let g = 34 + hills(x) + bumps(x);
    // The river carves a dip down to the water.
    const d = Math.abs(x - riverX);
    if (d < riverHalf + 90) {
      const t = Math.max(0, 1 - d / (riverHalf + 90));
      g -= t * t * 30;
    }
    return Math.max(4, g);
  }

  // Rings: threaded along the route, high over the hills and the river, the last
  // one on the glide path so the final ring lines the pilot up with the strip.
  const rings = [];
  const n = leg.rings;
  for (let i = 0; i < n; i += 1) {
    const x = 900 + ((runwayX - 1400) * (i + 0.5)) / n;
    let y = ground(x) + 95 + random() * 70;
    if (i === n - 1) y = 95; // on the glide path
    if (Math.abs(x - riverX) < riverHalf + 60) y = Math.max(y, 130); // clear the river
    rings.push({ x, y, r: 26, taken: false, centre: false });
  }

  return { leg, runwayX, riverX, riverHalf, fields, trees, houses, ground, rings };
}
