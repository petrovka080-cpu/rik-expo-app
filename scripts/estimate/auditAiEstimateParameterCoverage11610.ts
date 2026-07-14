import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
} from "../../src/lib/estimate/aiEstimateParameterSchema";
import {
  containsForbiddenAiEstimateVisibleToken,
  hasHumanReadableAiEstimateParameterPassport,
  isAiEstimateGenericParameterLabel,
} from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

export const GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY =
  "GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY" as const;
export const STOP_AI_ESTIMATE_PARAMETER_COVERAGE_11610_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_COVERAGE_11610_FAILED" as const;

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function auditAiEstimateParameterCoverage11610(input: { writeSummary?: boolean } = {}) {
  const ids = listProfessionalWorkPassportTemplateIds();
  let schemasBuilt = 0;
  let templatesWithCards = 0;
  let visibleRuLabelCoverage = 0;
  let visibleRuUnitCoverage = 0;
  let editableConnected = 0;
  let totalEditable = 0;
  let unmappedVisibleParameterKeys = 0;
  let genericParameterLabels = 0;
  let rawTechnicalStatusesVisible = 0;
  const failures: string[] = [];

  for (const [index, templateId] of ids.entries()) {
    const schema = buildAiEstimateParameterSchema(templateId);
    if (!schema) {
      failures.push(`${templateId}:schema_missing`);
      continue;
    }
    schemasBuilt += 1;
    if (schema.fields.length > 0) templatesWithCards += 1;
    for (const field of schema.fields) {
      totalEditable += 1;
      const visible = `${field.labelRu} ${field.unitRu}`;
      if (!hasHumanReadableAiEstimateParameterPassport(field.key, field.labelRu)) {
        unmappedVisibleParameterKeys += 1;
        failures.push(`${templateId}:${field.key}:UNMAPPED_VISIBLE_PARAMETER_KEY`);
      }
      if (isAiEstimateGenericParameterLabel(field.labelRu)) {
        genericParameterLabels += 1;
        failures.push(`${templateId}:${field.key}:generic_parameter_label`);
      }
      if (containsForbiddenAiEstimateVisibleToken(visible)) {
        rawTechnicalStatusesVisible += 1;
        failures.push(`${templateId}:${field.key}:raw_technical_status_visible`);
      }
      if (field.labelRu && !containsForbiddenAiEstimateVisibleToken(visible) && !/[a-z]+_[a-z0-9_]+/i.test(field.labelRu)) {
        visibleRuLabelCoverage += 1;
      } else {
        failures.push(`${templateId}:${field.key}:visible_label_not_ru`);
      }
      if (!field.unit || field.unitRu) {
        visibleRuUnitCoverage += 1;
      } else {
        failures.push(`${templateId}:${field.key}:visible_unit_missing`);
      }
      if (field.affectsRowIds.length > 0 || field.formulaRefs.length > 0) {
        editableConnected += 1;
      } else {
        failures.push(`${templateId}:${field.key}:parameter_card_not_connected`);
      }
    }
    if (index > 0 && index % 100 === 0) {
      clearAiEstimateParameterSchemaCache();
      clearProfessionalWorkPassportBuildCaches();
    }
  }
  clearAiEstimateParameterSchemaCache();
  clearProfessionalWorkPassportBuildCaches();

  const deadParameterCardsCount = totalEditable - editableConnected;
  const blockers = [
    ids.length === 11610 ? "" : `catalog_total_templates:${ids.length}`,
    schemasBuilt === ids.length ? "" : `schemas_built:${schemasBuilt}/${ids.length}`,
    templatesWithCards === ids.length ? "" : `templates_with_cards:${templatesWithCards}/${ids.length}`,
    visibleRuLabelCoverage === totalEditable ? "" : `visible_ru_label_coverage:${visibleRuLabelCoverage}/${totalEditable}`,
    visibleRuUnitCoverage === totalEditable ? "" : `visible_ru_unit_coverage:${visibleRuUnitCoverage}/${totalEditable}`,
    unmappedVisibleParameterKeys === 0 ? "" : `UNMAPPED_VISIBLE_PARAMETER_KEY:${unmappedVisibleParameterKeys}`,
    genericParameterLabels === 0 ? "" : `generic_parameter_labels:${genericParameterLabels}`,
    rawTechnicalStatusesVisible === 0 ? "" : `raw_technical_statuses_visible:${rawTechnicalStatusesVisible}`,
    deadParameterCardsCount === 0 ? "" : `dead_parameter_cards_count:${deadParameterCardsCount}`,
    ...failures.slice(0, 200),
  ].filter(Boolean);
  const finalGreen = blockers.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY
      : STOP_AI_ESTIMATE_PARAMETER_COVERAGE_11610_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    catalog_total_templates: ids.length,
    parameter_schema_coverage: `${schemasBuilt}/${ids.length}`,
    editable_parameter_card_template_coverage: `${templatesWithCards}/${ids.length}`,
    visible_ru_label_coverage: `${visibleRuLabelCoverage}/${totalEditable}`,
    visible_ru_unit_coverage: `${visibleRuUnitCoverage}/${totalEditable}`,
    editable_parameters_connected_to_calculation: `${editableConnected}/${totalEditable}`,
    dead_parameter_cards_count: deadParameterCardsCount,
    unmapped_visible_parameter_keys: unmappedVisibleParameterKeys,
    generic_parameter_labels: genericParameterLabels,
    raw_technical_statuses_visible: rawTechnicalStatusesVisible,
    hardcoded_capital_repair_only: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    release_started: false,
    blocking_reasons: blockers,
  };

  const summaryPath = input.writeSummary
    ? path.join(".release-runtime", "ai-estimate-parameter-cards", "coverage-11610-summary.json")
    : null;
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, failures };
}

if (require.main === module) {
  const result = auditAiEstimateParameterCoverage11610({ writeSummary: hasFlag("write-summary") || hasFlag("json") });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    catalog_total_templates: result.summary.catalog_total_templates,
    parameter_schema_coverage: result.summary.parameter_schema_coverage,
    editable_parameter_card_template_coverage: result.summary.editable_parameter_card_template_coverage,
    visible_ru_label_coverage: result.summary.visible_ru_label_coverage,
    editable_parameters_connected_to_calculation: result.summary.editable_parameters_connected_to_calculation,
    dead_parameter_cards_count: result.summary.dead_parameter_cards_count,
    blockers: result.summary.blocking_reasons.slice(0, 20),
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY) process.exitCode = 1;
}
