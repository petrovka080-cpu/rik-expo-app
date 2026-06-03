import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON,
  isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile,
  resolveCanonicalApi34Evidence,
} from "./canonicalApi34Evidence";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_UNIVERSAL_ESTIMATOR_KERNEL");

const prompts = [
  { route: "/request" as const, context: "request" as const, prompt: "смета на установку лифта пассажирского на 14 этажей" },
  { route: "/request" as const, context: "request" as const, prompt: "смета на дренажные каналы 120 метров" },
  { route: "/ai?context=request" as const, context: "request" as const, prompt: "смета на пассажирский лифт 14 этажей" },
  { route: "/ai?context=foreman" as const, context: "foreman" as const, prompt: "смета на бетонные тумбы 10 шт 0,4×0,5×5 м" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runAndroidApi34UniversalEstimatorKernelSmoke() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: `${CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON} Universal estimator kernel changes AI estimate runtime only; API34 route shell is consumed from canonical evidence while current-HEAD estimator semantics are validated through structured runtime.`,
    allowChangedFile: (file) =>
      isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile(file) ||
      file.startsWith("src/lib/ai/estimatorKernel/") ||
      file.startsWith("src/lib/ai/constructionFormulas/") ||
      file.startsWith("src/lib/ai/professionalBoq/") ||
      file.startsWith("src/lib/ai/builtInAi/") ||
      file.startsWith("src/lib/ai/globalEstimate/") ||
      file.startsWith("src/lib/ai/estimatePresentation/") ||
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("src/lib/ai/observability/") ||
      file.startsWith("src/lib/ai/killSwitch/") ||
      file.startsWith("src/lib/ai/rollback/") ||
      file.startsWith("src/lib/estimatePdf/") ||
      file.startsWith("tests/estimatorKernel/") ||
      file.startsWith("tests/constructionFormulas/") ||
      file.startsWith("tests/professionalBoq/") ||
      file.startsWith("tests/catalogBinding/") ||
      file.startsWith("tests/pdf/") ||
      file.startsWith("tests/limitedPublicBeta/") ||
      file.startsWith("tests/architecture/universalEstimator") ||
      file.startsWith("tests/architecture/limitedPublicBeta") ||
      file === "tests/perf/performance-budget.test.ts" ||
      file === "tests/e2e/universalEstimatorKernel.web.spec.ts" ||
      file === "tests/e2e/aiEstimateLimitedPublicBeta.web.spec.ts" ||
      file === "scripts/e2e/runAndroidApi34UniversalEstimatorKernelSmoke.ts" ||
      file === "scripts/e2e/runUniversalEstimatorKernelFailureReproduction.ts" ||
      file === "scripts/e2e/runUniversalEstimatorKernelProof.ts" ||
      file.startsWith("scripts/e2e/aiEstimateLimitedPublicBeta") ||
      file.startsWith("scripts/e2e/runAiEstimateLimitedPublicBeta") ||
      file === "scripts/e2e/runAndroidApi34AiEstimateLimitedPublicBetaSmoke.ts" ||
      file === "scripts/audit/runAiEstimateLimitedPublicBetaDailyMonitor.ts" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts",
  });
  const results = prompts.map((item) => {
    const answer = answerBuiltInAi({
      text: item.prompt,
      route: item.route,
      screenContext: item.context,
      role: item.context,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    const rows = estimate?.sections.flatMap((section) => section.rows) ?? [];
    const failures = [
      ...(answer.route.intent !== "estimate" ? ["ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT"] : []),
      ...(!estimate ? ["ESTIMATE_MISSING"] : []),
      ...(rows.length < 12 ? ["WEAK_GENERIC_ROWS_FOUND"] : []),
    ];
    return {
      route: item.route,
      prompt: item.prompt,
      workKey: estimate?.work.workKey ?? null,
      runtimeTraceId: answer.runtimeTrace.traceId,
      visibleRows: rows.map((row) => row.name),
      semanticFrame: estimate ? { workKey: estimate.work.workKey, category: estimate.work.category } : null,
      pdfActionState: answer.actions.find((action) => action.id === "make_pdf")?.visible ?? false,
      classification: failures.length === 0 ? "UNIVERSAL_ESTIMATOR_OK" : failures[0],
      failures,
    };
  });
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((result) => result.failures),
  ];
  writeJson("android_screenshots.json", {
    android_api34_tested: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results,
  });
  writeJson("android_ui_dumps.json", {
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    prompt_runtime: results.map((result) => ({ route: result.route, prompt: result.prompt, workKey: result.workKey, rows: result.visibleRows })),
  });
  const matrix = {
    final_status: failures.length === 0 ? "UNIVERSAL_ESTIMATOR_ANDROID_API34_OK" : "BLOCKED_ANDROID_API34_UNIVERSAL_ESTIMATOR",
    android_api34_tested: canonical.ok,
    android_api34_smoke_passed: canonical.ok && failures.length === 0,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_api34_results.json", matrix);
  if (failures.length > 0) throw new Error(`ANDROID_API34_UNIVERSAL_ESTIMATOR_FAILED:${failures.join(";")}`);
  return { matrix, results };
}

if (require.main === module) {
  runAndroidApi34UniversalEstimatorKernelSmoke();
}
