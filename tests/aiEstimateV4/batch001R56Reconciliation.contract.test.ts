import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import {
  buildAllBatch001DrywallSuccessorsR3,
  compileBatch001DrywallSuccessorR3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { batch001DrywallGoldFixtureValuesR3 } from "../../scripts/estimate/batch001008R3/batch001DrywallGoldFixtureR3";
import { compileBatch001R56ThroughSharedCore } from "../../scripts/estimate/r5/batch001R56SharedCoreProjection";

const ORACLE_PATH = resolve(
  ".release-runtime/real-professional-estimates-r3/evidence/04-repair/batch001/batch001_gold_fixture_compiled_rows.jsonl",
);
const ORACLE_SHA256 = "8eca44e50affd832a7d89d9e596289aee370f9eb499c3d8c1aa30a62cefccf32";

type OracleRecord = {
  catalogId: string;
  rows: { rowId: string; titleRu: string; unitId: string; quantity: number; procurementEligible: boolean }[];
};

function oracleRecords(): Map<string, OracleRecord> {
  const bytes = readFileSync(ORACLE_PATH);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(ORACLE_SHA256);
  const records = bytes.toString("utf8").trim().split("\n").map((line) => JSON.parse(line) as OracleRecord);
  expect(records).toHaveLength(16);
  return new Map(records.map((record) => [record.catalogId, record]));
}

describe("BATCH-001 R5.6 shared-core reconciliation", () => {
  it("binds every catalog-level passport to ranges, engineering sources and unique owners", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      expect(definition.passport).toMatchObject({
        executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU",
        batchId: "BATCH-001",
        proofStatus: "CONTENT_RECONCILIATION_GREEN_BACKEND_REPLAY_PENDING_R56",
      });
      expect(definition.passport.engineeringSources.length).toBeGreaterThanOrEqual(3);
      expect(definition.passport.userParameterContracts).toHaveLength(
        definition.passport.parameters.filter((parameter) => parameter.visibilityRole === "USER_INPUT").length,
      );
      expect(definition.passport.userParameterContracts.every((contract) => contract.defaultValue == null
        || contract.parameterId === "delivery_included_by_supplier")).toBe(true);
      expect(definition.passport.parameters.every((parameter) =>
        (parameter as typeof parameter & { sourceRole?: string | null }).sourceRole != null
      )).toBe(true);
      expect(new Set(definition.passport.semanticOwners).size).toBe(definition.resources.length);
      expect(new Set(definition.passport.costOwners).size).toBe(definition.resources.length);
      expect(new Set(definition.passport.procurementOwners).size).toBe(
        definition.resources.filter((resource) => resource.procurementEligible).length,
      );
      const sourceIds = new Set(definition.passport.engineeringSources.map((source) => source.sourceId));
      expect(definition.resources.every((resource) => resource.engineeringSourceIds.length > 0
        && resource.engineeringSourceIds.every((sourceId) => sourceIds.has(sourceId)))).toBe(true);
    }
  });

  it("preserves manufacturer-passport ownership for project-selected material rates", () => {
    const clad = buildAllBatch001DrywallSuccessorsR3().find((definition) =>
      definition.catalogId === "drywall_ceiling_interior_bulkhead_clad_standard"
    );
    expect(clad).toBeDefined();
    const sourceRole = (parameterId: string) => (clad!.passport.parameters.find((parameter) =>
      parameter.parameterId === parameterId
    ) as { sourceRole?: string } | undefined)?.sourceRole;

    expect(sourceRole("joint_compound_rate_kg_m")).toBe("MATERIAL_PASSPORT_VALUE");
    expect(sourceRole("surface_primer_rate_l_m2")).toBe("MATERIAL_PASSPORT_VALUE");
  });

  it("rejects values immediately outside both numeric boundaries for every definition", () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      const numeric = definition.passport.userParameterContracts.find((contract) => contract.range.kind === "NUMERIC");
      expect(numeric?.range.kind).toBe("NUMERIC");
      if (!numeric || numeric.range.kind !== "NUMERIC") continue;
      const fixture = { ...batch001DrywallGoldFixtureValuesR3(definition) };
      const below = compileBatch001DrywallSuccessorR3(definition, {
        ...fixture,
        [numeric.parameterId]: numeric.range.minimum - Math.max(1, Math.abs(numeric.range.minimum) + 1),
      });
      const above = compileBatch001DrywallSuccessorR3(definition, {
        ...fixture,
        [numeric.parameterId]: numeric.range.maximum + Math.max(1, Math.abs(numeric.range.maximum) * 0.01),
      });
      expect(below).toMatchObject({ status: "NEEDS_REQUIRED_INPUTS" });
      expect(above).toMatchObject({ status: "NEEDS_REQUIRED_INPUTS" });
      if (below.status !== "GREEN") expect(below.blockers).toContain(`NUMERIC_INPUT_OUT_OF_RANGE:${numeric.parameterId}`);
      if (above.status !== "GREEN") expect(above.blockers).toContain(`NUMERIC_INPUT_OUT_OF_RANGE:${numeric.parameterId}`);
    }
  });

  it("matches the frozen data-only business oracle through the single production compiler", async () => {
    const oracle = oracleRecords();
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      const expected = oracle.get(definition.catalogId);
      expect(expected).toBeDefined();
      if (!expected) continue;
      const fixture = batch001DrywallGoldFixtureValuesR3(definition);
      const compiled = await compileBatch001R56ThroughSharedCore({
        definition,
        values: fixture,
      });
      expect(compiled.rows).toHaveLength(expected.rows.length);
      for (let index = 0; index < expected.rows.length; index += 1) {
        const actual = compiled.rows[index]!;
        const row = expected.rows[index]!;
        const expectedTitle = definition.group === "FRAME" && actual.category === "material"
          ? `${row.titleRu} — ${String(fixture.exact_system_route)}`
          : row.titleRu;
        expect(actual).toMatchObject({
          row_id: row.rowId,
          title_ru: expectedTitle,
          unit_id: row.unitId,
          procurement_eligible: row.procurementEligible,
        });
        expect(Math.abs(Number(actual.quantity) - row.quantity)).toBeLessThan(0.000001);
      }
    }
  });

  it("keeps the 50 m² developed bulkhead geometry distinct from its 30 m² horizontal face", async () => {
    const definition = buildAllBatch001DrywallSuccessorsR3().find((candidate) =>
      candidate.catalogId === "drywall_ceiling_interior_bulkhead_frame_standard"
    );
    expect(definition).toBeDefined();
    const values = {
      ...batch001DrywallGoldFixtureValuesR3(definition!),
      area_m2: 50,
      horizontal_face_area_m2: 30,
      vertical_face_length_m: 20,
      vertical_face_count: 2,
      bulkhead_drop_height_m: 0.5,
      end_face_area_m2: 0,
      return_face_area_m2: 0,
      opening_area_m2: 0,
      exact_system_route: "Проектный узел короба: ПП 60×27×0,6 мм и ПН 28×27×0,6 мм",
    };
    const compiled = await compileBatch001R56ThroughSharedCore({ definition: definition!, values });
    const work = compiled.rows.find((row) => row.row_id.endsWith(":work:install_metal_frame"));

    expect(work?.quantity).toBe("50");
    expect(Number(values.horizontal_face_area_m2)).toBe(30);
    expect(compiled.rows.filter((row) => row.category === "material").every((row) =>
      String(row.title_ru).endsWith(` — ${values.exact_system_route}`)
    )).toBe(true);
    expect(compiled.rows.some((row) => /лист.*гипс|шпакл[её]в|обшив|окраск/iu.test(String(row.title_ru)))).toBe(false);
  });

  it("uses the shared artifact selector for the exact procurement subset", async () => {
    for (const definition of buildAllBatch001DrywallSuccessorsR3()) {
      const compiled = await compileBatch001R56ThroughSharedCore({
        definition,
        values: batch001DrywallGoldFixtureValuesR3(definition),
      });
      const selected = selectCanonicalArtifactRows(compiled.rows);
      expect(selected.estimateRows).toHaveLength(compiled.rows.length);
      expect(selected.procurementRows.map((row) => row.row_id)).toEqual(
        compiled.rows.filter((row) => row.procurement_eligible).map((row) => row.row_id),
      );
    }
  });
});
