import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  buildAllBatch002DrywallSuccessorsR3,
  buildBatch002DrywallSuccessorR3,
  compileBatch002DrywallSuccessorR3,
  evaluateBatch002DrywallContentPassportR3,
  evaluateBatch002FormulaUnitsR4,
  type Batch002DrywallCompiledRowR3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4";
import { batch002DrywallGoldFixtureValuesR3 } from "../../scripts/estimate/batch001008R3/batch002DrywallGoldFixtureR3";

const FORBIDDEN_VISIBLE_TEXT = /(?:worker_h|man_hour|machine_h|поставка состава|рабочая детализация|входное обследование|контрол|журнал|акт\b|испытани|координац|комплект документац)/iu;
const FORBIDDEN_VISIBLE_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);

function fixture(catalogId: string): Record<string, string | number | boolean> {
  const definition = buildBatch002DrywallSuccessorR3(catalogId);
  return { ...batch002DrywallGoldFixtureValuesR3(definition) };
}

function compiledRows(catalogId: string, values = fixture(catalogId)): readonly Batch002DrywallCompiledRowR3[] {
  const definition = buildBatch002DrywallSuccessorR3(catalogId);
  const result = compileBatch002DrywallSuccessorR3(definition, values);
  if (result.status !== "GREEN") throw new Error(`${catalogId}:${result.status}:${"blockers" in result ? result.blockers.join("|") : ""}`);
  return result.rows;
}

function changedValue(
  value: string | number | boolean,
  contract: ReturnType<typeof buildBatch002DrywallSuccessorR3>["passport"]["userParameterContracts"][number],
): string | number | boolean {
  if (contract.inputType === "BOOLEAN") return !value;
  if (contract.inputType === "TEXT") return `${String(value)} изменено`;
  if (contract.range.kind !== "NUMERIC") throw new Error(`NUMERIC_RANGE_MISSING:${contract.parameterId}`);
  const numeric = Number(value);
  return numeric === contract.range.minimum
    ? Math.min(contract.range.maximum, numeric + Math.max(1, Math.abs(numeric) * 0.25))
    : contract.range.minimum;
}

describe("BATCH-002 R4 real-content successors", () => {
  it("covers the exact 55-member family with individual R4 passports", () => {
    const definitions = buildAllBatch002DrywallSuccessorsR3();
    expect(definitions.map((definition) => definition.catalogId)).toEqual(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
    expect(definitions).toHaveLength(55);
    expect(new Set(definitions.map((definition) => definition.catalogId)).size).toBe(55);

    for (const definition of definitions) {
      expect(definition.passport).toMatchObject({
        executionContract: "MASTER_EXECUTION_TZ_R5_5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU",
        batchId: "BATCH-002",
        domain: "interior_finishes",
        catalogId: definition.catalogId,
        operation: definition.operation,
        variant: definition.variant,
        proofStatus: "CONTENT_SUBJECT_AUDIT_GREEN_BACKEND_REPLAY_PENDING_R55",
      });
      expect(definition.contentDecision).toMatchObject({
        status: "GREEN",
        allowed: true,
        metrics: {
          genericCartesianRows: 0,
          rawInternalUnitRows: 0,
          duplicateSemanticOwners: 0,
          duplicateOwnCostOwners: 0,
        },
      });
      expect(definition.domainDecision).toEqual({ status: "GREEN", allowed: true, errors: [] });
      expect(definition.passport.userParameterContracts.length).toBeLessThanOrEqual(15);
      expect(definition.passport.engineeringSources.length).toBeGreaterThanOrEqual(2);
      expect(definition.passport.engineeringSources.every((source) => source.checkedAt === "2026-08-19")).toBe(true);
      expect(definition.passport.engineeringSources.every((source) => source.confirms.length > 0 && source.exactLocator.length > 20)).toBe(true);
      expect(definition.passport.predecessorAdjudication).toEqual(definition.adjudication);
      expect(definition.passport.successorAdditions).toEqual(definition.successorAdditions);
    }
    const localBackend = readFileSync(resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"), "utf8");
    const productionWorker = readFileSync(resolve("supabase/functions/canonical-estimate-worker/index.ts"), "utf8");
    const backendHarness = readFileSync(resolve("scripts/estimate/batch001008R3/runBatch001DrywallBackendParityR3.ts"), "utf8");
    const compileCore = readFileSync(resolve("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts"), "utf8");
    expect(localBackend).toContain("compileCanonicalEstimateCore");
    expect(productionWorker).toContain("compileCanonicalEstimateCore");
    expect(backendHarness).toContain("titleSpecificationParameterId");
    expect(compileCore).toContain("titleSpecificationParameterId");
    expect(compileCore).toContain("canonicalTitleRu");
  });

  it("keeps operation and variant passports physically distinct", () => {
    const definitions = buildAllBatch002DrywallSuccessorsR3();
    for (const system of ["BULKHEAD", "CURVE"] as const) {
      for (const operation of [...new Set(definitions.filter((definition) => definition.system === system).map((definition) => definition.operation))]) {
        const members = definitions.filter((definition) => definition.system === system && definition.operation === operation);
        const parameterSignatures = members.map((definition) => JSON.stringify(definition.passport.parameters
          .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
          .map((parameter) => parameter.parameterId)
          .sort()));
        const resourceSignatures = members.map((definition) => JSON.stringify(definition.resources.map((resource) => resource.resourceIdentity.split(":").at(-1)).sort()));
        expect(new Set(parameterSignatures).size).toBe(members.length);
        expect(new Set(resourceSignatures).size).toBe(members.length);
      }
    }
    for (const definition of definitions) {
      const declared = new Set(definition.passport.parameters.map((parameter) => parameter.parameterId));
      expect(Object.keys(batch002DrywallGoldFixtureValuesR3(definition)).every((parameterId) => declared.has(parameterId))).toBe(true);
    }
  });

  it("exposes only real Russian resources with normalized public units", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      expect(new Set(definition.resources.map((resource) => resource.group))).toEqual(new Set(["material", "construction_work", "delivery"]));
      expect(definition.resources.every((resource) => /[а-яё]/iu.test(resource.titleRu))).toBe(true);
      expect(definition.resources.every((resource) => !FORBIDDEN_VISIBLE_TEXT.test(resource.titleRu))).toBe(true);
      expect(definition.resources.every((resource) => !FORBIDDEN_VISIBLE_UNITS.has(resource.unitId))).toBe(true);
      expect(definition.resources.every((resource) => resource.engineeringSourceIds.length > 0)).toBe(true);
      expect(definition.resources.filter((resource) => resource.procurementEligible).every((resource) => Boolean(resource.procurementOwnerId))).toBe(true);
      expect(definition.resources.filter((resource) => !resource.procurementEligible).every((resource) => resource.procurementOwnerId == null)).toBe(true);
    }
  });

  it("compiles an exact-key gold fixture for each catalog id", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      const values = { ...batch002DrywallGoldFixtureValuesR3(definition) };
      const result = compileBatch002DrywallSuccessorR3(definition, values);
      expect(result.status).toBe("GREEN");
      if (result.status !== "GREEN") continue;
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => Number.isFinite(row.quantity) && row.quantity > 0)).toBe(true);
      expect(result.rows.every((row) => !FORBIDDEN_VISIBLE_TEXT.test(row.titleRu))).toBe(true);
      expect(new Set(result.rows.map((row) => row.semanticOwnerId)).size).toBe(result.rows.length);
      expect(new Set(result.rows.map((row) => row.costOwnerId)).size).toBe(result.rows.length);
    }
  });

  it("accepts exact parameter boundaries and rejects values outside them", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      for (const contract of definition.passport.userParameterContracts) {
        const base = { ...batch002DrywallGoldFixtureValuesR3(definition) };
        if (contract.inputType === "BOOLEAN") {
          for (const value of [false, true]) {
            const result = compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: value });
            if (contract.parameterId === "repair_cause_removed" && value === false) {
              expect(result).toMatchObject({ status: "RED", blockers: expect.arrayContaining(["REPAIR_CAUSE_NOT_REMOVED"]) });
            } else expect(result.status).toBe("GREEN");
          }
        } else if (contract.range.kind === "TEXT") {
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: "X".repeat(contract.range.minimumLength) }).status).toBe("GREEN");
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: "Я".repeat(contract.range.maximumLength) }).status).toBe("GREEN");
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: "" })).toMatchObject({ status: "NEEDS_REQUIRED_INPUTS" });
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: "Я".repeat(contract.range.maximumLength + 1) })).toMatchObject({ status: "RED" });
        } else if (contract.range.kind === "NUMERIC") {
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: contract.range.minimum }).status).toBe("GREEN");
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: contract.range.maximum }).status).toBe("GREEN");
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: contract.range.minimum - Math.max(0.01, Math.abs(contract.range.minimum) * 0.1) })).toMatchObject({
            status: "RED",
            blockers: expect.arrayContaining([`USER_INPUT_OUT_OF_RANGE:${contract.parameterId}`]),
          });
          expect(compileBatch002DrywallSuccessorR3(definition, { ...base, [contract.parameterId]: contract.range.maximum + Math.max(1, Math.abs(contract.range.maximum) * 0.1) })).toMatchObject({
            status: "RED",
            blockers: expect.arrayContaining([`USER_INPUT_OUT_OF_RANGE:${contract.parameterId}`]),
          });
        }
      }
    }
  });

  it("makes every user parameter observable through quantity, row text or applicability", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      const beforeValues = { ...batch002DrywallGoldFixtureValuesR3(definition) };
      const before = compileBatch002DrywallSuccessorR3(definition, beforeValues);
      expect(before.status).toBe("GREEN");
      for (const contract of definition.passport.userParameterContracts) {
        const afterValues = {
          ...beforeValues,
          [contract.parameterId]: changedValue(beforeValues[contract.parameterId]!, contract),
        };
        const after = compileBatch002DrywallSuccessorR3(definition, afterValues);
        if (contract.parameterId === "repair_cause_removed") {
          expect(after).toMatchObject({ status: "RED", blockers: expect.arrayContaining(["REPAIR_CAUSE_NOT_REMOVED"]) });
          continue;
        }
        expect(after.status).toBe("GREEN");
        expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
      }
    }
  });

  it("suppresses optional zero-quantity resources and supplier-included delivery", () => {
    const optionalByOperation = {
      FINISH_JOINT: "cut_edge_length_m",
      INSULATE: "support_mesh_area_m2",
      PREPARE: "local_defect_area_m2",
      REPAIR: "damaged_insulation_volume_m3",
      ALIGN: "local_reinforcement_length_m",
      CLAD: "wet_forming_area_m2",
      FRAME: "curve_opening_reinforcement_length_m",
    } as const;
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      const base = { ...batch002DrywallGoldFixtureValuesR3(definition) };
      const before = compiledRows(definition.catalogId, base);
      const optionalId = optionalByOperation[definition.operation];
      const withoutOptional = compiledRows(definition.catalogId, { ...base, [optionalId]: 0 });
      expect(withoutOptional.length).toBeLessThan(before.length);
      const includedDelivery = compileBatch002DrywallSuccessorR3(definition, {
        ...base,
        delivery_included_by_supplier: true,
        delivery_mass_kg: undefined as unknown as number,
        delivery_distance_km: undefined as unknown as number,
      });
      expect(includedDelivery.status).toBe("GREEN");
      if (includedDelivery.status === "GREEN") {
        expect(includedDelivery.rows.some((row) => row.rowId.endsWith(":material_delivery"))).toBe(false);
        if (definition.operation === "REPAIR") expect(includedDelivery.rows.some((row) => row.rowId.endsWith(":repair_waste_haul"))).toBe(true);
      }
    }
  });

  it("keeps canonical AST inputs exact and verifies formula dimensions", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      for (const formula of definition.runtimeFormulas) {
        expect(formula.inputParameterIds).toEqual(compileFormulaGraph(formula.expressionSource).inputParameterIds);
      }
      expect(evaluateBatch002FormulaUnitsR4(definition)).toEqual({ status: "GREEN", errors: [] });
    }
  });

  it("has unique semantic, cost and procurement owners", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      expect(new Set(definition.passport.semanticOwners).size).toBe(definition.passport.semanticOwners.length);
      expect(new Set(definition.passport.costOwners).size).toBe(definition.passport.costOwners.length);
      expect(new Set(definition.passport.procurementOwners).size).toBe(definition.passport.procurementOwners.length);
      expect(definition.passport.semanticOwners).toEqual(definition.resources.map((resource) => resource.semanticOwnerId));
      expect(definition.passport.costOwners).toEqual(definition.resources.map((resource) => resource.costOwnerId));
    }
  });

  it("adjudicates every predecessor row once with an engineering reason", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      expect(definition.adjudication.length).toBeGreaterThan(50);
      expect(new Set(definition.adjudication.map((row) => row.predecessorRowId)).size).toBe(definition.adjudication.length);
      expect(definition.adjudication.every((row) => row.reasonRu.length >= 30)).toBe(true);
      expect(definition.adjudication.some((row) => row.decision === "REMOVED_NON_BOQ_QA_DOCUMENT_OR_OVERHEAD")).toBe(true);
      expect(definition.adjudication.some((row) => row.decision === "INCLUDED_IN_CONSTRUCTION_WORK_RATE")).toBe(true);
      expect(definition.adjudication.every((row) => [
        "KEEP", "RENAME", "MERGE", "INCLUDE_IN_RATE", "REMOVE_NOISE", "REMOVE_DUPLICATE", "REPLACE", "REDIRECT",
      ].includes(row.r4Decision))).toBe(true);
      expect(definition.adjudication.every((row) => row.reasonCode.length > 10)).toBe(true);
      expect(definition.successorAdditions.every((row) => row.r4Decision === "ADD_MISSING" && row.reasonCode.startsWith("ADD_"))).toBe(true);
      expect(new Set(definition.successorAdditions.map((row) => row.successorRowId)).size).toBe(definition.successorAdditions.length);
    }
  });

  it("rejects a cross-domain physical resource independently for every catalog id", () => {
    for (const definition of buildAllBatch002DrywallSuccessorsR3()) {
      const source = definition.resources[0]!;
      const foreign = {
        ...source,
        rowId: `${definition.catalogId}:successor-r3:material:foreign_concrete`,
        titleRu: "Бетонная смесь для монолитного фундамента",
        semanticOwnerId: `${definition.catalogId}:successor-r3:semantic:material:foreign_concrete`,
        costOwnerId: `${definition.catalogId}:successor-r3:cost:material:foreign_concrete`,
        procurementOwnerId: `${definition.catalogId}:successor-r3:procurement:material:foreign_concrete`,
        resourceIdentity: `${definition.catalogId}:material:foreign_concrete`,
      };
      const decision = evaluateBatch002DrywallContentPassportR3({
        ...definition.passport,
        resources: [...definition.resources, foreign],
        semanticOwners: [...definition.passport.semanticOwners, foreign.semanticOwnerId],
        costOwners: [...definition.passport.costOwners, foreign.costOwnerId],
        procurementOwners: [...definition.passport.procurementOwners, foreign.procurementOwnerId],
      });
      expect(decision.allowed).toBe(false);
      expect(decision.errors).toContain("DRYWALL_BATCH002_CROSS_DOMAIN_RESOURCE");
    }
  });
});
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
