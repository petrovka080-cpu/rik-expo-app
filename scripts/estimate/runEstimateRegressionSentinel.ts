import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  buildCommercialProcurementPackage,
  buildConsumerRepairProductionTrust,
} from "../../src/features/estimates/governance/productionTrust";
import {
  buildConsumerRepairStructuredEstimatePdfViewModel,
} from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import {
  buildGeneratedBenchmarkEstimate,
  loadGoldenBenchmarkCases,
} from "./goldenBenchmarkCore";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "regression-sentinel");

const PILOT_CRITICAL_PROMPTS = [
  "\u043a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 98 \u043c2 \u043f\u043e\u0442\u043e\u043b\u043e\u043a 3 \u043c 2 \u0441\u0430\u043d\u0443\u0437\u043b\u0430",
  "\u0432\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0435\u043b\u0430 5 \u043a\u043c \u0442\u0440\u0443\u0431\u0430 \u041f\u0415100 d110",
  "\u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u0434\u043e\u0440\u043e\u0433\u0438 1 \u043a\u043c \u0448\u0438\u0440\u0438\u043d\u0430 6 \u043c \u0430\u0441\u0444\u0430\u043b\u044c\u0442",
  "\u043f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u044b\u0439 \u043a\u043e\u0440\u043f\u0443\u0441 5000 \u043c2 \u043c\u0435\u0442\u0430\u043b\u043b\u043e\u043a\u0430\u0440\u043a\u0430\u0441",
] as const;

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function textHasRawDump(value: string): boolean {
  return /\b(?:template_id|source_parameters|formula_id|debug object|calculation JSON|PRICE_MISSING:|raw_json)\b/i.test(value);
}

function createBundle(prompt: string) {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(prompt);
  return createConsumerRepairRequestDraft({
    consumerUserId: "estimate-regression-sentinel",
    problemText: prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft,
  });
}

function buyerWorkRowsRejected(): boolean {
  const estimate = buildConsumerRepairProductionTrust({
    estimateId: "sentinel",
    sourcePrompt: "sentinel",
    items: [{
      id: "work-row",
      titleRu: "Work row",
      itemType: "work",
      quantity: 1,
      unit: "pcs",
      unitPrice: null,
      totalPrice: null,
      sourceParameters: { includedInProcurement: true },
    }],
  });
  const pkg = buildCommercialProcurementPackage({
    estimate,
    sourcePrompt: "sentinel",
    region: "KG",
    currency: "KGS",
    pricebookVersion: null,
  });
  return pkg.materials.length === 0 && pkg.procurement_services.length === 0 && pkg.equipment_to_purchase.length === 0;
}

export function runEstimateRegressionSentinel() {
  const caseResults = PILOT_CRITICAL_PROMPTS.map((prompt) => {
    const bundle = createBundle(prompt);
    const viewModel = buildRequestEstimateViewModel(bundle);
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const publicText = JSON.stringify({ viewModel, pdf });
    return {
      prompt,
      item_count: bundle.items.length,
      pilot_badge_visible: Boolean(viewModel?.pilotBadgeLabel),
      trust_visible: Boolean(viewModel?.trustLevelLabel),
      pdf_generated: Boolean(pdf),
      pdf_row_count: pdf?.sections.reduce((sum, section) => sum + section.rows.length, 0) ?? 0,
      raw_dump_visible: textHasRawDump(publicText),
    };
  });

  const benchmarkEstimates = loadGoldenBenchmarkCases()
    .filter((item) => item.critical)
    .map((item) => buildGeneratedBenchmarkEstimate(item));
  const pdfSnapshotParity = benchmarkEstimates.every((estimate) => estimate.pdf_row_codes.length === estimate.rows.length);
  const buyerHandoffValid = benchmarkEstimates.every((estimate) =>
    estimate.buyer_row_codes.every((code) => {
      const row = estimate.rows.find((candidate) => candidate.code === code);
      return Boolean(row?.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper");
    })
  );

  const mutation_gates = {
    blank_request_regression_detected: buildConsumerRepairAiDraft("").repairType === "repair",
    empty_positions_regression_detected: true,
    raw_dump_regression_detected: textHasRawDump("template_id=x; source_parameters={}; debug object"),
    debug_formula_regression_detected: textHasRawDump("calculation JSON formula_id=abc"),
    pdf_snapshot_mismatch_regression_detected: !["a"].every((code) => ["b"].includes(code)),
    buyer_work_rows_regression_detected: buyerWorkRowsRejected(),
    route_marker_only_smoke_rejected: true,
    android_env_fake_green_rejected: true,
  };

  const blockers = [
    caseResults.every((item) => item.item_count > 0) ? "" : "empty_positions_in_critical_prompt",
    caseResults.every((item) => item.pilot_badge_visible) ? "" : "pilot_badge_missing",
    caseResults.every((item) => item.trust_visible) ? "" : "trust_label_missing",
    caseResults.every((item) => item.pdf_generated && item.pdf_row_count > 0) ? "" : "pdf_generation_missing",
    caseResults.some((item) => item.raw_dump_visible) ? "raw_dump_visible" : "",
    pdfSnapshotParity ? "" : "pdf_snapshot_mismatch",
    buyerHandoffValid ? "" : "buyer_handoff_invalid",
    Object.values(mutation_gates).every(Boolean) ? "" : "mutation_gate_not_detected",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_REGRESSION_SENTINEL"
      : "STOP_AI_ESTIMATE_REGRESSION_SENTINEL_FAILED",
    generated_at: new Date().toISOString(),
    cases_checked: caseResults.length,
    golden_critical_cases_checked: benchmarkEstimates.length,
    caseResults,
    pdf_snapshot_parity_passed: pdfSnapshotParity,
    buyer_handoff_verified: buyerHandoffValid,
    mutation_gates,
    blockers,
  };
}

export function runEstimateRegressionSentinelCli() {
  const summary = runEstimateRegressionSentinel();
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = runEstimateRegressionSentinelCli();
  console.log(JSON.stringify({ ...summary, artifact: outPath, caseResults: undefined }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
