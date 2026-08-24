const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const core = require(path.join(ROOT, 'src', 'game-v121-core.js'));
const runtime = fs.readFileSync(path.join(ROOT, 'src', 'game-07.js'), 'utf8');
const progressRuntime = fs.readFileSync(path.join(ROOT, 'src', 'game-08.js'), 'utf8');

class FakeClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(...names) { for (const n of names) this.values.add(n); }
  remove(...names) { for (const n of names) this.values.delete(n); }
  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name); else this.values.delete(name);
    return next;
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.classList = new FakeClassList();
    this.style = { values: {}, setProperty: (k, v) => { this.style.values[k] = v; } };
    this.listeners = new Map();
    this.children = [];
    this.dataset = {};
    this.textContent = '';
    this.innerHTML = '';
    this.title = '';
  }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  setAttribute(name, value) { this[name] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
  querySelector(selector) {
    if (selector === '#fullscreenHintClose') return new FakeElement('fullscreenHintClose');
    return null;
  }
}

function makeContext() {
  const ids = [
    'fullscreenButton', 'upgradeProgressHud', 'upgradeProgressFill', 'upgradeProgressValue', 'upgradeProgressLabel',
    'upgradeChoices',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const documentElement = new FakeElement('html');
  const body = new FakeElement('body');
  const documentListeners = new Map();
  const document = {
    documentElement,
    body,
    fullscreenElement: null,
    webkitFullscreenElement: null,
    getElementById(id) { return elements[id] || null; },
    createElement() { return new FakeElement(); },
    addEventListener(type, fn) { documentListeners.set(type, fn); },
  };

  const visualViewport = { height: 612.4, width: 390, offsetTop: 0, addEventListener() {} };
  const window = {
    PulseV121Core: core,
    PulseCourier: {
      version: '1.2.0',
      getSnapshot() { return { player: { hull: context.state.player.hull } }; },
    },
    visualViewport,
    innerHeight: 844,
    innerWidth: 390,
    matchMedia() { return { matches: false }; },
    addEventListener() {},
  };

  const context = {
    window,
    document,
    navigator: { standalone: false },
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn) { fn(); return 1; },
    state: {
      mode: 'upgrade',
      nextUpgradeIndex: 0,
      player: { hull: 1, maxHull: 3, invulnerable: 0, hitFlash: 0, x: 100, y: 120 },
      particles: [],
    },
    dom: { upgradeChoices: elements.upgradeChoices },
    upgradeReturnMode: 'playing',
    UPGRADE_THRESHOLDS: [16, 38, 72, 118, 180],
    renderUpgradeChoices() {},
    chooseUpgrade() {},
    updateHud() {},
    pickUpgradeChoices() { return [{ id: 'overdrive', name: '超載推進', icon: '»', description: 'x' }]; },
    applyUpgrade(player) { return player; },
    upgradeProgressScore() { return context._progress; },
    _progress: 11,
    spawnBurst() {},
    playTone() {},
    syncUiState() { context.updateHud(); },
    syncArenaViewport() {},
    lastFrame: 0,
    performance: { now: () => 1234 },
  };
  window.window = window;
  window.document = document;
  return { context, elements, documentElement, documentListeners };
}

test('choosing emergency repair restores two hull and starts 1.5 second protection', () => {
  const { context } = makeContext();
  vm.runInNewContext(runtime, context, { filename: 'game-07.js' });
  context.chooseUpgrade('emergency-repair');
  assert.equal(context.state.player.hull, 3);
  assert.equal(context.state.player.invulnerable, 1.5);
  assert.equal(context.state.mode, 'playing');
  assert.ok(context.state.particles.some((p) => p.type === 'ring' && p.color === '#66efff'));
});

test('upgrade progress HUD follows the current threshold segment and highlights near-ready state', () => {
  const { context, elements } = makeContext();
  context.state.mode = 'playing';
  vm.runInNewContext(runtime, context, { filename: 'game-07.js' });
  vm.runInNewContext(progressRuntime, context, { filename: 'game-08.js' });

  context._progress = 11;
  context.state.nextUpgradeIndex = 0;
  context.updateHud();
  assert.equal(elements.upgradeProgressValue.textContent, '11 / 16');
  assert.equal(elements.upgradeProgressFill.style.width, '68.8%');
  assert.equal(elements.upgradeProgressHud.classList.contains('is-near-ready'), false);

  context._progress = 15;
  context.updateHud();
  assert.equal(elements.upgradeProgressHud.classList.contains('is-near-ready'), true);
  assert.match(elements.upgradeProgressLabel.textContent, /READY SOON/);

  context._progress = 27;
  context.state.nextUpgradeIndex = 1;
  context.updateHud();
  assert.equal(elements.upgradeProgressValue.textContent, '11 / 22');
  assert.equal(elements.upgradeProgressFill.style.width, '50%');
});

test('upgrade progress HUD switches to MAX after all five choices', () => {
  const { context, elements } = makeContext();
  context.state.mode = 'playing';
  vm.runInNewContext(runtime, context, { filename: 'game-07.js' });
  vm.runInNewContext(progressRuntime, context, { filename: 'game-08.js' });
  context.state.nextUpgradeIndex = 5;
  context._progress = 180;
  context.updateHud();
  assert.equal(elements.upgradeProgressLabel.textContent, 'UPGRADES MAX');
  assert.equal(elements.upgradeProgressValue.textContent, 'MAX');
  assert.equal(elements.upgradeProgressFill.style.width, '100%');
});



test('fullscreen fallback shows non-blocking inline guidance instead of a modal overlay', async () => {
  const { context } = makeContext();
  vm.runInNewContext(runtime, context, { filename: 'game-07.js' });
  const result = await context.window.PulseCourier.requestFullscreen();
  assert.equal(result, false);
  const hint = context.document.body.children.find((child) => child.id === 'fullscreenInstallHint');
  assert.ok(hint, 'fallback guidance should be rendered in-page');
  assert.equal(hint.role, 'status');
  assert.equal(hint['aria-modal'], undefined, 'fallback must not be modal');
  assert.match(hint.className, /fullscreen-inline-hint/);
});



test('v1.2.1 public API patches after base init when loaded before DOMContentLoaded', () => {
  const { context, documentListeners } = makeContext();
  context.window.PulseCourier = undefined;
  vm.runInNewContext(runtime, context, { filename: 'game-07.js' });
  assert.equal(context.window.PulseCourier, undefined);
  context.window.PulseCourier = {
    version: '1.2.0',
    getSnapshot() { return { player: {} }; },
  };
  const onReady = documentListeners.get('DOMContentLoaded');
  assert.equal(typeof onReady, 'function', 'v1.2.1 should wait for the base runtime API');
  onReady();
  assert.equal(context.window.PulseCourier.version, '1.2.1');
  assert.equal(typeof context.window.PulseCourier.requestFullscreen, 'function');
});

test('visual viewport height is written to CSS app height', () => {
  const { context, documentElement } = makeContext();
  vm.runInNewContext(runtime, context, { filename: 'game-07.js' });
  assert.equal(documentElement.style.values['--app-height'], '612px');
  assert.equal(documentElement.style.values['--app-width'], '390px');
});
