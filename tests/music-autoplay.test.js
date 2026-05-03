const test = require('node:test');
const assert = require('node:assert/strict');

test('music-autoplay module exports useMusicAutoplay', async () => {
  const mod = await import('../src/music-autoplay.mjs');
  assert.equal(typeof mod.useMusicAutoplay, 'function');
});

