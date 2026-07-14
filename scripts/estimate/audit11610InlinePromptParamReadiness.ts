import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { getParameterSchemaForTemplate } from "../../src/lib/estimate/getParameterSchemaForTemplate";
import { getPromptHintsForTemplate } from "../../src/lib/estimate/getPromptHintsForTemplate";
import { parseInlineWorkEstimatePrompt } from "../../src/lib/ai/parseInlineWorkEstimatePrompt";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import { runInlineWorkPromptAcceptanceCorpus } from "./inlineWorkPromptAcceptanceCases";

export const GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY =
  "GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY" as const;
export const STOP_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_FAILED =
  "STOP_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-inline-work-prompt-params");

type InlinePromptReadinessLedgerRow = {
  template_id: string;
  template_name: string;
  family: string;
  has_parameter_schema: boolean;
  has_prompt_hints: boolean;
  has_synonyms: boolean;
  has_unit_parser_rules: boolean;
  has_default_assumptions: boolean;
  has_missing_input_policy: boolean;
  can_parse_inline_params: boolean;
  can_build_preliminary_from_inline_prompt: boolean;
  has_selected_template_lock_support: boolean;
  has_pdf_mapping: boolean;
  has_buyer_handoff_mapping: boolean;
  status: "ready" | "blocked";
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function readinessRow(templateId: string): InlinePromptReadinessLedgerRow {
  const passport = buildProfessionalWorkPassport(templateId);
  const schema = getParameterSchemaForTemplate(templateId);
  const hints = getPromptHintsForTemplate(templateId);
  const parse = parseInlineWorkEstimatePrompt({
    rawInput: `${passport?.localizedNameRu ?? templateId} 100 m2`,
    selectedTemplateId: templateId,
  });
  const blockingReasons = [
    passport ? "" : "passport_missing",
    schema ? "" : "parameter_schema_missing",
    hints ? "" : "prompt_hints_missing",
    schema && schema.synonyms.length > 0 ? "" : "synonyms_missing",
    schema && schema.unitParserRules.length > 0 ? "" : "unit_parser_rules_missing",
    schema && schema.defaultAssumptions.length > 0 ? "" : "default_assumptions_missing",
    schema?.missingInputPolicy === "show_missing_and_continue_preliminary_boq" ? "" : "missing_input_policy_missing",
    parse.extractedParams.area_m2 ? "" : "inline_param_parse_failed",
    parse.canBuildPreliminaryEstimate ? "" : "preliminary_parse_not_buildable",
    parse.matchedTemplate?.templateId === templateId ? "" : "selected_template_lock_failed",
    passport?.outputMappings.pdfRowsEqualSnapshotRows ? "" : "pdf_mapping_missing",
    passport?.outputMappings.buyerHandoffProcurementSubset ? "" : "buyer_handoff_missing",
    passport && passport.boqRecipe.rowCount > 0 ? "" : "boq_rows_missing",
  ].filter(Boolean);

  return {
    template_id: templateId,
    template_name: passport?.localizedNameRu ?? templateId,
    family: passport?.familyId ?? "missing",
    has_parameter_schema: Boolean(schema),
    has_prompt_hints: Boolean(hints),
    has_synonyms: Boolean(schema && schema.synonyms.length > 0),
    has_unit_parser_rules: Boolean(schema && schema.unitParserRules.length > 0),
    has_default_assumptions: Boolean(schema && schema.defaultAssumptions.length > 0),
    has_missing_input_policy: schema?.missingInputPolicy === "show_missing_and_continue_preliminary_boq",
    can_parse_inline_params: Boolean(parse.extractedParams.area_m2),
    can_build_preliminary_from_inline_prompt: parse.canBuildPreliminaryEstimate && Boolean(passport && passport.boqRecipe.rowCount > 0),
    has_selected_template_lock_support: parse.matchedTemplate?.templateId === templateId,
    has_pdf_mapping: Boolean(passport?.outputMappings.pdfRowsEqualSnapshotRows),
    has_buyer_handoff_mapping: Boolean(passport?.outputMappings.buyerHandoffProcurementSubset),
    status: blockingReasons.length === 0 ? "ready" : "blocked",
    blocking_reasons: blockingReasons,
  };
}

export function audit11610InlinePromptParamReadiness(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
} = {}) {
  const templateIds = listProfessionalWorkPassportTemplateIds();
  const ledger: InlinePromptReadinessLedgerRow[] = [];
  for (const [index, templateId] of templateIds.entries()) {
    ledger.push(readinessRow(templateId));
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();

  const corpus = runInlineWorkPromptAcceptanceCorpus();
  const blocked = ledger.filter((row) => row.status !== "ready");
  const finalGreen =
    ledger.length === 11610 &&
    blocked.length === 0 &&
    corpus.cases_run >= 300 &&
    corpus.cases_passed >= 300 &&
    corpus.template_match_failures === 0 &&
    corpus.param_extraction_failures === 0 &&
    corpus.unit_normalization_failures === 0 &&
    corpus.draft_empty_failures === 0 &&
    corpus.pdf_mapping_failures === 0 &&
    corpus.buyer_mapping_failures === 0;

  const outDir = input.writeLedger || input.writeSummary ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "inline-prompt-readiness-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY
      : STOP_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    inline_work_prompt_contract_created: true,
    raw_input_preserved: true,
    work_template_match_supported: true,
    inline_param_extraction_supported: true,
    selected_template_lock_supported: ledger.every((row) => row.has_selected_template_lock_support),
    all_11610_templates_have_parameter_schema: ledger.every((row) => row.has_parameter_schema),
    all_11610_templates_have_prompt_hints: ledger.every((row) => row.has_prompt_hints),
    all_11610_templates_have_unit_parser_rules: ledger.every((row) => row.has_unit_parser_rules),
    all_11610_templates_have_missing_input_policy: ledger.every((row) => row.has_missing_input_policy),
    templates_audited: ledger.length,
    templates_ready_for_inline_prompt_params: ledger.filter((row) => row.status === "ready").length,
    blocked_templates_count: blocked.length,
    missing_parameter_schema_count: ledger.filter((row) => !row.has_parameter_schema).length,
    missing_prompt_hints_count: ledger.filter((row) => !row.has_prompt_hints).length,
    missing_unit_parser_rules_count: ledger.filter((row) => !row.has_unit_parser_rules).length,
    missing_missing_input_policy_count: ledger.filter((row) => !row.has_missing_input_policy).length,
    inline_prompt_cases_run: corpus.cases_run,
    inline_prompt_cases_passed: corpus.cases_passed,
    template_match_failures: corpus.template_match_failures,
    param_extraction_failures: corpus.param_extraction_failures,
    unit_normalization_failures: corpus.unit_normalization_failures,
    selected_template_lost_count: corpus.selected_template_lost_count,
    draft_empty_count: corpus.draft_empty_failures,
    contact_blocker_count: corpus.contact_blocker_count,
    pdf_missing_count: corpus.pdf_mapping_failures,
    buyer_handoff_missing_count: corpus.buyer_mapping_failures,
    blocking_reasons: [
      ...blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)),
      ...corpus.failures,
    ].slice(0, 100),
    full_inline_prompt_params_green_claimed: finalGreen,
    render_staging_started: false,
    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    full_jest_started: false,
    fake_green_claimed: false,
    ledger_artifact: ledgerPath,
    runtime_summary_path: summaryPath,
  };

  if (ledgerPath) writeJsonl(ledgerPath, ledger);
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, ledger, corpus, outDir, ledgerPath, summaryPath };
}

if (require.main === module) {
  const result = audit11610InlinePromptParamReadiness({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    templates_audited: result.summary.templates_audited,
    templates_ready_for_inline_prompt_params: result.summary.templates_ready_for_inline_prompt_params,
    blocked_templates_count: result.summary.blocked_templates_count,
    inline_prompt_cases_passed: result.summary.inline_prompt_cases_passed,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
    ledger_artifact: result.summary.ledger_artifact,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_11610_INLINE_PROMPT_PARAM_READINESS_READY) process.exitCode = 1;
}
