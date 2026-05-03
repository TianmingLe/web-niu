const test = require('node:test');
const assert = require('node:assert/strict');

test('tracksFromManifest builds stable id/url and altUrls', async () => {
  const mod = await import('../src/music-library.mjs');
  const tracks = mod.tracksFromManifest({
    tracks: [
      { name: 'a', file: 'a+b.MP3' },
      { file: 'bad.txt' }
    ]
  });
  assert.equal(tracks.length, 1);
  assert.ok(tracks[0].id.includes('lib-a-a+b.MP3'));
  assert.ok(tracks[0].url.startsWith('/music/'));
  assert.ok(Array.isArray(tracks[0].altUrls));
});

