import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("releaseConfig.shared", () => {
  it("declares the fixed runtime policy in app config", () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, "app.json"), "utf8"),
    ) as {
      expo?: {
        runtimeVersion?: unknown;
        extra?: {
          release?: {
            runtimePolicy?: unknown;
          };
        };
      };
    };

    expect(appJson.expo?.runtimeVersion).toBe("1.0.0");
    expect(appJson.expo?.extra?.release?.runtimePolicy).toBe("fixed(1.0.0)");
  });
});
