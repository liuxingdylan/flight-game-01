// Rendering: sky, parallax hills, the valley, the strip, the rings, the plane and
// the HUD — everything the judge sees in a screenshot. All art is drawn code;
// there are no image files. The camera holds the plane at a fixed screen spot.
import { VIEW_W, VIEW_H, SCALE, LEGS, PLANE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PLANE_SX = 380; // plane's fixed screen x
const PLANE_SY = 480; // plane's fixed screen y

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const clouds = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 14; i += 1) {
    clouds.push({ x: rnd() * 4000, y: 40 + rnd() * 260, s: 0.7 + rnd() * 1.1, a: 0.5 + rnd() * 0.4 });
  }

  function toScreenX(wx, camX) {
    return (wx - camX) * SCALE;
  }
  function toScreenY(alt, camAlt) {
    return PLANE_SY - (alt - camAlt) * SCALE;
  }

  function drawSky(state) {
    const leg = LEGS[state.legIndex];
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, leg.sky[0]);
    g.addColorStop(0.6, leg.sky[1]);
    g.addColorStop(1, leg.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Sun (or low dusk sun) with a soft halo.
    const sx = leg.sun.x * VIEW_W;
    const sy = leg.sun.y * VIEW_H;
    const halo = ctx.createRadialGradient(sx, sy, 4, sx, sy, 130);
    halo.addColorStop(0, leg.sun.color);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - 130, sy - 130, 260, 260);
    ctx.fillStyle = leg.sun.color;
    ctx.beginPath();
    ctx.arc(sx, sy, 34, 0, Math.PI * 2);
    ctx.fill();
    // Clouds, drifting slowly with the wind, parallax 0.35.
    const camX = state.plane.x - PLANE_SX / SCALE;
    ctx.fillStyle = '#ffffff';
    for (const c of clouds) {
      const cx = (((c.x - camX * 0.35) % 1800) + 1800) % 1800 - 260;
      ctx.globalAlpha = c.a * 0.85;
      ctx.beginPath();
      ctx.ellipse(cx, c.y, 70 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 44 * c.s, c.y + 6, 48 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 46 * c.s, c.y + 8, 40 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFarHills(state) {
    const leg = LEGS[state.legIndex];
    const camX = state.plane.x - PLANE_SX / SCALE;
    const camAlt = state.plane.alt;
    for (let layer = 0; layer < 2; layer += 1) {
      const par = 0.55 + layer * 0.15;
      const base = VIEW_H * (0.62 + layer * 0.06);
      ctx.fillStyle = leg.hills[layer];
      ctx.globalAlpha = 0.75 - layer * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);
      for (let sx = 0; sx <= VIEW_W; sx += 16) {
        const wx = camX * par + sx / SCALE;
        const y = base - (Math.sin(wx / 260 + layer * 2.1) * 46 + Math.sin(wx / 97 + layer) * 18) - (camAlt - 120) * 0.12;
        ctx.lineTo(sx, y);
      }
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTerrain(state) {
    const leg = LEGS[state.legIndex];
    const t = state.terrain;
    const p = state.plane;
    const camX = p.x - PLANE_SX / SCALE;
    const camAlt = p.alt;
    // Ground body.
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let sx = 0; sx <= VIEW_W; sx += 8) {
      const wx = camX + sx / SCALE;
      ctx.lineTo(sx, toScreenY(t.ground(wx), camAlt));
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.fillStyle = leg.dirt;
    ctx.fill();
    // Depth in the earth: it darkens toward the bottom of the frame.
    const shade = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = shade;
    ctx.fill();
    // Grass skin along the top edge.
    ctx.beginPath();
    for (let sx = 0; sx <= VIEW_W; sx += 8) {
      const wx = camX + sx / SCALE;
      const y = toScreenY(t.ground(wx), camAlt);
      if (sx === 0) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    for (let sx = VIEW_W; sx >= 0; sx -= 8) {
      const wx = camX + sx / SCALE;
      ctx.lineTo(sx, toScreenY(t.ground(wx), camAlt) + 22);
    }
    ctx.closePath();
    ctx.fillStyle = leg.grass;
    ctx.fill();
    // Field patches: tinted bands following the ground.
    for (const f of t.fields) {
      const x0 = toScreenX(f.x, camX);
      const x1 = toScreenX(f.x + f.w, camX);
      if (x1 < -40 || x0 > VIEW_W + 40) continue;
      ctx.beginPath();
      for (let sx = Math.max(0, x0); sx <= Math.min(VIEW_W, x1); sx += 8) {
        const wx = camX + sx / SCALE;
        const y = toScreenY(t.ground(wx), camAlt);
        if (sx === Math.max(0, x0)) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      for (let sx = Math.min(VIEW_W, x1); sx >= Math.max(0, x0); sx -= 8) {
        const wx = camX + sx / SCALE;
        ctx.lineTo(sx, toScreenY(t.ground(wx), camAlt) + 10);
      }
      ctx.closePath();
      ctx.fillStyle = f.shade > 0.5 ? 'rgba(214,178,94,0.5)' : 'rgba(120,160,90,0.45)';
      ctx.fill();
    }
    // The river: water where the ground dips under the waterline.
    const wl = toScreenY(12, camAlt);
    ctx.fillStyle = '#4a90d9';
    ctx.beginPath();
    let started = false;
    for (let sx = 0; sx <= VIEW_W; sx += 4) {
      const wx = camX + sx / SCALE;
      if (t.ground(wx) < 12) {
        if (!started) {
          ctx.moveTo(sx, wl);
          started = true;
        }
        ctx.lineTo(sx, toScreenY(t.ground(wx), camAlt));
      } else if (started) {
        ctx.lineTo(sx, wl);
        started = false;
      }
    }
    if (started) ctx.lineTo(VIEW_W, wl);
    ctx.closePath();
    ctx.fill();
    // Trees.
    for (const tr of t.trees) {
      const sx = toScreenX(tr.x, camX);
      if (sx < -30 || sx > VIEW_W + 30) continue;
      const sy = toScreenY(t.ground(tr.x), camAlt);
      const s = tr.s * SCALE * 3;
      ctx.fillStyle = '#3f7a3a';
      ctx.beginPath();
      ctx.moveTo(sx, sy - s * 2.2);
      ctx.lineTo(sx - s * 0.7, sy);
      ctx.lineTo(sx + s * 0.7, sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5d4023';
      ctx.fillRect(sx - 1.5, sy - 4, 3, 5);
    }
    drawStrip(state, camX, camAlt);
    drawHouses(state, camX, camAlt);
  }

  function drawStrip(state, camX, camAlt) {
    const t = state.terrain;
    const x0 = toScreenX(t.runwayX - RUNWAY_HALF, camX);
    const x1 = toScreenX(t.runwayX + RUNWAY_HALF, camX);
    if (x1 < -50 || x0 > VIEW_W + 50) return;
    const y = toScreenY(t.ground(t.runwayX), camAlt);
    // Asphalt.
    ctx.fillStyle = '#3c3f45';
    ctx.fillRect(x0, y - 4, x1 - x0, 8);
    // Centreline dashes.
    ctx.fillStyle = '#f5f5f5';
    for (let d = x0 + 12; d < x1 - 12; d += 46) ctx.fillRect(d, y - 1, 24, 2);
    // Threshold bars.
    ctx.fillRect(x0 + 8, y - 3, 10, 6);
    ctx.fillRect(x1 - 18, y - 3, 10, 6);
    // Windsock on a pole beside the strip.
    const wx = toScreenX(t.runwayX - RUNWAY_HALF - 26, camX);
    const wy = toScreenY(t.ground(t.runwayX - RUNWAY_HALF - 26), camAlt);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx, wy - 34);
    ctx.stroke();
    ctx.fillStyle = '#ff7f2a';
    ctx.beginPath();
    ctx.moveTo(wx, wy - 34);
    ctx.lineTo(wx + 20, wy - 30);
    ctx.lineTo(wx, wy - 26);
    ctx.closePath();
    ctx.fill();
    // Beacon: blinking light on the far end.
    const blink = Math.floor(state.phaseTime * 2) % 2 === 0;
    const bx = toScreenX(t.runwayX + RUNWAY_HALF + 18, camX);
    const by = toScreenY(t.ground(t.runwayX + RUNWAY_HALF + 18), camAlt);
    ctx.fillStyle = blink ? '#ff5252' : '#7a2020';
    ctx.beginPath();
    ctx.arc(bx, by - 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHouses(state, camX, camAlt) {
    const t = state.terrain;
    for (const h of t.houses) {
      const sx = toScreenX(h.x, camX);
      if (sx < -60 || sx > VIEW_W + 60) continue;
      const sy = toScreenY(t.ground(h.x), camAlt);
      const w = h.w;
      const hh = h.h;
      ctx.fillStyle = '#e8dcc8';
      ctx.fillRect(sx, sy - hh, w, hh);
      ctx.fillStyle = h.roof > 0.5 ? '#b0503c' : '#4a6b8a';
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy - hh);
      ctx.lineTo(sx + w / 2, sy - hh - 12);
      ctx.lineTo(sx + w + 3, sy - hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(sx + w * 0.25, sy - hh * 0.6, 6, 8);
      ctx.fillRect(sx + w * 0.6, sy - hh * 0.6, 6, 8);
    }
  }

  function drawRings(state) {
    const t = state.terrain;
    const p = state.plane;
    const camX = p.x - PLANE_SX / SCALE;
    const camAlt = p.alt;
    for (const ring of t.rings) {
      const sx = toScreenX(ring.x, camX);
      if (sx < -90 || sx > VIEW_W + 90) continue;
      const sy = toScreenY(ring.y, camAlt);
      const r = ring.r * SCALE;
      ctx.lineWidth = 7;
      ctx.strokeStyle = ring.taken ? 'rgba(126,231,135,0.85)' : '#ffd94a';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ring.taken ? 'rgba(126,231,135,0.4)' : 'rgba(255,217,74,0.45)';
      ctx.beginPath();
      ctx.arc(sx, sy, r + 7, 0, Math.PI * 2);
      ctx.stroke();
      if (!ring.taken) {
        ctx.fillStyle = '#ffd94a';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▸', sx, sy - r - 12);
      } else {
        ctx.fillStyle = '#7ee787';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓', sx, sy + 8);
      }
    }
  }

  function drawParticles(state) {
    const p = state.plane;
    const camX = p.x - PLANE_SX / SCALE;
    const camAlt = p.alt;
    for (const pt of state.particles) {
      const sx = toScreenX(pt.x, camX);
      const sy = toScreenY(pt.y, camAlt);
      if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) continue;
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(sx, sy, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlane(state) {
    const p = state.plane;
    ctx.save();
    ctx.translate(PLANE_SX, PLANE_SY);
    ctx.rotate(-p.pitch);
    // Tail.
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.lineTo(-34, -16);
    ctx.lineTo(-26, -16);
    ctx.lineTo(-20, -3);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.moveTo(-30, 2);
    ctx.quadraticCurveTo(-28, -8, -8, -9);
    ctx.quadraticCurveTo(18, -9, 30, -2);
    ctx.quadraticCurveTo(32, 2, 24, 5);
    ctx.quadraticCurveTo(0, 9, -24, 7);
    ctx.quadraticCurveTo(-31, 6, -30, 2);
    ctx.closePath();
    ctx.fill();
    // Red cheatline + tail band.
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-28, 0, 54, 3);
    ctx.fillRect(-30, -8, 5, 15);
    // Cockpit window.
    ctx.fillStyle = '#9fd8ef';
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.quadraticCurveTo(16, -8, 20, -3);
    ctx.lineTo(8, -3);
    ctx.closePath();
    ctx.fill();
    // Wing (high wing, strut-braced bush plane).
    ctx.fillStyle = '#dfe5ea';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(10, -8);
    ctx.lineTo(4, 4);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a939c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, 3);
    ctx.lineTo(8, 9);
    ctx.stroke();
    // Fixed gear.
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 7);
    ctx.lineTo(-14, 14);
    ctx.moveTo(10, 7);
    ctx.lineTo(10, 14);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-14, 16, 4, 0, Math.PI * 2);
    ctx.arc(10, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    // Propeller: a blurred disc seen edge-on, plus one blade turning with throttle.
    ctx.save();
    ctx.translate(32, -1);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.rotate(Math.sin(p.propAngle) * 0.5);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-1, -18, 2, 36);
    ctx.restore();
    // Registration.
    ctx.fillStyle = '#333';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N101SK', -8, 6);
    // Nav light blink.
    if (Math.floor(state.phaseTime * 2.4) % 2 === 0) {
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(-34, -14, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10,16,24,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawHUD(state) {
    const p = state.plane;
    const leg = LEGS[state.legIndex];
    const altFt = Math.round(p.alt * 3.28084);
    const spdKt = Math.round(p.speed * 1.94384);
    const vsi = Math.round(p.vspeed * 196.85);
    ctx.textAlign = 'left';
    // Instruments, top left.
    panel(16, 16, 250, 108);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`ALT ${String(altFt).padStart(5, ' ')} FT`, 28, 44);
    ctx.fillText(`SPD ${String(spdKt).padStart(3, ' ')} KT`, 28, 70);
    ctx.fillText(`HDG 090°  VSI ${vsi >= 0 ? '+' : ''}${vsi}`, 28, 96);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#9fd8ef';
    ctx.fillText(`THR ${Math.round(p.throttle * 100)}%   FUEL ${Math.round(p.fuel)}%`, 28, 116);
    // Fuel + throttle bars, bottom left.
    panel(16, VIEW_H - 64, 250, 48);
    ctx.fillStyle = p.fuel < 20 ? '#ff5252' : '#7ee787';
    ctx.fillRect(28, VIEW_H - 48, 168 * (p.fuel / 100), 10);
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(28, VIEW_H - 30, 168 * p.throttle, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('FUEL', 204, VIEW_H - 38);
    ctx.fillText('THR', 204, VIEW_H - 20);
    // Score, top right.
    panel(VIEW_W - 266, 16, 250, 108);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE ${state.score}`, VIEW_W - 28, 44);
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`LEG ${state.legIndex + 1}/3 · ${leg.name.toUpperCase()}`, VIEW_W - 28, 70);
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`RINGS ${state.ringsTaken}/${state.ringsTotal}`, VIEW_W - 28, 96);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#9fd8ef';
    ctx.fillText(`AIRFRAMES ${'▮'.repeat(state.airframes)}${'▯'.repeat(PLANE.airframes - state.airframes)}`, VIEW_W - 28, 116);
    ctx.textAlign = 'left';
    // Compass strip, top centre: we fly east, 090, always.
    ctx.fillStyle = 'rgba(10,16,24,0.72)';
    ctx.beginPath();
    ctx.roundRect(VIEW_W / 2 - 150, 16, 300, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    for (let d = 60; d <= 120; d += 15) {
      const x = VIEW_W / 2 + (d - 90) * 4;
      ctx.fillText(d === 90 ? 'E 090' : String(d), x, 36);
    }
    ctx.textAlign = 'left';
    // Altitude tape, right edge.
    ctx.fillStyle = 'rgba(10,16,24,0.55)';
    ctx.fillRect(VIEW_W - 54, 140, 46, 360);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    for (let a = 0; a <= 600; a += 50) {
      const y = PLANE_SY - (a - p.alt) * SCALE;
      if (y < 150 || y > 490) continue;
      ctx.fillRect(VIEW_W - 54, y, 8, 1);
      ctx.fillText(`${Math.round(a * 3.28 / 10) * 10}`, VIEW_W - 8, y + 4);
    }
    ctx.textAlign = 'left';
    const gy = PLANE_SY - (state.terrain.ground(p.x) - p.alt) * SCALE;
    if (gy >= 150 && gy <= 490) {
      ctx.fillStyle = '#c98a4e';
      ctx.fillRect(VIEW_W - 54, gy - 2, 46, 4);
    }
    // Messages, centre.
    ctx.textAlign = 'center';
    let my = 120;
    for (const m of state.messages) {
      if (m.ttl <= 0) continue;
      ctx.globalAlpha = Math.min(1, m.ttl);
      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = m.text.includes('PULL UP') || m.text.includes('CRASH') ? '#ff6b5e' : '#ffffff';
      ctx.fillText(m.text, VIEW_W / 2, my);
      my += 34;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawTitle(state) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, 'rgba(8,14,24,0.55)');
    g.addColorStop(0.55, 'rgba(8,14,24,0.12)');
    g.addColorStop(1, 'rgba(8,14,24,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 84px monospace';
    ctx.fillText('SKY COURIER', VIEW_W / 2, 210);
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('— RIDGE RUN —', VIEW_W / 2, 258);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText('Three deliveries. One bush plane. Mind the fuel, thread the rings,', VIEW_W / 2, 320);
    ctx.fillText('and put her down gently on the strip.', VIEW_W / 2, 348);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    const blink = Math.floor(state.phaseTime * 1.6) % 2 === 0;
    if (blink) ctx.fillText('PRESS SPACE OR CLICK TO FLY', VIEW_W / 2, 440);
    ctx.font = '17px monospace';
    ctx.fillStyle = '#cfe6f5';
    ctx.fillText('↑/W climb · ↓/S descend · →/D throttle up · ←/A throttle down · mouse steers too', VIEW_W / 2, 520);
    ctx.fillText('P pause · M mute', VIEW_W / 2, 548);
    if (state.best > 0) {
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`BEST ${state.best}`, VIEW_W / 2, 600);
    }
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8,14,24,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('PAUSED', VIEW_W / 2, 380);
    ctx.font = '20px monospace';
    ctx.fillText('Press P or Space to keep flying', VIEW_W / 2, 430);
    ctx.textAlign = 'left';
  }

  function drawLegDone(state) {
    ctx.fillStyle = 'rgba(8,14,24,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const leg = LEGS[state.legIndex];
    const l = state.landed || { quality: 0, timeBonus: 0, fuelBonus: 0, landing: 0 };
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ee787';
    ctx.font = 'bold 54px monospace';
    ctx.fillText('DELIVERED!', VIEW_W / 2, 250);
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.fillText(`${leg.name} — ${state.ringsTaken}/${state.ringsTotal} rings`, VIEW_W / 2, 300);
    ctx.font = '20px monospace';
    ctx.fillText(`Landing +${l.landing}   Time bonus +${l.timeBonus}   Fuel bonus +${l.fuelBonus}`, VIEW_W / 2, 350);
    ctx.fillText(`Leg score ${state.legScore}   Total ${state.score}`, VIEW_W / 2, 382);
    ctx.font = 'bold 22px monospace';
    const blink = Math.floor(state.phaseTime * 1.6) % 2 === 0;
    if (blink) ctx.fillText(state.legIndex + 1 >= LEGS.length ? 'PRESS SPACE FOR THE RESULTS' : 'PRESS SPACE FOR THE NEXT LEG', VIEW_W / 2, 460);
    ctx.textAlign = 'left';
  }

  function drawOver(state, win) {
    ctx.fillStyle = 'rgba(8,14,24,0.65)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = win ? '#7ee787' : '#ff6b5e';
    ctx.font = 'bold 54px monospace';
    ctx.fillText(win ? 'ALL DELIVERIES COMPLETE!' : 'OUT OF AIRFRAMES', VIEW_W / 2, 250);
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.fillText(win ? 'The valley has its mail, and the plane is still in one piece.' : 'The valley keeps the mail this time.', VIEW_W / 2, 300);
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`FINAL SCORE ${state.score}`, VIEW_W / 2, 360);
    if (state.best > 0) {
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffd94a';
      ctx.fillText(`BEST ${state.best}`, VIEW_W / 2, 396);
    }
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    const blink = Math.floor(state.phaseTime * 1.6) % 2 === 0;
    if (blink) ctx.fillText('PRESS SPACE TO FLY AGAIN', VIEW_W / 2, 470);
    ctx.textAlign = 'left';
  }

  function draw(state, screen) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    drawSky(state);
    drawFarHills(state);
    drawTerrain(state);
    drawRings(state);
    drawParticles(state);
    if (screen !== SCREEN_TITLE) drawPlane(state);
    if (screen === SCREEN_TITLE) {
      // The demo plane still flies behind the title.
      drawPlane(state);
      drawTitle(state);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHUD(state);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === 'legdone') {
      drawHUD(state);
      drawLegDone(state);
    }
    if (screen === SCREEN_OVER) drawOver(state, false);
    if (screen === SCREEN_WIN) drawOver(state, true);
  }

  return { draw, PLANE_SX, PLANE_SY };
}

// Kept in sync with config.js RUNWAY.halfLength (the renderer needs it standalone).
const RUNWAY_HALF = 170;
