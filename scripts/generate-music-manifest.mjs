import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const musicDir = path.join(ROOT, 'public', 'music');
const outFile = path.join(musicDir, 'manifest.json');

const isAudioFile = (name) => {
  const ext = path.extname(name).toLowerCase();
  return ext === '.mp3' || ext === '.wav' || ext === '.ogg';
};

const main = async () => {
  let entries = [];
  try {
    entries = await fs.readdir(musicDir, { withFileTypes: true });
  } catch (e) {
    await fs.mkdir(musicDir, { recursive: true });
    entries = [];
  }

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name !== 'manifest.json')
    .filter(isAudioFile)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));

  const tracks = files.map((file) => {
    const base = path.basename(file, path.extname(file));
    return { name: base, file };
  });

  const payload = {
    version: 1,
    tracks
  };

  await fs.writeFile(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
