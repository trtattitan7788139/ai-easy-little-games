'use strict';

function spawnBurst(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) state.particles.push(makeParticle(x, y, color, 0.35 + Math.random() * 0.35, speed));
}

function spawnPulseRing(x, y, radius) {
  state.particles.push({ type: 'ring', x, y, color: '#b89cff', life: 0.42, maxLife: 0.42, radius, current: 18 });
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    if (particle.type === 'ring') {
      const t = 1 - particle.life / particle.maxLife;
      particle.current = 18 + (particle.radius - 18) * t;
    } else {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.92, dt * 60);
      particle.vy *= Math.pow(0.92, dt * 60);
    }
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function render(now) {
  ctx.save();
  if (state.screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
  }
  drawBackground(now);
  drawRelay(now);
  drawCells(now);
  drawEnemies(now);
  drawParticles();
  if (state.mode !== 'menu') drawPlayer(now);
  if (state.mode === 'playing') drawMissionHints();
  ctx.restore();

  if (state.flash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 72, 98, ${state.flash * 1.2})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function drawBackground(now) {
  const t = now * 0.001;
  const gradient = ctx.createRadialGradient(RELAY.x, RELAY.y, 10, RELAY.x, RELAY.y, 520);
  gradient.addColorStop(0, '#0b1a2a');
  gradient.addColorStop(0.55, '#07111f');
  gradient.addColorStop(1, '#040812');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  for (const star of state.stars) {
    ctx.globalAlpha = star.alpha * (0.7 + Math.sin(t * 0.8 + star.x) * 0.3);
    ctx.fillStyle = '#b9e9ff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(77, 151, 186, 0.075)';
  ctx.lineWidth = 1;
  const offset = (t * 8) % 40;
  for (let x = -40 + offset; x < W + 40; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 66); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 70 + offset; y < H + 40; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(102, 239, 255, 0.12)';
  ctx.strokeRect(12, 72, W - 24, H - 86);
}

function drawRelay(now) {
  const t = now * 0.001;
  ctx.save();
  ctx.translate(RELAY.x, RELAY.y);

  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 96);
  glow.addColorStop(0, 'rgba(102, 239, 255, .18)');
  glow.addColorStop(0.4, 'rgba(22, 217, 255, .07)');
  glow.addColorStop(1, 'rgba(22, 217, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 96, 0, TAU); ctx.fill();

  ctx.strokeStyle = 'rgba(102, 239, 255, .54)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.lineDashOffset = -t * 16;
  ctx.beginPath(); ctx.arc(0, 0, RELAY.r, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(t * 0.12);
  ctx.strokeStyle = 'rgba(154, 125, 255, .35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0.3, 2.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 40, Math.PI + 0.3, Math.PI + 2.6); ctx.stroke();
  ctx.rotate(-t * 0.12);

  ctx.fillStyle = '#d7fbff';
  ctx.font = '800 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('RELAY', 0, 3);
  ctx.restore();
}

function drawCells(now) {
  const t = now * 0.001;
  for (const cell of state.cells) {
    const pulse = 1 + Math.sin(t * 4 + cell.phase) * 0.16;
    ctx.save();
    ctx.translate(cell.x, cell.y);
    ctx.rotate(t * cell.spin + cell.phase);
    ctx.shadowBlur = cell.highlight ? 22 : 12;
    ctx.shadowColor = cell.highlight ? '#fff29a' : '#ffe45c';
    ctx.strokeStyle = cell.dropped ? '#ffb45c' : '#ffe45c';
    ctx.fillStyle = cell.highlight ? 'rgba(255, 242, 154, .28)' : 'rgba(255, 228, 92, .18)';
    ctx.lineWidth = cell.highlight ? 2.2 : 1.4;
    const r = cell.r * pulse;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.75, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.75, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies(now) {
  const t = now * 0.001;
  for (const enemy of state.enemies) {
    ctx.save();
    if (enemy.type === 'charger' && enemy.phase === 'telegraph') {
      ctx.strokeStyle = `rgba(255, 95, 120, ${0.2 + Math.sin(t * 18) * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 7]);
      ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(enemy.targetX, enemy.targetY); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(t * (enemy.type === 'charger' ? -1.5 : 1.15) + enemy.id);
    const color = enemy.dummy ? '#b89cff' : enemy.type === 'charger' ? '#ff6b7f' : '#ff496d';
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.fillStyle = enemy.dummy ? 'rgba(184, 156, 255, .12)' : 'rgba(255, 73, 109, .10)';
    ctx.lineWidth = 1.5;
    const r = enemy.r;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.8); ctx.lineTo(0, r * 0.45); ctx.lineTo(-r, r * 0.8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (enemy.type === 'charger' && enemy.phase === 'telegraph') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

function drawPlayer(now) {
  const p = state.player;
  const t = now * 0.001;
  ctx.save();
  ctx.translate(p.x, p.y);
  const angle = Math.atan2(p.lastDirY, p.lastDirX) + Math.PI / 2;
  ctx.rotate(angle);
  if (p.invulnerable > 0 && p.dashRemaining <= 0) ctx.globalAlpha = 0.45 + Math.sin(t * 34) * 0.25;
  ctx.shadowBlur = p.dashRemaining > 0 ? 26 : 15;
  ctx.shadowColor = '#66efff';
  ctx.strokeStyle = p.hitFlash > 0 ? '#ffffff' : '#66efff';
  ctx.fillStyle = 'rgba(102, 239, 255, .11)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -18); ctx.lineTo(11, 12); ctx.lineTo(0, 7); ctx.lineTo(-11, 12); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e7fdff';
  ctx.beginPath(); ctx.arc(0, -2, 2.4, 0, TAU); ctx.fill();
  ctx.restore();

  if (state.carried > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 228, 92, .28)';
    ctx.lineWidth = 1;
    for (let i = 0; i < state.carried; i += 1) {
      const angle2 = t * 1.8 + (TAU * i) / state.carried;
      const radius = 25 + (i % 2) * 4;
      const x = p.x + Math.cos(angle2) * radius;
      const y = p.y + Math.sin(angle2) * radius;
      ctx.fillStyle = '#ffe45c';
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = particle.color;
    ctx.fillStyle = particle.color;
    if (particle.type === 'ring') {
      ctx.lineWidth = 2 + alpha * 2;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.current, 0, TAU); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * alpha, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

function drawMissionHints() {
  if (state.elapsed < 7) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = `rgba(180, 213, 231, ${clamp((7 - state.elapsed) / 2, 0, 0.85)})`;
    ctx.fillText('撿黃色能量 → 回中央 RELAY 存入 → 貨越多倍率越高', W / 2, 102);
    ctx.restore();
  }
  if (state.elapsed >= MISSION_SECONDS && state.banked < MISSION_BANKED) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillStyle = '#ffe45c';
    ctx.fillText(`OVERTIME — 再存入 ${MISSION_BANKED - state.banked} 能量即可完成`, W / 2, 102);
    ctx.restore();
  }
}
