const test = require('node:test');
const assert = require('node:assert/strict');

test('serializeTracksForStorage strips upload data urls and keeps blobKey metadata', async () => {
  const mod = await import('../src/music-track-storage.mjs');
  const input = [
    { id: 'u1', name: 'x', source: 'upload', url: 'data:audio/mp3;base64,AAAA', blobKey: 'bk1', mimeType: 'audio/mpeg', size: 12 },
    { id: 'l1', name: 'y', source: 'library', url: '/music/a.mp3', altUrls: ['/music/a%2B.mp3'] }
  ];
  const out = mod.serializeTracksForStorage(input);
  assert.equal(out.length, 2);
  assert.equal(out[0].source, 'upload');
  assert.equal(out[0].blobKey, 'bk1');
  assert.ok(!('url' in out[0]));
  assert.equal(out[1].url, '/music/a.mp3');
});

