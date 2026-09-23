import {readFile, writeFile} from 'node:fs/promises';
import {gzipSync, gunzipSync} from 'node:zlib';

const source = new URL('../public/models/pc-19.glb', import.meta.url);
const target = new URL('../public/models/pc-19.glb.gz', import.meta.url);
const raw = await readFile(source);
const compressed = gzipSync(raw, {level: 9});
if (!gunzipSync(compressed).equals(raw)) throw new Error('PC gzip round-trip failed');
await writeFile(target, compressed);
console.log(`PC model: ${raw.byteLength.toLocaleString('en-US')} raw bytes; ${compressed.byteLength.toLocaleString('en-US')} gzip bytes`);
