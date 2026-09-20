import { readFileSync } from "node:fs";
import {
  assertConcreteSlabFullWorkCatalogScopeAgainstManifest,
  assertConcreteSlabFullWorkCatalogScopeAudit,
  assertFormworkRemainingFamilyApplicabilityMatrix,
  assertRemainingFormTokenFamilySemanticLedger,
  CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT,
  FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX,
  FORMWORK_REMAINING_FAMILY_CONTRACTS,
  REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER,
} from "./formworkRemainingFamilyApplicabilityCorrection";

describe("remaining foundation formwork applicability correction", () => {
  test("keeps all seven concrete-slab identities as complete m3 works", () => {
    expect(() => assertConcreteSlabFullWorkCatalogScopeAudit()).not.toThrow();
    expect(CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT).toHaveLength(7);
    for (const row of CONCRETE_SLAB_FULL_WORK_CATALOG_SCOPE_AUDIT) {
      expect(row.promisedOperation).toBe("COMPLETE_CONCRETE_SLAB_INSTALLATION");
      expect(row.primaryUnitId).toBe("m3");
      expect(row.domainOwner).toBe("calc_family_concrete_v1");
      expect(row.dokaflexApplicability.status).toBe("CONDITIONAL_COMPONENT_ONLY");
      expect(row.dokaflexApplicability.requiredSlabSupportCondition)
        .toBe("SUSPENDED_ELEVATED_FLOOR_SLAB");
      expect(row.status).toBe("OPEN_COMPLETE_WORK_COMPOSITION_REQUIRED");
    }
  });

  test("pins the I8 decision to the actual catalog title, unit policy, norm pack, and owner", () => {
    const manifest = JSON.parse(readFileSync(
      "data/estimate-templates/estimate-10000-readiness-manifest.json",
      "utf8",
    )) as { templates: Parameters<typeof assertConcreteSlabFullWorkCatalogScopeAgainstManifest>[0] };
    expect(() => assertConcreteSlabFullWorkCatalogScopeAgainstManifest(manifest.templates)).not.toThrow();

    const targetTemplateId =
      "concrete_foundation_interior_concrete_slab_form_standard_professional_expanded_v1";
    const changedRows = manifest.templates.map((row) => row.template_id === targetTemplateId
      ? { ...row, localized_name_ru: "Опалубка подвесной плиты перекрытия" }
      : row);
    expect(() => assertConcreteSlabFullWorkCatalogScopeAgainstManifest(changedRows))
      .toThrow("CONCRETE_SLAB_CATALOG_MANIFEST_PROMISE");
  });

  test("covers exactly three seven-context families without changing the accepted pile-cap fixture", () => {
    expect(() => assertFormworkRemainingFamilyApplicabilityMatrix()).not.toThrow();
    expect(FORMWORK_REMAINING_FAMILY_CONTRACTS).toHaveLength(3);
    expect(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX).toHaveLength(21);
    expect(new Set(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.map((row) => row.familyKey))).toEqual(
      new Set(["strip_foundation", "slab_foundation", "foundation_walls"]),
    );
    expect(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.some(
      (row) => row.catalogId.includes("pile_cap"),
    )).toBe(false);
  });

  test("routes the four remaining form-token families by catalog promise rather than suffix", () => {
    expect(() => assertRemainingFormTokenFamilySemanticLedger()).not.toThrow();
    expect(REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER).toHaveLength(4);
    expect(REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER.flatMap((row) => row.catalogIds)).toHaveLength(28);
    const frame = REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER.find(
      (row) => row.familyKey === "reinforcement_frame_form",
    );
    expect(frame).toMatchObject({
      promisedOperation: "REINFORCEMENT_CAGE_ASSEMBLY",
      correctedPrimaryUnitId: "kg",
      domainOwner: "reinforcement-frame-reinforcement",
      status: "READY_SHARED_REINFORCEMENT_PIPELINE",
    });
    const slab = REMAINING_FORM_TOKEN_FAMILY_SEMANTIC_LEDGER.find(
      (row) => row.familyKey === "concrete_slab_form",
    );
    expect(slab?.status).toBe("OPEN_COMPLETE_WORK_COMPOSITION_REQUIRED");
  });

  test("fails closed to measurement-only until every catalog ID has its own project evidence", () => {
    for (const row of FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX) {
      expect(row.status).toBe("OPEN_MEASUREMENT_ONLY_RESTORED");
      expect(row.evidence).toEqual({
        clonedFixtureRejectedAsPerIdEvidence: true,
        measurementOnlyFallbackRequired: true,
      });
      expect(row.conditions.length).toBeGreaterThanOrEqual(3);
      expect(row.requiredProject.length).toBeGreaterThanOrEqual(2);
      expect(row.includedStages).toEqual(["измерение площади контакта опалубки по RICS NRM 2"]);
    }
  });
});
