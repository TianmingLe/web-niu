const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('music directory listing fallback should be dev-only', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.jsx'), 'utf8');
  const hasListingFetch = code.includes("fetch('/music/')");
  assert.ok(hasListingFetch, 'expected listing fetch to exist for dev fallback');
  assert.ok(code.includes('import.meta.env.DEV'), 'expected listing fetch guarded by import.meta.env.DEV');
});

