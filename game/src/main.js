// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between title, play, paused, leg-done,
// game-over and win screens.
//
// ?seed=N fixes the valley. ?shot=start|play|land|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, resetRun, stepWorld, nextLeg, EVENT_LAND, EVENT_OVER, EVENT_CRASH } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  world.state.best = best;
  world.state.phase = 'title';
  let accumulator = 0;
  let last = performance.now();
  let lastWarn = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    resetRun(world);
    world.state.best = best;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Flying. Thread the rings, land on the strip.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      world.state.best = best;
      saveBest(best);
    }
    announce(`Out of airframes. Score ${world.state.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    if (world.state.score > best) {
      best = world.state.score;
      world.state.best = best;
      saveBest(best);
    }
    announce(`All deliveries complete. Score ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) world.state.muted = !world.state.muted;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_CONFIRM && screen === 'legdone') {
      nextLeg(world);
      if (world.state.phase === 'win') winGame();
      else screen = SCREEN_PLAY;
    }
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Flying.');
    }
  }

  function step() {
    const s = world.state;
    if (screen === SCREEN_TITLE) {
      const control = { pitchTarget: Math.sin(s.phaseTime * 0.25) * 0.35, throttleTarget: 0.6 };
      stepWorld(world, control, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const view = { width: canvas.clientWidth || 1280, height: canvas.clientHeight || 800, planeScreenY: 480 };
    const control = input.control(s.plane, view);
    const events = stepWorld(world, control, false);
    if (events & EVENT_LAND) {
      audio.land();
      screen = 'legdone';
      announce('Delivered! Press Space for the next leg.');
    } else if (events & EVENT_CRASH) {
      audio.crash();
      if (events & EVENT_OVER) endGame();
    }
    if (s.phase === 'win') winGame();
    // Engine hum follows the throttle; warn on low fuel, at most once a second.
    audio.engine(s.plane.throttle, s.plane.speed, !s.muted && screen === SCREEN_PLAY);
    if (s.plane.fuel < 20 && s.plane.fuel > 0 && performance.now() - lastWarn > 1000) {
      lastWarn = performance.now();
      audio.warn();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dtFrame = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += dtFrame;
    last = now;
    handleActions();
    const s = world.state;
    if (screen === 'legdone' && s.phase === 'play') screen = SCREEN_PLAY;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      // Static screens still animate their blinking prompts.
      s.phaseTime += dtFrame;
      accumulator = 0;
    }
    const drawScreen = screen === 'legdone' ? 'legdone' : screen;
    renderer.draw(s, drawScreen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sky Courier. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
