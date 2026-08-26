import { selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  compileBatch003R56ThroughSharedCore,
} from "../../scripts/estimate/r5/batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "../../scripts/estimate/r5/batch003R56Fixtures";

const FORBIDDEN_CATEGORIES = new Set(["documentation", "testing", "temporary_work", "subcontract_service"]);
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);
const FORBIDDEN_TEXT = /(?:журнал|акт\b|протокол|фото(?:фиксац|отчет)|обмер\s+и\s+подтвержден|входн(?:ой|ого)\s+контрол|испытани|комплект\s+(?:приемочн|исполнительн|закупочн)|ппе|сиз\b)/iu;

describe("BATCH-003 R5.6 canonical successor reconciliation", () => {
  test("projects the exact 36 legacy identities into unique noise-free REAL_WORK definitions", () => {
    const definitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
    expect(definitions).toHaveLength(36);
    expect(new Set(definitions.map((definition) => definition.definitionSha256)).size).toBe(36);
    expect(new Set(definitions.map((definition) => definition.passport.engineeringSourcePack.sourcePackHash)).size).toBe(36);
    for (const definition of definitions) {
      expect(definition).toMatchObject({
        batchId: "BATCH-003",
        successorVersion: "Batch003CanonicalSuccessorR56",
        disposition: "REAL_WORK",
      });
      expect(definition.resources.length).toBeGreaterThanOrEqual(5);
      expect(definition.resources.length).toBeLessThanOrEqual(32);
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
      });
    }
  });

  test("binds the source pack exactly to formula and price inputs with fail-closed provenance", () => {
    for (const definition of buildAllBatch003R56CanonicalSuccessorDefinitions()) {
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

  test("compiles 36/36 through the single shared core and selects the exact procurement subset", async () => {
    for (const definition of buildAllBatch003R56CanonicalSuccessorDefinitions()) {
      const compiled = await compileBatch003R56ThroughSharedCore({
        definition,
        values: batch003R56FixtureValues(definition),
      });
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
      const withoutAccess = await compileBatch003R56ThroughSharedCore({
        definition,
        values: { ...batch003R56FixtureValues(definition), access_equipment_required: false },
      });
      expect(withoutAccess.rows).toHaveLength(compiled.rows.length - 1);
      expect(withoutAccess.rows.some((row) => row.row_id.endsWith(":access_equipment"))).toBe(false);
    }
  });

  test("rejects a missing physical quantity and a missing work price for every definition", async () => {
    for (const definition of buildAllBatch003R56CanonicalSuccessorDefinitions()) {
      const values = { ...batch003R56FixtureValues(definition) };
      const quantityId = definition.operation === "FINISH_JOINT"
        ? "joint_length_m"
        : definition.operation === "REPAIR" ? "defect_area_m2" : "area_m2";
      delete values[quantityId];
      await expect(compileBatch003R56ThroughSharedCore({ definition, values })).rejects.toBeDefined();
      const withoutPrice = { ...batch003R56FixtureValues(definition) };
      delete withoutPrice.unit_price_successor_operation_work_kgs;
      await expect(compileBatch003R56ThroughSharedCore({ definition, values: withoutPrice })).rejects.toBeDefined();
    }
  });
});
