import fs from "node:fs";
import path from "node:path";

const artifactDir = path.join(process.cwd(), "artifacts", "S_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP");

function readJson(name: string): Record<string, unknown> | null {
  const filePath = path.join(artifactDir, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function collectPaths(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectPaths);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectPaths);
  return [];
}

describe("Android route bootstrap wave: no placeholder screenshots", () => {
  it("requires any recorded screenshot or UI dump path to point at a real non-placeholder file", () => {
    const screenshots = readJson("android_screenshots.json");
    const dumps = readJson("android_ui_dumps.json");
    const matrix = readJson("matrix.json");
    if (!screenshots && !dumps) {
      expect(screenshots).toBeNull();
      expect(dumps).toBeNull();
      return;
    }

    const screenshotPaths = collectPaths((screenshots?.screenshots ?? {}) as unknown).filter((file) =>
      file.endsWith(".png"),
    );
    const dumpPaths = collectPaths((dumps?.ui_dumps ?? {}) as unknown).filter((file) => file.endsWith(".xml"));

    for (const file of screenshotPaths) {
      expect(file).not.toMatch(/placeholder|fake/i);
      const fullPath = path.resolve(process.cwd(), file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(1000);
    }

    for (const file of dumpPaths) {
      expect(file).not.toMatch(/placeholder|fake/i);
      const fullPath = path.resolve(process.cwd(), file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(200);
    }

    if (matrix?.final_status === "GREEN_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP_READY") {
      expect(screenshotPaths.length).toBeGreaterThanOrEqual(4);
      expect(dumpPaths.length).toBeGreaterThanOrEqual(4);
    }
  });
});
