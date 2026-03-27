import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

process.env.RIK_QUEUE_WORKER_USE_SERVICE_ROLE = "true";
(globalThis as Record<string, unknown>).__DEV__ = false;

type JsonRecord = Record<string, unknown>;

type BattleCase = {
  id: string;
  items: {
    name: string;
    qty: number;
    unit: string;
    kind: "material" | "work" | "service";
    specs?: string | null;
  }[];
  expectedType: "resolved_items" | "candidate_options" | "clarify_required" | "hard_fail_safe";
  expectedResolvedCount?: number;
  expectedCandidateGroupCount?: number;
  expectedQuestionCount?: number;
  expectedPartialFailure?: boolean;
  expectedFirstCode?: string;
  expectedFirstUnit?: string;
  expectedFirstQty?: number;
};

type SessionCase = {
  id: string;
  prompt: string;
  lastResolvedItems: {
    rik_code: string;
    name: string;
    qty: number;
    unit: string;
    kind: "material" | "work" | "service";
    specs?: string | null;
  }[];
  networkOnline: boolean | null;
  expectedType: "resolved_items" | "candidate_options" | "clarify_required" | "hard_fail_safe" | "ai_unavailable";
  expectedResolvedCount?: number;
  expectedQuestionCount?: number;
  expectedReason?: string;
  expectedFirstCode?: string;
  expectedFirstQty?: number;
};

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const fullOutPath = path.join(artifactDir, "foreman-ai-battle-hardening-wave1.json");
const summaryOutPath = path.join(artifactDir, "foreman-ai-battle-hardening-wave1.summary.json");

const hardeningSummaryPath = path.join(artifactDir, "foreman-ai-hardening-wave1.summary.json");
const webSmokeSummaryPath = path.join(artifactDir, "foreman-ai-batchc-smoke.json");
const runtimeSummaryPath = path.join(artifactDir, "foreman-request-sync-runtime.summary.json");

const readJson = (targetPath: string): JsonRecord | null => {
  if (!fs.existsSync(targetPath)) return null;
  return JSON.parse(fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
};

const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const approxEqual = (left: number | null | undefined, right: number | null | undefined, epsilon = 0.0001) =>
  typeof left === "number" && typeof right === "number" && Math.abs(left - right) <= epsilon;

const battleCases: BattleCase[] = [
  {
    id: "rebar_12kg",
    items: [{ name: "\u0430\u0440\u043c\u0430\u0442\u0443\u0440\u0430 12", qty: 40, unit: "\u043a\u0433", kind: "material" }],
    expectedType: "resolved_items",
    expectedResolvedCount: 1,
    expectedFirstCode: "MAT-REBAR-A500-12",
    expectedFirstUnit: "\u043a\u0433",
    expectedFirstQty: 40,
  },
  {
    id: "plywood_sheet_conversion",
    items: [{ name: "\u0444\u0430\u043d\u0435\u0440\u0430 6", qty: 2, unit: "\u043b\u0438\u0441\u0442", kind: "material" }],
    expectedType: "resolved_items",
    expectedResolvedCount: 1,
    expectedFirstCode: "MAT-WOOD-Plywood-FK-6MM-1525x1525",
    expectedFirstUnit: "\u043c2",
    expectedFirstQty: 4.6512,
  },
  {
    id: "chainlink_roll_conversion",
    items: [{ name: "\u0441\u0435\u0442\u043a\u0430 \u0440\u0430\u0431\u0438\u0446\u0430 1.8", qty: 3, unit: "\u0440\u0443\u043b\u043e\u043d", kind: "material" }],
    expectedType: "resolved_items",
    expectedResolvedCount: 1,
    expectedFirstCode: "MAT-FENCE-CHAINLINK-180CM-10M",
    expectedFirstUnit: "\u043c2",
    expectedFirstQty: 54,
  },
  {
    id: "generic_screw_needs_choice",
    items: [{ name: "\u0441\u0430\u043c\u043e\u0440\u0435\u0437", qty: 1, unit: "\u0448\u0442", kind: "material" }],
    expectedType: "candidate_options",
    expectedCandidateGroupCount: 1,
    expectedResolvedCount: 0,
    expectedPartialFailure: false,
  },
  {
    id: "generic_nails_needs_choice",
    items: [{ name: "\u0433\u0432\u043e\u0437\u0434\u0438", qty: 1, unit: "\u0448\u0442", kind: "material" }],
    expectedType: "candidate_options",
    expectedCandidateGroupCount: 1,
    expectedResolvedCount: 0,
    expectedPartialFailure: false,
  },
  {
    id: "cement_bag_not_silent_add",
    items: [{ name: "\u0446\u0435\u043c\u0435\u043d\u0442", qty: 5, unit: "\u043c\u0435\u0448\u043e\u043a", kind: "material" }],
    expectedType: "candidate_options",
    expectedCandidateGroupCount: 1,
    expectedResolvedCount: 0,
    expectedPartialFailure: false,
  },
  {
    id: "generic_plywood_bad_unit_needs_clarify",
    items: [{ name: "\u0444\u0430\u043d\u0435\u0440\u0430", qty: 1, unit: "\u0448\u0442", kind: "material" }],
    expectedType: "clarify_required",
    expectedQuestionCount: 1,
    expectedResolvedCount: 0,
    expectedPartialFailure: false,
  },
  {
    id: "mixed_partial_success",
    items: [
      { name: "\u0444\u0430\u043d\u0435\u0440\u0430 6", qty: 2, unit: "\u043b\u0438\u0441\u0442", kind: "material" },
      { name: "\u0446\u0435\u043c\u0435\u043d\u0442", qty: 5, unit: "\u043c\u0435\u0448\u043e\u043a", kind: "material" },
    ],
    expectedType: "candidate_options",
    expectedCandidateGroupCount: 1,
    expectedResolvedCount: 1,
    expectedPartialFailure: true,
  },
];

const sessionCases: SessionCase[] = [
  {
    id: "session_repeat_same_qty",
    prompt: "\u0435\u0449\u0451 \u0441\u0442\u043e\u043b\u044c\u043a\u043e \u0436\u0435",
    lastResolvedItems: [
      {
        rik_code: "MAT-REBAR-A500-12",
        name: "\u0410\u0440\u043c\u0430\u0442\u0443\u0440\u0430 A500 12",
        qty: 40,
        unit: "\u043a\u0433",
        kind: "material",
      },
    ],
    networkOnline: true,
    expectedType: "resolved_items",
    expectedResolvedCount: 1,
    expectedFirstCode: "MAT-REBAR-A500-12",
    expectedFirstQty: 40,
  },
  {
    id: "session_repeat_override_qty",
    prompt: "\u0435\u0449\u0451 \u043f\u044f\u0442\u044c \u0442\u0430\u043a\u0438\u0445 \u0436\u0435",
    lastResolvedItems: [
      {
        rik_code: "MAT-REBAR-A500-12",
        name: "\u0410\u0440\u043c\u0430\u0442\u0443\u0440\u0430 A500 12",
        qty: 40,
        unit: "\u043a\u0433",
        kind: "material",
      },
    ],
    networkOnline: true,
    expectedType: "resolved_items",
    expectedResolvedCount: 1,
    expectedFirstCode: "MAT-REBAR-A500-12",
    expectedFirstQty: 5,
  },
  {
    id: "session_repeat_multi_item_clarify",
    prompt: "\u0435\u0449\u0451 \u0441\u0442\u043e\u043b\u044c\u043a\u043e \u0436\u0435",
    lastResolvedItems: [
      {
        rik_code: "MAT-WOOD-Plywood-FK-6MM-1525x1525",
        name: "\u0424\u0430\u043d\u0435\u0440\u0430 6",
        qty: 4.6512,
        unit: "\u043c2",
        kind: "material",
      },
      {
        rik_code: "MAT-FENCE-CHAINLINK-180CM-10M",
        name: "\u0421\u0435\u0442\u043a\u0430 \u0440\u0430\u0431\u0438\u0446\u0430 1.8",
        qty: 18,
        unit: "\u043c2",
        kind: "material",
      },
    ],
    networkOnline: true,
    expectedType: "clarify_required",
    expectedQuestionCount: 1,
  },
  {
    id: "offline_degraded_without_context",
    prompt: "\u0446\u0435\u043c\u0435\u043d\u0442 5 \u043c\u0435\u0448\u043a\u043e\u0432",
    lastResolvedItems: [],
    networkOnline: false,
    expectedType: "ai_unavailable",
    expectedReason: "offline_degraded_mode",
  },
  {
    id: "offline_repeat_last_safe",
    prompt: "\u0435\u0449\u0451 \u0441\u0442\u043e\u043b\u044c\u043a\u043e \u0436\u0435",
    lastResolvedItems: [
      {
        rik_code: "MAT-REBAR-A500-12",
        name: "\u0410\u0440\u043c\u0430\u0442\u0443\u0440\u0430 A500 12",
        qty: 40,
        unit: "\u043a\u0433",
        kind: "material",
      },
    ],
    networkOnline: false,
    expectedType: "resolved_items",
    expectedResolvedCount: 1,
    expectedFirstCode: "MAT-REBAR-A500-12",
    expectedFirstQty: 40,
  },
];

async function main() {
  const { resolveForemanParsedItemsForTesting, resolveForemanQuickLocalAssist } =
    await import("../src/screens/foreman/foreman.ai");

  const hardeningSummary = readJson(hardeningSummaryPath);
  const webSmokeSummary = readJson(webSmokeSummaryPath);
  const runtimeSummary = readJson(runtimeSummaryPath);
  const packageJson = readJson(path.join(projectRoot, "package.json"));
  const appJson = readJson(path.join(projectRoot, "app.json"));
  const voiceHookSource = readText("src/screens/foreman/hooks/useForemanVoiceInput.ts");
  const modalSource = readText("src/screens/foreman/ForemanAiQuickModal.tsx");
  const aiSource = readText("src/screens/foreman/foreman.ai.ts");

  const caseResults = [];

  for (const battleCase of battleCases) {
    const outcome = await resolveForemanParsedItemsForTesting({
      items: battleCase.items,
      message: battleCase.id,
    });

    const resolvedItems = "items" in outcome
      ? outcome.items
      : Array.isArray((outcome as JsonRecord).resolvedItems)
        ? ((outcome as JsonRecord).resolvedItems as unknown[])
        : [];
    const candidateGroups = Array.isArray((outcome as JsonRecord).options)
      ? ((outcome as JsonRecord).options as unknown[])
      : [];
    const questions = Array.isArray((outcome as JsonRecord).questions)
      ? ((outcome as JsonRecord).questions as unknown[])
      : [];
    const firstResolved = (resolvedItems[0] as JsonRecord | undefined) ?? null;
    const partialFailure = (outcome as JsonRecord).partialFailure === true;

    const checks = {
      typeOk: outcome.type === battleCase.expectedType,
      resolvedCountOk:
        battleCase.expectedResolvedCount == null || resolvedItems.length === battleCase.expectedResolvedCount,
      candidateCountOk:
        battleCase.expectedCandidateGroupCount == null || candidateGroups.length === battleCase.expectedCandidateGroupCount,
      questionCountOk:
        battleCase.expectedQuestionCount == null || questions.length === battleCase.expectedQuestionCount,
      partialFailureOk:
        battleCase.expectedPartialFailure == null || partialFailure === battleCase.expectedPartialFailure,
      firstCodeOk:
        battleCase.expectedFirstCode == null || String(firstResolved?.rik_code || "") === battleCase.expectedFirstCode,
      firstUnitOk:
        battleCase.expectedFirstUnit == null || String(firstResolved?.unit || "") === battleCase.expectedFirstUnit,
      firstQtyOk:
        battleCase.expectedFirstQty == null || approxEqual(Number(firstResolved?.qty), battleCase.expectedFirstQty),
    };

    caseResults.push({
      id: battleCase.id,
      scope: "dataset",
      passed: Object.values(checks).every(Boolean),
      checks,
      outcome,
    });
  }

  for (const sessionCase of sessionCases) {
    const outcome = resolveForemanQuickLocalAssist({
      prompt: sessionCase.prompt,
      lastResolvedItems: sessionCase.lastResolvedItems,
      networkOnline: sessionCase.networkOnline,
    });
    const resolvedItems = outcome && "items" in outcome
      ? outcome.items
      : Array.isArray((outcome as JsonRecord | null)?.resolvedItems)
        ? (((outcome as JsonRecord).resolvedItems as unknown[]) ?? [])
        : [];
    const questions = Array.isArray((outcome as JsonRecord | null)?.questions)
      ? (((outcome as JsonRecord).questions as unknown[]) ?? [])
      : [];
    const firstResolved = (resolvedItems[0] as JsonRecord | undefined) ?? null;
    const checks = {
      outcomePresent: outcome != null,
      typeOk: outcome?.type === sessionCase.expectedType,
      resolvedCountOk:
        sessionCase.expectedResolvedCount == null || resolvedItems.length === sessionCase.expectedResolvedCount,
      questionCountOk:
        sessionCase.expectedQuestionCount == null || questions.length === sessionCase.expectedQuestionCount,
      reasonOk:
        sessionCase.expectedReason == null || String((outcome as JsonRecord | null)?.reason || "") === sessionCase.expectedReason,
      firstCodeOk:
        sessionCase.expectedFirstCode == null || String(firstResolved?.rik_code || "") === sessionCase.expectedFirstCode,
      firstQtyOk:
        sessionCase.expectedFirstQty == null || approxEqual(Number(firstResolved?.qty), sessionCase.expectedFirstQty),
    };
    caseResults.push({
      id: sessionCase.id,
      scope: "session",
      passed: Object.values(checks).every(Boolean),
      checks,
      outcome,
    });
  }

  const datasetPassed = caseResults.every((result) => result.passed);
  const mixedCase = caseResults.find((result) => result.id === "mixed_partial_success");
  const genericScrewCase = caseResults.find((result) => result.id === "generic_screw_needs_choice");
  const cementBagCase = caseResults.find((result) => result.id === "cement_bag_not_silent_add");
  const sessionRepeatCase = caseResults.find((result) => result.id === "session_repeat_same_qty");
  const sessionQtyOverrideCase = caseResults.find((result) => result.id === "session_repeat_override_qty");
  const offlineDegradedCase = caseResults.find((result) => result.id === "offline_degraded_without_context");
  const offlineRepeatCase = caseResults.find((result) => result.id === "offline_repeat_last_safe");

  const voiceOptionalSafe =
    fs.existsSync(path.join(projectRoot, "src/screens/foreman/hooks/useForemanVoiceInput.ts"))
    && modalSource.includes("useForemanVoiceInput")
    && modalSource.includes("Отправка остаётся ручной")
    && !voiceHookSource.includes("onSubmit")
    && voiceHookSource.includes('require("expo-speech-recognition")')
    && String(
      (((packageJson as JsonRecord | null)?.dependencies as JsonRecord | undefined)?.["expo-speech-recognition"] as string | undefined)
      || "",
    ).trim().length > 0
    && JSON.stringify(((appJson as JsonRecord | null)?.expo as JsonRecord | undefined)?.plugins ?? []).includes("expo-speech-recognition");

  const offlineDegradedModeReady =
    aiSource.includes('type: "ai_unavailable"')
    && aiSource.includes("not_configured");
  const sessionMemorySafe =
    sessionRepeatCase?.passed === true
    && sessionQtyOverrideCase?.passed === true;
  const offlineDegradedCasesPassed =
    offlineDegradedCase?.passed === true
    && offlineRepeatCase?.passed === true;

  const summary = {
    status:
      datasetPassed
      && hardeningSummary?.gate === "GREEN"
      && webSmokeSummary?.open === true
      && webSmokeSummary?.submit === true
      && webSmokeSummary?.close === true
      && Array.isArray((webSmokeSummary?.runtime as JsonRecord | undefined)?.foremanPageErrors)
      && (((webSmokeSummary?.runtime as JsonRecord | undefined)?.foremanPageErrors as unknown[])?.length ?? 0) === 0
      && runtimeSummary?.androidPassed === true
      && sessionMemorySafe
      && offlineDegradedCasesPassed
        ? "passed"
        : "failed",
    gate:
      datasetPassed
      && hardeningSummary?.gate === "GREEN"
      && webSmokeSummary?.open === true
      && webSmokeSummary?.submit === true
      && webSmokeSummary?.close === true
      && runtimeSummary?.androidPassed === true
      && voiceOptionalSafe
      && offlineDegradedModeReady
      && sessionMemorySafe
      && offlineDegradedCasesPassed
        ? "GREEN"
        : "AMBER",
    synonymBackendOwned:
      hardeningSummary?.synonymBackendContractPresent === true
      && hardeningSummary?.backendContractsDeployed === true,
    packagingBackendOwned:
      hardeningSummary?.packagingBackendContractPresent === true
      && hardeningSummary?.backendContractsDeployed === true,
    autoResolveSafe:
      genericScrewCase?.passed === true
      && cementBagCase?.passed === true,
    partialFailureSupported: mixedCase?.passed === true,
    sessionMemorySafe,
    voiceOptionalSafe,
    offlineDegradedModeReady: offlineDegradedModeReady && offlineDegradedCasesPassed,
    textFlowRegressionFree:
      webSmokeSummary?.open === true
      && webSmokeSummary?.submit === true
      && webSmokeSummary?.close === true
      && runtimeSummary?.webPassed === true,
    webPassed:
      webSmokeSummary?.open === true
      && webSmokeSummary?.submit === true
      && webSmokeSummary?.close === true,
    androidPassed: runtimeSummary?.androidPassed === true,
    iosPassed: runtimeSummary?.iosPassed === true,
    iosResidual: runtimeSummary?.iosResidual ?? null,
    datasetCaseCount: caseResults.length,
    datasetPassed,
  };

  const full = {
    generatedAt: new Date().toISOString(),
    summary,
    dataset: caseResults,
    structural: {
      hardeningSummary,
      webSmokeSummary,
      runtimeSummary,
      voiceHookPresent: fs.existsSync(path.join(projectRoot, "src/screens/foreman/hooks/useForemanVoiceInput.ts")),
      modalUsesVoiceHook: modalSource.includes("useForemanVoiceInput"),
      noVoiceAutoSubmitEvidence: !voiceHookSource.includes("onSubmit"),
      genericFallbackBlockPresent:
        aiSource.includes('phase: "catalog_fallback_generic_blocked"')
        && aiSource.includes('phase: "synonym_generic_blocked"'),
    },
    artifacts: {
      hardeningSummary: path.relative(projectRoot, hardeningSummaryPath),
      webSmokeSummary: path.relative(projectRoot, webSmokeSummaryPath),
      runtimeSummary: path.relative(projectRoot, runtimeSummaryPath),
    },
  };

  writeJson(fullOutPath, full);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "passed" || summary.gate !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
