const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function androidBundleUrl(manifest, origin) {
  const url = new URL(manifest?.launchAsset?.url);
  // Follow the same Expo manifest as the dev client, on this launcher only.
  if (url.origin !== origin || url.username || url.password || url.hash
    || !url.pathname.endsWith('.bundle')
    || url.searchParams.getAll('platform').length !== 1
    || url.searchParams.get('platform') !== 'android') {
    throw new Error('WHOLE_APP_ANDROID_MANIFEST_BUNDLE_INVALID');
  }
  return url.href;
}

async function readResource(fetchImpl, url, timeoutMs, maxBytes, headers = {}) {
  const started = Date.now();
  const response = await fetchImpl(url, { headers, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok || !response.body) throw new Error('WHOLE_APP_WARMUP_HTTP_FAILED');
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error('WHOLE_APP_WARMUP_RESPONSE_TOO_LARGE');
    hash.update(chunk);
  }
  if (bytes === 0) throw new Error('WHOLE_APP_WARMUP_EMPTY_RESPONSE');
  return { bytes, sha256: hash.digest('hex'), durationMs: Date.now() - started,
    contentType: response.headers.get('content-type') || '' };
}

async function warmWholeAppDeveloperRuntime({ port, root, fetchImpl = fetch, readFile = fs.readFileSync }) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('WHOLE_APP_WARMUP_PORT_INVALID');
  const origin = `http://127.0.0.1:${port}`;
  const response = await fetchImpl(origin + '/', { headers: { 'expo-platform': 'android', accept: 'application/expo+json' },
    redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('WHOLE_APP_ANDROID_MANIFEST_FAILED');
  const bundleUrl = androidBundleUrl(await response.json(), origin);
  // Stream rather than retaining a second large copy of the Android bundle.
  const android = await readResource(fetchImpl, bundleUrl, 180000, 128 * 1024 * 1024, { accept: 'application/javascript' });
  if (!/^(application\/(javascript|octet-stream)|text\/javascript)(;|$)/i.test(android.contentType)) {
    throw new Error('WHOLE_APP_ANDROID_BUNDLE_CONTENT_INVALID');
  }
  const pdfAssets = [];
  for (const file of ['pdf.mjs', 'pdf.worker.mjs']) {
    const resource = await readResource(fetchImpl, `${origin}/pdfjs/${file}`, 15000, 16 * 1024 * 1024);
    const expectedHash = createHash('sha256').update(readFile(path.join(root, 'public', 'pdfjs', file))).digest('hex');
    if (resource.sha256 !== expectedHash) throw new Error('WHOLE_APP_PDF_ASSET_BYTES_MISMATCH');
    pdfAssets.push({ file, ...resource });
  }
  return { status: 'WHOLE_APP_WEB_ANDROID_PDF_TRANSPORT_READY', capturedAt: new Date().toISOString(),
    android, pdfAssets, catalogMutation: false, viewerRenderTimeoutChanged: false };
}

module.exports = { androidBundleUrl, warmWholeAppDeveloperRuntime };
if (require.main === module) {
  const [port, root, receiptPath] = process.argv.slice(2);
  warmWholeAppDeveloperRuntime({ port: Number(port), root }).then(receipt => {
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(receipt.status);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
