// BEGIN LOCAL_SERIAL_METRO_CACHE_READS
// Bound FileStore read/UTF-8/JSON fanout; the complete returned value is retained.
// Writes and clear keep their original invocation timing and return semantics.
const serialMetroCacheReadWrappers = new WeakMap();

function createSerialMetroCacheReadStore(store) {
  if (!store || typeof store.get !== "function" || typeof store.set !== "function"
    || typeof store.clear !== "function") {
    throw new TypeError("Expected the existing Metro cache store interface");
  }
  const existing = serialMetroCacheReadWrappers.get(store);
  if (existing) return existing;

  let head = null;
  let tail = null;
  let active = false;
  const pump = () => {
    if (active || head === null) return;
    active = true;
    const item = head;
    head = item.next;
    if (head === null) tail = null;
    item.next = null;
    const finish = (ok, result) => {
      const settle = ok ? item.resolve : item.reject;
      item.key = null;
      item.resolve = null;
      item.reject = null;
      active = false;
      settle(result);
      pump();
    };
    // A synchronous throw or thenable rejection also releases the read slot.
    // The microtask prevents recursive synchronous completions growing a stack.
    Promise.resolve()
      .then(() => Reflect.apply(store.get, store, [item.key]))
      .then((value) => finish(true, value), (error) => finish(false, error));
  };
  const wrapper = {
    get name() { return store.name ?? store.constructor.name; },
    get(key) {
      return new Promise((resolve, reject) => {
        const item = { key, resolve, reject, next: null };
        if (tail === null) head = item;
        else tail.next = item;
        tail = item;
        pump();
      });
    },
    set(key, value) { return Reflect.apply(store.set, store, [key, value]); },
    clear() { return Reflect.apply(store.clear, store, []); },
  };
  serialMetroCacheReadWrappers.set(store, wrapper);
  serialMetroCacheReadWrappers.set(wrapper, wrapper);
  return wrapper;
}

function withLocalSerialMetroCacheReads(config, runtime = process) {
  const localReview = runtime.env.LOCAL_DEVELOPER_REVIEW === "1"
    || runtime.env.EXPO_PUBLIC_RELEASE_LABEL === "STAGING_WHOLE_APP_WITH_LOCAL_ESTIMATE";
  if (runtime.platform !== "win32" || !localReview) {
    return config;
  }
  // The installed Expo config has one FileStore. Do not silently schedule a
  // new multi-store/read-through topology without an addressed review.
  if (!Array.isArray(config.cacheStores) || config.cacheStores.length === 0
    || new Set(config.cacheStores).size !== 1) {
    throw new Error("Expected one existing local Expo cache store");
  }
  config.cacheStores = config.cacheStores.map(createSerialMetroCacheReadStore);
  return config;
}
// END LOCAL_SERIAL_METRO_CACHE_READS

function localDeveloperMetroConfig() {
  if (process.env.LOCAL_DEVELOPER_REVIEW === "1") {
    const { getDefaultConfig } = require("expo/metro-config");
    const { existsSync, statSync } = require("node:fs");
    const { delimiter, join } = require("node:path");
    const config = getDefaultConfig(__dirname);
    const fallbackModulePaths = String(process.env.NODE_PATH || "")
      .split(delimiter)
      .filter(Boolean);
    config.resolver.nodeModulesPaths = [
      ...(config.resolver.nodeModulesPaths || []),
      ...fallbackModulePaths,
    ];
    const fallbackRoot = fallbackModulePaths.find((candidate) =>
      existsSync(join(candidate, "@babel", "runtime", "package.json")),
    );
    if (fallbackRoot) {
      const babelRuntimeRoot = join(fallbackRoot, "@babel", "runtime");
      config.watchFolders = [
        ...(config.watchFolders || []),
        babelRuntimeRoot,
      ];
      config.resolver.extraNodeModules = {
        ...(config.resolver.extraNodeModules || {}),
        "@babel/runtime": babelRuntimeRoot,
      };
      const inheritedResolveRequest = config.resolver.resolveRequest;
      config.resolver.resolveRequest = (context, moduleName, platform) => {
        if (moduleName.startsWith("@babel/runtime/")) {
          const relativeModulePath = moduleName.slice("@babel/runtime/".length);
          const exactPath = join(babelRuntimeRoot, relativeModulePath);
          const filePath = [exactPath, `${exactPath}.js`, join(exactPath, "index.js")]
            .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
          if (filePath) return { filePath, type: "sourceFile" };
        }
        return inheritedResolveRequest
          ? inheritedResolveRequest(context, moduleName, platform)
          : context.resolveRequest(context, moduleName, platform);
      };
    }
    return config;
  }
  const { getSentryExpoConfig } = require("@sentry/react-native/metro");
  return getSentryExpoConfig(__dirname);
}

// Production Expo inlines EXPO_PUBLIC_* values inside transformed modules.
// Metro's ordinary file cache key does not include those process values.
function withPublicEnvTransformCache(config, runtime = process) {
  const entries = Object.keys(runtime.env)
    .filter((name) => name.startsWith("EXPO_PUBLIC_") && typeof runtime.env[name] === "string")
    .sort()
    .map((name) => [name, runtime.env[name]]);
  if (entries.length === 0) return config;
  const digest = require("node:crypto").createHash("sha256")
    .update(JSON.stringify(entries)).digest("hex");
  config.cacheVersion = [config.cacheVersion ?? "", "expo-public-env-v1", digest].join(":");
  return config;
}

const config = localDeveloperMetroConfig();
withPublicEnvTransformCache(config);
// Verification reports and archived source copies are never application modules.
// Keep the files intact, but do not index them in either Expo/Sentry Metro mode.
const generatedRuntimeRoot = require("node:path").resolve(__dirname, ".release-runtime");
const generatedRuntimePath = generatedRuntimeRoot.split(/[\\/]/)
  .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("[\\\\/]");
const inheritedBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(inheritedBlockList) ? inheritedBlockList
    : inheritedBlockList ? [inheritedBlockList] : []),
  new RegExp(`^${generatedRuntimePath}(?:[\\\\/]|$)`),
];
require("./scripts/dev/metroAndroidBundleTransport.cjs").withLocalAndroidBundleTransport(config);
require("./scripts/dev/metroNavigationAndroidAssets.cjs").withNavigationAndroidAssets(config, __dirname);

withLocalSerialMetroCacheReads(config);
const compactLocalOutput = process.env.LOCAL_DEVELOPER_REVIEW === "1"
  || (process.platform === "win32"
    && process.env.EXPO_PUBLIC_RELEASE_LABEL === "STAGING_WHOLE_APP_WITH_LOCAL_ESTIMATE");
config.transformer = {
  ...config.transformer,
  ...(compactLocalOutput ? { unstable_compactOutput: true } : {}),
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
