(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.AmbientDreamUtils = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const getArrangeXStart = ({ viewportWidth, cols, cardWidth, gapX, margin = 18 }) => {
    const gridWidth = cols * cardWidth + (cols - 1) * gapX;
    const centered = Math.round((viewportWidth - gridWidth) / 2);
    return Math.max(margin, centered);
  };

  const accumulateWheelNavigation = ({ acc, deltaY, threshold = 300 }) => {
    const nextAcc = (acc || 0) + (deltaY || 0);
    if (nextAcc > threshold) return { acc: 0, action: 'next' };
    if (nextAcc < -threshold) return { acc: 0, action: 'prev' };
    return { acc: nextAcc, action: null };
  };

  return { getArrangeXStart, accumulateWheelNavigation, clamp };
});

