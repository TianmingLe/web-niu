const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('index.html redirects to ambient-dream-v2.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('/src/main.jsx'));
});

test('public/ambient-dream-v2.html redirects to /', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'ambient-dream-v2.html'), 'utf8');
  assert.ok(html.includes("window.location.replace('/')"));
});

test('src/main.jsx persists current quote index and auto-plays music after 3s', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.jsx'), 'utf8');
  assert.ok(code.includes('ambient-dream-current-index'));
  assert.ok(code.includes('ambient-dream-mobile-onboarding-v1'));
  assert.ok(code.includes('viewport-mobile'));
  assert.ok(code.includes('3000'));
});
