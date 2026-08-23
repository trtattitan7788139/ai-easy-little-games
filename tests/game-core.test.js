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
