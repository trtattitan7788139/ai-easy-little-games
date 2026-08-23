const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEBUG_PORT = 9333;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startProcess(command, args, options = {}) {
  return spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

async function waitFor(url, timeout = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      events.push(message);
    }
  });

  function send(method, params = {}) {
    const requestId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
    return result.result.value;
  }

  return { ws, send, evaluate, events };
}

async function holdKey(cdp, key, code, windowsVirtualKeyCode, ms) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode });
  await sleep(ms);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
  await sleep(60);
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-courier-chrome-'));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const coreJs = fs.readFileSync(path.join(ROOT, 'src/game-core.js'), 'utf8');
  const gameScripts = [...html.matchAll(/<script defer src="(src\/game(?:-[0-9]+)?\.js)"><\/script>/g)].map((match) => match[1]);
  let inlineHtml = html
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
    .replace('<script defer src="src/game-core.js"></script>', `<script>${coreJs}</script>`);
  for (const script of gameScripts) {
    const source = fs.readFileSync(path.join(ROOT, script), 'utf8');
    inlineHtml = inlineHtml.replace(`<script defer src="${script}"></script>`, `<script>${source}</script>`);
  }
  let chrome;
  let cdp;
  try {
    chrome = startProcess('chromium', [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
      'about:blank',
    ]);

    await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    let page;
    for (let i = 0; i < 50 && !page; i += 1) {
      const pages = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      page = pages.find((entry) => entry.type === 'page');
      if (!page) await sleep(100);
    }
    assert.ok(page, 'Chromium should expose the game page');

    cdp = await connectCdp(page.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    const frameTree = await cdp.send('Page.getFrameTree');
    await cdp.send('Page.setDocumentContent', { frameId: frameTree.frameTree.frame.id, html: inlineHtml });

    for (let i = 0; i < 50; i += 1) {
      if (await cdp.evaluate("document.readyState === 'complete' && !!window.PulseCourier")) break;
      await sleep(100);
    }
    const hasRuntime = await cdp.evaluate('!!window.PulseCourier');
    if (!hasRuntime) {
      const diag = {
        ready: await cdp.evaluate('document.readyState'),
        href: await cdp.evaluate('location.href'),
        title: await cdp.evaluate('document.title'),
        body: await cdp.evaluate('document.body && document.body.innerText.slice(0,300)'),
        core: await cdp.evaluate('typeof window.PulseCore'),
        canvas: await cdp.evaluate("!!document.getElementById('gameCanvas')"),
        finishButton: await cdp.evaluate("!!document.getElementById('tutorialFinishButton')"),
        exceptions: cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown'),
      };
      console.error('runtime diagnostics', JSON.stringify(diag, null, 2));
    }
    assert.equal(hasRuntime, true, 'game runtime API should be available');
    const frameWidth = await cdp.evaluate("document.querySelector('.game-frame').getBoundingClientRect().width");
    assert.ok(frameWidth > 1000, `desktop game frame should be enlarged, got ${frameWidth}px`);
    const pageHeight = await cdp.evaluate('document.documentElement.scrollHeight');
    assert.ok(pageHeight <= 802, `desktop shell should fit the 800px viewport without meaningful vertical scrolling, got ${pageHeight}px`);
    if (process.env.PULSE_MENU_SCREENSHOT) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.env.PULSE_MENU_SCREENSHOT, Buffer.from(shot.data, 'base64'));
    }

    await cdp.evaluate("document.getElementById('startButton').click()");
    await sleep(120);
    let snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.mode, 'playing');
    assert.equal(await cdp.evaluate("document.getElementById('menuScreen').classList.contains('is-hidden')"), true);

    const startX = snapshot.player.x;
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
    await sleep(280);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(snapshot.player.x > startX + 5, 'holding D should move the courier right');

    // Dash is defensive until the dash-impact upgrade is acquired.
    const lockedDash = await cdp.evaluate("state.enemies = []; state.player.dashImpactLevel = 0; state.player.dashImpactRadius = 0; state.player.dashImpactScore = 0; state.player.dashRemaining = 0.15; spawnEnemy('chaser', { x: state.player.x, y: state.player.y }); handleEnemyCollisions(); ({ enemies: state.enemies.length, score: state.score })");
    assert.equal(lockedDash.enemies, 1, 'locked dash should pass through without destroying an enemy');

    const unlockedDash = await cdp.evaluate("state.enemies = []; state.score = 0; state.player = { ...state.player, ...applyUpgrade(state.player, 'dash-impact') }; state.player.dashRemaining = 0.15; spawnEnemy('chaser', { x: state.player.x, y: state.player.y }); spawnEnemy('chaser', { x: state.player.x + 20, y: state.player.y }); handleEnemyCollisions(); updateHud(); ({ enemies: state.enemies.length, score: state.score, level: state.player.dashImpactLevel, label: document.getElementById('dashImpactLabel').textContent })");
    assert.equal(unlockedDash.enemies, 0, 'unlocked dash impact should destroy the contacted cluster');
    assert.equal(unlockedDash.score, 8, 'level 1 dash impact should award 4 points per destroyed enemy');
    assert.equal(unlockedDash.level, 1);
    assert.match(unlockedDash.label, /撞擊 Lv\.1/);
    await cdp.evaluate("state.enemies = []; state.score = 0; state.player.dashRemaining = 0; state.player.dashCooldownRemaining = 0");

    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await sleep(40);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(snapshot.player.dashCooldownRemaining > 0, 'Space should trigger dash cooldown');

    await cdp.evaluate("document.getElementById('pauseButton').click()");
    await sleep(40);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.mode, 'paused');
    assert.equal(await cdp.evaluate("!document.getElementById('pauseScreen').classList.contains('is-hidden')"), true);

    await cdp.evaluate("document.getElementById('resumeButton').click()");
    await sleep(40);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.mode, 'playing');

    // Reproduce the late-game stacking case: many chasers begin at exactly the same point.
    await cdp.evaluate("state.enemies = []; state.elapsed = 230; state.player.x = 480; state.player.y = 300; state.player.hull = 99; for (let i = 0; i < 12; i += 1) spawnEnemy('chaser', { x: 180, y: 300 });");
    await sleep(650);
    const crowd = await cdp.evaluate("state.enemies.filter((enemy) => enemy.type === 'chaser').map((enemy) => ({ x: enemy.x, y: enemy.y }))");
    assert.ok(crowd.length >= 10, 'late-game crowd should remain populated during separation check');
    const crowdY = crowd.map((enemy) => enemy.y);
    assert.ok(Math.max(...crowdY) - Math.min(...crowdY) > 24, 'overlapping chasers should fan out instead of remaining stacked');
    if (process.env.PULSE_CROWD_SCREENSHOT) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.env.PULSE_CROWD_SCREENSHOT, Buffer.from(shot.data, 'base64'));
    }

    // Walk a first-time player through the entire interactive tutorial.
    await cdp.evaluate('window.PulseCourier.showMenu()');
    await cdp.evaluate("document.getElementById('tutorialButton').click()");
    await sleep(80);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.mode, 'tutorial');
    assert.equal(snapshot.tutorialStep, 0);
    if (process.env.PULSE_TUTORIAL_SCREENSHOT) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.env.PULSE_TUTORIAL_SCREENSHOT, Buffer.from(shot.data, 'base64'));
    }

    await holdKey(cdp, 'd', 'KeyD', 68, 300);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.tutorialStep, 1, 'movement should advance tutorial to collection');

    await holdKey(cdp, 'd', 'KeyD', 68, 500);
    await holdKey(cdp, 'w', 'KeyW', 87, 220);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.tutorialStep, 2, 'collecting highlighted energy should advance tutorial');
    assert.ok(snapshot.carried >= 1);

    await holdKey(cdp, 'a', 'KeyA', 65, 760);
    await holdKey(cdp, 'w', 'KeyW', 87, 360);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.tutorialStep, 3, 'returning cargo to Relay should advance tutorial');
    assert.ok(snapshot.banked >= 1);

    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await sleep(60);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.tutorialStep, 4, 'Dash should advance tutorial to Pulse');
    assert.equal(Math.round(snapshot.pulse), 100);

    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
    await sleep(60);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.tutorialStep, 5, 'Pulse should reach the final HUD lesson');
    assert.equal(await cdp.evaluate("!document.getElementById('tutorialFinishButton').classList.contains('is-hidden')"), true);

    await cdp.evaluate("document.getElementById('tutorialFinishButton').click()");
    await sleep(80);
    snapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(snapshot.mode, 'playing', 'finishing tutorial should launch a real mission');

    if (process.env.PULSE_SCREENSHOT) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.env.PULSE_SCREENSHOT, Buffer.from(shot.data, 'base64'));
    }

    // Mobile regression: touch-only players must be able to move, dash, pulse, and reach pause actions.
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await sleep(120);
    await cdp.evaluate('window.PulseCourier.showMenu()');
    await cdp.evaluate("document.getElementById('startButton').click()");
    await sleep(80);
    const mobileControlsDisplay = await cdp.evaluate("getComputedStyle(document.getElementById('mobileControls')).display");
    assert.notEqual(mobileControlsDisplay, 'none', 'touch controls should be visible during mobile gameplay');
    let mobileSnapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    const mobileStartX = mobileSnapshot.player.x;
    const rightRect = await cdp.evaluate("(() => { const r = document.getElementById('mobileRightButton').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rightRect.x, y: rightRect.y, radiusX: 8, radiusY: 8, force: 1, id: 1 }] });
    await sleep(320);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(70);
    mobileSnapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(mobileSnapshot.player.x > mobileStartX + 5, 'holding the mobile right control should move the courier');

    const dashRect = await cdp.evaluate("(() => { const r = document.getElementById('mobileDashButton').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: dashRect.x, y: dashRect.y, radiusX: 8, radiusY: 8, force: 1, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(50);
    mobileSnapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(mobileSnapshot.player.dashCooldownRemaining > 0, 'mobile Dash button should trigger dash');

    await cdp.evaluate("state.pulse = 100; updateHud();");
    const pulseRect = await cdp.evaluate("(() => { const r = document.getElementById('mobilePulseButton').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pulseRect.x, y: pulseRect.y, radiusX: 8, radiusY: 8, force: 1, id: 3 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(50);
    mobileSnapshot = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(Math.round(mobileSnapshot.pulse), 0, 'mobile Pulse button should fire a charged pulse');
    if (process.env.PULSE_MOBILE_GAME_SCREENSHOT) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.env.PULSE_MOBILE_GAME_SCREENSHOT, Buffer.from(shot.data, 'base64'));
    }

    await cdp.evaluate("document.getElementById('pauseButton').click()");
    await sleep(60);
    const pauseFit = await cdp.evaluate("(() => { const frame=document.querySelector('.game-frame').getBoundingClientRect(); const card=document.querySelector('.pause-card').getBoundingClientRect(); const last=document.getElementById('pauseMenuButton').getBoundingClientRect(); return {frameTop:frame.top,frameBottom:frame.bottom,cardTop:card.top,cardBottom:card.bottom,lastBottom:last.bottom}; })()");
    assert.ok(pauseFit.cardTop >= pauseFit.frameTop - 1, 'mobile pause card should stay inside the game frame');
    assert.ok(pauseFit.lastBottom <= pauseFit.cardBottom + 1, 'all mobile pause actions should be visible without scrolling the pause card');
    assert.ok(pauseFit.cardBottom <= pauseFit.frameBottom + 1, 'mobile pause card should stay inside the game frame');
    if (process.env.PULSE_MOBILE_SCREENSHOT) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.env.PULSE_MOBILE_SCREENSHOT, Buffer.from(shot.data, 'base64'));
    }

    const browserErrors = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
    assert.equal(browserErrors.length, 0, `browser exceptions: ${JSON.stringify(browserErrors)}`);

    console.log(JSON.stringify({ ok: true, mode: snapshot.mode, moved: Math.round(snapshot.player.x - startX), errors: browserErrors.length }));
  } finally {
    if (cdp) cdp.ws.close();
    if (chrome) { chrome.kill('SIGTERM'); await sleep(250); }
    await sleep(100);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
