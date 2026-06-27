import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("office market fast regression harness", () => {
  it("exposes a focused package script without building or running release gates", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    const script = packageJson.scripts?.["ci:office-market"] ?? "";

    expect(script).toBe("tsx scripts/ci/runOfficeMarketRegression.ts");
    expect(script).not.toMatch(/eas|expo run|release|production-safe|jest\s*$/i);
  });

  it("keeps suite ownership and required coverage explicit in the manifest", () => {
    const manifest = read("scripts/ci/officeMarketRegressionManifest.ts");

    for (const key of [
      "foreman",
      "director",
      "pdf",
      "buyer",
      "downstream",
      "consumer",
      "market",
      "auth",
    ]) {
      expect(manifest).toContain(`"${key}"`);
    }

    expect(manifest).toContain('name: "director-flow"');
    expect(manifest).toContain('owner: "office/director"');
    expect(manifest).toContain('path: "tests/consumerRepair"');
    expect(manifest).toContain('path: "tests/market"');
    expect(manifest).toContain("SKIPPED_MISSING_SUITE");
  });

  it("writes only ignored runtime summary and reports per-suite duration", () => {
    const runner = read("scripts/ci/runOfficeMarketRegression.ts");

    expect(runner).toContain("OFFICE_MARKET_REGRESSION_SUMMARY");
    expect(runner).toContain(".release-runtime");
    expect(runner).toContain("office-market-regression");
    expect(runner).toContain("latest.json");
    expect(runner).toContain("duration_ms");
    expect(runner).toContain("--runTestsByPath");
    expect(runner).toContain("collectTestFiles");
    expect(runner).toContain("node_modules");
    expect(runner).toContain("jest");
    expect(runner).not.toContain("artifacts/");
    expect(runner).not.toMatch(/release:verify|\beas\b|expo run|production-safe/i);
  });

  it("maps office and market source impacts to the focused command", () => {
    const impactMap = read("scripts/ci/impact-map.ts");

    expect(impactMap).toContain("src\\/screens\\/director");
    expect(impactMap).toContain("src\\/screens\\/buyer");
    expect(impactMap).toContain("src\\/screens\\/foreman");
    expect(impactMap).toContain("src\\/features\\/consumerRepair");
    expect(impactMap).toContain("src\\/features\\/market");
    expect(impactMap).toContain("src\\/lib\\/pdf");
    expect(impactMap).toContain("src\\/lib\\/api\\/buyer\\.ts");
    expect(impactMap).toContain("src\\/lib\\/api\\/requests\\.status\\.ts");
    expect(impactMap).toContain("npm run ci:office-market");
  });
});
