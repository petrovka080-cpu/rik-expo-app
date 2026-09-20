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

const config = localDeveloperMetroConfig();

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
