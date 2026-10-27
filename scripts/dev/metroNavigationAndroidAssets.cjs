const fs = require('node:fs');
const path = require('node:path');

/** Keep upstream's Web/iOS assets intact; Android needs one file per density. */
function withNavigationAndroidAssets(config, projectRoot) {
  const packageRoot = path.dirname(require.resolve('@react-navigation/elements/package.json', {
    paths: [projectRoot],
  }));
  if (require(path.join(packageRoot, 'package.json')).version !== '2.9.5') {
    throw new Error('NAVIGATION_ANDROID_ASSET_VERSION_REVIEW_REQUIRED');
  }
  const canonical = (file) => fs.realpathSync(file);
  const sourceFamilies = new Map();
  for (const directory of ['lib/module/assets', 'src/assets']) {
    for (const name of ['clear-icon', 'close-icon']) {
      for (const suffix of ['', '@1x', '@2x', '@3x', '@4x']) {
        sourceFamilies.set(canonical(path.join(packageRoot, directory, `${name}${suffix}.png`)), name);
      }
    }
  }
  const inherited = config.resolver.resolveRequest;
  const next = (context, moduleName, platform) => inherited
    ? inherited(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const original = next(context, moduleName, platform);
    if (platform !== 'android' || original.type !== 'assetFiles') return original;
    const families = original.filePaths.map((file) => sourceFamilies.get(canonical(file)));
    if (!families.some(Boolean)) return original;
    const name = families[0];
    if (!name || families.some((family) => family !== name)) {
      throw new Error('NAVIGATION_ANDROID_ASSET_FAMILY_MIXED');
    }
    const normalized = path.join(projectRoot, 'assets/navigation-android/elements-2.9.5', `${name}.png`);
    return next(context, normalized, platform);
  };
  return config;
}

module.exports = { withNavigationAndroidAssets };
