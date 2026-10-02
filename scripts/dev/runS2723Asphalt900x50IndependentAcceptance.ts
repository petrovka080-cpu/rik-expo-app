import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Pool } from "pg";

import { compileCanonicalEstimateCore } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalApprovedBaselineRuntimeParameters } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import { resolveCanonicalEstimateProfileInputsS2723 } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723";
import { estimateDeterministicHash } from
  "../../src/lib/estimate/estimateDeterministicHash";
import {
  ASPHALT_TRANSVERSE_JOINT_ROW_ID_S2723,
  correctAsphaltFullCycleDefinitionS2723,
} from "../../src/lib/estimate/v4/asphalt/asphaltFullCycleFormulaCorrectionS2723";

const RELEASE_ID = process.env.S2723_DEFINITION_RELEASE_ID
  ?? "c1c7488f-b7a0-5bc5-beb3-dc3d0e25b616";
const CATALOG_ID = "canonical-work:expanded:asphalt_concrete_pavement";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const definition = (await pool.query(
      `select definition.id,manifest.approved_template_baseline_id
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_definition_version definition
         on definition.id=manifest.definition_version_id
       where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [RELEASE_ID, CATALOG_ID],
    )).rows[0];
    if (!definition) throw new Error("S2723_ASPHALT_DEFINITION_MISSING");
    const parameterDefinitions = (await pool.query(
      `select * from public.estimate_parameter_definition
       where definition_version_id=$1 order by ordinal`,
      [definition.id],
    )).rows;
    const storedFormulaDefinitions = (await pool.query(
      `select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
       from public.estimate_formula_graph where definition_version_id=$1`,
      [definition.id],
    )).rows;
    const storedResourceDefinitions = (await pool.query(
      `select * from public.estimate_resource_spec
       where definition_version_id=$1 order by ordinal`,
      [definition.id],
    )).rows;
    const baseline = (await pool.query(
      `select input_values,input_classification
       from public.estimate_approved_template_baseline where id=$1`,
      [definition.approved_template_baseline_id],
    )).rows[0];
    const baselineParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
    const submittedParameters = {
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
    };
    const profile = resolveCanonicalEstimateProfileInputsS2723({
      catalogId: CATALOG_ID,
      confirmedParameters: baselineParameters,
      effectiveUserParameters: submittedParameters,
    });
    const confirmedParameters = profile.confirmedParameters;
    const correctionPersisted = storedResourceDefinitions.some((row) =>
      String(row.row_id) === ASPHALT_TRANSVERSE_JOINT_ROW_ID_S2723);
    const correction = correctionPersisted
      ? { formulas: storedFormulaDefinitions, resources: storedResourceDefinitions }
      : correctAsphaltFullCycleDefinitionS2723({
        formulas: storedFormulaDefinitions,
        resources: storedResourceDefinitions,
      });
    const formulaDefinitions = [...correction.formulas];
    const resourceDefinitions = [...correction.resources];
    const compiled = await compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-23-asphalt-900x50-independent-acceptance",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "area_m2",
      parameterDefinitions,
      formulaDefinitions,
      resourceDefinitions,
      submittedParameters,
      confirmedParameters,
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 1_000,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const rowIdBySourceRowId = new Map(resourceDefinitions.map((row) => [
      String(row.resource_graph?.sourceRowId ?? row.row_id),
      String(row.row_id),
    ]));
    const quantityBySourceRowId = (sourceRowId: string) => {
      const exact = rowIdBySourceRowId.get(sourceRowId);
      const suffix = [...rowIdBySourceRowId.entries()].find(([source]) =>
        source.endsWith(`:${sourceRowId}`))?.[1];
      const rowId = exact ?? suffix;
      return rowId == null
        ? null
        : compiled.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
    };
    const diagnosticBySourceRowId = (sourceRowId: string) => {
      const resource = resourceDefinitions.find((row) =>
        String(row.resource_graph?.sourceRowId ?? row.row_id) === sourceRowId
        || String(row.resource_graph?.sourceRowId ?? row.row_id).endsWith(`:${sourceRowId}`));
      if (!resource) return null;
      const formula = formulaDefinitions.find((row) => row.formula_id === resource.formula_id);
      const compiledRow = compiled.rows.find((row) => row.row_id === resource.row_id);
      const need = compiled.preliminaryNeeds.find((row) => row.row_id === resource.row_id);
      return {
        rowId: String(resource.row_id),
        formulaId: String(resource.formula_id),
        expression: String(formula?.expression_source ?? ""),
        inputs: Object.fromEntries((formula?.input_parameter_ids ?? []).map((parameterId: string) => [
          parameterId,
          Object.hasOwn(submittedParameters, parameterId)
            ? (submittedParameters as Record<string, unknown>)[parameterId]
            : (confirmedParameters as Record<string, unknown>)[parameterId],
        ])),
        quantity: compiledRow?.quantity ?? null,
        missingParameterIds: need?.missing_parameter_ids ?? [],
      };
    };
    const jointDefinitions = resourceDefinitions.filter((row) =>
      /joint|edge|стык|кром/iu.test(
        `${String(row.row_id)} ${String(row.title_ru)} ${String(row.resource_graph?.sourceRowId ?? "")}`,
      ) && !/emulsion_interface/iu.test(String(row.resource_graph?.sourceRowId ?? row.row_id)));
    const compiledRowIds = new Set(compiled.rows.map((row) => row.row_id));
    const preliminaryNeedIds = new Set(compiled.preliminaryNeeds.map((need) => need.row_id));
    const jointState = jointDefinitions.map((row) => ({
      rowId: String(row.row_id),
      sourceRowId: String(row.resource_graph?.sourceRowId ?? ""),
      titleRu: String(row.title_ru),
      ordinal: Number(row.ordinal),
      section: String(row.section),
      category: String(row.category),
      rowType: String(row.row_type),
      unitId: String(row.unit_id),
      semanticOwner: String(row.semantic_owner),
      costOwnerId: row.cost_owner_id == null ? null : String(row.cost_owner_id),
      procurementEligible: Boolean(row.procurement_eligible),
      compiled: compiledRowIds.has(String(row.row_id)),
      pending: preliminaryNeedIds.has(String(row.row_id)),
      quantity: compiled.rows.find((candidate) => candidate.row_id === String(row.row_id))?.quantity
        ?? null,
      missingParameterIds: compiled.preliminaryNeeds.find((candidate) =>
        candidate.row_id === String(row.row_id))?.missing_parameter_ids ?? [],
    }));
    const evidence = {
      schemaVersion: "rik-expo-app.s27-23.asphalt-900x50-independent-acceptance.v1",
      status: correctionPersisted
        ? "GREEN_S27_23_ASPHALT_900X50_AUTOMATIC_CORE_NOT_UI_ACCEPTED"
        : "DRY_RUN_S27_23_ASPHALT_900X50_CORRECTION_NOT_PERSISTED",
      releaseId: RELEASE_ID,
      definitionId: String(definition.id),
      definitionShape: [
        parameterDefinitions.length,
        formulaDefinitions.length,
        resourceDefinitions.length,
      ],
      profileInputResolution: {
        applied: profile.applied,
        profileId: profile.profileId,
      },
      rowCount: compiled.rows.length,
      preliminaryNeedCount: compiled.preliminaryNeeds.length,
      preliminaryMissingParameterCounts: Object.entries(compiled.preliminaryNeeds.reduce(
        (counts, need) => {
          for (const parameterId of need.missing_parameter_ids) {
            counts[parameterId] = (counts[parameterId] ?? 0) + 1;
          }
          return counts;
        },
        {} as Record<string, number>,
      )).sort((left, right) => right[1] - left[1]),
      procurementRowCount: compiled.rows.filter((row) => row.included_in_procurement).length,
      parameterBaseline: parameterDefinitions.map((parameter) => ({
        parameterId: String(parameter.parameter_id),
        required: Boolean(parameter.required),
        value: (baseline.input_values as Record<string, unknown>)[parameter.parameter_id] ?? null,
        classification: (baseline.input_classification as Record<string, unknown>)[parameter.parameter_id]
          ?? null,
      })),
      relevantParameters: parameterDefinitions.filter((parameter) =>
        /thickness|density|waste|loss|wearing|binder|length_m|width_m/iu.test(
          String(parameter.parameter_id),
        )).map((parameter) => ({
          parameterId: String(parameter.parameter_id),
          required: Boolean(parameter.required),
          confirmedValue: (confirmedParameters as Record<string, unknown>)[parameter.parameter_id]
            ?? null,
          submittedValue: (submittedParameters as Record<string, unknown>)[parameter.parameter_id]
            ?? null,
        })),
      quantities: {
        lowerMixT: quantityBySourceRowId("asphalt_layer_1_material"),
        upperMixT: quantityBySourceRowId("asphalt_layer_2_material"),
      },
      geotextileState: resourceDefinitions.filter((row) =>
        /geotextile/iu.test(String(row.resource_graph?.sourceRowId ?? row.row_id))).map((row) => ({
        sourceRowId: String(row.resource_graph?.sourceRowId ?? row.row_id),
        quantity: compiled.rows.find((candidate) => candidate.row_id === row.row_id)?.quantity ?? null,
        includedInProcurement: compiled.rows.find((candidate) =>
          candidate.row_id === row.row_id)?.included_in_procurement ?? null,
        pending: compiled.preliminaryNeeds.some((candidate) => candidate.row_id === row.row_id),
        expression: formulaDefinitions.find((formula) => formula.formula_id === row.formula_id)?.expression_source,
        inclusionAst: row.inclusion_ast,
      })),
      quantityDiagnostics: {
        lowerMix: diagnosticBySourceRowId("asphalt_layer_1_material"),
        upperMix: diagnosticBySourceRowId("asphalt_layer_2_material"),
        longitudinalJoints: diagnosticBySourceRowId("longitudinal_joints"),
        jointSealingMaterial: diagnosticBySourceRowId("joint_sealing_material"),
      },
      jointState,
      productionAccessed: false,
      activationPerformed: false,
      webAccepted: false,
      androidAccepted: false,
      procurementUiAccepted: false,
      pdfAccepted: false,
    };
    if (correctionPersisted && (
      JSON.stringify(evidence.definitionShape) !== JSON.stringify([127, 148, 148])
      || evidence.rowCount !== 104
      || evidence.preliminaryNeedCount !== 5
      || evidence.procurementRowCount !== 10
      || evidence.quantities.lowerMixT !== "129.438"
      || evidence.quantities.upperMixT !== "107.865"
    )) throw new Error("STOP_S2723_ASPHALT_PERSISTED_ACCEPTANCE_DRIFT");
    const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
    if (process.argv.includes("--write")) {
      const outputPath = resolve(process.env.S2723_ACCEPTANCE_OUTPUT
        ?? ".release-runtime/r568/s27-23/asphalt-900x50-automatic-successor/independent-acceptance.json");
      mkdirSync(dirname(outputPath), { recursive: true });
      const temporary = `${outputPath}.${process.pid}.tmp`;
      writeFileSync(temporary, serialized, "utf8");
      renameSync(temporary, outputPath);
    }
    process.stdout.write(serialized);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
