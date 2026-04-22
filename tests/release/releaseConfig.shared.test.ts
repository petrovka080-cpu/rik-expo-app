import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("releaseConfig.shared", () => {
  it("declares the fingerprint runtime policy in app config", () => {
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

    expect(appJson.expo?.runtimeVersion).toEqual({ policy: "fingerprint" });
    expect(appJson.expo?.extra?.release?.runtimePolicy).toBe("fingerprint");
  });
});
