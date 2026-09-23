type AssetOptions = {
  fetcher?: typeof fetch;
  decompressor?: typeof DecompressionStream | null;
};

function isGLB(bytes: ArrayBuffer) {
  if (bytes.byteLength < 12) return false;
  const header = new DataView(bytes);
  return header.getUint32(0, true) === 0x46546c67
    && header.getUint32(4, true) === 2
    && header.getUint32(8, true) === bytes.byteLength;
}

export async function loadPCAsset(options: AssetOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const Decompress = options.decompressor === undefined ? globalThis.DecompressionStream : options.decompressor;
  const read = async (url: string) => {
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`PC asset request failed (${response.status})`);
    const declaredBytes = Number(response.headers.get('content-length')) || null;
    return {bytes: await response.arrayBuffer(), declaredBytes};
  };

  if (Decompress) {
    try {
      const response = await read('/models/pc-19.glb.gz');
      const payload = response.bytes;
      // A host may already decode Content-Encoding. Recognize that response
      // rather than attempting to decompress the same asset a second time.
      const decoded = isGLB(payload) ? payload : await new Response(
        new Blob([payload]).stream().pipeThrough(new Decompress('gzip')),
      ).arrayBuffer();
      if (!isGLB(decoded)) throw new Error('Invalid compressed PC asset');
      return {bytes: decoded, source: 'gzip', responseBytes: payload.byteLength, declaredBytes: response.declaredBytes};
    } catch {
      // Older browsers and hosts without the sidecar retain the same live scene.
    }
  }

  const response = await read('/models/pc-19.glb');
  const bytes = response.bytes;
  if (!isGLB(bytes)) throw new Error('Invalid PC asset');
  return {bytes, source: 'raw', responseBytes: bytes.byteLength, declaredBytes: response.declaredBytes};
}
