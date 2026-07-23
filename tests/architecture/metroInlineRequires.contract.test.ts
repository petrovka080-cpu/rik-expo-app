import fs from "fs";
import path from "path";

describe("Metro production startup policy", () => {
  it("defers module evaluation without replacing the Sentry Expo config", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "metro.config.js"),
      "utf8",
    );

    expect(source).toContain("getSentryExpoConfig(__dirname)");
    expect(source).toContain("...config.transformer");
    expect(source).toContain("experimentalImportSupport: false");
    expect(source).toContain("inlineRequires: true");
    expect(source).toContain("module.exports = config");
  });
});
