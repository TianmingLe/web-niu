const uniq = (items) => {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (!item) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
};

export const buildMusicUrlCandidates = (file) => {
  const f = String(file || '').trim();
  if (!f) return [];
  const encodedUri = `/music/${encodeURI(f)}`;
  const encodedComponent = `/music/${encodeURIComponent(f).replace(/%2F/g, '/')}`;
  const raw = `/music/${f}`;
  return uniq([encodedUri, encodedComponent, raw]);
};

