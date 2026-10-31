const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { withNavigationAndroidAssets } = require('./metroNavigationAndroidAssets.cjs');
const { getAssetData, getAssetFiles } = require('metro/private/Assets');
const { computeReleaseFingerprintPayload } = require('../release/computeReleaseFingerprints');

const root = path.resolve(__dirname, '../..');
const packageRoot = path.dirname(require.resolve('@react-navigation/elements/package.json'));
const normalizedRoot = path.join(root, 'assets/navigation-android/elements-2.9.5');

describe('React Navigation Android asset inputs', () => {
  it('rejects contradictory build-preparation modes before any provider or backend work', () => {
    const launcher = path.join(root, 'scripts/dev/startWholeAppDeveloperReview.ps1');
    for (const conflict of ['-PreflightOnly', '-VerifyFullTypecheck']) {
      const child = spawnSync('powershell', ['-NoProfile', '-File', launcher, '-PrepareBuildOnly', conflict], {
        cwd: root, windowsHide: true, encoding: 'utf8',
      });
      expect(child.status).not.toBe(0);
      expect(child.stderr).toContain('WHOLE_APP_BUILD_PREPARATION_SWITCH_CONFLICT');
      expect(child.stdout).not.toContain('WHOLE_APP_DEVELOPER_PREFLIGHT_GREEN');
    }
  });
  it('attests the production resolver bytes in both source and JS fingerprints', () => {
    const name = 'scripts/dev/metroNavigationAndroidAssets.cjs';
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
    for (const scope of ['productSourceHash', 'jsBundleFingerprint']) {
      const payload = computeReleaseFingerprintPayload(scope);
      expect(payload.files.find(file => file.path === name)?.sha256).toBe(hash);
    }
  });
  for (const name of ['clear-icon', 'close-icon']) {
    it(`keeps all four original native densities and consistent Metro metadata for ${name}`, async () => {
      const absolute = path.join(normalizedRoot, `${name}.png`);
      const data = await getAssetData(absolute, path.relative(root, absolute), [], 'android', '/assets');
      const size = name === 'clear-icon' ? 16 : 24;
      expect(data.scales).toEqual([1, 2, 3, 4]);
      expect(data.width).toBe(size);
      expect(data.height).toBe(size);
      expect(data.files).toHaveLength(4);
      const combined = crypto.createHash('md5');
      data.files.forEach((file, i) => {
        const original = fs.readFileSync(path.join(packageRoot, 'lib/module/assets', `${name}@${i + 1}x.png`));
        expect(fs.readFileSync(file).equals(original)).toBe(true);
        combined.update(original);
      });
      expect(data.hash).toBe(combined.digest('hex'));
      expect(fs.readFileSync(path.join(packageRoot, 'lib/module/assets', `${name}.png`)))
        .toEqual(fs.readFileSync(data.files[3]));
    });
  }

  it.each(['lib/module/assets', 'src/assets'])('delegates exact Android families from %s to the normalized inputs', async (directory) => {
    const originalFile = path.join(packageRoot, directory, 'clear-icon.png');
    const original = { type: 'assetFiles', filePaths: await getAssetFiles(originalFile, 'android') };
    const normalizedFile = path.join(normalizedRoot, 'clear-icon.png');
    const normalized = { type: 'assetFiles', filePaths: await getAssetFiles(normalizedFile, 'android') };
    const inherited = jest.fn((_context, name) => name === originalFile ? original : normalized);
    const config = { resolver: { resolveRequest: inherited } };
    withNavigationAndroidAssets(config, root);
    const context = { resolveRequest: jest.fn() };
    expect(config.resolver.resolveRequest(context, originalFile, 'android')).toBe(normalized);
    expect(inherited.mock.calls).toEqual([[context, originalFile, 'android'], [context, normalizedFile, 'android']]);
    expect(context.resolveRequest).not.toHaveBeenCalled();
  });

  it.each(['web', 'ios'])('preserves the upstream result and calls the inherited resolver once on %s', async (platform) => {
    const asset = path.join(packageRoot, 'lib/module/assets/close-icon.png');
    const original = { type: 'assetFiles', filePaths: await getAssetFiles(asset, platform) };
    const inherited = jest.fn(() => original);
    const config = { resolver: { resolveRequest: inherited } };
    withNavigationAndroidAssets(config, root);
    expect(config.resolver.resolveRequest({}, asset, platform)).toBe(original);
    expect(inherited).toHaveBeenCalledTimes(1);
  });

  it('keeps unrelated Android assets and source modules object-identical through the default resolver', () => {
    const config = { resolver: {} };
    withNavigationAndroidAssets(config, root);
    const result = { type: 'assetFiles', filePaths: [path.join(root, 'assets/notify.wav')] };
    const context = { resolveRequest: jest.fn(() => result) };
    expect(config.resolver.resolveRequest(context, './notify.wav', 'android')).toBe(result);
    const source = { type: 'sourceFile', filePath: __filename };
    context.resolveRequest.mockReturnValue(source);
    expect(config.resolver.resolveRequest(context, './module', 'android')).toBe(source);
    expect(context.resolveRequest).toHaveBeenCalledTimes(2);
  });
});
