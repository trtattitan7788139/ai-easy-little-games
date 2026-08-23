'use strict';

function updateCharger(enemy, dt) {
  enemy.phaseTimer -= dt;
  if (enemy.phase === 'seek') {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    enemy.x += (dx / distance) * enemy.speed * dt;
    enemy.y += (dy / distance) * enemy.speed * dt;
    if (enemy.phaseTimer <= 0) {
      enemy.phase = 'telegraph';
      enemy.phaseTimer = 0.72;
      enemy.targetX = state.player.x;
      enemy.targetY = state.player.y;
      playTone(145, 0.08, 'square', 0.012);
    }
  } else if (enemy.phase === 'telegraph') {
    if (enemy.phaseTimer <= 0) {
      const dx = enemy.targetX - enemy.x;
      const dy = enemy.targetY - enemy.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      enemy.vx = (dx / distance) * 390;
      enemy.vy = (dy / distance) * 390;
      enemy.phase = 'charge';
      enemy.phaseTimer = 0.58;
    }
  } else if (enemy.phase === 'charge') {
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    if (enemy.phaseTimer <= 0 || enemy.x < -30 || enemy.x > W + 30 || enemy.y < 50 || enemy.y > H + 30) {
      enemy.phase = 'seek';
      enemy.phaseTimer = 2.4 + Math.random() * 1.1;
      enemy.x = clamp(enemy.x, 18, W - 18);
      enemy.y = clamp(enemy.y, 78, H - 18);
    }
  }
}

function updateTutorialDummies(dt) {
  for (const enemy of state.enemies) {
    enemy.phaseTimer += dt;
    const baseAngle = enemy.baseAngle == null ? 0 : enemy.baseAngle;
    const angle = baseAngle + Math.sin(enemy.phaseTimer * 0.8) * 0.12;
    enemy.x = state.player.x + Math.cos(angle) * enemy.orbitRadius;
    enemy.y = state.player.y + Math.sin(angle) * enemy.orbitRadius;
  }
}

function handleEnemyCollisions() {
  const p = state.player;
  const kept = [];
  for (const enemy of state.enemies) {
    if (circlesOverlap(p, enemy)) {
      if (p.dashRemaining > 0) {
        state.score += 2;
        spawnBurst(enemy.x, enemy.y, '#66efff', 10, 130);
        continue;
      }
      if (p.invulnerable <= 0) {
        damagePlayer(enemy);
        continue;
      }
    }
    kept.push(enemy);
  }
  state.enemies = kept;
}

function damagePlayer(enemy) {
  const p = state.player;
  p.hull -= 1;
  p.invulnerable = 1.05;
  p.hitFlash = 0.34;
  state.flash = 0.14;
  state.screenShake = 8;
  const dropped = Math.ceil(state.carried / 2);
  state.carried -= dropped;
  for (let i = 0; i < dropped; i += 1) {
    const angle = Math.random() * TAU;
    const distance = 30 + Math.random() * 55;
    spawnCell(p.x + Math.cos(angle) * distance, p.y + Math.sin(angle) * distance, { dropped: true, life: 18 });
  }
  spawnBurst(p.x, p.y, '#ff5f78', 18, 180);
  playTone(90, 0.16, 'sawtooth', 0.045);
  if (enemy) spawnBurst(enemy.x, enemy.y, '#ff8396', 7, 110);
}

function checkUpgrade() {
  if (state.nextUpgradeIndex >= UPGRADE_THRESHOLDS.length) return;
  if (state.score < UPGRADE_THRESHOLDS[state.nextUpgradeIndex]) return;
  upgradeReturnMode = state.mode;
  state.mode = 'upgrade';
  state.nextUpgradeIndex += 1;
  keys.clear();
  renderUpgradeChoices();
  syncUiState();
  playTone(520, 0.10, 'triangle', 0.025);
}

function renderUpgradeChoices() {
  dom.upgradeChoices.textContent = '';
  for (const upgrade of pickUpgradeChoices(3)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upgrade-choice';
    button.innerHTML = `<span class="upgrade-icon" aria-hidden="true">${upgrade.icon}</span><h3>${upgrade.name}</h3><p>${upgrade.description}</p>`;
    button.addEventListener('click', () => chooseUpgrade(upgrade.id));
    dom.upgradeChoices.appendChild(button);
  }
}

function chooseUpgrade(id) {
  state.player = { ...state.player, ...applyUpgrade(state.player, id) };
  state.mode = upgradeReturnMode;
  lastFrame = performance.now();
  playTone(760, 0.07, 'sine', 0.025);
  syncUiState();
}

function finishRun(victory) {
  state.mode = victory ? 'victory' : 'gameover';
  keys.clear();
  const oldBestScore = Number(readStorage(STORAGE_KEYS.bestScore, '0')) || 0;
  const oldBestBanked = Number(readStorage(STORAGE_KEYS.bestBanked, '0')) || 0;
  if (state.score > oldBestScore) writeStorage(STORAGE_KEYS.bestScore, String(state.score));
  if (state.banked > oldBestBanked) writeStorage(STORAGE_KEYS.bestBanked, String(state.banked));
  dom.endKicker.textContent = victory ? 'MISSION COMPLETE' : 'COURIER OFFLINE';
  dom.endTitle.textContent = victory ? '任務完成' : '任務失敗';
  dom.endSummary.textContent = victory
    ? '你撐過了能量風暴，並完成中繼站所需的能量配送。'
    : '船體已失去反應。下一局可以少貪一點，先把貨送回 Relay。';
  dom.finalScore.textContent = String(state.score);
  dom.finalBanked.textContent = String(state.banked);
  updateBestLabels();
  syncUiState();
  playTone(victory ? 660 : 120, victory ? 0.18 : 0.22, victory ? 'triangle' : 'sawtooth', 0.045);
}

function setTutorialStep(step) {
  state.tutorialStep = clamp(step, 0, 5);
  state.cells = [];
  state.enemies = [];
  dom.tutorialFinishButton.classList.add('is-hidden');

  const steps = [
    ['移動', '使用 WASD 或方向鍵移動。只要離開起點一小段距離即可完成。'],
    ['拾取能量', '前往閃爍的黃色能量球。靠近它就會自動拾取，不需要按其他按鍵。'],
    ['把貨送回 Relay', '現在你身上有貨。回到畫面中央的藍色 Relay，接觸它就會自動存入。'],
    ['使用 Dash', '按 SPACE 衝刺。Dash 很快，而且衝刺期間短暫無敵，是被包圍時最重要的逃生工具。'],
    ['使用 Pulse', 'Pulse 已為教學充滿。按 E 釋放脈衝，清除你附近的訓練無人機。'],
    ['讀懂 HUD', 'HULL 是生命、CARGO 是身上貨物、RISK 是存入倍率、BANKED 是任務進度。正式任務要撐過 4 分鐘並存入至少 60 能量。'],
  ];
  const [title, text] = steps[state.tutorialStep];
  dom.tutorialStep.textContent = `步驟 ${state.tutorialStep + 1} / 6 · ${title}`;
  dom.tutorialText.textContent = text;
  dom.tutorialProgress.textContent = Array.from({ length: 6 }, (_, i) => (i <= state.tutorialStep ? '●' : '○')).join(' ');

  if (state.tutorialStep === 1) {
    const x = clamp(state.player.x + (state.player.x < W * 0.7 ? 125 : -125), 90, W - 90);
    const y = clamp(state.player.y - 55, 120, H - 90);
    spawnCell(x, y, { highlight: true });
  } else if (state.tutorialStep === 3) {
    state.player.dashCooldownRemaining = 0;
  } else if (state.tutorialStep === 4) {
    state.pulse = 100;
    spawnTutorialPulseTargets();
  } else if (state.tutorialStep === 5) {
    writeStorage(STORAGE_KEYS.tutorialDone, 'true');
    dom.tutorialFinishButton.classList.remove('is-hidden');
    state.pulse = 0;
  }
  updateHud();
}

function spawnTutorialPulseTargets() {
  if (state.tutorialPulseSpawned) return;
  state.tutorialPulseSpawned = true;
  const radius = Math.min(105, state.player.pulseRadius * 0.72);
  for (let i = 0; i < 5; i += 1) {
    const angle = (TAU * i) / 5;
    state.enemies.push({
      id: idCounter++, type: 'chaser', dummy: true,
      x: state.player.x + Math.cos(angle) * radius,
      y: state.player.y + Math.sin(angle) * radius,
      r: 12, phaseTimer: Math.random() * 5, baseAngle: angle, orbitRadius: radius,
    });
  }
}

function finishTutorialAndStart() {
  writeStorage(STORAGE_KEYS.tutorialDone, 'true');
  startMission();
}

function updateAmbient(dt) {
  for (const star of state.stars) {
    star.y += star.drift * dt * 0.15;
    if (star.y > H) star.y = 72;
  }
  state.screenShake = Math.max(0, state.screenShake - dt * 22);
  state.flash = Math.max(0, state.flash - dt);
}

function makeParticle(x, y, color, life, speed) {
  const angle = Math.random() * TAU;
  const velocity = (speed || 80) * (0.35 + Math.random() * 0.65);
  return {
    type: 'spark', x, y, color,
    vx: Math.cos(angle) * velocity,
    vy: Math.sin(angle) * velocity,
    life: life || 0.5,
    maxLife: life || 0.5,
    size: 1 + Math.random() * 2.5,
  };
}
