const test = require('node:test');
const assert = require('node:assert/strict');

test('getArrangeXStart centers grid when there is room', () => {
  const { getArrangeXStart } = require('../ambient-dream-utils.js');
  const xStart = getArrangeXStart({
    viewportWidth: 1200,
    cols: 3,
    cardWidth: 240,
    gapX: 20,
    margin: 18,
  });
  assert.equal(xStart, 220);
});

test('accumulateWheelNavigation triggers prev on upward scroll', () => {
  const { accumulateWheelNavigation } = require('../ambient-dream-utils.js');
  let state = { acc: 0 };
  state = accumulateWheelNavigation({ acc: state.acc, deltaY: -120, threshold: 300 });
  assert.equal(state.action, null);
  state = accumulateWheelNavigation({ acc: state.acc, deltaY: -220, threshold: 300 });
  assert.equal(state.action, 'prev');
  assert.equal(state.acc, 0);
});

