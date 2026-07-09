import {
  OWNER_REVIEW_ALLOWED_DELTA_PREFIXES,
  buildOwnerReviewDependencies,
  validateOwnerReviewDependencies,
  type OwnerReviewDependency,
} from "../../scripts/estimate/auditAiEstimateOwnerReviewPrerequisites";

function dependency(overrides: Partial<OwnerReviewDependency>): OwnerReviewDependency {
  return {
    layer: "required",
    required: true,
    latestStatus: "GREEN_REQUIRED",
    sourceSha: "head",
    sourceShaMatchesHead: true,
    webEvidence: "green",
    androidEvidence: "green",
    blockers: [],
    ...overrides,
  };
}

describe("owner review dependency audit", () => {
  it("rejects stale required green and marks missing optional layers as not evaluated", () => {
    const validation = validateOwnerReviewDependencies([
      dependency({ layer: "required-stale", sourceShaMatchesHead: false }),
      dependency({ layer: "required-1" }),
      dependency({ layer: "required-2" }),
      dependency({ layer: "required-3" }),
      dependency({ layer: "required-4" }),
      dependency({ layer: "optional", required: false, latestStatus: "not_evaluated", sourceSha: "", sourceShaMatchesHead: false, webEvidence: "not_required", androidEvidence: "not_required" }),
    ]);

    expect(validation.owner_review_dependency_audit_created).toBe(true);
    expect(validation.required_dependencies_checked).toBe(true);
    expect(validation.stale_required_green_rejected).toBe(true);
    expect(validation.missing_optional_layers_marked_not_evaluated).toBe(true);
    expect(validation.blockers).toContain("required-stale:required_green_stale");
  });

  it("uses the current platform seal as coverage for required technical layers", () => {
    const dependencies = buildOwnerReviewDependencies({
      head: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      platformSeal: {
        final_status: "GREEN_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL_COMMITTED_NO_RELEASE",
        source_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        real_named_boq_green_found: true,
        trusted_costing_green_found: true,
        approved_history_scaling_green_found: true,
        material_quantity_accuracy_green_found: true,
        foreman_sync_green_found: true,
      },
    });

    const required = dependencies.filter((item) => item.required);
    expect(required).toHaveLength(5);
    expect(required.every((item) => item.sourceShaMatchesHead)).toBe(true);
  });

  it("allows only the reviewed foreman subcontract screen sync delta over the platform seal", () => {
    const foremanScreenDeltas = OWNER_REVIEW_ALLOWED_DELTA_PREFIXES.filter((item) =>
      item.startsWith("src/screens/foreman/"),
    );

    expect(foremanScreenDeltas).toEqual([
      "src/screens/foreman/ForemanSubcontractTab.sections.tsx",
      "src/screens/foreman/hooks/useForemanSubcontractController.tsx",
      "src/screens/foreman/ForemanSubcontractTab.sections.test.tsx",
    ]);
    expect(OWNER_REVIEW_ALLOWED_DELTA_PREFIXES).toContain("tests/foreman/foremanAiEstimateNoLegacyPicker.test.ts");
    expect(OWNER_REVIEW_ALLOWED_DELTA_PREFIXES).not.toContain("src/screens/foreman/");
  });
});
