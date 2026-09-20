import pumpFixture from "../../../data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json";

import { resolveCatalogRefinementFixture } from "./catalogFirstEstimateRefinementFixture";

describe("catalog first-estimate refinement fixture ownership", () => {
  test("loads the pump fixture only through its exact declared file hash", () => {
    const fixture = resolveCatalogRefinementFixture({
      catalogId: pumpFixture.catalogId,
      validationScenarioRefs: [{
        fixture: "data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json",
        fixtureSha256: "da5125bf0edeb9e4f2475ae441d72502d451caec539ca1b4e35bdae482986834",
        expectedParameters: 24,
      }],
      acceptanceEvidenceSha256: "not-used-for-an-exact-file-fixture",
    });

    expect(fixture?.fixtureKind).toContain("validation_scenario_file:");
    expect(fixture?.parameters).toEqual(pumpFixture.parameters);
  });

  test("rejects a pump fixture whose declared bytes hash does not match", () => {
    expect(() => resolveCatalogRefinementFixture({
      catalogId: pumpFixture.catalogId,
      validationScenarioRefs: [{
        fixture: "data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json",
        fixtureSha256: "0".repeat(64),
        expectedParameters: 24,
      }],
      acceptanceEvidenceSha256: "not-used-for-an-exact-file-fixture",
    })).toThrow("REFINEMENT_FIXTURE_HASH_MISMATCH");
  });

  test("ignores legacy object-valued fixture metadata instead of treating it as a path", () => {
    expect(resolveCatalogRefinementFixture({
      catalogId: pumpFixture.catalogId,
      validationScenarioRefs: [{ fixture: { kind: "legacy-inline-metadata" } }],
      acceptanceEvidenceSha256: "not-applicable",
    })).toBeNull();
  });

  test("ignores a symbolic legacy fixture name that is not an allowlisted file path", () => {
    expect(resolveCatalogRefinementFixture({
      catalogId: pumpFixture.catalogId,
      validationScenarioRefs: [{ fixture: "batch001DrywallGoldFixtureR3" }],
      acceptanceEvidenceSha256: "not-applicable",
    })).toBeNull();
  });

  test("uses an inline Frami Xlife fixture only when the immutable baseline evidence matches", () => {
    const evidence = "1".repeat(64);
    const fixture = resolveCatalogRefinementFixture({
      catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_standard",
      validationScenarioRefs: [{
        scenario: "FORMWORK_FRAMI_XLIFE_BELT_STANDARD",
        fixture: {
          measured_formwork_contact_area_m2: 120,
          assembly_alignment_worker_h: 90,
        },
        targetEvidenceSha256: evidence,
      }],
      acceptanceEvidenceSha256: evidence,
    });

    expect(fixture).toEqual({
      fixtureKind: "validation_scenario_inline_evidence_bound:FORMWORK_FRAMI_XLIFE_BELT_STANDARD",
      parameters: {
        measured_formwork_contact_area_m2: 120,
        assembly_alignment_worker_h: 90,
      },
    });
  });

  test("rejects a Frami Xlife inline fixture after evidence drift", () => {
    expect(() => resolveCatalogRefinementFixture({
      catalogId: "canonical-work:base:concrete_foundation_interior_belt_form_standard",
      validationScenarioRefs: [{
        scenario: "FORMWORK_FRAMI_XLIFE_BELT_STANDARD",
        fixture: { measured_formwork_contact_area_m2: 120 },
        targetEvidenceSha256: "1".repeat(64),
      }],
      acceptanceEvidenceSha256: "2".repeat(64),
    })).toThrow("REFINEMENT_INLINE_FIXTURE_EVIDENCE_HASH_MISMATCH");
  });

  test("reproduces the asphalt drainage gold evidence before using its fixture", () => {
    const evidence = "8d0bbee052d179f5225c7b343700dfef875ea365add30cf5b067825e276f38c6";
    const fixture = resolveCatalogRefinementFixture({
      catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
      validationScenarioRefs: [{
        scenario: "ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD",
        acceptanceEvidenceSha256: evidence,
      }],
      acceptanceEvidenceSha256: evidence,
    });

    expect(fixture?.fixtureKind).toBe(
      "validation_scenario_registry:ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD",
    );
    expect(fixture?.parameters).toMatchObject({
      system_type: "linear_tray",
      route_length_m: 180,
      trench_width_m: 0.6,
    });
  });

  test("restores the exact asphalt removal package owned by a full-applicable catalog scenario", () => {
    const evidence = "3".repeat(64);
    const fixture = resolveCatalogRefinementFixture({
      catalogId: "built-in-ai-1000:0670",
      validationScenarioRefs: [{
        scenario: "R555_ASPHALT_FULL_APPLICABLE_DEFAULT",
        expectedRows: 21,
        zeroRows: 0,
        genericRows: 0,
      }, {
        scenario: "R6_NO_HIDDEN_RUNTIME_ASSUMPTIONS",
        acceptanceEvidenceSha256: evidence,
      }],
      acceptanceEvidenceSha256: evidence,
    });

    expect(fixture).toEqual({
      fixtureKind: "validation_scenario_registry:R555_ASPHALT_FULL_APPLICABLE_DEFAULT",
      parameters: { asphalt_removal_package_required: true },
    });
  });

  test("rejects a stale asphalt removal scenario without current no-assumption evidence", () => {
    expect(() => resolveCatalogRefinementFixture({
      catalogId: "built-in-ai-1000:0705",
      validationScenarioRefs: [{
        scenario: "R555_ASPHALT_FULL_APPLICABLE_DEFAULT",
        expectedRows: 21,
        zeroRows: 0,
        genericRows: 0,
      }],
      acceptanceEvidenceSha256: "4".repeat(64),
    })).toThrow("REFINEMENT_ASPHALT_REMOVAL_SCENARIO_DRIFT");
  });

  test("resolves the strip-foundation gold input only when its acceptance hash still reproduces", () => {
    const fixture = resolveCatalogRefinementFixture({
      catalogId: "canonical-work:expanded:strip_foundation",
      validationScenarioRefs: [{
        scenario: "STRIP_FOUNDATION_TECHNOLOGICAL_GOLD",
        acceptanceEvidenceSha256: "a23e4b8dd3d3db24b8c361a012c0c2c57f354ce63b2e9d93efb8cf9ef762f3d6",
      }],
      acceptanceEvidenceSha256: "a23e4b8dd3d3db24b8c361a012c0c2c57f354ce63b2e9d93efb8cf9ef762f3d6",
    });

    expect(fixture?.fixtureKind).toBe(
      "validation_scenario_registry:STRIP_FOUNDATION_TECHNOLOGICAL_GOLD",
    );
    expect(fixture?.parameters).toMatchObject({
      total_axis_length_m: 40,
      strip_width_m: 0.5,
      strip_height_m: 1.5,
      reinforcement_mass_t: 2.4,
    });
  });

  test("rejects a strip-foundation scenario whose stored evidence hash drifted", () => {
    expect(() => resolveCatalogRefinementFixture({
      catalogId: "canonical-work:expanded:strip_foundation",
      validationScenarioRefs: [{
        scenario: "STRIP_FOUNDATION_TECHNOLOGICAL_GOLD",
        acceptanceEvidenceSha256: "0".repeat(64),
      }],
      acceptanceEvidenceSha256: "0".repeat(64),
    })).toThrow("REFINEMENT_FIXTURE_EVIDENCE_HASH_MISMATCH");
  });
});
