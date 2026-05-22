import fs from "node:fs";
import path from "node:path";

describe("all screens no second media framework contract", () => {
  it("keeps media/photo/document controls on existing Expo media dependencies and app services", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies["expo-image-picker"]).toBeDefined();
    expect(packageJson.dependencies["expo-document-picker"]).toBeDefined();
    expect(fs.existsSync(path.join(process.cwd(), "src/lib/media/services/mediaBackendUploadService.ts"))).toBe(true);
  });
});
