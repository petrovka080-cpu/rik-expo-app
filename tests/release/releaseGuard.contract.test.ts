import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("release guard automation contract", () => {
  it("routes package publish scripts through the guarded release CLI", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["release:preflight"]).toBe(
      "tsx scripts/release/run-release-guard.ts preflight",
    );
    expect(packageJson.scripts?.["release:verify"]).toBe(
      "tsx scripts/release/run-release-guard.ts verify --json",
    );
    expect(packageJson.scripts?.["release:ota"]).toBe(
      "tsx scripts/release/run-release-guard.ts ota",
    );
    expect(packageJson.scripts?.["ota:publish:development"]).toBe(
      "tsx scripts/release/run-release-guard.ts ota --channel development",
    );
    expect(packageJson.scripts?.["ota:publish:preview"]).toBe(
      "tsx scripts/release/run-release-guard.ts ota --channel preview",
    );
    expect(packageJson.scripts?.["ota:publish:production"]).toBe(
      "tsx scripts/release/run-release-guard.ts ota --channel production",
    );
  });

  it("does not leave direct eas update publish scripts as the canonical package path", () => {
    const packageSource = fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8");

    expect(packageSource).not.toContain('"ota:publish:development": "npx eas update --branch development"');
    expect(packageSource).not.toContain('"ota:publish:preview": "npx eas update --branch preview"');
    expect(packageSource).not.toContain('"ota:publish:production": "npx eas update --branch production"');
  });

  it("documents the guarded release path in the OTA runbook", () => {
    const runbookSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "docs/operations/eas-update-runbook.md"),
      "utf8",
    );

    expect(runbookSource).toContain("npm run release:preflight");
    expect(runbookSource).toContain("npm run release:ota -- --channel <development|preview|production> --message");
    expect(runbookSource).toContain("Direct `npx eas update ...` is not the supported release path");
  });
});
