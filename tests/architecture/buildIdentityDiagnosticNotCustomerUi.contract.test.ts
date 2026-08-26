import fs from "node:fs";

describe("build identity diagnostic is not customer UI", () => {
  it("keeps identity in a JS evidence channel without a rendered or accessible node", () => {
    const layout = fs.readFileSync("app/_layout.tsx", "utf8");
    const diagnostic = fs.readFileSync("src/components/BuildIdentityDiagnostic.tsx", "utf8");

    expect(fs.existsSync("src/components/BuildIdentityMarker.tsx")).toBe(false);
    expect(layout).toContain("BuildIdentityDiagnostic");
    expect(layout).not.toContain("BuildIdentityMarker");
    expect(diagnostic).toContain("__RIK_BUILD_IDENTITY_EVIDENCE__");
    expect(diagnostic).toContain("[BuildIdentityEvidence]");
    expect(diagnostic).toContain("return null");
    expect(diagnostic).not.toMatch(/<(?:View|Text)\b/u);
    expect(diagnostic).not.toMatch(
      /(?:testID\s*=|nativeID\s*=|accessibility(?:Label|Hint|Role|State|Value|LiveRegion)\s*=)/u,
    );
  });

  it("keeps the retired R4.5 runtime proof out of the production package entry", () => {
    const entry = fs.readFileSync("index.js", "utf8");

    expect(fs.existsSync("src/lib/runtime/r45RuntimeManifest.ts")).toBe(false);
    expect(entry).not.toContain("r45RuntimeManifest");
    expect(entry).not.toContain("installR45RuntimeManifest");
    expect(entry.trim()).toBe('import "expo-router/entry";');
  });
});
