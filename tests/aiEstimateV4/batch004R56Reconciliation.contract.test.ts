import { selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { compileProfessionalProjectAssemblyV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  buildDrywallDomainCompletionSuccessorPackagePartsR56,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionSuccessorR56";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/inventory";
import { interiorFinishesDomainFactory } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage";
import {
  buildAllBatch004R56CanonicalSuccessorDefinitions,
  compileBatch004R56ThroughSharedCore,
} from "../../scripts/estimate/r5/batch004R56SharedCoreProjection";
import { batch004R56FixtureValues } from "../../scripts/estimate/r5/batch004R56Fixtures";

const FORBIDDEN_CATEGORIES = new Set(["documentation", "testing", "temporary_work", "subcontract_service"]);
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);
const FORBIDDEN_TEXT = /(?:журнал|акт\b|протокол|фото(?:фиксац|отчет|отчёт)|обмер\s+и\s+подтвержден|входн(?:ой|ого)\s+контрол|испытани|комплект\s+(?:приемочн|приёмочн|исполнительн|закупочн)|ппе|сиз\b)/iu;

describe("BATCH-004 R5.6 canonical drywall-domain successor", () => {
  test("freezes exactly 393 unique REAL_WORK definitions in 75 family-operation groups", () => {
    const definitions = buildAllBatch004R56CanonicalSuccessorDefinitions();
    expect(definitions).toHaveLength(393);
    expect(new Set(definitions.map((definition) => definition.catalogId)).size).toBe(393);
    expect(new Set(definitions.map((definition) => definition.definitionSha256)).size).toBe(393);
    expect(new Set(definitions.map((definition) => `${definition.family}|${definition.operation}`)).size).toBe(75);
    expect(definitions.every((definition) => definition.batchId === "BATCH-004"
      && definition.successorVersion === "Batch004CanonicalSuccessorR56"
      && definition.disposition === "REAL_WORK")).toBe(true);
  });

  test("removes every forbidden V7 row and keeps one consolidated logistics/access boundary", () => {
    for (const definition of buildAllBatch004R56CanonicalSuccessorDefinitions()) {
      expect(definition.resources.length).toBeGreaterThanOrEqual(5);
      expect(definition.resources.length).toBeLessThanOrEqual(10);
      expect(definition.resources.filter((row) => row.rowId.endsWith(":operation_work"))).toHaveLength(1);
      expect(definition.resources.filter((row) => row.rowId.endsWith(":incoming_delivery"))).toHaveLength(1);
      expect(definition.resources.filter((row) => row.rowId.endsWith(":waste_haul"))).toHaveLength(1);
      expect(definition.resources.filter((row) => row.rowId.endsWith(":access_equipment"))).toHaveLength(1);
      expect(definition.resources.every((row) => !FORBIDDEN_CATEGORIES.has(row.category)
        && !FORBIDDEN_UNITS.has(row.outputUnitId)
        && !FORBIDDEN_TEXT.test(row.titleRu))).toBe(true);
      expect(definition.passport).toMatchObject({
        predecessorNoiseRowsCarriedForwardCount: 0,
        hiddenQuantitativeAssumptionCount: 0,
        documentationBoqRowCount: 0,
        genericHourBoqRowCount: 0,
        deliveryBoqRowCount: 1,
        wasteHaulBoqRowCount: 1,
      });
    }
  });

  test("binds every formula and price input to a source without hidden defaults", () => {
    for (const definition of buildAllBatch004R56CanonicalSuccessorDefinitions()) {
      const expected = new Set([
        ...definition.formulas.flatMap((formula) => formula.inputParameterIds),
        ...definition.resources.flatMap((resource) => resource.priceRoute?.kind === "RUNTIME_VALIDATED_INPUT"
          ? [resource.priceRoute.unit_price_parameter_id] : []),
      ]);
      const bindings = definition.passport.engineeringSourcePack.quantitativeBindings;
      expect(new Set(bindings.map((binding) => binding.parameterId))).toEqual(expected);
      expect(bindings.every((binding) => binding.hiddenDefault === false
        && binding.missingValuePolicy === "FAIL_CLOSED"
        && binding.sourceIds.length > 0
        && binding.formulaConsumerIds.length > 0)).toBe(true);
      expect(definition.parameters.every((parameter) => parameter.defaultValue == null
        && parameter.missingValuePolicy === "FAIL_CLOSED")).toBe(true);
    }
  });

  test("compiles 393/393 through the shared core and preserves procurement selection", async () => {
    for (const definition of buildAllBatch004R56CanonicalSuccessorDefinitions()) {
      const values = batch004R56FixtureValues(definition);
      const compiled = await compileBatch004R56ThroughSharedCore({ definition, values });
      expect(compiled.rows).toHaveLength(definition.resources.length);
      expect(compiled.totals).toMatchObject({
        includedRowCount: definition.resources.length,
        excludedRowCount: 0,
        pricedRowCount: definition.resources.length,
        unpricedRowCount: 0,
        currencyCode: "KGS",
      });
      const selected = selectCanonicalArtifactRows(compiled.rows);
      expect(selected.estimateRows).toHaveLength(compiled.rows.length);
      expect(selected.procurementRows.map((row) => row.row_id)).toEqual(
        compiled.rows.filter((row) => row.procurement_eligible).map((row) => row.row_id),
      );
      const noOptionalLogistics = await compileBatch004R56ThroughSharedCore({
        definition,
        values: { ...values, delivery_required: false, waste_haul_required: false, access_equipment_required: false },
      });
      expect(noOptionalLogistics.rows).toHaveLength(compiled.rows.length - 3);
      expect(noOptionalLogistics.rows.some((row) => /:(?:incoming_delivery|waste_haul|access_equipment)$/u.test(row.row_id))).toBe(false);
    }
  });

  test("fails closed on missing primary quantity and missing work price for every definition", async () => {
    for (const definition of buildAllBatch004R56CanonicalSuccessorDefinitions()) {
      const values = { ...batch004R56FixtureValues(definition) };
      const primary = definition.parameters.find((parameter) => ["area_m2", "joint_length_m", "defect_area_m2", "opening_count_item"].includes(parameter.parameterId));
      expect(primary).toBeDefined();
      delete values[primary!.parameterId];
      await expect(compileBatch004R56ThroughSharedCore({ definition, values })).rejects.toBeDefined();
      const withoutPrice = { ...batch004R56FixtureValues(definition) };
      delete withoutPrice.unit_price_operation_work;
      await expect(compileBatch004R56ThroughSharedCore({ definition, values: withoutPrice })).rejects.toBeDefined();
    }
  });

  test("uses the same successor content in the production domain factory and honors optional branches", () => {
    for (const definition of buildAllBatch004R56CanonicalSuccessorDefinitions()) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((entry) => entry.catalog_id === definition.catalogId)!;
      const parts = buildDrywallDomainCompletionSuccessorPackagePartsR56(inventory)!;
      const fixture = batch004R56FixtureValues(definition);
      const parameterValues = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, {
        value: fixture[parameter.parameterId],
        unit_id: parameter.unitId,
        source_type: "USER_EXPLICIT" as const,
        source_id: `batch004-r56-fixture:${parameter.parameterId}`,
        captured_at: "2026-08-20T00:00:00.000Z",
        confidence: "high" as const,
        applicability: "BATCH-004 R5.6 production binding parity fixture",
      }]));
      const compiled = compileProfessionalProjectAssemblyV4({
        project_assembly_id: `batch004-r56:${definition.catalogId}`,
        parent_passport_id: definition.ownerId,
        parent_revision_id: null,
        requested_catalog_id: definition.catalogId,
        requested_work_key: inventory.work_key,
        scope_mode: "FULL_APPLICABLE_SCOPE",
        parameter_values: parameterValues,
        child_assemblies: parts.child_assemblies,
      });
      expect(compiled.requirements).toHaveLength(0);
      expect(compiled.compiled_rows.map((row) => row.row_id)).toEqual(definition.resources.map((row) => row.rowId));

      const withoutOptional = compileProfessionalProjectAssemblyV4({
        project_assembly_id: `batch004-r56:${definition.catalogId}:optional-off`,
        parent_passport_id: definition.ownerId,
        parent_revision_id: null,
        requested_catalog_id: definition.catalogId,
        requested_work_key: inventory.work_key,
        scope_mode: "FULL_APPLICABLE_SCOPE",
        parameter_values: {
          ...parameterValues,
          delivery_required: { ...parameterValues.delivery_required, value: false },
          waste_haul_required: { ...parameterValues.waste_haul_required, value: false },
          access_equipment_required: { ...parameterValues.access_equipment_required, value: false },
        },
        child_assemblies: parts.child_assemblies,
      });
      expect(withoutOptional.compiled_rows).toHaveLength(compiled.compiled_rows.length - 3);
      expect(withoutOptional.compiled_rows.some((row) => /:(?:incoming_delivery|waste_haul|access_equipment)$/u.test(row.row_id))).toBe(false);
    }
  });

  test("registers all 393 successors instead of the noisy V7 overlay", () => {
    for (const definition of buildAllBatch004R56CanonicalSuccessorDefinitions()) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((entry) => entry.catalog_id === definition.catalogId)!;
      const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
      expect(technology?.parameter_schema_id).toBe(`${definition.catalogId}:successor-r56:parameter-schema`);
      const schema = interiorFinishesDomainFactory.schema_by_id.get(technology!.parameter_schema_id);
      expect(schema?.schema_version).toBe("5.6.0");
    }
  });
});
