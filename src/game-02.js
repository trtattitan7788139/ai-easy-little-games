'use strict';

const CELL_SPAWN_MIN = 0.95;
const CELL_SPAWN_MAX = 1.35;
const CELL_DOUBLE_CHANCE = 0.08;
const MAX_NATURAL_CELLS = 22;

function tryDash() {
  if (state.mode !== 'playing' && state.mode !== 'tutorial') return false;
  const p = state.player;
  if (p.dashCooldownRemaining > 0 || p.dashRemaining > 0) return false;
  let { x: dx, y: dy } = inputVector();
  if (dx === 0 && dy === 0) {
    dx = p.lastDirX;
    dy = p.lastDirY;
  }
  p.lastDirX = dx;
  p.lastDirY = dy;
  p.dashRemaining = p.dashDuration;
  p.dashCooldownRemaining = p.dashCooldown;
  p.invulnerable = Math.max(p.invulnerable, p.dashDuration + 0.07);
  spawnBurst(p.x, p.y, '#66efff', 12, 150);
  playTone(190, 0.08, 'sawtooth', 0.025);
  if (state.mode === 'tutorial' && state.tutorialStep === 3) setTutorialStep(4);
  return true;
}

function tryPulse() {
  if (state.mode !== 'playing' && state.mode !== 'tutorial') return false;
  if (state.pulse < 100) return false;
  const p = state.player;
  state.pulse = 0;
  let removed = 0;
  state.enemies = state.enemies.filter((enemy) => {
    const dx = enemy.x - p.x;
    const dy = enemy.y - p.y;
    const inside = dx * dx + dy * dy <= p.pulseRadius * p.pulseRadius;
    if (inside) {
      removed += 1;
      spawnBurst(enemy.x, enemy.y, '#b89cff', 8, 130);
    }
    return !inside;
  });
  state.score += removed * 3;
  state.screenShake = Math.max(state.screenShake, 4);
  spawnPulseRing(p.x, p.y, p.pulseRadius);
  playTone(110, 0.18, 'sine', 0.045);
  if (state.mode === 'tutorial' && state.tutorialStep === 4) setTutorialStep(5);
  return true;
}

function inputVector() {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (x !== 0 || y !== 0) {
    const length = Math.hypot(x, y);
    x /= length;
    y /= length;
  }
  return { x, y };
}

function update(dt) {
  if (state.mode === 'playing') updateMission(dt);
  else if (state.mode === 'tutorial') updateTutorial(dt);
  updateAmbient(dt);
  updateParticles(dt);
  updateHud();
}

function updateMission(dt) {
  state.elapsed += dt;
  updatePlayer(dt);
  updateCells(dt, true);
  updateEnemies(dt);
  handleCollections();
  handleBanking();
  handleEnemyCollisions();
  checkUpgrade();

  const status = missionStatus({ hull: state.player.hull, elapsed: state.elapsed, banked: state.banked });
  if (status === 'victory') finishRun(true);
  else if (status === 'gameover') finishRun(false);
}

function updateTutorial(dt) {
  updatePlayer(dt);
  updateCells(dt, false);
  updateTutorialDummies(dt);
  handleCollections();
  handleBanking();

  if (state.tutorialStep === 0) {
    const dx = state.player.x - state.tutorialStart.x;
    const dy = state.player.y - state.tutorialStart.y;
    state.tutorialMovedDistance = Math.max(state.tutorialMovedDistance, Math.hypot(dx, dy));
    if (state.tutorialMovedDistance >= 55) setTutorialStep(1);
  }
}

function updatePlayer(dt) {
  const p = state.player;
  p.dashCooldownRemaining = Math.max(0, p.dashCooldownRemaining - dt);
  p.dashRemaining = Math.max(0, p.dashRemaining - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);

  const direction = inputVector();
  if (direction.x !== 0 || direction.y !== 0) {
    p.lastDirX = direction.x;
    p.lastDirY = direction.y;
  }
  const dashFactor = p.dashRemaining > 0 ? p.dashMultiplier : 1;
  const speed = p.speed * carrySpeedFactor(state.carried) * dashFactor;
  p.x += direction.x * speed * dt;
  p.y += direction.y * speed * dt;
  p.x = clamp(p.x, 28, W - 28);
  p.y = clamp(p.y, 72, H - 30);

  if (p.dashRemaining > 0 && (direction.x !== 0 || direction.y !== 0) && Math.random() < 0.75) {
    state.particles.push(makeParticle(p.x - direction.x * 10, p.y - direction.y * 10, '#66efff', 0.28, 25));
  }
}

function updateCells(dt, allowSpawning) {
  for (const cell of state.cells) {
    cell.phase += dt * (1.8 + cell.spin);
    if (cell.life !== Infinity) cell.life -= dt;
  }
  state.cells = state.cells.filter((cell) => cell.life > 0);

  if (!allowSpawning) return;
  state.cellSpawnTimer -= dt;
  if (state.cellSpawnTimer <= 0 && state.cells.length < MAX_NATURAL_CELLS) {
    spawnCell();
    if (Math.random() < CELL_DOUBLE_CHANCE && state.cells.length < MAX_NATURAL_CELLS) spawnCell();
    state.cellSpawnTimer = CELL_SPAWN_MIN + Math.random() * (CELL_SPAWN_MAX - CELL_SPAWN_MIN);
  }
}

function spawnCell(x, y, options) {
  const opts = options || {};
  let cx = x;
  let cy = y;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    let tries = 0;
    do {
      cx = 55 + Math.random() * (W - 110);
      cy = 95 + Math.random() * (H - 150);
      tries += 1;
    } while (tries < 12 && Math.hypot(cx - RELAY.x, cy - RELAY.y) < 105);
  }
  state.cells.push({
    id: idCounter++,
    x: clamp(cx, 35, W - 35),
    y: clamp(cy, 88, H - 35),
    r: opts.highlight ? 12 : 9,
    phase: Math.random() * TAU,
    spin: 0.6 + Math.random() * 1.2,
    life: opts.life == null ? Infinity : opts.life,
    highlight: !!opts.highlight,
    dropped: !!opts.dropped,
  });
}

function handleCollections() {
  if (state.carried >= state.player.capacity) return;
  const kept = [];
  let collected = 0;
  for (const cell of state.cells) {
    if (state.carried + collected < state.player.capacity && circlesOverlap(state.player, cell)) {
      collected += 1;
      spawnBurst(cell.x, cell.y, cell.highlight ? '#fff29a' : '#ffe45c', 7, 75);
    } else {
      kept.push(cell);
    }
  }
  if (collected > 0) {
    state.cells = kept;
    state.carried += collected;
    state.score += collected;
    playTone(680 + state.carried * 18, 0.045, 'sine', 0.018);
    if (state.mode === 'tutorial' && state.tutorialStep === 1) setTutorialStep(2);
  }
}

function handleBanking() {
  if (state.carried <= 0) return;
  if (!circlesOverlap(state.player, RELAY)) return;
  const amount = state.carried;
  const reward = bankReward(amount, state.player.bankBonus);
  state.carried = 0;
  state.banked += amount;
  state.score += reward;
  state.pulse = clamp(state.pulse + amount * state.player.pulseGain, 0, 100);
  spawnBurst(RELAY.x, RELAY.y, '#66efff', 18, 160);
  playTone(410, 0.08, 'triangle', 0.03);
  setTimeout(() => playTone(620, 0.06, 'sine', 0.018), 35);
  if (state.mode === 'tutorial' && state.tutorialStep === 2) setTutorialStep(3);
}

function updateEnemies(dt) {
  state.spawnTimer -= dt;
  const maxEnemies = 10 + Math.min(12, Math.floor(state.elapsed / 28));
  if (state.spawnTimer <= 0 && state.enemies.length < maxEnemies) {
    const chargerChance = state.elapsed > 40 ? Math.min(0.38, 0.12 + state.elapsed / 700) : 0;
    spawnEnemy(Math.random() < chargerChance ? 'charger' : 'chaser');
    state.spawnTimer = spawnInterval(state.elapsed, state.carried) * (0.92 + Math.random() * 0.25);
  }

  for (const enemy of state.enemies) {
    if (enemy.type === 'chaser') updateChaser(enemy, dt);
    else updateCharger(enemy, dt);
  }
}

function spawnEnemy(type, position) {
  let x;
  let y;
  if (position) {
    x = position.x;
    y = position.y;
  } else {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = 20; y = 90 + Math.random() * (H - 130); }
    else if (edge === 1) { x = W - 20; y = 90 + Math.random() * (H - 130); }
    else if (edge === 2) { x = 40 + Math.random() * (W - 80); y = 82; }
    else { x = 40 + Math.random() * (W - 80); y = H - 22; }
  }
  const charger = type === 'charger';
  state.enemies.push({
    id: idCounter++,
    type,
    x,
    y,
    r: charger ? 16 : 13,
    speed: charger ? 74 : 90 + Math.min(45, state.elapsed * 0.18),
    phase: 'seek',
    phaseTimer: 2.1 + Math.random() * 1.4,
    targetX: state.player.x,
    targetY: state.player.y,
    vx: 0,
    vy: 0,
    dummy: false,
  });
}

function updateChaser(enemy, dt) {
  const direction = steerTowardWithSeparation(enemy, state.player, state.enemies, 48, 1.35);
  enemy.x += direction.x * enemy.speed * dt;
  enemy.y += direction.y * enemy.speed * dt;
}
