import fs from "node:fs";
import path from "node:path";

const artifactDir = path.join(process.cwd(), "artifacts", "S_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP");

function readJson(name: string): Record<string, unknown> | null {
  const filePath = path.join(artifactDir, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function containsPlaceholder(value: unknown): boolean {
  if (typeof value === "string") {
    return /\bplaceholder\b|fake screenshot|fake xml|captured from code analysis|not a real file/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  if (value && typeof value === "object") return Object.values(value).some(containsPlaceholder);
  return false;
}

describe("Android route bootstrap wave: no fake artifacts", () => {
  it("does not allow GREEN with placeholders or missing route proof artifacts", () => {
    const matrix = readJson("matrix.json");
    if (!matrix) {
      expect(matrix).toBeNull();
      return;
    }

    expect(matrix.fake_green_claimed).toBe(false);
    expect(containsPlaceholder(matrix)).toBe(false);

    if (matrix.final_status === "GREEN_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP_READY") {
      expect(matrix.android_screenshots_real).toBe(true);
      expect(matrix.android_ui_dumps_real).toBe(true);
      expect(matrix.request_route_opened).toBe(true);
      expect(matrix.embedded_ai_route_opened).toBe(true);
      expect(matrix.product_logic_changed).toBe(false);
      expect(matrix.estimate_engine_changed).toBe(false);
    }
  });
});
