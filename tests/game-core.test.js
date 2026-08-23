const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clamp,
  circlesOverlap,
  carryMultiplier,
  carrySpeedFactor,
  bankReward,
  spawnInterval,
  missionStatus,
  createBasePlayerStats,
  applyUpgrade,
  pickUpgradeChoices,
  steerTowardWithSeparation,
  getUpgradePool,
  UPGRADES,
} = require('../src/game-core.js');

test('clamp limits values to a closed range', () => {
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(13, 0, 10), 10);
});

test('circlesOverlap detects touching and separated circles', () => {
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 10 }, { x: 20, y: 0, r: 10 }), true);
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 10 }, { x: 21, y: 0, r: 10 }), false);
});

test('carry multiplier grows by 12% per cell and caps at 2.5x', () => {
  assert.equal(carryMultiplier(0), 1);
  assert.equal(carryMultiplier(5), 1.6);
  assert.equal(carryMultiplier(99), 2.5);
});

test('carry slowdown is 2.5% per cell and never exceeds 20%', () => {
  assert.equal(carrySpeedFactor(0), 1);
  assert.equal(carrySpeedFactor(4), 0.9);
  assert.equal(carrySpeedFactor(99), 0.8);
});

test('bankReward applies carry multiplier and optional banking bonus', () => {
  assert.equal(bankReward(5, 0), 8);
  assert.equal(bankReward(5, 0.10), 9);
  assert.equal(bankReward(0, 5), 0);
});

test('spawnInterval decreases with time and carried risk but has a floor', () => {
  const calm = spawnInterval(0, 0);
  const late = spawnInterval(180, 0);
  const risky = spawnInterval(180, 6);
  assert.ok(late < calm);
  assert.ok(risky < late);
  assert.equal(spawnInterval(10_000, 100), 0.32);
});

test('mission status prioritizes hull failure, then victory, then progress', () => {
  assert.equal(missionStatus({ hull: 0, elapsed: 240, banked: 99 }), 'gameover');
  assert.equal(missionStatus({ hull: 1, elapsed: 240, banked: 60 }), 'victory');
  assert.equal(missionStatus({ hull: 1, elapsed: 240, banked: 59 }), 'playing');
  assert.equal(missionStatus({ hull: 1, elapsed: 120, banked: 99 }), 'playing');
});

test('each upgrade mutates only the intended base stat family', () => {
  const base = createBasePlayerStats();

  const speed = applyUpgrade(base, 'overdrive');
  assert.equal(speed.speed, base.speed * 1.12);
  assert.equal(base.speed, 245, 'input object stays immutable');

  const hull = applyUpgrade({ ...base, hull: 2, maxHull: 3 }, 'reinforced-hull');
  assert.equal(hull.maxHull, 4);
  assert.equal(hull.hull, 3);

  const cargo = applyUpgrade(base, 'cargo-lattice');
  assert.equal(cargo.capacity, 8);
  assert.equal(cargo.bankBonus, 0.05);

  let dash = { ...base };
  for (let i = 0; i < 20; i += 1) dash = applyUpgrade(dash, 'phase-cooling');
  assert.equal(dash.dashCooldown, 1.4);

  const pulse = applyUpgrade(base, 'wide-pulse');
  assert.equal(pulse.pulseRadius, base.pulseRadius * 1.22);

  const capacitor = applyUpgrade(base, 'capacitor');
  assert.equal(capacitor.pulseGain, base.pulseGain * 1.2);
});

test('pickUpgradeChoices returns unique valid choices deterministically', () => {
  const values = [0, 0.01, 0.2, 0.2, 0.8, 0.99];
  let i = 0;
  const rng = () => values[i++ % values.length];
  const choices = pickUpgradeChoices(3, rng);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
  for (const choice of choices) assert.ok(UPGRADES.some((upgrade) => upgrade.id === choice.id));
});

test('pickUpgradeChoices never requests more than the available upgrade pool', () => {
  const choices = pickUpgradeChoices(99, () => 0.5);
  assert.equal(choices.length, UPGRADES.length);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, UPGRADES.length);
});

test('upgrade choices use Traditional Chinese names and descriptions', () => {
  assert.deepEqual(
    UPGRADES.map(({ id, name, description }) => ({ id, name, description })),
    [
      { id: 'overdrive', name: '超載推進', description: '移動速度 +12%。' },
      { id: 'reinforced-hull', name: '強化船體', description: '最大船體 +1，並修復 1 格船體。' },
      { id: 'cargo-lattice', name: '貨艙擴充', description: '貨艙容量 +2，存入分數額外 +5%。' },
      { id: 'phase-cooling', name: '相位冷卻', description: '衝刺冷卻時間 -15%（最低 1.4 秒）。' },
      { id: 'wide-pulse', name: '廣域脈衝', description: '脈衝範圍 +22%。' },
      { id: 'capacitor', name: '高效電容', description: '脈衝充能速度 +20%。' },
      { id: 'dash-impact', name: '衝刺撞擊', description: '解鎖衝刺攻擊：撞擊敵人可直接擊破，每隻 +4 分。' },
    ],
  );
});

test('enemy steering separates enemies that pursue the same target', () => {
  const target = { x: 100, y: 0 };
  const a = { id: 1, x: 0, y: 0 };
  const b = { id: 2, x: 0, y: 0 };
  const enemies = [a, b];
  const dirA = steerTowardWithSeparation(a, target, enemies, 48, 1.35);
  const dirB = steerTowardWithSeparation(b, target, enemies, 48, 1.35);
  assert.ok(Math.hypot(dirA.x, dirA.y) > 0.99);
  assert.ok(Math.hypot(dirB.x, dirB.y) > 0.99);
  assert.notDeepEqual(dirA, dirB, 'overlapping enemies should not receive identical steering');
});

test('enemy steering is direct pursuit when no neighbor is nearby', () => {
  const enemy = { id: 1, x: 0, y: 0 };
  const dir = steerTowardWithSeparation(enemy, { x: 100, y: 0 }, [enemy, { id: 2, x: 200, y: 200 }], 48, 1.35);
  assert.ok(Math.abs(dir.x - 1) < 1e-9);
  assert.ok(Math.abs(dir.y) < 1e-9);
});


test('dash impact starts locked and upgrades into a scaling ability line', () => {
  const base = createBasePlayerStats();
  assert.equal(base.dashImpactLevel, 0);
  assert.equal(base.dashImpactRadius, 0);
  assert.equal(base.dashImpactScore, 0);

  const level1 = applyUpgrade(base, 'dash-impact');
  assert.equal(level1.dashImpactLevel, 1);
  assert.equal(level1.dashImpactRadius, 18);
  assert.equal(level1.dashImpactScore, 4);

  const level2 = applyUpgrade(level1, 'dash-impact');
  assert.equal(level2.dashImpactLevel, 2);
  assert.equal(level2.dashImpactRadius, 30);
  assert.equal(level2.dashImpactScore, 6);
});

test('dash impact upgrade copy changes after the ability is unlocked', () => {
  const base = createBasePlayerStats();
  const locked = getUpgradePool(base).find((upgrade) => upgrade.id === 'dash-impact');
  assert.equal(locked.name, '衝刺撞擊');
  assert.match(locked.description, /解鎖衝刺攻擊/);

  const level1 = applyUpgrade(base, 'dash-impact');
  const upgrade = getUpgradePool(level1).find((choice) => choice.id === 'dash-impact');
  assert.equal(upgrade.name, '衝刺撞擊 Lv.2');
  assert.match(upgrade.description, /爆破範圍 \+12/);
  assert.match(upgrade.description, /擊破分數 \+2/);
});
