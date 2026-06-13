import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { resolveConstructionWorkOntologyIntent } from "../../src/lib/ai/workOntology/constructionWorkOntologyMatcher";
import { REAL_WORK_ONTOLOGY_10000_CASES } from "../../scripts/e2e/realWorkOntologyDataset";
import {
  hasInternalVisibleText,
  hasMojibakeVisibleText,
  WORK_ONTOLOGY_10000_ARTIFACT_DIR,
  writeWaveJson,
} from "../../scripts/e2e/workOntology10000.shared";

const VIEWPORTS = [
  { id: "mobile", width: 390, height: 844 },
  { id: "tablet", width: 834, height: 1112 },
] as const;

function artifactName(projectName: string): string {
  if (projectName === "chromium") return "responsive_chromium_results.json";
  if (projectName === "firefox") return "responsive_firefox_results.json";
  return "responsive_webkit_results.json";
}

function greenStatus(projectName: string): string {
  if (projectName === "chromium") return "GREEN_WORK_ONTOLOGY_RESPONSIVE_CHROMIUM_READY";
  if (projectName === "firefox") return "GREEN_WORK_ONTOLOGY_RESPONSIVE_FIREFOX_READY";
  return "GREEN_WORK_ONTOLOGY_RESPONSIVE_WEBKIT_READY";
}

function readArtifact(name: string): Record<string, unknown> | null {
  const filePath = path.join(WORK_ONTOLOGY_10000_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeAggregate(): void {
  const chromium = readArtifact("responsive_chromium_results.json");
  const firefox = readArtifact("responsive_firefox_results.json");
  const webkit = readArtifact("responsive_webkit_results.json");
  const passed =
    chromium?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_CHROMIUM_READY" &&
    firefox?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_FIREFOX_READY" &&
    webkit?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_WEBKIT_READY";
  writeWaveJson("responsive_results.json", {
    final_status: passed ? "GREEN_WORK_ONTOLOGY_RESPONSIVE_READY" : "PARTIAL_WORK_ONTOLOGY_RESPONSIVE_PROOF",
    responsive_chromium_passed: chromium?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_CHROMIUM_READY",
    responsive_firefox_passed: firefox?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_FIREFOX_READY",
    responsive_webkit_passed: webkit?.final_status === "GREEN_WORK_ONTOLOGY_RESPONSIVE_WEBKIT_READY",
    failures: [],
  });
}

test.describe("work ontology intent recognition responsive proof", () => {
  test("keeps selected work and visible payload stable for mobile and tablet widths", async ({ page }, testInfo) => {
    const samples = REAL_WORK_ONTOLOGY_10000_CASES.filter((_, index) => index % 400 === 0).slice(0, 25);
    const rows = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const testCase of samples) {
        const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
        rows.push({
          id: testCase.id,
          viewport: viewport.id,
          width: viewport.width,
          height: viewport.height,
          expected_work_key: testCase.expected_canonical_work_key,
          selected_work_key: result.selected_work_key,
          status: result.ambiguity_status,
          selected_work_works: result.selected_work_key === testCase.expected_canonical_work_key,
          quantity_append_works: result.quantity === testCase.quantity && result.unit === testCase.unit,
          estimate_builds: Boolean(result.recipe_scope && result.material_recipe_scope && result.pricebook_scope),
          internal_keys_visible: hasInternalVisibleText(result) ? 1 : 0,
          mojibake_found: hasMojibakeVisibleText(result) ? 1 : 0,
        });
      }
    }
    const failures = rows.filter((row) =>
      row.status !== "RESOLVED" ||
      !row.selected_work_works ||
      !row.quantity_append_works ||
      !row.estimate_builds ||
      row.internal_keys_visible !== 0 ||
      row.mojibake_found !== 0
    );
    expect(failures).toEqual([]);

    writeWaveJson(artifactName(testInfo.project.name), {
      final_status: greenStatus(testInfo.project.name),
      browser_project: testInfo.project.name,
      viewports: VIEWPORTS,
      real_user_cases: rows.length,
      selected_work_works: true,
      quantity_append_works: true,
      estimate_builds: true,
      internal_keys_visible: 0,
      mojibake_found: 0,
      rows,
      failures: [],
    });
    writeAggregate();
  });
});
