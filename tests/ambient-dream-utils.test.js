const test = require('node:test');
const assert = require('node:assert/strict');

test('getArrangeXStart centers grid when there is room', async () => {
  const { getArrangeXStart } = await import('../src/ambient-dream-utils.js');
  const xStart = getArrangeXStart({
    viewportWidth: 1200,
    cols: 3,
    cardWidth: 240,
    gapX: 20,
    margin: 18,
  });
  assert.equal(xStart, 220);
});

test('accumulateWheelNavigation triggers prev on upward scroll', async () => {
  const { accumulateWheelNavigation } = await import('../src/ambient-dream-utils.js');
  let state = { acc: 0 };
  state = accumulateWheelNavigation({ acc: state.acc, deltaY: -120, threshold: 300 });
  assert.equal(state.action, null);
  state = accumulateWheelNavigation({ acc: state.acc, deltaY: -220, threshold: 300 });
  assert.equal(state.action, 'prev');
  assert.equal(state.acc, 0);
});

test('createSummerMeadowLayout supports very high grass-to-flower ratio', async () => {
  const { createSummerMeadowLayout } = await import('../src/ambient-dream-utils.js');
  const out = createSummerMeadowLayout({
    width: 1000,
    height: 800,
    bladeCount: 320,
    flowerCount: 50,
    seed: 42,
  });
  assert.equal(out.grass.length, 320);
  assert.equal(out.flowers.length, 50);

  const kinds = new Set(out.grass.map(g => g.kind));
  assert.ok(kinds.has('blade'));
  assert.ok(kinds.has('broad'));
  assert.ok(kinds.has('seed'));

  out.grass.forEach((b) => {
    assert.ok(Number.isFinite(b.x));
    assert.ok(Number.isFinite(b.y));
    assert.ok(b.y >= 800 * 0.70 && b.y <= 800 * 0.98);
    assert.ok(b.x >= -80 && b.x <= 1080);
    assert.ok(b.h >= 20 && b.h <= 130);
  });
  const flowerKinds = new Set(out.flowers.map(f => f.kind));
  assert.ok(flowerKinds.has('daisy'));
  assert.ok(flowerKinds.has('clover'));

  out.flowers.forEach((f) => {
    assert.ok(Number.isFinite(f.x));
    assert.ok(Number.isFinite(f.y));
    assert.ok(f.y >= 800 * 0.74 && f.y <= 800 * 0.96);
    assert.ok(f.x >= -80 && f.x <= 1080);
    assert.ok(f.r >= 1.6 && f.r <= 6.4);
  });
});
