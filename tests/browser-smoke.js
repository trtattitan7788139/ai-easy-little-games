const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wait(url) {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(url); if (r.ok) return r; } catch (_) {}
    await sleep(80);
  }
  throw new Error(`timeout: ${url}`);
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    } else if (m.method) events.push(m);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id; pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'evaluation failed');
    return r.result.value;
  };
  return { ws, send, evaluate, events };
}

function inlineGame() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'mobile-v112.css'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`).replace('<link rel="stylesheet" href="mobile-v112.css">', '');
  for (const file of ['src/game-core.js', ...[...html.matchAll(/<script defer src="(src\/game(?:-[0-9]+)?\.js)"><\/script>/g)].map((m) => m[1])]) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    html = html.replace(`<script defer src="${file}"></script>`, `<script>${source}</script>`);
  }
  return html;
}

async function touch(cdp, type, points) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points }); }

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-v112-'));
  const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let cdp;
  try {
    await wait(`http://127.0.0.1:${PORT}/json/list`);
    const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    cdp = await connect(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
    await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    const tree = await cdp.send('Page.getFrameTree');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html: inlineGame() });
    for (let i = 0; i < 60 && !(await cdp.evaluate('!!window.PulseCourier')); i += 1) await sleep(60);
    assert.equal(await cdp.evaluate('window.PulseCourier.version'), '1.1.2');

    await cdp.evaluate("document.getElementById('startButton').click()"); await sleep(80);
    let s = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    const x = s.player.x;
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 }); await sleep(180);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
    s = await cdp.evaluate('window.PulseCourier.getSnapshot()'); assert.ok(s.player.x > x + 4);

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await sleep(100);
    await cdp.evaluate('window.PulseCourier.showMenu(); document.getElementById("startButton").click()'); await sleep(60);
    let start = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    let joy = await cdp.evaluate("(() => { const r=document.getElementById('mobileJoystick').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    await touch(cdp, 'touchStart', [{ x: joy.x, y: joy.y, id: 1, force: 1, radiusX: 8, radiusY: 8 }]);
    await touch(cdp, 'touchMove', [{ x: joy.x + 45, y: joy.y - 45, id: 1, force: 1, radiusX: 8, radiusY: 8 }]); await sleep(220);
    let moved = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(moved.player.x > start.player.x + 4 && moved.player.y < start.player.y - 4, 'portrait joystick should move diagonally');
    await touch(cdp, 'touchEnd', []); await sleep(80);
    const stoppedA = await cdp.evaluate('window.PulseCourier.getSnapshot()'); await sleep(140);
    const stoppedB = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(Math.hypot(stoppedB.player.x - stoppedA.player.x, stoppedB.player.y - stoppedA.player.y) < 2, 'released joystick should stop');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true }); await sleep(120);
    joy = await cdp.evaluate("(() => { const r=document.getElementById('mobileJoystick').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    const dash = await cdp.evaluate("(() => { const r=document.getElementById('mobileDashButton').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    const landscapeStart = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    await touch(cdp, 'touchStart', [{ x: joy.x, y: joy.y, id: 2, force: 1 }, { x: dash.x, y: dash.y, id: 3, force: 1 }]);
    await touch(cdp, 'touchMove', [{ x: joy.x + 55, y: joy.y, id: 2, force: 1 }, { x: dash.x, y: dash.y, id: 3, force: 1 }]); await sleep(180);
    const landscape = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(landscape.player.x > landscapeStart.player.x + 4, 'landscape joystick should move');
    assert.ok(landscape.player.dashCooldownRemaining > 0, 'Dash should work while joystick is held');
    await touch(cdp, 'touchEnd', []);

    const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `JavaScript exceptions: ${JSON.stringify(exceptions)}`);
    console.log(JSON.stringify({ ok: true, mode: landscape.mode, errors: 0 }));
  } finally {
    if (cdp) cdp.ws.close();
    if (!chrome.killed) chrome.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => chrome.once('exit', resolve)),
      sleep(700),
    ]);
    for (let i = 0; i < 4; i += 1) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; }
      catch (error) { if (i === 3) throw error; await sleep(120); }
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
