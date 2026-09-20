import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildIndividualDrywallEstimatePassportV7,
  drywallDomainExpectedCandidatesV7,
  isDrywallDomainCompletionCatalogIdV7,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { allDomainCompletionParts, compileAllDomainCompletionWorks } from "./domainCompletionV7TestSupport";
import { buildAllBatch004R56CanonicalSuccessorDefinitions } from "../../scripts/estimate/r5/batch004R56SharedCoreProjection";

describe("BATCH-004 drywall full-domain completion V7 production", () => {
  test("owns exact remaining 393 identities / 75 groups without changing 107 prior owners", () => {
    const ids = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7;
    const prior = new Set([
      ...DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
      ...DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
      ...DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
    ]);
    expect(ids).toHaveLength(393);
    expect(new Set(ids).size).toBe(393);
    expect(ids.some((id) => prior.has(id))).toBe(false);
    expect(prior.size).toBe(107);
    expect(new Set([...prior, ...ids]).size).toBe(500);
    expect(ids.every(isDrywallDomainCompletionCatalogIdV7)).toBe(true);
    expect(new Set(ids.map((id) => id.replace(/_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u, ""))).size).toBe(75);
  });

  test("creates individual candidate-complete schemas, formulas, resources and passports", () => {
    const passports = allDomainCompletionParts().map((parts) => {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === parts.contract.catalogId)!;
      const expected = drywallDomainExpectedCandidatesV7(parts.contract.catalogId);
      const rows = parts.child_assemblies.flatMap((child) => child.rows);
      const rowKeys = new Set(rows.map((row) => row.row_id.split(":row:")[1]));
      expect(rows).toHaveLength(expected.length);
      expect(expected.every((candidate) => rowKeys.has(candidate.candidateId))).toBe(true);
      expect(new Set(expected.map((candidate) => candidate.completenessSlot)).size).toBe(22);
      expect(rows.every((row) => row.formula.formula_id.endsWith("FormulaGraphV7"))).toBe(true);
      expect(rows.every((row) => row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT")).toBe(true);
      expect(rows.every((row) => row.normative_trace_v3?.length === 4)).toBe(true);
      expect(rows.every((row) => row.resource_graph_node_v3?.resource_class.includes("DRYWALL_DOMAIN_V7"))).toBe(true);
      expect(rows.some((row) => /^(Материалы|Работы|Оборудование|Комплект работ|Прочие материалы)$/u.test(row.title_ru))).toBe(false);
      return buildIndividualDrywallEstimatePassportV7(inventory, parts);
    });
    expect(new Set(passports.map((passport) => passport.identityHash)).size).toBe(393);
    expect(new Set(passports.map((passport) => passport.parameterSchemaId)).size).toBe(393);
    expect(new Set(passports.map((passport) => passport.formulaGraphHash)).size).toBe(393);
    expect(passports.every((passport) => passport.candidateCoveragePercent === 100 && passport.hiddenAggregateRows === 0)).toBe(true);
  });

  test("compiles all 393 identities in the single interior_finishes runtime", () => {
    const results = compileAllDomainCompletionWorks();
    const definitions = new Map(buildAllBatch004R56CanonicalSuccessorDefinitions()
      .map((definition) => [definition.catalogId, definition] as const));
    expect(results).toHaveLength(393);
    for (const result of results) {
      const definition = definitions.get(result.inventory.catalog_id)!;
      expect(result.compile_result.status).toBe("COMPILED");
      expect(result.compile_result.blockers).toEqual([]);
      expect(result.draft?.items.map((item) => item.sourceParameters?.rowCode))
        .toEqual(definition.resources.map((resource) => resource.rowId));
      expect(result.draft?.items.length).toBe(definition.resources.length);
      expect(new Set(definition.resources.map((resource) => resource.category)))
        .toEqual(new Set(["material", "labor", "transport", "equipment"]));
      expect(result.draft?.items.every((item) => String(item.sourceParameters?.semanticOwner).includes("drywall-domain-completion-v7"))).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.legacyFallbackUsed !== true)).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.priceRouteV3)).toBe(true);
    }
  });

  test("differentiates every real variant and makes INSTALL an exclusive alternative", () => {
    const roots = new Map<string, string[]>();
    for (const id of DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7) {
      const root = id.replace(/_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u, "");
      roots.set(root, [...(roots.get(root) ?? []), id]);
    }
    for (const ids of roots.values()) {
      const signatures = ids.map((id) => [...drywallDomainExpectedCandidatesV7(id)].map((row) => row.candidateId).sort().join("|"));
      expect(new Set(signatures).size).toBe(ids.length);
    }
    const installParts = allDomainCompletionParts().filter((parts) => parts.contract.operation === "INSTALL");
    expect(installParts).toHaveLength(72);
    expect(installParts.every((parts) => parts.contract.forbiddenCostScope.includes("simultaneous staged-route cost ownership"))).toBe(true);
  });
});
