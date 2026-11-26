// Sky Courier: Ridge Run — one-job config: every number the game tunes lives here.
// A 2D side-view bush-plane courier game: fly three delivery legs across a valley,
// thread the rings, mind fuel and the terrain, and land on the strip to deliver.
export const STEP = 1 / 60;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const SCALE = 2.0; // pixels per metre on screen
export const BEST_KEY = 'sky-courier-best';

// Flight model (arcade, but honest: speed, pitch, lift and stall all matter).
export const PLANE = {
  maxThrust: 38, // m/s^2 at full throttle
  dragCoef: 0.0078, // drag = coef * speed^2
  climbFactor: 0.55, // how much of gravity bites while climbing
  stallSpeed: 30, // m/s; below this the wing stops flying and she sinks
  sinkBase: 1.2, // m/s gentle sink at cruise
  sinkStall: 0.55, // extra sink per m/s below stall speed
  pitchRate: 1.4, // rad/s toward the commanded pitch
  pitchMax: 0.42, // rad, about 24 degrees
  throttleRate: 0.9, // per second
  cruiseSpeed: 55, // m/s the autopilot and the HUD aim for
  fuelBurnBase: 0.1, // %/s
  fuelBurnThrottle: 0.45, // %/s at full throttle
  maxDamage: 100,
  airframes: 3,
};

export const RUNWAY = {
  halfLength: 170, // metres; the strip is flat and safe inside this band
  maxTouchVSpeed: 7, // m/s vertical speed allowed for a good landing
  maxTouchSpeed: 62, // m/s ground speed allowed at touchdown
  minTouchSpeed: 16, // below this she stalls onto the strip
};

// One leg = one delivery. Palettes are day, golden hour and dusk.
export const LEGS = [
  {
    name: 'Meadow Run',
    seed: 101,
    length: 6000,
    rings: 6,
    wind: 2,
    gust: 1.5,
    fuel: 100,
    sky: ['#7ec0ee', '#bfe3f7', '#eaf6ff'],
    sun: { x: 0.78, y: 0.16, color: '#fff3b0' },
    hills: ['#8fae7d', '#6f9660'],
    grass: '#79a95c',
    dirt: '#7d5f42',
  },
  {
    name: 'River Valley',
    seed: 202,
    length: 7200,
    rings: 8,
    wind: -4,
    gust: 3.5,
    fuel: 100,
    sky: ['#f7b267', '#f4845f', '#ffe8c2'],
    sun: { x: 0.2, y: 0.24, color: '#ffdf8a' },
    hills: ['#a67c52', '#86592f'],
    grass: '#b98a4e',
    dirt: '#7a5230',
  },
  {
    name: 'Mountain Pass',
    seed: 303,
    length: 9000,
    rings: 10,
    wind: 5,
    gust: 5,
    fuel: 100,
    sky: ['#3b4a6b', '#7a6a9a', '#e8a56b'],
    sun: { x: 0.5, y: 0.2, color: '#ffd9a0' },
    hills: ['#4c4a72', '#35344f'],
    grass: '#5c5a7a',
    dirt: '#3e3a55',
  },
];

export const RING_RADIUS = 26; // metres; centre bonus inside 8 m
export const RING_CENTER = 8;
export const RING_POINTS = 100;
export const CENTER_BONUS = 25;
export const CRASH_PENALTY = 150;
export const LANDING_BASE = 300;
export const LANDING_QUALITY = 200;
