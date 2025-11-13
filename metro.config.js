const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const rootGuard = path.join(projectRoot, "app", "_webStyleGuard.tsx");
const origResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (ctx, name, platform) => {
  if (name === "./_webStyleGuard" || name.endsWith("/_webStyleGuard")) {
    return { type: "sourceFile", filePath: rootGuard };
  }
  if (typeof origResolve === "function") return origResolve(ctx, name, platform);
  return ctx.resolveRequest(ctx, name, platform);
};

module.exports = config;
