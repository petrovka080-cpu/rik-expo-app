import { Pool } from "pg";

import { compileCanonicalEstimateCore } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
  resolveCanonicalEstimateProfileInputsS2723,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723";
import { estimateDeterministicHash } from
  "../../src/lib/estimate/estimateDeterministicHash";

const RELEASE_ID = process.env.S2723_DEFINITION_RELEASE_ID
  ?? "c1c7488f-b7a0-5bc5-beb3-dc3d0e25b616";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const definition = (await pool.query(
      `select definition.id
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [RELEASE_ID, STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723],
    )).rows[0];
    if (!definition) throw new Error("S2723_STRIP_FOUNDATION_DEFINITION_MISSING");
    const parameterDefinitions = (await pool.query(
      `select * from public.estimate_parameter_definition
       where definition_version_id=$1 order by ordinal`,
      [definition.id],
    )).rows;
    const formulaDefinitions = (await pool.query(
      `select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
       from public.estimate_formula_graph where definition_version_id=$1`,
      [definition.id],
    )).rows;
    const resourceDefinitions = (await pool.query(
      `select * from public.estimate_resource_spec
       where definition_version_id=$1 order by ordinal`,
      [definition.id],
    )).rows;
    const submittedParameters = { total_axis_length_m: 150 };
    const resolved = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
      confirmedParameters: {},
      effectiveUserParameters: submittedParameters,
    });
    const compiled = await compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-strip-foundation-independent-acceptance",
      catalogId: STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
      primaryMeasureParameterId: "total_axis_length_m",
      parameterDefinitions,
      formulaDefinitions,
      resourceDefinitions,
      submittedParameters,
      confirmedParameters: { ...resolved.confirmedParameters },
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 1_000,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const quantity = (rowId: string) =>
      compiled.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
    const evidence = {
      schemaVersion: "rik-expo-app.s27-23.strip-foundation-independent-acceptance.v1",
      status: "GREEN_S27_23_STRIP_FOUNDATION_150M_AUTOMATIC_CORE",
      releaseId: RELEASE_ID,
      definitionId: String(definition.id),
      catalogId: STRIP_FOUNDATION_FULL_SCOPE_CATALOG_ID_S2723,
      profileInputResolutionApplied: resolved.applied,
      definitionShape: [
        parameterDefinitions.length,
        formulaDefinitions.length,
        resourceDefinitions.length,
      ],
      rowCount: compiled.rows.length,
      preliminaryNeedCount: compiled.preliminaryNeeds.length,
      procurementRowCount: compiled.rows.filter((row) => row.included_in_procurement).length,
      quantities: {
        mainConcreteM3: quantity("main_concrete"),
        reinforcementT: quantity("reinforcement"),
        bindingWireKg: quantity("binding_wire"),
        excavationM3: quantity("excavation_work"),
        beddingM3: quantity("foundation_bedding_work"),
        waterproofingMaterialKg: quantity("bituminous_waterproofing"),
        backfillM3: quantity("backfill_work"),
      },
      unconfirmedConditionalRowsPresent: {
        mechanicalCouplers: compiled.rows.some((row) => row.row_id === "mechanical_couplers"),
        constructionJointWaterstop: compiled.rows.some((row) =>
          row.row_id === "construction_joint_waterstop"),
        excavationSupport: compiled.rows.some((row) =>
          row.row_id === "work:foundation:excavation-support"),
        excavationDewatering: compiled.rows.some((row) =>
          row.row_id === "machine:foundation:excavation-dewatering"),
      },
      productionAccessed: false,
      activationPerformed: false,
    };
    const expected = JSON.stringify({
      mainConcreteM3: "259.2",
      reinforcementT: "28.8",
      bindingWireKg: "345.6",
      excavationM3: "540",
      beddingM3: "36",
      waterproofingMaterialKg: "2400",
      backfillM3: "210",
    });
    if (evidence.profileInputResolutionApplied !== true
      || evidence.preliminaryNeedCount !== 0
      || evidence.rowCount < 40
      || evidence.procurementRowCount < 20
      || JSON.stringify(evidence.quantities) !== expected
      || Object.values(evidence.unconfirmedConditionalRowsPresent).some(Boolean)) {
      throw new Error(`S2723_STRIP_FOUNDATION_INDEPENDENT_ACCEPTANCE_RED:${JSON.stringify(evidence)}`);
    }
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
