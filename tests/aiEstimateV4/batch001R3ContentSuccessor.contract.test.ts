import {
  buildAllBatch001DrywallSuccessorsR3,
  buildBatch001DrywallSuccessorR3,
  compileBatch001DrywallSuccessorR3,
  evaluateBatch001DrywallContentPassportR3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import {
  batch001DrywallGoldFixtureValuesR3,
} from "../../scripts/estimate/batch001008R3/batch001DrywallGoldFixtureR3";
import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";

const FORBIDDEN_VISIBLE_TEXT = /(?:worker_h|man_hour|machine_h|exact system route|\bFRAME\b|\bALIGN\b|\bCLAD\b|поставка состава|рабочая детализация|входное обследование|контрол|журнал|акт\b|испытани|координац|комплект документац)/iu;
const FORBIDDEN_VISIBLE_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);

function fixtureValues(catalogId: string): Record<string, string | number | boolean> {
  return { ...batch001DrywallGoldFixtureValuesR3(buildBatch001DrywallSuccessorR3(catalogId)) };
}

describe("BATCH-001 R3 technological content successors", () => {
  it("covers all 16 real works with GREEN content passports and a complete row adjudication", () => {
    const definitions = buildAllBatch001DrywallSuccessorsR3();
    expect(definitions.map((definition) => definition.catalogId)).toEqual(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3);
    expect(definitions).toHaveLength(16);

    for (const definition of definitions) {
      expect(definition.contentDecision).toMatchObject({
        allowed: true,
        status: "GREEN",
        metrics: {
          genericCartesianRows: 0,
          rawInternalUnitRows: 0,
          duplicateSemanticOwners: 0,
          duplicateOwnCostOwners: 0,
        },
      });
      expect(definition.domainDecision).toEqual({ allowed: true, status: "GREEN", errors: [] });
      expect(definition.adjudication).not.toHaveLength(0);
      expect(new Set(definition.adjudication.map((row) => row.predecessorRowId)).size).toBe(definition.adjudication.length);
      expect(definition.adjudication.every((row) => row.reasonRu.length >= 20)).toBe(true);
      expect(definition.resources.length).toBeLessThanOrEqual(32);
    }
  });

  it("keeps variant parameter sets and applicable resources individual", () => {
    const definitions = buildAllBatch001DrywallSuccessorsR3();
    for (const group of ["FRAME", "ALIGN", "CLAD"] as const) {
      const members = definitions.filter((definition) => definition.group === group);
      const parameterSignatures = members.map((definition) => JSON.stringify(definition.passport.parameters
        .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
        .map((parameter) => parameter.parameterId)
        .sort()));
      expect(new Set(parameterSignatures).size).toBe(members.length);
    }
    expect(buildBatch001DrywallSuccessorR3("drywall_ceiling_interior_bulkhead_align_wet_zone")
      .resources.some((row) => row.resourceIdentity.endsWith(":wet_zone_adjustment_consumables"))).toBe(true);
    expect(buildBatch001DrywallSuccessorR3("drywall_ceiling_interior_bulkhead_align_small_area")
      .resources.some((row) => row.rowId.endsWith(":align_small_area_corners"))).toBe(true);
    expect(buildBatch001DrywallSuccessorR3("drywall_ceiling_interior_bulkhead_align_technical_room")
      .resources.some((row) => row.rowId.endsWith(":align_technical_openings"))).toBe(true);
  });

  it("exposes only concrete Russian materials, measurable operations and explicit cargo deliveries", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      expect(new Set(definition.resources.map((row) => row.group))).toEqual(
        definition.group === "ALIGN"
          ? definition.variant === "wet_zone"
            ? new Set(["material", "construction_work"])
            : new Set(["construction_work"])
          : new Set(["material", "construction_work", "delivery"]),
      );
      expect(definition.resources.some((row) => row.group === "construction_work")).toBe(true);
      expect(definition.resources.every((row) => !FORBIDDEN_VISIBLE_TEXT.test(row.titleRu))).toBe(true);
      expect(definition.resources.every((row) => !FORBIDDEN_VISIBLE_UNITS.has(row.unitId))).toBe(true);
      expect(definition.resources.every((row) => /[а-яё]/iu.test(row.titleRu))).toBe(true);
      expect(definition.passport.parameters
        .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
        .every((parameter) => /[а-яё]/iu.test(parameter.titleRu) && parameter.guideRu.length >= 20)).toBe(true);
    }
  });

  it("compiles all 16 successors without visible labor, QA or document rows", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      const compiled = compileBatch001DrywallSuccessorR3(definition, fixtureValues(definition.catalogId));
      expect(compiled.status).toBe("GREEN");
      if (compiled.status !== "GREEN") continue;
      expect(compiled.rows.length).toBeGreaterThan(0);
      expect(compiled.rows.every((row) => row.quantity > 0 && Number.isFinite(row.quantity))).toBe(true);
      expect(compiled.rows.every((row) => row.quantity < 10_000)).toBe(true);
      expect(compiled.rows.every((row) => !FORBIDDEN_VISIBLE_TEXT.test(row.titleRu))).toBe(true);
      expect(compiled.rows.every((row) => !FORBIDDEN_VISIBLE_UNITS.has(row.unitId))).toBe(true);
      expect(new Set(compiled.rows.map((row) => row.semanticOwnerId)).size).toBe(compiled.rows.length);
      expect(new Set(compiled.rows.map((row) => row.costOwnerId)).size).toBe(compiled.rows.length);
    }
  });

  it("recalculates each of the 16 definitions when its physical geometry changes", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      const beforeValues = fixtureValues(definition.catalogId);
      const afterValues = {
        ...beforeValues,
        horizontal_face_area_m2: Number(beforeValues.horizontal_face_area_m2) + 25,
      };
      const before = compileBatch001DrywallSuccessorR3(definition, beforeValues);
      const after = compileBatch001DrywallSuccessorR3(definition, afterValues);
      expect(before.status).toBe("GREEN");
      expect(after.status).toBe("GREEN");
      if (before.status !== "GREEN" || after.status !== "GREEN") continue;
      const beforeWork = before.rows.find((row) => row.group === "construction_work");
      const afterWork = after.rows.find((row) => row.rowId === beforeWork?.rowId);
      expect(afterWork?.quantity).toBeGreaterThan(beforeWork?.quantity ?? Number.POSITIVE_INFINITY);
      if (definition.group !== "ALIGN") {
        const changedPhysicalRows = before.rows.filter((row) => row.group === "material" || row.group === "delivery")
          .filter((row) => after.rows.find((candidate) => candidate.rowId === row.rowId)?.quantity !== row.quantity);
        expect(changedPhysicalRows.length).toBeGreaterThan(0);
      }
    }
  });

  it("rejects a cross-domain resource independently for every catalog id", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      const source = definition.passport.resources[0]!;
      const foreignRow = {
        ...source,
        rowId: `${definition.catalogId}:successor-r3:material:foreign_concrete`,
        group: "material" as const,
        titleRu: "Бетонная смесь для монолитного фундамента",
        semanticOwnerId: `${definition.catalogId}:successor-r3:semantic:material:foreign_concrete`,
        costOwnerId: `${definition.catalogId}:successor-r3:cost:material:foreign_concrete`,
        resourceIdentity: `${definition.catalogId}:material:foreign_concrete`,
        provenanceKind: "CANONICAL_PHYSICAL_RESOURCE" as const,
        procurementEligible: true,
        delivery: undefined,
      };
      const decision = evaluateBatch001DrywallContentPassportR3({
        ...definition.passport,
        resources: [...definition.passport.resources, foreignRow],
        capabilityMatrix: definition.passport.capabilityMatrix.map((capability) => capability.group === "material"
          ? { ...capability, status: "INCLUDED" as const, reasonRu: "Негативная fixture для проверки междоменной строки." }
          : capability),
      });
      expect(decision.allowed).toBe(false);
      expect(decision.errors).toContain("DRYWALL_CROSS_DOMAIN_RESOURCE");
    }
  });

  it("blocks missing geometry and suppresses separately priced delivery when the supplier includes it", () => {
    const catalogId = "drywall_ceiling_interior_bulkhead_clad_standard";
    const definition = buildBatch001DrywallSuccessorR3(catalogId);
    const missing = fixtureValues(catalogId);
    delete missing.horizontal_face_area_m2;
    expect(compileBatch001DrywallSuccessorR3(definition, missing)).toMatchObject({
      status: "NEEDS_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["MISSING_USER_INPUT:horizontal_face_area_m2"]),
    });

    const included = fixtureValues(catalogId);
    included.delivery_included_by_supplier = true;
    delete included.delivery_distance_km;
    const compiled = compileBatch001DrywallSuccessorR3(definition, included);
    expect(compiled.status).toBe("GREEN");
    if (compiled.status === "GREEN") expect(compiled.rows.some((row) => row.group === "delivery")).toBe(false);
  });
});
