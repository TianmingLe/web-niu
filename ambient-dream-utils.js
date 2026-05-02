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

  const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  const createSummerMeadowLayout = ({ width, height, bladeCount, flowerCount, seed = 1 }) => {
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);
    const bladesN = Math.max(0, Math.floor(Number(bladeCount) || 0));
    const flowersN = Math.max(0, Math.floor(Number(flowerCount) || 0));
    const rng = mulberry32(seed);
    const margin = 80;
    const blades = Array.from({ length: bladesN }, () => {
      const x = -margin + rng() * (w + margin * 2);
      const y = h * (0.70 + rng() * 0.28);
      const hh = 20 + rng() * 110;
      return {
        x,
        y,
        h: hh,
        lean: (rng() - 0.5) * 0.55,
        phase: rng() * Math.PI * 2,
        f: 0.7 + rng() * 1.2,
        w: 0.7 + rng() * 1.2
      };
    });
    const flowers = Array.from({ length: flowersN }, () => {
      const x = -margin + rng() * (w + margin * 2);
      const y = h * (0.74 + rng() * 0.22);
      const r = 1.8 + rng() * 2.8;
      return {
        x,
        y,
        r,
        phase: rng() * Math.PI * 2,
        f: 0.8 + rng() * 1.4
      };
    });
    return { blades, flowers };
  };

  return { getArrangeXStart, accumulateWheelNavigation, createSummerMeadowLayout, clamp };
});
