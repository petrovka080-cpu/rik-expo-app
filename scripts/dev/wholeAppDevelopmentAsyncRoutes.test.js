const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const withRouter = require('expo-router/plugin/build').default;
const { getMetroDirectBundleOptionsForExpoConfig } = require(
  'expo/node_modules/@expo/cli/build/src/start/server/middleware/metroOptions',
);
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const routerEntry = app.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-router');

describe('whole-app development route loading through the installed Expo owner', () => {
  test('opts into the supported development mode without changing the application route root', () => {
    expect(app.plugins.filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-router')).toHaveLength(1);
    expect(routerEntry[1]).toEqual({ asyncRoutes: 'development' });
    const configured = withRouter(structuredClone(app), routerEntry[1]);
    expect(configured.extra.router).toEqual({ asyncRoutes: 'development' });
    expect(configured.android).toEqual(app.android);
    expect(configured.ios.bundleIdentifier).toBe(app.ios.bundleIdentifier);
  });

  test.each(['web', 'android', 'ios'])('uses lazy route transforms on %s only in development', (platform) => {
    const configured = withRouter(structuredClone(app), routerEntry[1]);
    const options = (mode) => getMetroDirectBundleOptionsForExpoConfig(root, configured, {
      mainModuleName: 'index', platform, mode, environment: 'client', lazy: true,
    });
    const development = options('development');
    expect(development.customTransformOptions.asyncRoutes).toBe('true');
    expect(development.customTransformOptions.routerRoot).toBe('app');
    expect(development.entryFile).toBe('index');
    expect(development.lazy).toBe(true);
    const production = options('production');
    expect(production.customTransformOptions).not.toHaveProperty('asyncRoutes');
    expect(production.customTransformOptions.routerRoot).toBe('app');
    expect(production.entryFile).toBe('index');
  });
});
