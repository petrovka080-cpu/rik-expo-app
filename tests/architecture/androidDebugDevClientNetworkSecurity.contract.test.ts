import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Android debug dev-client network security", () => {
  it("allows adb-reverse Metro traffic only through the debug resource overlay", () => {
    const productionConfig = read(
      "android/app/src/main/res/xml/network_security_config.xml",
    );
    const debugConfig = read(
      "android/app/src/debug/res/xml/network_security_config.xml",
    );
    const debugManifest = read("android/app/src/debug/AndroidManifest.xml");

    expect(productionConfig).toContain(
      '<base-config cleartextTrafficPermitted="false" />',
    );
    expect(debugConfig).toContain(
      '<base-config cleartextTrafficPermitted="true" />',
    );
    expect(debugManifest).toContain('android:usesCleartextTraffic="true"');
    expect(debugManifest).toContain(
      'tools:replace="android:usesCleartextTraffic"',
    );
  });
});
