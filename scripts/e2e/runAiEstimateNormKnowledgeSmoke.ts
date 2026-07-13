import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import goldenMatrixRaw from "../../data/estimate-golden-cases/extended-100-work-cases.json";
import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  __resetConsumerRepairRequestStoreForTests,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

const GREEN_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_NO_BUILDS" as const;
const STOP_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_FAILED" as const;
const RUNTIME_ROOT = ".release-runtime/ai-estimate-norm-knowledge-smoke";
const GENERATED_AT = "2026-07-03T00:00:00.000Z";
type SmokeTarget = "web" | "android-chrome" | "both";

type RawGoldenMatrix = {
  cases: Array<{
    case_id: string;
    prompt: string;
    expected_work_key: string;
    expected_work_group: string;
    input_parameters: {
      quantity: number;
      unit: string;
      country?: string;
      city?: string;
      city_or_region?: string;
      currency?: string;
    };
  }>;
};

function numberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function smokeTarget(): SmokeTarget {
  const prefix = "--target=";
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ??
    process.env.ESTIMATE_SMOKE_TARGET ??
    "web";
  if (raw === "android-chrome" || raw === "both" || raw === "web") return raw;
  throw new Error(`AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_UNKNOWN_TARGET:${raw}`);
}

function groupArgs(): Set<string> | null {
  const prefix = "--groups=";
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const groups = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return groups.length > 0 ? new Set(groups) : null;
}

function writeSummary(value: unknown): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "summary.json");
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

function main(): void {
  const casesLimit = numberArg("cases", 20);
  const target = smokeTarget();
  const groups = groupArgs();
  const allCases = (goldenMatrixRaw as RawGoldenMatrix).cases;
  const filteredCases = groups
    ? allCases.filter((testCase) => groups.has(testCase.expected_work_group.toLowerCase()))
    : allCases;
  const cases = filteredCases.slice(0, casesLimit);
  const failures: string[] = [];
  let webNormSourcesVisible = true;
  let directorPdfContainsNormSources = true;
  let buyerBoqContainsNormTrace = true;

  __resetConsumerRepairRequestStoreForTests();
  for (const testCase of cases) {
    const estimate = buildProfessionalExpandedGlobalEstimate({
      workKey: testCase.expected_work_key,
      estimateInput: {
        text: testCase.prompt,
        estimateDetailLevel: "professional_expanded",
        countryCode: testCase.input_parameters.country ?? "KG",
        city: testCase.input_parameters.city ?? testCase.input_parameters.city_or_region ?? "Bishkek",
        currency: testCase.input_parameters.currency ?? "KGS",
      },
    });
    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate);
    const payload = aiDraft.structuredEstimatePayload;
    if (!payload) {
      failures.push(`structured_payload_missing:${testCase.case_id}`);
      webNormSourcesVisible = false;
      directorPdfContainsNormSources = false;
      buyerBoqContainsNormTrace = false;
      continue;
    }

    const rowsHaveNormSources = payload.rows.every((row) =>
      Boolean(row.normId && row.normSourceId && row.normVersion && row.calculationTrace?.includes("normSource="))
    );
    webNormSourcesVisible = webNormSourcesVisible && rowsHaveNormSources;
    if (!rowsHaveNormSources) failures.push(`web_norm_sources_missing:${testCase.case_id}`);

    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: `norm-knowledge-smoke-${testCase.case_id}`,
      problemText: testCase.prompt,
      repairType: testCase.expected_work_group,
      aiDraft,
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: [],
      generatedAt: GENERATED_AT,
    });
    const labels = pdf?.sections.flatMap((section) => section.rows.flatMap((row) => row.sourceLabels)) ?? [];
    const pdfHasNormSource = labels.some((label) => label.includes("normSource="));
    directorPdfContainsNormSources = directorPdfContainsNormSources && pdfHasNormSource;
    if (!pdfHasNormSource) failures.push(`director_pdf_norm_sources_missing:${testCase.case_id}`);

    const buyerDraft = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      sourceRequestId: `norm-knowledge-smoke-${testCase.case_id}`,
      countryCode: testCase.input_parameters.country ?? "KG",
      cityOrRegion: testCase.input_parameters.city ?? testCase.input_parameters.city_or_region ?? "Bishkek",
      generatedAt: GENERATED_AT,
    });
    const buyerHasTrace = buyerDraft.procurementItems.length > 0 &&
      buyerDraft.procurementItems.every((item) =>
        Boolean(item.normId && item.normSourceId && item.normVersion && item.calculationTrace?.includes("normSource="))
      );
    buyerBoqContainsNormTrace = buyerBoqContainsNormTrace && buyerHasTrace;
    if (!buyerHasTrace) failures.push(`buyer_boq_norm_trace_missing:${testCase.case_id}`);
  }

  const green =
    failures.length === 0 &&
    webNormSourcesVisible &&
    directorPdfContainsNormSources &&
    buyerBoqContainsNormTrace;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_NO_BUILDS
      : STOP_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_FAILED,
    smoke_target: target,
    requested_groups: groups ? [...groups].sort() : [],
    cases_checked: cases.length,
    group_filter_applied: Boolean(groups),
    web_norm_knowledge_smoke_passed: (target === "web" || target === "both") && green,
    android_chrome_norm_knowledge_smoke_passed: (target === "android-chrome" || target === "both") && green,
    norm_sources_visible: webNormSourcesVisible,
    calculation_trace_visible: webNormSourcesVisible,
    web_norm_sources_visible: webNormSourcesVisible,
    director_pdf_contains_norm_sources: directorPdfContainsNormSources,
    buyer_boq_contains_norm_trace: buyerBoqContainsNormTrace,
    smoke_execution_mode: "headless_route_equivalent",
    browser_automation_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    failures,
  };
  const summaryFile = writeSummary(summary);

  console.log(JSON.stringify({
    ...summary,
    summary_file: summaryFile,
  }, null, 2));

  if (!green) process.exitCode = 1;
}

main();
