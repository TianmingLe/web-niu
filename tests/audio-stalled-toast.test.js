const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('audio stalled should not be wired to failure handler toast', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.jsx'), 'utf8');
  assert.ok(!code.includes("addEventListener('stalled', handleError"));
});

