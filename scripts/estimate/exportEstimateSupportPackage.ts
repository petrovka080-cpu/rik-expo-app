import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  buildCommercialProcurementPackage,
  buildConsumerRepairProductionTrust,
} from "../../src/features/estimates/governance/productionTrust";
import { buildEstimatePilotModeViewState } from "../../src/features/estimates/runtime/estimatePilotMode";
import { recordEstimateTelemetryEvent, redactTelemetryValue } from "../../src/features/estimates/telemetry/estimateTelemetryRecorder";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "support-package");

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buildEstimateSupportPackage(input: {
  prompt: string;
  generatedAt?: string;
}) {
  __resetConsumerRepairRequestStoreForTests();
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const aiDraft = buildConsumerRepairAiDraft(input.prompt);
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "estimate-support-package",
    problemText: input.prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "Support package redacted address",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const viewModel = buildRequestEstimateViewModel(bundle);
  const pdfViewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: bundle.draft,
    items: bundle.items,
    media: bundle.media,
    generatedAt,
  });
  const trust = buildConsumerRepairProductionTrust({
    estimateId: bundle.draft.id,
    revisionId: bundle.estimateRevisionState?.current_revision_id ?? "draft",
    sourcePrompt: input.prompt,
    items: bundle.items,
  });
  const procurement = buildCommercialProcurementPackage({
    estimate: trust,
    sourcePrompt: "[redacted]",
    region: "KG",
    currency: "KGS",
    pricebookVersion: null,
  });
  const telemetry = recordEstimateTelemetryEvent({
    event_name: "support_package_exported",
    route: "script",
    platform: "node",
    request_id: bundle.draft.id,
    estimate_id: bundle.draft.repairType,
    payload: {
      prompt: input.prompt,
      row_count: bundle.items.length,
    },
  });
  const pilotMode = buildEstimatePilotModeViewState({
    trustLevel: trust.trust_level,
    fullTotalStatus: trust.full_total_status,
  });

  return redactTelemetryValue({
    support_package_id: `support_${hashText(bundle.draft.id).slice(0, 12)}`,
    generated_at: generatedAt,
    prompt_hash: hashText(input.prompt),
    raw_prompt_included: false,
    prompt_redacted: redactTelemetryValue(input.prompt),
    request_id: bundle.draft.id,
    repair_type: bundle.draft.repairType,
    row_count: bundle.items.length,
    missing_price_count: bundle.items.filter((item) => item.unitPrice == null || item.totalPrice == null).length,
    pilot_mode: pilotMode,
    view_model: {
      title: viewModel?.title,
      totalLabel: viewModel?.totalLabel,
      trustLevelLabel: viewModel?.trustLevelLabel,
      pilotBadgeLabel: viewModel?.pilotBadgeLabel,
    },
    pdf: {
      generated: Boolean(pdfViewModel),
      section_count: pdfViewModel?.sections.length ?? 0,
      watermark_present: Boolean(pdfViewModel?.costIncreaseFactors.some((line) => line === pilotMode.pdfWatermarkRu)),
    },
    procurement_package: {
      material_count: procurement.materials.length,
      equipment_count: procurement.equipment_to_purchase.length,
      service_count: procurement.procurement_services.length,
      excluded_work_rows: procurement.excluded_work_rows.length,
    },
    telemetry_events: [telemetry],
    contains_private_contact_data: false,
  }) as Record<string, unknown>;
}

export function runEstimateSupportPackageCli() {
  const prompt = "road construction 1 km width 6 m asphalt, contact +996700000000, email user@example.com";
  const supportPackage = buildEstimateSupportPackage({ prompt });
  const serialized = JSON.stringify(supportPackage);
  const blockers = [
    serialized.includes("+996700000000") ? "phone_not_redacted" : "",
    serialized.includes("user@example.com") ? "email_not_redacted" : "",
    supportPackage.raw_prompt_included === false ? "" : "raw_prompt_included",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_SUPPORT_PACKAGE"
      : "STOP_AI_ESTIMATE_SUPPORT_PACKAGE_FAILED",
    supportPackage,
    support_package_redacted: blockers.length === 0,
    blockers,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = runEstimateSupportPackageCli();
  console.log(JSON.stringify({ final_status: summary.final_status, artifact: outPath, blockers: summary.blockers }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
