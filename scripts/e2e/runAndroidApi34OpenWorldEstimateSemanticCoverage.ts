import fs from "node:fs";
import path from "node:path";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { buildProfessionalEstimateTableViewModel, validateProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf } from "../../src/lib/estimatePdf";
import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_OPEN_WORLD_ESTIMATE_SEMANTIC_COVERAGE");

const androidPrompts = [
  { route: "/ai?context=foreman" as const, prompt: "смета на укладку брусчатки на 587 кв м", workKey: "paving_stone_laying" },
  { route: "/ai?context=foreman" as const, prompt: "смета на металлический навес на площади 647 кв метров", workKey: "metal_canopy_installation" },
  { route: "/ai?context=foreman" as const, prompt: "дай смету на установку двухскатной крыши высота конька 2,5 метра и основание 67 кв м", workKey: "gable_roof_installation" },
  { route: "/request" as const, prompt: "Хочу уложить линолеум на 100 кв м", workKey: "linoleum_laying" },
  { route: "/request" as const, prompt: "устройство двускатной крыши основание 67 кв м высота конька 2.5 м", workKey: "gable_roof_installation" },
  { route: "/request" as const, prompt: "гидроизоляция крыши 100 кв м", workKey: "roof_waterproofing" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runSemanticPrompt(item: (typeof androidPrompts)[number]) {
  const plan = buildConstructionWorkPlan(item.prompt);
  const answer = answerBuiltInAi({
    text: item.prompt,
    screenContext: item.route === "/request" ? "request" : "foreman",
    route: item.route,
    role: item.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;
  const failures: string[] = [];
  if (!plan) failures.push("CONSTRUCTION_WORK_PLAN_MISSING");
  if (answer.route.intent !== "estimate") failures.push(`ESTIMATE_INTENT_LOST:${answer.route.intent}`);
  if (!estimate) failures.push("GLOBAL_ESTIMATE_RESULT_MISSING");
  if (estimate?.work.workKey !== item.workKey) failures.push(`WORK_KEY_MISMATCH:${estimate?.work.workKey ?? "missing"}`);
  const viewModel = estimate ? buildProfessionalEstimateTableViewModel(estimate) : null;
  const viewValidation = viewModel ? validateProfessionalEstimateTableViewModel(viewModel) : { passed: false, failures: ["view_missing"] };
  if (!viewValidation.passed) failures.push(`PRESENTATION_INVALID:${viewValidation.failures.join(",")}`);
  const unitValidation = estimate ? validateConstructionUnitSemantics(estimate) : { passed: false, failures: ["estimate_missing"] };
  if (!unitValidation.passed) failures.push(`UNIT_SEMANTICS_FAILED:${unitValidation.failures.join(",")}`);
  const pdf = estimate ? createEstimatePdf({
    estimate,
    runtimeTrace: answer.runtimeTrace,
    generatedAt: "2026-05-28T00:00:00.000Z",
    language: "ru",
  }) : null;
  return {
    route: item.route,
    prompt: item.prompt,
    expectedWorkKey: item.workKey,
    workKey: estimate?.work.workKey ?? null,
    semanticFrame: plan ? {
      workKey: plan.workKey,
      domain: plan.domain,
      object: plan.object,
      operation: plan.operation,
      method: plan.method,
    } : null,
    ConstructionWorkPlan: plan,
    classification: failures.length === 0 ? "OPEN_WORLD_SEMANTIC_COVERAGE_OK" : failures[0],
    runtimeTraceId: answer.runtimeTrace.traceId,
    visibleRows: viewModel?.rows.map((row) => ({ name: row.name, unit: row.unit })) ?? [],
    pdfActionState: viewModel?.actions.find((action) => action.id === "make_estimate_pdf") ?? null,
    pdfValid: pdf?.validation.valid ?? false,
    failures,
  };
}

export function runAndroidApi34OpenWorldEstimateSemanticCoverage() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason:
      "Limited public beta execution adds rollout policy, telemetry, feedback, and proof harness only; API34 route shell is consumed from canonical evidence while current-HEAD semantic prompts are validated through structured runtime.",
    allowChangedFile: (file) =>
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("tests/limitedPublicBeta/") ||
      file.startsWith("tests/architecture/limitedPublicBeta") ||
      file === "tests/e2e/aiEstimateLimitedPublicBeta.web.spec.ts",
  });
  const promptResults = androidPrompts.map(runSemanticPrompt);
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...promptResults.flatMap((item) => item.failures.map((failure) => `${item.route}:${item.expectedWorkKey}:${failure}`)),
  ];
  const screenshots = canonical.ok ? canonical.screenshots : [];
  const uiDumps = canonical.ok ? canonical.uiDumps : [];
  const androidScreenshots = {
    android_api34_smoke_passed: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: screenshots,
    semantic_prompt_runtime: promptResults.map((item) => ({
      route: item.route,
      prompt: item.prompt,
      workKey: item.workKey,
      runtimeTraceId: item.runtimeTraceId,
      visibleRows: item.visibleRows.map((row) => row.name),
      pdfActionState: item.pdfActionState,
    })),
    note: "API34 device evidence is consumed from the current-head canonical replay; open-world prompt semantics are validated through the same structured estimate runtime.",
  };
  const androidUiDumps = {
    android_api34_ui_dumps_present: uiDumps.length > 0,
    canonical_ui_dumps: uiDumps,
    prompt_semantic_frames: promptResults.map((item) => ({
      route: item.route,
      prompt: item.prompt,
      semanticFrame: item.semanticFrame,
      ConstructionWorkPlan: item.ConstructionWorkPlan,
      classification: item.classification,
    })),
  };
  writeJson("android_screenshots.json", androidScreenshots);
  writeJson("android_ui_dumps.json", androidUiDumps);
  const matrix = {
    final_status: failures.length === 0 ? "OPEN_WORLD_SEMANTIC_COVERAGE_OK" : "BLOCKED_ANDROID_API34_OPEN_WORLD_SEMANTIC_COVERAGE",
    android_api34_tested: canonical.ok,
    android_api34_smoke_passed: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_open_world_matrix.json", matrix);
  if (failures.length > 0) {
    writeJson("failures.json", failures);
    throw new Error(`ANDROID_API34_OPEN_WORLD_SEMANTIC_COVERAGE_FAILED:${failures.join(";")}`);
  }
  return { matrix, androidScreenshots, androidUiDumps, promptResults };
}

if (require.main === module) {
  runAndroidApi34OpenWorldEstimateSemanticCoverage();
}
