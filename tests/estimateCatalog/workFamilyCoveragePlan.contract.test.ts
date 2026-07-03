import { readFileSync } from "node:fs";
import path from "node:path";

import type { WorkFamilyCoveragePlan } from "../../scripts/estimate/buildWorkFamilyCoveragePlan";
import { GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS } from "../../scripts/estimate/buildWorkFamilyCoveragePlan";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("work family coverage plan artifact", () => {
  it("publishes the 10000 coverage plan under estimate-catalog with P0 families visible", () => {
    const plan = readJson<WorkFamilyCoveragePlan>("data/estimate-catalog/work-family-coverage-plan.json");
    const families = new Set(plan.work_families.map((family) => family.work_family_id));

    expect(plan.final_status).toBe(GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS);
    expect(plan.manifest_total_templates).toBe(10000);
    expect(plan.ready_professional_count).toBe(10000);
    expect(plan.generic_fallback_count).toBe(0);
    expect(plan.synthetic_family_default_count).toBe(0);
    expect(plan.blockers).toEqual([]);
    expect([...families]).toEqual(expect.arrayContaining([
      "masonry",
      "concrete",
      "reinforcement",
      "formwork",
      "screed",
      "roofing",
      "metalwork",
      "plumbing",
      "electrical",
      "profile_sheet_fence",
    ]));
  });
});
