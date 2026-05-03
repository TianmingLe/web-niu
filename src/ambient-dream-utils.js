export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export const getArrangeXStart = ({ viewportWidth, cols, cardWidth, gapX, margin = 18 }) => {
  const gridWidth = cols * cardWidth + (cols - 1) * gapX;
  const centered = Math.round((viewportWidth - gridWidth) / 2);
  return Math.max(margin, centered);
};

export const accumulateWheelNavigation = ({ acc, deltaY, threshold = 300 }) => {
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

export const createSummerMeadowLayout = ({ width, height, bladeCount, flowerCount, seed = 1 }) => {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const grassN = Math.max(0, Math.floor(Number(bladeCount) || 0));
  const flowersN = Math.max(0, Math.floor(Number(flowerCount) || 0));
  const rng = mulberry32(seed);
  const margin = 80;
  const grass = Array.from({ length: grassN }, (_, idx) => {
    const x = -margin + rng() * (w + margin * 2);
    const y = h * (0.70 + rng() * 0.28);
    const hh = 20 + rng() * 110;
    const kindPick = rng();
    const kind = kindPick < 0.64 ? 'blade' : kindPick < 0.86 ? 'seed' : 'broad';
    return {
      kind,
      x,
      y,
      h: hh,
      lean: (rng() - 0.5) * 0.65,
      phase: rng() * Math.PI * 2,
      f: 0.7 + rng() * 1.35,
      w: 0.8 + rng() * 1.35,
      split: kind === 'blade' ? (idx % 7 === 0) : false,
      puff: kind === 'seed' ? (0.55 + rng() * 0.7) : 0
    };
  });

  const flowers = Array.from({ length: flowersN }, (_, idx) => {
    const x = -margin + rng() * (w + margin * 2);
    const y = h * (0.74 + rng() * 0.22);
    const kind = (idx % 5 === 0) ? 'clover' : 'daisy';
    const r = 1.6 + rng() * 4.8;
    return {
      kind,
      x,
      y,
      r,
      phase: rng() * Math.PI * 2,
      f: 0.8 + rng() * 1.4
    };
  });
  return { grass, flowers };
};
