const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('music manifest should not include generatedAt to avoid churn', () => {
  const manifestPath = path.join(__dirname, '..', 'public', 'music', 'manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);
  assert.ok(!('generatedAt' in data));
  assert.ok(Array.isArray(data.tracks));
});

