import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GREEN_PROFESSIONAL_AI_ESTIMATE_REAL_MATERIAL_QUANTITY_ENGINE,
  buildRealMaterialQuantityEngineSummary,
} from "../../src/lib/ai/professionalEstimateCalculator";

function envFlag(name: string): boolean | undefined {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return undefined;
  return value === "1" || value === "true" || value === "yes";
}

function greenArtifactFlag(name: string): boolean | undefined {
  const filePath = String(process.env[name] ?? "").trim();
  if (!filePath) return undefined;
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { status?: string; blockers?: unknown[]; fakeGreenClaimed?: boolean };
  return parsed.status === "GREEN" && Array.isArray(parsed.blockers) && parsed.blockers.length === 0 && parsed.fakeGreenClaimed === false;
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const summary = buildRealMaterialQuantityEngineSummary({
    requireSourceGateEvidence: true,
    webSmokePassed: envFlag("PROFESSIONAL_ESTIMATE_WEB_SMOKE_PASSED"),
    androidChromeSmokePassed: greenArtifactFlag("PROFESSIONAL_ESTIMATE_ANDROID_CHROME_SMOKE_ARTIFACT"),
    ciOfficeMarketPassed: envFlag("PROFESSIONAL_ESTIMATE_OFFICE_MARKET_PASSED"),
    typecheckPassed: envFlag("PROFESSIONAL_ESTIMATE_TYPECHECK_PASSED"),
    lintPassed: envFlag("PROFESSIONAL_ESTIMATE_LINT_PASSED"),
    diffCheckPassed: envFlag("PROFESSIONAL_ESTIMATE_GIT_DIFF_CHECK_PASSED"),
    noTestWeakeningPassed: envFlag("PROFESSIONAL_ESTIMATE_TEST_WEAKENING_GUARD_PASSED"),
    webPublicSmokePassed: envFlag("PROFESSIONAL_ESTIMATE_WEB_PUBLIC_SMOKE_PASSED"),
    secretScanPassed: envFlag("PROFESSIONAL_ESTIMATE_SECRET_SCAN_PASSED"),
  });
  const outDir = path.join(
    process.cwd(),
    ".release-runtime",
    "professional-ai-estimate-real-quantity-engine",
    timestampForPath(),
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    finalStatus: summary.final_status,
    artifact: path.join(outDir, "summary.json"),
    blockers: summary.blockers,
    fakeGreenClaimed: summary.fake_green_claimed,
  }, null, 2));

  if (summary.final_status !== GREEN_PROFESSIONAL_AI_ESTIMATE_REAL_MATERIAL_QUANTITY_ENGINE) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
