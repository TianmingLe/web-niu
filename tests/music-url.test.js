const test = require('node:test');
const assert = require('node:assert/strict');

test('buildMusicUrlCandidates provides + and %2B variants for filenames', async () => {
  const mod = await import('../src/music-url.mjs');
  assert.equal(typeof mod.buildMusicUrlCandidates, 'function');
  const urls = mod.buildMusicUrlCandidates('我记得纯音乐+小管弦长版.MP3');
  assert.ok(Array.isArray(urls));
  assert.ok(urls.length >= 2);
  assert.ok(urls.every((u) => typeof u === 'string' && u.startsWith('/music/')));
  assert.ok(urls.some((u) => u.includes('+')));
  assert.ok(urls.some((u) => u.toLowerCase().includes('%2b')));
});

