const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../metro.config.js"), "utf8");
const projectRoot = path.resolve("/gox[review]+/canonical");

function loadConfig(localReview, inheritedBlockList, options = {}) {
  const config = {
    cacheVersion: options.cacheVersion,
    resolver: { blockList: inheritedBlockList },
    transformer: { inheritedTransformOption: "retained" },
    cacheStores: [options.store || { get() {}, set() {}, clear() {} }],
  };
  const getConfig = jest.fn(() => config);
  const result = { exports: {} };
  vm.runInNewContext(source, {
    __dirname: projectRoot,
    module: result,
    process: {
      platform: options.platform || "win32",
      env: { LOCAL_DEVELOPER_REVIEW: localReview ? "1" : "0", EXPO_PUBLIC_RELEASE_LABEL: options.label, ...options.env },
    },
    require(name) {
      if (name === "expo/metro-config") return { getDefaultConfig: getConfig };
      if (name === "@sentry/react-native/metro") return { getSentryExpoConfig: getConfig };
      if (name === "./scripts/dev/metroAndroidBundleTransport.cjs") {
        return { withLocalAndroidBundleTransport: (value) => value };
      }
      if (name === "./scripts/dev/metroNavigationAndroidAssets.cjs") {
        return { withNavigationAndroidAssets: (value) => value };
      }
      return require(name);
    },
  });
  expect(getConfig).toHaveBeenCalledWith(projectRoot);
  return result.exports;
}

describe.each([false, true])("generated Metro runtime exclusion, local review=%s", (localReview) => {
  it.each([undefined, /inherited-one/, [/inherited-one/, /inherited-two/]])(
    "retains upstream exclusions and excludes only the exact generated directory: %s",
    (inherited) => {
      const config = loadConfig(localReview, inherited);
      const original = Array.isArray(inherited) ? inherited : inherited ? [inherited] : [];
      expect(config.resolver.blockList.slice(0, original.length)).toEqual(original);
      const excluded = (file) => config.resolver.blockList.some((pattern) => pattern.test(file));
      for (const file of [
        ".release-runtime", ".release-runtime/verification-v1/report.json",
        ".release-runtime/archive/src/old.tsx", ".release-runtime/r568/runtime/backend.json",
      ]) {
        const absolute = path.join(projectRoot, file);
        expect(excluded(absolute)).toBe(true);
        expect(excluded(absolute.replace(/\\/g, "/"))).toBe(true);
        expect(excluded(absolute.replace(/\//g, "\\"))).toBe(true);
      }
      for (const file of [
        "app/_layout.tsx", "src/lib/estimate/current.ts", "assets/navigation-android/clear-icon.png",
        "public/pdfjs/pdf.worker.min.mjs", "data/estimate-benchmarks/source-packs/current.json",
        "node_modules/expo/package.json", ".release-runtime-backup/report.json",
        "src/.release-runtime/example.ts", "release-runtime/report.json",
      ]) expect(excluded(path.join(projectRoot, file))).toBe(false);
      expect(excluded(path.join(projectRoot.replace("[review]+", "review"), ".release-runtime/report.json"))).toBe(false);
      for (const pattern of original) expect(excluded(path.join(projectRoot, pattern.source))).toBe(true);
    },
  );
});

describe("whole-app local Metro memory settings", () => {
  const label = "STAGING_WHOLE_APP_WITH_LOCAL_ESTIMATE";
  it("serializes whole-app cache reads without changing values, errors, writes or clear", async () => {
    let release;
    const first = { code: "source".repeat(30000), map: [[1, 2, 3, 4]], dependencies: ["same-module"] };
    const failure = new Error("original-cache-error");
    const store = {
      get: jest.fn((key) => key === "one" ? new Promise((resolve) => { release = () => resolve(first); })
        : Promise.reject(failure)),
      set: jest.fn(() => "write-result"), clear: jest.fn(() => "clear-result"),
    };
    const config = loadConfig(false, undefined, { label, store });
    const cache = config.cacheStores[0];
    const one = cache.get("one");
    const two = cache.get("two");
    const originalError = two.catch((error) => error);
    await Promise.resolve();
    expect(store.get.mock.calls).toEqual([["one"]]);
    expect(cache.set("key", first)).toBe("write-result");
    expect(store.set).toHaveBeenCalledWith("key", first);
    expect(cache.clear()).toBe("clear-result");
    release();
    expect(await one).toBe(first);
    expect(await originalError).toBe(failure);
    expect(store.get.mock.calls).toEqual([["one"], ["two"]]);
    expect(config.transformer.unstable_compactOutput).toBe(true);
    expect(config.transformer.inheritedTransformOption).toBe("retained");
    expect(await config.transformer.getTransformOptions()).toEqual({
      transform: { experimentalImportSupport: false, inlineRequires: true },
    });
  });

  it.each([
    { label: "production", platform: "win32" },
    { label, platform: "linux" },
    { label, platform: "darwin" },
  ])("preserves the upstream cache and output settings outside the exact local Windows profile: %j", (options) => {
    const store = { get() {}, set() {}, clear() {} };
    const config = loadConfig(false, undefined, { ...options, store });
    expect(config.cacheStores[0]).toBe(store);
    expect(config.transformer.unstable_compactOutput).toBeUndefined();
  });
});


describe("Metro public environment transform identity", () => {
  const env = {
    EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: "source-a",
    EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: "product-a",
    EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: "bundle-a",
    EXPO_PUBLIC_BUILD_COMMIT: "commit-a",
    EXPO_PUBLIC_BUILD_TIME: "time-a",
    EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID: "release-a",
    EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID: "search-a",
    EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID: "capability-a",
    EXPO_PUBLIC_SUPABASE_URL: "https://example.invalid",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-test-key",
  };
  const version = (values, base = "upstream-v3") => loadConfig(false, undefined, { env: values, cacheVersion: base }).cacheVersion;
  it.each(Object.keys(env))("invalidates inlined transforms when %s changes", (name) => {
    expect(version({ ...env, [name]: env[name] + "-changed" })).not.toBe(version(env));
  });
  it("keeps the same snapshot key across process environment order and private variables", () => {
    const reversed = Object.fromEntries(Object.entries(env).reverse());
    expect(version(reversed)).toBe(version(env));
    expect(version({ ...env, PRIVATE_BACKEND_SECRET: "different" })).toBe(version(env));
  });
  it("retains the upstream cache namespace and never embeds public values in the key", () => {
    const key = version(env);
    expect(key).toMatch(/^upstream-v3:expo-public-env-v1:[a-f0-9]{64}$/);
    expect(version(env, "upstream-v4")).not.toBe(key);
    for (const value of Object.values(env)) expect(key).not.toContain(value);
  });
  it("preserves ordinary upstream caching when no public variables exist", () => {
    expect(version({})).toBe("upstream-v3");
  });
});
