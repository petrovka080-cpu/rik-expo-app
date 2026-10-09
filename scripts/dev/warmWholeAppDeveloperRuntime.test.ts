/** @jest-environment node */
import { createHash } from 'node:crypto';
const { androidBundleUrl, warmWholeAppDeveloperRuntime } = require('./warmWholeAppDeveloperRuntime.cjs');
const origin = 'http://127.0.0.1:8081';
const bundle = origin + '/index.bundle?platform=android&dev=true&lazy=true&transform.bytecode=1';
const library = Buffer.from('pinned-library'), worker = Buffer.from('pinned-worker');
const streamResponse = (bytes: Buffer, contentType = 'application/javascript') => ({
  ok: true, headers: { get: () => contentType }, body: (async function* () { yield bytes; })(),
});
function fixture(overrides: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    [origin + '/']: { ok: true, json: async () => ({ launchAsset: { url: bundle } }) },
    [bundle]: streamResponse(Buffer.from('android bundle')),
    [origin + '/pdfjs/pdf.mjs']: streamResponse(library),
    [origin + '/pdfjs/pdf.worker.mjs']: streamResponse(worker), ...overrides,
  };
  const fetchImpl = jest.fn(async (url: string) => responses[url]);
  const readFile = (file: string) => file.endsWith('pdf.worker.mjs') ? worker : library;
  return { port: 8081, root: '.', fetchImpl, readFile };
}
describe('whole-app startup before first Android/PDF use', () => {
  it('warms the exact native manifest URL and verifies both pinned renderer files', async () => {
    const options = fixture();
    const receipt = await warmWholeAppDeveloperRuntime(options);
    expect(options.fetchImpl.mock.calls.map(call => call[0])).toEqual([origin + '/', bundle, origin + '/pdfjs/pdf.mjs', origin + '/pdfjs/pdf.worker.mjs']);
    expect(receipt.status).toBe('WHOLE_APP_WEB_ANDROID_PDF_TRANSPORT_READY');
    expect(receipt.pdfAssets[1].sha256).toBe(createHash('sha256').update(worker).digest('hex'));
  });
  it.each(['https://elsewhere.test/index.bundle?platform=android', origin + '/index.bundle?platform=web', origin + '/index.bundle?platform=android&platform=web'])('rejects a wrong transport target before requesting it: %s', url => {
    expect(() => androidBundleUrl({ launchAsset: { url } }, origin)).toThrow('WHOLE_APP_ANDROID_MANIFEST_BUNDLE_INVALID');
  });
  it('does not call the runtime ready when native compilation returns an error page', async () => {
    await expect(warmWholeAppDeveloperRuntime(fixture({ [bundle]: streamResponse(Buffer.from('<html>error</html>'), 'text/html') }))).rejects.toThrow('WHOLE_APP_ANDROID_BUNDLE_CONTENT_INVALID');
  });
  it('does not accept a missing or substituted PDF worker', async () => {
    await expect(warmWholeAppDeveloperRuntime(fixture({ [origin + '/pdfjs/pdf.worker.mjs']: streamResponse(Buffer.from('old worker')) }))).rejects.toThrow('WHOLE_APP_PDF_ASSET_BYTES_MISMATCH');
  });
  it('propagates an aborted or failed download and cannot emit readiness', async () => {
    const options = fixture();
    options.fetchImpl.mockRejectedValueOnce(new Error('download aborted'));
    await expect(warmWholeAppDeveloperRuntime(options)).rejects.toThrow('download aborted');
    expect(options.fetchImpl).toHaveBeenCalledTimes(1);
  });
});
