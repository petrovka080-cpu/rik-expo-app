import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAParameterDefinitions,
} from "../../src/lib/estimate/v4/roadworks";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  asphaltRelatedParameterKeysForProfileV4,
} from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import {
  ASPHALT_RELATED_PARAMETER_METADATA_V4,
  compileAsphaltRelatedProfessionalEstimateV4,
} from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4";
import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import { buildAsphaltRelatedR8Inventory } from "../estimate/buildAsphaltRelatedR8Inventory";

const VALUES: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  area_m2: 120,
  geometry_method: "direct_area",
  length_m: 12,
  width_m: 10,
  exclusions_m2: 0,
  purpose: "public_road",
  traffic_load_category: "medium",
  construction_mode: "new_construction",
  removal_area_m2: 120,
  removal_depth_mm: 50,
  removal_method: "MECHANICAL_BREAKOUT",
  removal_extent: "FULL",
  existing_asphalt_density_t_m3: 2.35,
  haul_required: false,
  material_destination: "RECYCLING",
  wearing_layer_thickness_mm: 50,
  binder_layer_thickness_mm: 60,
  asphalt_density_t_m3: 2.35,
  prepared_base_confirmed: true,
  bridge_deck_system_confirmed: true,
  traffic_class_confirmed: true,
  estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
});

function diagnostic(): unknown {
  const inventory = buildAsphaltRelatedR8Inventory();
  const old35 = RoadworksWaveAInventory.map((entry) => {
    const parameterKeys = getRoadworksWaveAParameterDefinitions(entry.workId).map((item) => item.key);
    const rows = compileRoadworksWaveAWork(entry.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, {
      scopeProfile: entry.scopeProfile,
    }).rows;
    const formulas = rows.map((row) => {
      try {
        const compiled = compileFormulaGraph(row.formulaId);
        return {
          rowId: row.rowId,
          formula: row.formulaId,
          inputs: compiled.inputParameterIds,
          missingInputs: compiled.inputParameterIds.filter((key) => !parameterKeys.includes(key as never)),
        };
      } catch (error) {
        return {
          rowId: row.rowId,
          formula: row.formulaId,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    return {
      catalogId: entry.catalogItemId,
      workId: entry.workId,
      titleRu: entry.professionalNameRu,
      parameterCount: parameterKeys.length,
      rowCount: rows.length,
      invalidFormulaCount: formulas.filter((item) => "error" in item).length,
      unboundFormulaCount: formulas.filter((item) => Array.isArray(item.missingInputs) && item.missingInputs.length > 0).length,
      invalidFormulas: formulas.filter((item) => "error" in item || (Array.isArray(item.missingInputs) && item.missingInputs.length > 0)),
    };
  });
  const extra9 = ASPHALT_RELATED_EXTRA_PROFILES_V4.map((profile) => {
    const parameterKeys = asphaltRelatedParameterKeysForProfileV4(profile);
    const paramOverrides = Object.fromEntries(
      Object.entries(VALUES).map(([key, value]) => [key, { value, source: "user_input" }]),
    );
    try {
      const compiled = compileAsphaltRelatedProfessionalEstimateV4({
        rawInput: `${profile.professionalNameRu}, площадь 120 м²`,
        selectedWorkKey: profile.canonicalCatalogRecordId,
        selectedTemplateId: profile.canonicalCatalogRecordId,
        paramOverrides,
      });
      return {
        catalogId: profile.canonicalCatalogRecordId,
        workId: profile.canonicalWorkKey,
        titleRu: profile.professionalNameRu,
        parameterCount: parameterKeys.length,
        missingRussianParameterTitles: parameterKeys.filter((key) => !/[А-Яа-яЁё]/u.test(ASPHALT_RELATED_PARAMETER_METADATA_V4[key]?.labelRu ?? "")),
        readiness: compiled?.readiness ?? "NO_COMPILATION",
        rowCount: compiled?.draft.items.length ?? 0,
        missingData: compiled?.draft.missingData ?? [],
        sample: compiled?.draft.items.slice(0, 2).map((item) => ({
          titleRu: item.titleRu,
          quantity: item.quantity,
          unit: item.unit,
          formulaId: item.formulaId,
          quantityFormula: item.quantityFormula,
          sourceParameters: item.sourceParameters,
        })) ?? [],
      };
    } catch (error) {
      return {
        catalogId: profile.canonicalCatalogRecordId,
        workId: profile.canonicalWorkKey,
        titleRu: profile.professionalNameRu,
        parameterCount: parameterKeys.length,
        missingRussianParameterTitles: parameterKeys.filter((key) => !/[А-Яа-яЁё]/u.test(ASPHALT_RELATED_PARAMETER_METADATA_V4[key]?.labelRu ?? "")),
        readiness: "ERROR",
        rowCount: 0,
        error: error instanceof Error ? error.stack ?? error.message : String(error),
      };
    }
  });
  const owners = new Map(
    [...old35, ...extra9].map((item) => [item.workId, item]),
  );
  const lineageRecords = inventory.records.filter((item) => item.canonical_technology_id !== null);
  const corpusPath = "C:/dev/rik-expo-app-post-r6-01-asphalt-v3-cf16-final/.release-runtime/completed-domains-depth-r1/asphalt-benchmark/r63-m1-exact-353ad3ac/ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json";
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as {
    cases: Array<{
      ledger: { catalog_id: string; canonical_owner: string; total_boq_rows: number };
      requested_input: Record<string, unknown>;
      row_evidence: Array<{
        formula_id: string;
        quantity_formula: string;
        parameter_sources: string[];
        source_parameters?: Record<string, any>;
      }>;
    }>;
  };
  const corpusFormulaDiagnostics = corpus.cases.flatMap((entry) => {
    const parameterSnapshot = entry.row_evidence[0]?.source_parameters?.parameterSnapshot ?? {};
    return entry.row_evidence.map((row) => {
      const formulaInputValues = row.source_parameters?.formulaInputValues ?? {};
      const available = new Set([
        ...Object.keys(entry.requested_input),
        ...Object.keys(parameterSnapshot),
        ...Object.keys(formulaInputValues),
      ]);
      try {
        const compiled = compileFormulaGraph(row.quantity_formula);
        return {
          catalogId: entry.ledger.catalog_id,
          formulaId: row.formula_id,
          missingInputs: compiled.inputParameterIds.filter((key) => !available.has(key)),
        };
      } catch (error) {
        return {
          catalogId: entry.ledger.catalog_id,
          formulaId: row.formula_id,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  });
  const corpusFormulaDiagnosticsWithoutRowValues = corpus.cases.flatMap((entry) => {
    const parameterSnapshot = entry.row_evidence[0]?.source_parameters?.parameterSnapshot ?? {};
    return entry.row_evidence.map((row) => {
      const available = new Set([...Object.keys(entry.requested_input), ...Object.keys(parameterSnapshot)]);
      const compiled = compileFormulaGraph(row.quantity_formula);
      return compiled.inputParameterIds.filter((key) => !available.has(key));
    });
  });
  return {
    inventory: inventory.summary,
    ownerTotals: {
      technologies: old35.length + extra9.length,
      parameters: old35.reduce((sum, item) => sum + item.parameterCount, 0) + extra9.reduce((sum, item) => sum + item.parameterCount, 0),
      rows: old35.reduce((sum, item) => sum + item.rowCount, 0) + extra9.reduce((sum, item) => sum + item.rowCount, 0),
    },
    lineageTotals: {
      records: lineageRecords.length,
      parameters: lineageRecords.reduce((sum, record) => sum + (owners.get(record.canonical_technology_id!)?.parameterCount ?? 0), 0),
      rows: lineageRecords.reduce((sum, record) => sum + (owners.get(record.canonical_technology_id!)?.rowCount ?? 0), 0),
    },
    corpusTotals: {
      cases: corpus.cases.length,
      parameters: lineageRecords.reduce((sum, record) => sum + (owners.get(record.canonical_technology_id!)?.parameterCount ?? 0), 0),
      rows: corpus.cases.reduce((sum, item) => sum + item.row_evidence.length, 0),
      invalidFormulaRows: corpusFormulaDiagnostics.filter((item) => "error" in item).length,
      unboundFormulaRows: corpusFormulaDiagnostics.filter((item) => Array.isArray(item.missingInputs) && item.missingInputs.length > 0).length,
      unboundInputIds: [...new Set(corpusFormulaDiagnostics.flatMap((item) => Array.isArray(item.missingInputs) ? item.missingInputs : []))].sort(),
      inputsOnlyInRowFormulaValues: [...new Set(corpusFormulaDiagnosticsWithoutRowValues.flat())].sort(),
      invalidFormulaExamples: corpusFormulaDiagnostics.filter((item) => "error" in item).slice(0, 12),
      unboundFormulaExamples: corpusFormulaDiagnostics.filter((item) => Array.isArray(item.missingInputs) && item.missingInputs.length > 0).slice(0, 12),
    },
    old35,
    extra9,
  };
}

process.stdout.write(`${JSON.stringify(diagnostic(), null, 2)}\n`);
import { readFileSync } from "node:fs";
