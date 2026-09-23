import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPCAsset} from '../src/scripts/pc-asset.ts';

const raw = await readFile(new URL('../public/models/pc-19.glb', import.meta.url));
const compressed = await readFile(new URL('../public/models/pc-19.glb.gz', import.meta.url));

test('PC explicit gzip payload transfers under 3 MB and decodes to the exact model', async () => {
  const requests = [];
  const asset = await loadPCAsset({fetcher: async url => {
    requests.push(url);
    return new Response(compressed);
  }});
  assert.deepEqual(requests, ['/models/pc-19.glb.gz']);
  assert.equal(asset.source, 'gzip');
  assert.equal(asset.responseBytes, compressed.byteLength);
  assert.ok(asset.responseBytes < 3_000_000);
  assert.ok(Buffer.from(asset.bytes).equals(raw), 'gzip sidecar must match the current raw model');
});

test('PC accepts a gzip response already decoded by the host', async () => {
  const asset = await loadPCAsset({fetcher: async () => new Response(raw, {headers: {'content-length': String(compressed.byteLength)}})});
  assert.equal(asset.source, 'gzip');
  assert.equal(asset.declaredBytes, compressed.byteLength);
  assert.ok(Buffer.from(asset.bytes).equals(raw));
});

test('PC raw fallback handles unsupported decompression, missing sidecar, and damaged gzip', async () => {
  for (const failure of ['unsupported', 'missing', 'damaged']) {
    const requests = [];
    const asset = await loadPCAsset({
      ...(failure === 'unsupported' ? {decompressor: null} : {}),
      fetcher: async url => {
        requests.push(url);
        if (url.endsWith('.glb')) return new Response(raw);
        return failure === 'missing' ? new Response(null, {status: 404}) : new Response('invalid gzip');
      },
    });
    assert.equal(asset.source, 'raw');
    assert.ok(Buffer.from(asset.bytes).equals(raw));
    assert.deepEqual(requests, failure === 'unsupported' ? ['/models/pc-19.glb'] : ['/models/pc-19.glb.gz', '/models/pc-19.glb']);
  }
});

test('PC fails cleanly when neither asset payload is usable', async () => {
  await assert.rejects(loadPCAsset({fetcher: async () => new Response('invalid model')}), /Invalid PC asset/);
});
