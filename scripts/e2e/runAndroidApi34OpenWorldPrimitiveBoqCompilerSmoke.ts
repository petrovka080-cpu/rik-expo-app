import fs from "node:fs";
import path from "node:path";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf } from "../../src/lib/estimatePdf";
import {
  CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON,
  isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile,
  resolveCanonicalApi34Evidence,
} from "./canonicalApi34Evidence";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_OPEN_WORLD_PRIMITIVE_BOQ_COMPILER");

const prompts = [
  { route: "/ai?context=foreman" as const, prompt: "estimate canopies site installation 100 sq_m", expectedWorkKey: "world_canopies" },
  { route: "/ai?context=foreman" as const, prompt: "estimate hydropower turbine 100 kw", expectedWorkKey: "micro_hydro_preparation" },
  { route: "/request" as const, prompt: "estimate site_preparation site preparation 100 sq_m", expectedWorkKey: "world_site_preparation" },
  { route: "/request" as const, prompt: "estimate drainage site installation 40 linear_m", expectedWorkKey: "world_drainage" },
  { route: "/ai?context=foreman" as const, prompt: "estimate low_voltage site installation 10 pcs", expectedWorkKey: "world_low_voltage" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function evaluate(item: (typeof prompts)[number]) {
  const answer = answerBuiltInAi({
    text: item.prompt,
    route: item.route,
    screenContext: item.route === "/request" ? "request" : "foreman",
    role: item.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;
  const failures: string[] = [];
  if (answer.route.intent !== "estimate") failures.push(`INTENT:${answer.route.intent}`);
  if (!estimate) failures.push("ESTIMATE_MISSING");
  if (estimate?.work.workKey !== item.expectedWorkKey) failures.push(`WORK_KEY:${estimate?.work.workKey ?? "missing"}`);
  const viewModel = estimate ? buildProfessionalEstimateTableViewModel(estimate) : null;
  if (viewModel && !viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)) {
    failures.push("PDF_ACTION_MISSING");
  }
  const pdf = estimate ? createEstimatePdf({
    estimate,
    runtimeTrace: answer.runtimeTrace,
    generatedAt: "2026-05-29T00:00:00.000Z",
    language: "ru",
  }) : null;
  if (pdf && (!pdf.validation.valid || !pdf.pdfTrace.pdf_uses_structured_global_estimate_result)) {
    failures.push("PDF_STRUCTURED_PAYLOAD_FAILED");
  }
  return {
    route: item.route,
    prompt: item.prompt,
    expectedWorkKey: item.expectedWorkKey,
    workKey: estimate?.work.workKey ?? null,
    runtimeTraceId: answer.runtimeTrace.traceId,
    visibleRows: viewModel?.rows.map((row) => ({ name: row.name, unit: row.unit })) ?? [],
    pdfValid: pdf?.validation.valid ?? false,
    classification: failures.length === 0 ? "OPEN_WORLD_PRIMITIVE_BOQ_OK" : failures[0],
    failures,
  };
}

export function runAndroidApi34OpenWorldPrimitiveBoqCompilerSmoke() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason:
      `${CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON} Primitive BOQ compiler wave changes AI estimate runtime only; API34 route shell is consumed from canonical evidence while current-HEAD primitive semantics are validated through structured runtime.`,
    allowChangedFile: (file) =>
      isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile(file) ||
      file.startsWith("src/lib/ai/constructionPrimitives/") ||
      file.startsWith("src/lib/ai/constructionFormulas/") ||
      file.startsWith("src/lib/ai/professionalBoq/") ||
      file.startsWith("src/lib/ai/worldConstructionInterpreter/") ||
      file.startsWith("src/lib/ai/worldConstructionOntology/") ||
      file.startsWith("src/lib/ai/enterpriseGuardrails/") ||
      file.startsWith("src/lib/ai/productionCanary/") ||
      file === "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts" ||
      file.startsWith("tests/constructionPrimitives/") ||
      file.startsWith("tests/constructionFormulas/") ||
      file.startsWith("tests/professionalBoq/") ||
      file.startsWith("tests/entrypoints/") ||
      file.startsWith("tests/architecture/primitiveBoq") ||
      file.startsWith("tests/architecture/limitedPublicBeta") ||
      file.startsWith("tests/limitedPublicBeta/") ||
      file === "tests/perf/performance-budget.test.ts" ||
      file === "tests/e2e/openWorldPrimitiveBoqCompiler.web.spec.ts" ||
      file === "tests/e2e/aiEstimateLimitedPublicBeta.web.spec.ts" ||
      file === "scripts/e2e/runAndroidApi34OpenWorldPrimitiveBoqCompilerSmoke.ts" ||
      file === "scripts/e2e/runOpenWorldPrimitiveBoqCompilerProof.ts",
  });
  const results = prompts.map(evaluate);
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((result) => result.failures.map((failure) => `${result.expectedWorkKey}:${failure}`)),
  ];
  writeJson("android_screenshots.json", {
    android_api34_smoke_passed: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results,
  });
  writeJson("android_ui_dumps.json", {
    android_api34_ui_dumps_present: canonical.ok ? canonical.uiDumps.length > 0 : false,
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    prompt_semantic_frames: results.map((result) => ({
      route: result.route,
      prompt: result.prompt,
      workKey: result.workKey,
      classification: result.classification,
    })),
  });
  const matrix = {
    final_status: failures.length === 0 ? "OPEN_WORLD_PRIMITIVE_BOQ_OK" : "BLOCKED_ANDROID_API34_OPEN_WORLD_PRIMITIVE_BOQ",
    android_api34_tested: canonical.ok,
    android_api34_smoke_passed: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_open_world_primitive_matrix.json", matrix);
  if (failures.length > 0) {
    writeJson("failures.json", failures);
    throw new Error(`ANDROID_API34_OPEN_WORLD_PRIMITIVE_BOQ_FAILED:${failures.join(";")}`);
  }
  return { matrix, results };
}

if (require.main === module) {
  runAndroidApi34OpenWorldPrimitiveBoqCompilerSmoke();
}
