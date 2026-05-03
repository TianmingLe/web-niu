const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export const serializeTracksForStorage = (tracks) => {
  const list = Array.isArray(tracks) ? tracks : [];
  return list.map((t) => {
    if (!isPlainObject(t)) return null;
    const source = String(t.source || 'library');
    const id = String(t.id || '');
    const name = String(t.name || '');
    if (!id || !name) return null;
    if (source === 'upload') {
      const blobKey = String(t.blobKey || '');
      if (!blobKey) return null;
      return {
        id,
        name,
        source: 'upload',
        blobKey,
        mimeType: t.mimeType ? String(t.mimeType) : '',
        size: Number.isFinite(t.size) ? t.size : null,
        lastModified: Number.isFinite(t.lastModified) ? t.lastModified : null
      };
    }
    const url = String(t.url || '');
    if (!url) return null;
    const altUrls = Array.isArray(t.altUrls) ? t.altUrls.map(String).filter(Boolean) : [];
    return {
      id,
      name,
      source,
      url,
      altUrls: altUrls.length ? altUrls : undefined
    };
  }).filter(Boolean);
};

export const extractUploadBlobKeys = (tracks) => {
  const list = Array.isArray(tracks) ? tracks : [];
  return list
    .filter((t) => isPlainObject(t) && t.source === 'upload' && typeof t.blobKey === 'string' && t.blobKey)
    .map((t) => t.blobKey);
};

