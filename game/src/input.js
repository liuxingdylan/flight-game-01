// Input: keyboard (arrows or WASD), mouse steering, and touch.
// Arrow Up / W climbs, Down / S descends, Right / D adds throttle, Left / A cuts
// it; Space or a click confirms; P pauses; M mutes. The mouse steers too: hold
// the pointer above the plane to climb, below to descend, left/right for throttle.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let actions = 0;
  let pointer = null; // {x, y} in canvas pixels, or null when not steering
  let pointerDown = false;

  function code(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    pointer = { x: event.offsetX, y: event.offsetY };
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointerDown) pointer = { x: event.offsetX, y: event.offsetY };
  });
  window.addEventListener('pointerup', () => {
    pointerDown = false;
    pointer = null;
  });

  function axis(neg, pos) {
    return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
  }

  return {
    /** Pitch/throttle command for this frame: { pitchTarget, throttleTarget }. */
    control(plane, view) {
      // Keyboard: climb/descend on Up/Down, throttle on Right/Left.
      let pitch = axis('ArrowDown', 'ArrowUp') + axis('KeyS', 'KeyW');
      let throttle = null;
      const tAxis = axis('ArrowLeft', 'ArrowRight') + axis('KeyA', 'KeyD');
      if (tAxis !== 0) throttle = Math.max(0, Math.min(1, plane.throttle + tAxis * 0.02));
      // Mouse: pointer above the plane climbs, below descends; x sets throttle.
      if (pointer) {
        const px = (pointer.x / view.width) * 1280;
        const py = (pointer.y / view.height) * 800;
        const planeScreenY = view.planeScreenY;
        pitch = Math.max(-1, Math.min(1, (planeScreenY - py) / 140));
        throttle = Math.max(0, Math.min(1, px / 1280));
      }
      return {
        pitchTarget: Math.max(-1, Math.min(1, pitch)),
        throttleTarget: throttle === null ? plane.throttle : throttle,
      };
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    consumePressed() {
      const p = new Set(pressed);
      pressed.clear();
      return p;
    },
  };
}
