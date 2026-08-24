'use strict';

(() => {
  const v121 = window.PulseV121Core;
  if (!v121) throw new Error('PulseV121Core failed to load before game-07.js');

  const REPAIR_UPGRADE = Object.freeze({
    id: 'emergency-repair',
    name: '緊急修復',
    icon: '✚',
    description: '立即恢復 2 格 HULL，不增加最大血量。',
  });

  function renderV121UpgradeChoices() {
    dom.upgradeChoices.textContent = '';
    const choices = pickUpgradeChoices(3, Math.random, state.player).slice();
    const repairChance = v121.repairOfferChance(state.player.hull, state.player.maxHull);
    if (choices.length > 0 && Math.random() < repairChance) {
      const replaceIndex = Math.floor(Math.random() * choices.length);
      choices[replaceIndex] = REPAIR_UPGRADE;
    }

    for (const upgrade of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-choice';
      button.dataset.upgradeId = upgrade.id;
      button.innerHTML = `<span class="upgrade-icon" aria-hidden="true">${upgrade.icon}</span><h3>${upgrade.name}</h3><p>${upgrade.description}</p>`;
      button.addEventListener('click', () => chooseUpgrade(upgrade.id));
      dom.upgradeChoices.appendChild(button);
    }
  }

  function applyUpgradeProtection() {
    const p = state.player;
    p.invulnerable = Math.max(p.invulnerable, v121.UPGRADE_GRACE_SECONDS);
    p.hitFlash = Math.max(p.hitFlash, 0.22);
    state.particles.push({
      type: 'ring', x: p.x, y: p.y, color: '#66efff',
      life: 0.52, maxLife: 0.52, radius: 92, current: 14,
    });
    spawnBurst(p.x, p.y, '#dffcff', 10, 92);
  }

  function chooseV121Upgrade(id) {
    if (id === REPAIR_UPGRADE.id) {
      const result = v121.healHull(state.player.hull, state.player.maxHull, 2);
      state.player.hull = result.hull;
      if (result.healed > 0) playTone(880, 0.09, 'sine', 0.025);
    } else {
      state.player = { ...state.player, ...applyUpgrade(state.player, id) };
    }

    applyUpgradeProtection();
    state.mode = upgradeReturnMode;
    lastFrame = performance.now();
    playTone(760, 0.07, 'sine', 0.025);
    syncUiState();
  }

  renderUpgradeChoices = renderV121UpgradeChoices;
  chooseUpgrade = chooseV121Upgrade;

  function isStandalone() {
    return window.matchMedia?.('(display-mode: standalone)').matches === true || navigator.standalone === true;
  }

  function fullscreenTarget() {
    return document.documentElement;
  }

  function nativeFullscreenRequest() {
    const target = fullscreenTarget();
    return target.requestFullscreen || target.webkitRequestFullscreen || null;
  }

  function nativeFullscreenExit() {
    return document.exitFullscreen || document.webkitExitFullscreen || null;
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function ensureInstallHint() {
    let hint = document.getElementById('fullscreenInstallHint');
    if (hint) return hint;
    hint = document.createElement('div');
    hint.id = 'fullscreenInstallHint';
    hint.className = 'fullscreen-inline-hint is-hidden';
    hint.setAttribute('role', 'status');
    hint.setAttribute('aria-live', 'polite');
    hint.setAttribute('aria-label', '全螢幕遊玩提示');
    hint.innerHTML = `
      <div class="fullscreen-install-card">
        <div>
          <strong>Safari 全螢幕提示</strong>
          <p>此瀏覽器無法直接進入真正全螢幕。iPhone 可用「分享 → 加入主畫面」，之後從主畫面開啟即可移除網址列；遊戲不會因這個提示暫停。</p>
        </div>
        <button id="fullscreenHintClose" class="fullscreen-hint-close" type="button" aria-label="關閉提示">×</button>
      </div>`;
    document.body.appendChild(hint);
    hint.querySelector('#fullscreenHintClose').addEventListener('click', () => hint.classList.add('is-hidden'));
    hint.addEventListener('click', (event) => {
      if (event.target === hint) hint.classList.add('is-hidden');
    });
    return hint;
  }

  let installHintTimer = 0;
  function showInstallHint() {
    const hint = ensureInstallHint();
    hint.classList.remove('is-hidden');
    clearTimeout(installHintTimer);
    installHintTimer = setTimeout(() => hint.classList.add('is-hidden'), 6500);
  }

  async function toggleFullscreenV121() {
    const request = nativeFullscreenRequest();
    const strategy = v121.fullscreenStrategy({ standalone: isStandalone(), canRequest: typeof request === 'function' });
    if (strategy === 'standalone') return true;

    if (fullscreenElement()) {
      const exit = nativeFullscreenExit();
      if (typeof exit === 'function') {
        try { await exit.call(document); return true; } catch (_) {}
      }
      return false;
    }

    if (strategy === 'native') {
      try {
        await request.call(fullscreenTarget(), { navigationUI: 'hide' });
        return true;
      } catch (_) {
        showInstallHint();
        return false;
      }
    }

    showInstallHint();
    return false;
  }

  function updateFullscreenButton() {
    const button = document.getElementById('fullscreenButton');
    if (!button) return;
    if (isStandalone()) {
      button.textContent = '▣';
      button.title = '已使用主畫面全螢幕模式';
      button.setAttribute('aria-label', '已使用全螢幕模式');
      return;
    }
    const active = Boolean(fullscreenElement());
    button.textContent = active ? '↙' : '⛶';
    button.title = active ? '離開全螢幕' : '全螢幕遊玩';
    button.setAttribute('aria-label', button.title);
  }

  function syncVisualViewportV121() {
    const vv = window.visualViewport;
    const height = v121.safeViewportHeight(vv?.height, window.innerHeight);
    const width = Math.max(1, Math.round(Number(vv?.width) || window.innerWidth || 1));
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    document.documentElement.style.setProperty('--app-width', `${width}px`);
    document.documentElement.style.setProperty('--app-offset-top', `${Math.round(Number(vv?.offsetTop) || 0)}px`);
    requestAnimationFrame(() => {
      try { syncArenaViewport(false); } catch (_) {}
    });
  }

  function bindV121Viewport() {
    let timer = 0;
    const schedule = (delay = 20) => {
      clearTimeout(timer);
      timer = setTimeout(syncVisualViewportV121, delay);
    };
    window.addEventListener('resize', () => schedule(30), { passive: true });
    window.addEventListener('orientationchange', () => {
      schedule(60);
      setTimeout(syncVisualViewportV121, 320);
    }, { passive: true });
    window.visualViewport?.addEventListener('resize', () => schedule(16), { passive: true });
    window.visualViewport?.addEventListener('scroll', () => schedule(16), { passive: true });
    document.addEventListener('fullscreenchange', () => { updateFullscreenButton(); schedule(20); });
    document.addEventListener('webkitfullscreenchange', () => { updateFullscreenButton(); schedule(20); });
    syncVisualViewportV121();
  }

  const fullscreenButton = document.getElementById('fullscreenButton');
  if (fullscreenButton) fullscreenButton.addEventListener('click', toggleFullscreenV121);
  updateFullscreenButton();
  bindV121Viewport();

  function patchPublicApiV121() {
    if (!window.PulseCourier) return false;
    if (window.PulseCourier.version === '1.2.1') return true;
    const previousApi = window.PulseCourier;
    window.PulseCourier = Object.freeze({
      ...previousApi,
      version: '1.2.1',
      requestFullscreen: toggleFullscreenV121,
      getSnapshot() {
        const snapshot = previousApi.getSnapshot();
        if (snapshot?.player) snapshot.player.invulnerable = state.player.invulnerable;
        return snapshot;
      },
    });
    return true;
  }

  if (!patchPublicApiV121()) {
    document.addEventListener('DOMContentLoaded', patchPublicApiV121, { once: true });
  }
})();
