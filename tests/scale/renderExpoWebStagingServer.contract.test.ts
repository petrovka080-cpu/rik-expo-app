import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("Render Expo web staging service config", () => {
  it("defines production web build/start scripts without dev server fallback", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["render:build:web"]).toContain("expo/bin/cli export --platform web --output-dir dist");
    expect(packageJson.scripts["render:start:web"]).toBe("node scripts/render/serveExpoWebStaging.mjs");
    expect(packageJson.scripts["render:start:web"]).not.toContain("expo start");
  });

  it("serves a Render-compatible health/version API and SPA fallback", () => {
    const server = readProjectFile("scripts/render/serveExpoWebStaging.mjs");

    expect(server).toContain('url.pathname === "/health"');
    expect(server).toContain('url.pathname === "/api/version"');
    expect(server).toContain('url.pathname === "/__version"');
    expect(server).toContain('const CATALOG_VERSION = "catalog:11610"');
    expect(server).toContain('return existsSync(indexPath) ? indexPath : null');
    expect(server).toContain('server.listen(port, host');
    expect(server).toContain('const host = process.env.HOST ?? "0.0.0.0"');
  });

  it("keeps Render app staging isolated from BFF/prod auto deploy", () => {
    const renderYaml = readProjectFile("render.yaml");

    expect(renderYaml).toContain("name: rik-expo-app-staging");
    expect(renderYaml).toContain("repo: https://github.com/petrovka080-cpu/rik-expo-app.git");
    expect(renderYaml).toContain("branch: release/ios-after-build48-integration");
    expect(renderYaml).toContain("buildCommand: npm ci && npm run render:build:web");
    expect(renderYaml).toContain("startCommand: npm run render:start:web");
    expect(renderYaml).toContain("healthCheckPath: /health");
    expect(renderYaml).toContain("autoDeploy: false");
    expect(renderYaml).not.toContain("gox-build-production-bff");
    expect(renderYaml).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
