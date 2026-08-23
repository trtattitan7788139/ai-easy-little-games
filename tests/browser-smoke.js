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
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'mobile-v120.css'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`).replace('<link rel="stylesheet" href="mobile-v120.css">', '');
  for (const file of ['src/game-core.js', ...[...html.matchAll(/<script defer src="(src\/game(?:-[0-9]+)?\.js)"><\/script>/g)].map((m) => m[1])]) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    html = html.replace(`<script defer src="${file}"></script>`, `<script>${source}</script>`);
  }
  return html;
}

async function touch(cdp, type, points) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points }); }

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-v120-'));
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
    assert.equal(await cdp.evaluate('window.PulseCourier.version'), '1.2.0');
    assert.equal((await cdp.evaluate('window.PulseCourier.getSnapshot()')).arenaWidth, 960, 'desktop arena should keep the original logical width');

    await cdp.evaluate("document.getElementById('startButton').click()"); await sleep(80);
    let s = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(s.difficulty, 'easy');
    assert.equal(await cdp.evaluate("document.getElementById('difficultyValue').textContent"), '簡單');
    const x = s.player.x;
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 }); await sleep(180);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
    s = await cdp.evaluate('window.PulseCourier.getSnapshot()'); assert.ok(s.player.x > x + 4);

    const easyKill = await cdp.evaluate("state.score=0; state.killScoreFraction=0; awardKillScore(3, 1); ({score:state.score,fraction:state.killScoreFraction})");
    assert.deepEqual(easyKill, { score: 3, fraction: 0 });
    await cdp.evaluate('window.PulseCourier.showMenu(); document.getElementById("normalButton").click()'); await sleep(60);
    const normalStart = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(normalStart.difficulty, 'normal');
    const normalKills = await cdp.evaluate("state.score=0; state.killScoreFraction=0; state.killScorePenalty=0; awardKillScore(3,1); const first={score:state.score,fraction:state.killScoreFraction,progress:upgradeProgressScore()}; awardKillScore(3,1); ({first,second:{score:state.score,fraction:state.killScoreFraction,progress:upgradeProgressScore()}})");
    assert.deepEqual(normalKills.first, { score: 1, fraction: 0.5, progress: 3 });
    assert.deepEqual(normalKills.second, { score: 3, fraction: 0, progress: 6 });
    const scoreKeys = await cdp.evaluate("({easy:bestScoreStorageKey('easy'),normal:bestScoreStorageKey('normal')})");
    assert.notEqual(scoreKeys.easy, scoreKeys.normal, 'easy and normal best scores must use separate storage keys');

    const lockedAftershock = await cdp.evaluate("state.enemies=[]; const p=state.player; p.dashImpactLevel=0; p.dashRemaining=.01; spawnEnemy('chaser',{x:p.x+30,y:p.y}); const before=state.enemies[0].x; updatePlayer(.02); ({before,after:state.enemies[0].x,count:state.enemies.length})");
    assert.equal(lockedAftershock.count, 1);
    assert.ok(Math.abs(lockedAftershock.after - lockedAftershock.before) < 0.01, 'locked Dash should not emit an aftershock');

    const aftershock = await cdp.evaluate(`(() => {
      state.enemies=[]; state.score=12; state.killScoreFraction=0; keys.clear(); mobileMove.x=0; mobileMove.y=0;
      const p=state.player; p.dashImpactLevel=1; p.dashImpactRadius=18; p.dashImpactScore=4; p.dashRemaining=.01;
      spawnEnemy('chaser',{x:p.x+100,y:p.y}); const isolatedId=state.enemies[0].id;
      for(let i=0;i<7;i+=1) spawnEnemy('chaser',{x:p.x+6+(i%3)*2,y:p.y+(i%2)*2});
      const beforeDistance=Math.hypot(state.enemies[0].x-p.x,state.enemies[0].y-p.y);
      updatePlayer(.02);
      const isolated=state.enemies.find((e)=>e.id===isolatedId);
      return {score:state.score, count:state.enemies.length, beforeDistance, isolatedDistance: isolated ? Math.hypot(isolated.x-p.x,isolated.y-p.y) : -1, rings:state.particles.filter((q)=>q.type==='ring').length};
    })()`);
    assert.equal(aftershock.score, 12, 'aftershock cleanup kills must never award score');
    assert.ok(aftershock.count < 8, 'dense enemies remaining in the core should be destroyed by the zero-score afterwave');
    assert.ok(aftershock.isolatedDistance > aftershock.beforeDistance, 'isolated enemy should be pushed outward');
    assert.ok(aftershock.rings >= 2, 'dash end should render the two-stage shockwave');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await sleep(220);
    await cdp.evaluate('window.PulseCourier.showMenu()'); await sleep(40);
    const portraitMenu = await cdp.evaluate("(() => { const frame=document.querySelector('.game-frame').getBoundingClientRect(); const easy=document.getElementById('startButton').getBoundingClientRect(); const normal=document.getElementById('normalButton').getBoundingClientRect(); return {frameBottom:frame.bottom,easyBottom:easy.bottom,normalBottom:normal.bottom}; })()");
    assert.ok(portraitMenu.easyBottom <= portraitMenu.frameBottom + 1 && portraitMenu.normalBottom <= portraitMenu.frameBottom + 1, 'both difficulty buttons should be immediately reachable in portrait');
    await cdp.evaluate('document.getElementById("startButton").click()'); await sleep(80);
    let portrait = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    const portraitUi = await cdp.evaluate("(() => { const f=document.querySelector('.game-frame').getBoundingClientRect(); const j=document.querySelector('.joystick-ring').getBoundingClientRect(); const a=document.getElementById('mobileDashButton').getBoundingClientRect(); return {fw:f.width,fh:f.height,jw:j.width,ah:a.height,canvas:document.getElementById('gameCanvas').width}; })()");
    assert.ok(portraitUi.fh >= 300, `portrait battlefield should be materially larger, got ${portraitUi.fh}`);
    assert.ok(portraitUi.jw >= 170, `portrait joystick should be enlarged, got ${portraitUi.jw}`);
    assert.ok(portraitUi.ah >= 100, `portrait ability buttons should be enlarged, got ${portraitUi.ah}`);
    assert.ok(portrait.arenaWidth < 900, `portrait logical arena should be compact, got ${portrait.arenaWidth}`);
    if (process.env.PULSE_V120_PORTRAIT) { const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}); fs.writeFileSync(process.env.PULSE_V120_PORTRAIT,Buffer.from(shot.data,'base64')); }

    let joy = await cdp.evaluate("(() => { const r=document.getElementById('mobileJoystick').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    const portraitStart = portrait;
    await touch(cdp, 'touchStart', [{ x: joy.x, y: joy.y, id: 1, force: 1, radiusX: 8, radiusY: 8 }]);
    await touch(cdp, 'touchMove', [{ x: joy.x + 55, y: joy.y - 55, id: 1, force: 1, radiusX: 8, radiusY: 8 }]); await sleep(220);
    let moved = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(moved.player.x > portraitStart.player.x + 4 && moved.player.y < portraitStart.player.y - 4, 'portrait joystick should move diagonally');
    await touch(cdp, 'touchEnd', []); await sleep(80);
    const stoppedA = await cdp.evaluate('window.PulseCourier.getSnapshot()'); await sleep(140);
    const stoppedB = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(Math.hypot(stoppedB.player.x - stoppedA.player.x, stoppedB.player.y - stoppedA.player.y) < 2, 'released joystick should stop');

    const beforeRotate = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    const beforeNormalized = (beforeRotate.player.x - beforeRotate.relayX) / beforeRotate.arenaWidth;
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true }); await sleep(260);
    const afterRotate = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    const landscapeUi = await cdp.evaluate("(() => { const f=document.querySelector('.game-frame').getBoundingClientRect(); const j=document.querySelector('.joystick-ring').getBoundingClientRect(); const a=document.getElementById('mobileDashButton').getBoundingClientRect(); return {fw:f.width,fh:f.height,jw:j.width,ah:a.height,canvas:document.getElementById('gameCanvas').width}; })()");
    assert.equal(afterRotate.mode, 'playing', 'rotation must not restart the active run');
    assert.ok(afterRotate.arenaWidth > portrait.arenaWidth + 400, `landscape should expose a wider logical arena (${portrait.arenaWidth} -> ${afterRotate.arenaWidth})`);
    assert.ok(landscapeUi.fw > 800 && landscapeUi.fh > 330, `landscape battlefield should fill the phone viewport: ${JSON.stringify(landscapeUi)}`);
    assert.ok(landscapeUi.jw >= 160 && landscapeUi.ah >= 100, 'landscape controls should stay large');
    if (process.env.PULSE_V120_LANDSCAPE) { const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}); fs.writeFileSync(process.env.PULSE_V120_LANDSCAPE,Buffer.from(shot.data,'base64')); }
    const afterNormalized = (afterRotate.player.x - afterRotate.relayX) / afterRotate.arenaWidth;
    assert.ok(Math.abs(afterNormalized - beforeNormalized) < 0.03, 'rotation should preserve player position relative to the relay');

    joy = await cdp.evaluate("(() => { const r=document.getElementById('mobileJoystick').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    const dash = await cdp.evaluate("(() => { const r=document.getElementById('mobileDashButton').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()");
    const landscapeStart = afterRotate;
    await touch(cdp, 'touchStart', [{ x: joy.x, y: joy.y, id: 2, force: 1 }, { x: dash.x, y: dash.y, id: 3, force: 1 }]);
    await touch(cdp, 'touchMove', [{ x: joy.x + 60, y: joy.y, id: 2, force: 1 }, { x: dash.x, y: dash.y, id: 3, force: 1 }]); await sleep(180);
    const landscape = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.ok(landscape.player.x > landscapeStart.player.x + 4, 'landscape joystick should move');
    assert.ok(landscape.player.dashCooldownRemaining > 0, 'Dash should work while joystick is held');
    await touch(cdp, 'touchEnd', []);

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }); await sleep(260);
    const portraitAgain = await cdp.evaluate('window.PulseCourier.getSnapshot()');
    assert.equal(portraitAgain.mode, 'playing');
    assert.ok(portraitAgain.arenaWidth < afterRotate.arenaWidth - 400, 'returning to portrait should recompute the arena width');

    const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `JavaScript exceptions: ${JSON.stringify(exceptions)}`);
    console.log(JSON.stringify({ ok: true, mode: portraitAgain.mode, difficulty: portraitAgain.difficulty, portraitArena: portrait.arenaWidth, landscapeArena: afterRotate.arenaWidth, errors: 0 }));
  } finally {
    if (cdp) cdp.ws.close();
    if (!chrome.killed) chrome.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => chrome.once('exit', resolve)), sleep(700)]);
    for (let i = 0; i < 4; i += 1) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; }
      catch (error) { if (i === 3) throw error; await sleep(120); }
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
