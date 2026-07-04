import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function json<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;
}

describe("controlled pilot scope", () => {
  it("limits pilot to explicit cohorts and requires web plus Android emulator gates", () => {
    const scope = json<any>("data/estimate-pilot/pilot-scope.json");
    const cohorts = json<any>("data/estimate-pilot/pilot-cohorts.json");

    expect(scope.acceptance.pilot_scope_created).toBe(true);
    expect(scope.global_enabled).toBe(false);
    expect(scope.acceptance.pilot_not_global_enabled).toBe(true);
    expect(scope.acceptance.pilot_limited_to_allowed_cohorts).toBe(true);
    expect(scope.required_acceptance_gates.web_smoke_required).toBe(true);
    expect(scope.required_acceptance_gates.android_emulator_smoke_required).toBe(true);

    const required = [
      "INTERNAL_QA",
      "ESTIMATOR_REVIEWERS",
      "DIRECTOR_REVIEWERS",
      "PROCUREMENT_REVIEWERS",
      "LIMITED_CLIENT_DEMO",
    ];
    expect(cohorts.cohorts.map((cohort: any) => cohort.cohort_id).sort()).toEqual(required.sort());
    for (const cohort of cohorts.cohorts) {
      expect(cohort).toEqual(expect.objectContaining({
        cohort_id: expect.any(String),
        enabled_features: expect.any(Array),
        allowed_work_families: expect.any(Array),
        blocked_work_families: expect.any(Array),
        max_estimates_per_day: expect.any(Number),
        requires_expert_review: expect.any(Boolean),
        can_generate_pdf: expect.any(Boolean),
        can_generate_procurement_package: expect.any(Boolean),
        can_export_support_package: expect.any(Boolean),
        requires_web_smoke: true,
        requires_android_emulator_smoke: true,
      }));
      expect(cohort.blocked_work_families).toEqual(expect.arrayContaining(["MARKETPLACE", "RFQ", "WAREHOUSE", "PAYMENT"]));
    }
  });
});
