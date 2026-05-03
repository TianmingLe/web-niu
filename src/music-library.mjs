import { buildMusicUrlCandidates } from './music-url.mjs';

export const tracksFromManifest = (data) => {
  const list = Array.isArray(data?.tracks) ? data.tracks : [];
  return list
    .map((t) => {
      const file = String(t?.file || '').trim();
      if (!file || !/\.(mp3|wav|ogg)$/i.test(file)) return null;
      const name = String(t?.name || file.replace(/\.[^/.]+$/, '')).trim() || file.replace(/\.[^/.]+$/, '');
      const urls = buildMusicUrlCandidates(file);
      const url = urls[0] || `/music/${encodeURI(file)}`;
      const altUrls = urls.slice(1);
      return { id: `lib-${name}-${file}`, name, url, altUrls, source: 'library' };
    })
    .filter(Boolean);
};

