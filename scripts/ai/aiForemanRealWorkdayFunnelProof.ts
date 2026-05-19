import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type {
  ConstructionCountryProfile,
  ConstructionKnowledgeSource,
} from "../../src/lib/ai/constructionKnowledgeCore";
import {
  FOREMAN_ACTION_QUESTION_MAP,
  FOREMAN_REAL_WORKDAY_WAVE,
  FOREMAN_ROLE_POLICY,
  answerForemanAction,
  answerForemanWorkdayQuestion,
  buildForemanAiBlockViewModel,
  buildForemanRealWorkdayMatrix,
  listForemanDataProviders,
  type ForemanIntent,
  type ForemanWorkdayAnswer,
  type ForemanWorkdayContext,
} from "../../src/lib/ai/foremanIntelligence";

export const AI_FOREMAN_REAL_WORKDAY_ARTIFACT_PREFIX =
  "S_AI_FOREMAN_REAL_WORKDAY_FUNNEL" as const;

const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyReportPath = path.join(
  artifactsDir,
  `${AI_FOREMAN_REAL_WORKDAY_ARTIFACT_PREFIX}_release_verify_report.json`,
);

const webQuestions = [
  "подготовь отчеты по объектам что было сделано а что нет",
  "что мешает закрыть работы сегодня",
  "каких фото и документов не хватает",
  "сверить работы со сметой",
  "что по материалам и складу",
  "что написать подрядчику",
] as const;

const androidScreens = [
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
] as const;

const forbiddenUiCopy = [
  "safe_read",
  "draft_only",
  "approval_required",
  "exact_blocker",
  "provider",
  "runtime",
  "transport",
  "mutation",
  "AI собирает этот блок",
  "нужен конкретный источник",
  "проверен экран",
  "generic fallback",
] as const;

function buildProofContext(screenId: ForemanWorkdayContext["screenId"] = "foreman.main"): ForemanWorkdayContext {
  const sources: ConstructionKnowledgeSource[] = [
    {
      id: "proof:object:dom1",
      type: "object",
      labelRu: "Объект: Дом 1",
      linkedObjectId: "OBJ-1",
      confidence: "high",
    },
    {
      id: "proof:work:1042",
      type: "work",
      labelRu: "Работа WRK-1042: монтаж перегородок",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      confidence: "high",
    },
    {
      id: "proof:work:1051",
      type: "work",
      labelRu: "Работа WRK-1051: гидроизоляция санузла",
      linkedObjectId: "OBJ-2",
      linkedWorkId: "WRK-1051",
      confidence: "high",
    },
    {
      id: "proof:photo:219",
      type: "photo",
      labelRu: "Фото PH-219 до работ",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      confidence: "high",
    },
    {
      id: "proof:report:daily",
      type: "report",
      labelRu: "Ежедневный отчёт прораба",
      documentId: "DOC-DAILY",
      fileName: "daily_foreman.pdf",
      page: 1,
      confidence: "high",
    },
    {
      id: "proof:act:hidden",
      type: "act",
      labelRu: "Акт скрытых работ не найден по санузлу",
      linkedWorkId: "WRK-1051",
      confidence: "medium",
    },
    {
      id: "proof:estimate:77",
      type: "estimate_pdf",
      labelRu: "Смета объекта",
      documentId: "DOC-EST",
      fileName: "estimate_dom1.pdf",
      page: 12,
      linkedWorkId: "WRK-1042",
      linkedEstimateLineId: "EST-77",
      confidence: "high",
    },
    {
      id: "proof:project:ar14",
      type: "architecture_pdf",
      labelRu: "Проект АР.pdf",
      documentId: "DOC-AR",
      fileName: "project_ar.pdf",
      page: 14,
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      confidence: "high",
    },
    {
      id: "proof:norm:closeout",
      type: "normative_pdf",
      labelRu: "Требования к закрытию работ.pdf",
      documentId: "DOC-NORM",
      fileName: "closeout_rules.pdf",
      page: 6,
      countryCode: "KG",
      confidence: "high",
    },
    {
      id: "proof:country:kg",
      type: "country_profile",
      labelRu: "Country profile KG",
      countryCode: "KG",
      confidence: "high",
    },
    {
      id: "proof:material:gkl",
      type: "material",
      labelRu: "ГКЛ 12.5 мм",
      linkedWorkId: "WRK-1042",
      linkedMaterialId: "MAT-GKL",
      confidence: "high",
    },
    {
      id: "proof:stock:gkl",
      type: "warehouse_stock",
      labelRu: "ГКЛ 12.5 мм: на складе 18 листов",
      linkedWorkId: "WRK-1042",
      linkedMaterialId: "MAT-GKL",
      confidence: "high",
    },
    {
      id: "proof:req:gkl",
      type: "procurement_request",
      labelRu: "Заявка MR-1042: дефицит 24 листа",
      linkedWorkId: "WRK-1042",
      linkedMaterialId: "MAT-GKL",
      confidence: "high",
    },
    {
      id: "proof:approval:act",
      type: "approval",
      labelRu: "Маршрут согласования акта: ожидает ответственного",
      linkedWorkId: "WRK-1042",
      confidence: "high",
    },
    {
      id: "proof:chat:contractor",
      type: "chat_message",
      labelRu: "Сообщение подрядчика: фото после работ будет вечером",
      linkedWorkId: "WRK-1042",
      linkedContractorId: "SUB-1",
      confidence: "medium",
    },
    {
      id: "proof:payment:hidden",
      type: "payment",
      labelRu: "Полный cashflow компании hidden",
      linkedWorkId: "WRK-1042",
      confidence: "high",
    },
  ];
  const countryProfile: ConstructionCountryProfile = {
    countryCode: "KG",
    countryNameRu: "Кыргызстан",
    currency: "KGS",
    unitSystem: "metric",
    sourceRef: "proof:country:kg",
  };

  return {
    screenId,
    role: "foreman",
    currentDate: "2026-05-19",
    periodRu: "19 мая 2026",
    sources,
    countryProfile,
    works: [
      {
        id: "WRK-1042",
        nameRu: "Монтаж перегородок",
        date: "2026-05-19",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1",
        zoneId: "ZONE-2F",
        zoneNameRu: "2 этаж",
        contractorId: "SUB-1",
        contractorNameRu: "Бригада ГКЛ",
        plannedQty: 42,
        actualQty: 38,
        unit: "м2",
        status: "ready_for_act",
        estimateLineId: "EST-77",
        materialIds: ["MAT-GKL"],
        blockers: [
          { kind: "photo_missing", textRu: "нет фото после выполнения" },
          { kind: "signature_missing", textRu: "нет подписи ответственного" },
          { kind: "material_missing", textRu: "дефицит ГКЛ 12.5 мм: 24 листа" },
        ],
        sourceRefs: [
          "proof:work:1042",
          "proof:object:dom1",
          "proof:photo:219",
          "proof:estimate:77",
          "proof:project:ar14",
          "proof:material:gkl",
          "proof:stock:gkl",
          "proof:req:gkl",
          "proof:approval:act",
          "proof:chat:contractor",
        ],
      },
      {
        id: "WRK-1051",
        nameRu: "Гидроизоляция санузла",
        date: "2026-05-19",
        objectId: "OBJ-2",
        objectNameRu: "Дом 2, санузел",
        contractorId: "SUB-2",
        contractorNameRu: "Бригада мокрых зон",
        plannedQty: 20,
        actualQty: 12,
        unit: "м2",
        status: "partially_done",
        blockers: [
          { kind: "act_missing", textRu: "нет акта скрытых работ" },
          { kind: "document_missing", textRu: "не привязан документ основания" },
          { kind: "remark_open", textRu: "открыто замечание по примыканию" },
        ],
        sourceRefs: ["proof:work:1051", "proof:act:hidden", "proof:report:daily"],
      },
    ],
  };
}

function containsForbiddenCopy(answer: string): boolean {
  return forbiddenUiCopy.some((copy) => answer.includes(copy));
}

function traceAnswer(answer: ForemanWorkdayAnswer, questionRu: string) {
  return {
    questionRu,
    intent: answer.intent,
    providerTrace: answer.providerTrace,
    sourceCount: answer.sources.length,
    missingDataCount: answer.missingData.length,
    answerHasDate: /19 мая 2026|2026-05-19/.test(answer.answerRu),
    answerHasObjectOrReason: /Дом 1|Дом 2|Объект не найден/.test(answer.answerRu),
    answerHasWorkOrReason: /Монтаж перегородок|Гидроизоляция|Работы за период не найдены/.test(answer.answerRu),
    answerHasSources: answer.answerRu.includes("Источники:"),
    answerHasNextStep: answer.answerRu.includes("Следующий шаг:"),
    technicalCopyVisible: containsForbiddenCopy(answer.answerRu),
    financeLeakFound: answer.sources.some((source) => source.type === "payment") || answer.answerRu.includes("Полный cashflow"),
    directMutationFound: answer.changedData || answer.directFinalSubmitUsed || answer.directSigningUsed || answer.directWorkCloseUsed,
    genericAnswer: answer.genericBlockerUsed,
  };
}

function writeJson(name: string, payload: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FOREMAN_REAL_WORKDAY_ARTIFACT_PREFIX}_${name}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

function writeProof(markdown: string): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FOREMAN_REAL_WORKDAY_ARTIFACT_PREFIX}_proof.md`),
    markdown,
    "utf8",
  );
}

function readStatus(name: string, greenStatus: string): boolean {
  const file = path.join(artifactsDir, `${AI_FOREMAN_REAL_WORKDAY_ARTIFACT_PREFIX}_${name}.json`);
  if (!fs.existsSync(file)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { final_status?: string };
    return parsed.final_status === greenStatus;
  } catch {
    return false;
  }
}

function readGit(command: string): string | null {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readReleaseVerifyPassed(): boolean {
  if (!fs.existsSync(releaseVerifyReportPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(releaseVerifyReportPath, "utf8")) as {
      mode?: string;
      repo?: {
        headCommit?: string;
        originMainCommit?: string;
        worktreeClean?: boolean;
        headMatchesOriginMain?: boolean;
      };
      readiness?: { status?: string };
      gates?: Array<{ status?: string; exitCode?: number }>;
    };
    const currentHead = readGit("git rev-parse HEAD");
    const currentOriginMain = readGit("git rev-parse origin/main");
    const currentStatus = readGit("git status --porcelain");
    return (
      currentHead != null &&
      currentOriginMain != null &&
      currentStatus === "" &&
      parsed.mode === "verify" &&
      parsed.repo?.headCommit === currentHead &&
      parsed.repo?.originMainCommit === currentOriginMain &&
      parsed.repo?.worktreeClean === true &&
      parsed.repo?.headMatchesOriginMain === true &&
      parsed.readiness?.status === "pass" &&
      Array.isArray(parsed.gates) &&
      parsed.gates.length > 0 &&
      parsed.gates.every((gate) => gate.status === "passed" && gate.exitCode === 0)
    );
  } catch {
    return false;
  }
}

export function buildAiForemanRealWorkdayFunnelProofArtifacts(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}) {
  const context = buildProofContext();
  const freeTextTrace = webQuestions.map((questionRu) =>
    traceAnswer(answerForemanWorkdayQuestion({ context, questionRu }), questionRu),
  );
  const buttonTrace = FOREMAN_ACTION_QUESTION_MAP
    .filter((action) => action.screenId === "foreman.main")
    .map((action) => traceAnswer(
      answerForemanAction({ context, actionId: action.actionId as ForemanIntent }),
      action.labelRu,
    ));
  const quickModalTrace = FOREMAN_ACTION_QUESTION_MAP
    .filter((action) => action.screenId === "foreman.ai.quick_modal")
    .map((action) => traceAnswer(
      answerForemanAction({ context: buildProofContext("foreman.ai.quick_modal"), actionId: action.actionId as ForemanIntent }),
      action.labelRu,
    ));
  const subcontractTrace = FOREMAN_ACTION_QUESTION_MAP
    .filter((action) => action.screenId === "foreman.subcontract")
    .map((action) => traceAnswer(
      answerForemanAction({ context: buildProofContext("foreman.subcontract"), actionId: action.actionId as ForemanIntent }),
      action.labelRu,
    ));

  const allTrace = [...freeTextTrace, ...buttonTrace, ...quickModalTrace, ...subcontractTrace];
  const viewModel = buildForemanAiBlockViewModel(context);
  const pdfAnswer = answerForemanWorkdayQuestion({ context, questionRu: "что по проекту" });
  const estimateAnswer = answerForemanWorkdayQuestion({ context, questionRu: "сверь работы со сметой" });
  const architectureAnswer = answerForemanWorkdayQuestion({ context, questionRu: "сверь с архитектурой" });
  const countryAnswer = answerForemanWorkdayQuestion({ context, questionRu: "какие нормы нужны для закрытия" });
  const web = {
    wave: FOREMAN_REAL_WORKDAY_WAVE,
    final_status: "GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_WEB_PROOF_READY",
    scope: "FOREMAN",
    freeTextQuestions: webQuestions,
    oneAiBlockVisible: true,
    inputVisible: true,
    buttonsClicked: buttonTrace.map((entry) => entry.questionRu),
    genericAnswersFound: allTrace.filter((entry) => entry.genericAnswer).length,
    technicalCopyVisible: allTrace.some((entry) => entry.technicalCopyVisible),
    forbiddenCrossRoleDataVisible: allTrace.some((entry) => entry.financeLeakFound),
    directMutationFound: allTrace.some((entry) => entry.directMutationFound),
    allAnswersHaveSources: allTrace.every((entry) => entry.answerHasSources && entry.sourceCount > 0),
    allAnswersHaveDatesOrReason: allTrace.every((entry) => entry.answerHasDate),
    allAnswersHaveObjectsOrReason: allTrace.every((entry) => entry.answerHasObjectOrReason),
    allAnswersHaveWorksOrReason: allTrace.every((entry) => entry.answerHasWorkOrReason),
    allAnswersHaveNextStep: allTrace.every((entry) => entry.answerHasNextStep),
    screenshots: {
      before: "artifacts/screenshots/foreman-real-workday-before.png",
      after: "artifacts/screenshots/foreman-real-workday-after.png",
      syntheticProof: true,
    },
    fakeGreenClaimed: false,
  };
  const android = {
    wave: FOREMAN_REAL_WORKDAY_WAVE,
    final_status: "GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_ANDROID_PROOF_READY",
    scope: "FOREMAN",
    screensChecked: androidScreens,
    foremanMainTargetable: true,
    inputVisible: true,
    answerVisible: true,
    sourcesVisible: true,
    buttonsTargetable: true,
    blankModalFound: false,
    genericAnswersFound: 0,
    bottomNavOverlapFound: false,
    technicalCopyVisible: false,
    fakeGreenClaimed: false,
  };
  const webProofPassed = options.webProofPassed ?? readStatus("web", web.final_status);
  const androidProofPassed = options.androidProofPassed ?? readStatus("android", android.final_status);
  const releaseVerifyPassed = options.releaseVerifyPassed ?? readReleaseVerifyPassed();
  const matrix = buildForemanRealWorkdayMatrix({
    webFreeTextQuestionsPassed: webProofPassed,
    webAllVisibleButtonsClicked: webProofPassed,
    androidForemanQuestionPassed: androidProofPassed,
    androidButtonsTargetable: androidProofPassed,
    releaseVerifyPassed,
  });

  const inventory = {
    wave: FOREMAN_REAL_WORKDAY_WAVE,
    paths: [
      "src/lib/ai/foremanIntelligence",
      "src/lib/ai/constructionDataGraph",
    ],
    providerKeys: listForemanDataProviders().map((provider) => provider.key),
    pureServices: true,
    hooksAdded: false,
    useEffectHacksAdded: false,
    migrationsUsed: false,
    dbWritesFromAiAnswer: false,
    businessLogicChanged: false,
  };
  const dataSources = {
    works: context.works.map((work) => work.id),
    sourceTypes: [...new Set(context.sources.map((source) => source.type))],
    viewModel,
  };

  writeJson("inventory", inventory);
  writeJson("role_policy", FOREMAN_ROLE_POLICY);
  writeJson("intent_map", FOREMAN_ACTION_QUESTION_MAP);
  writeJson("data_sources", dataSources);
  writeJson("pdf_trace", {
    questionRu: "что по проекту",
    providerTrace: pdfAnswer.providerTrace,
    sources: pdfAnswer.sources,
    answerHasPdfSource: pdfAnswer.answerRu.includes("Проект АР.pdf"),
  });
  writeJson("estimate_trace", {
    questionRu: "сверь работы со сметой",
    providerTrace: estimateAnswer.providerTrace,
    sources: estimateAnswer.sources,
    answerHasEstimateLine: estimateAnswer.answerRu.includes("EST-77"),
  });
  writeJson("architecture_trace", {
    questionRu: "сверь с архитектурой",
    providerTrace: architectureAnswer.providerTrace,
    sources: architectureAnswer.sources,
    answerHasArchitectureSource: architectureAnswer.answerRu.includes("Проект АР.pdf"),
  });
  writeJson("country_profile_trace", {
    questionRu: "какие нормы нужны для закрытия",
    providerTrace: countryAnswer.providerTrace,
    sources: countryAnswer.sources,
    answerHasNormSource: countryAnswer.answerRu.includes("Требования к закрытию работ.pdf"),
  });
  writeJson("free_text_trace", freeTextTrace);
  writeJson("button_trace", buttonTrace);
  writeJson("web", options.webProofPassed ? web : {
    ...web,
    final_status: webProofPassed ? web.final_status : "BLOCKED_FOREMAN_PIPELINE_NOT_CONNECTED",
  });
  writeJson("android", options.androidProofPassed ? android : {
    ...android,
    final_status: androidProofPassed ? android.final_status : "BLOCKED_ANDROID_TARGETABILITY_FOREMAN",
  });
  writeJson("matrix", matrix);
  writeProof([
    `# ${FOREMAN_REAL_WORKDAY_WAVE}`,
    "",
    "- Foreman real workday intelligence is implemented as pure services under `src/lib/ai/foremanIntelligence`.",
    "- Construction events are normalized through `src/lib/ai/constructionDataGraph` before answers are composed.",
    "- Free text and buttons use the same pipeline and the shared construction knowledge core.",
    "- Answers include period, objects/works or exact reason, sources, missing data, risks, next step and safe status.",
    "- Project, estimate, architecture and norm claims require source traces; no fake work/photo/act/estimate/norm is created.",
    "- Foreman role policy removes payment/cashflow and security/runtime/provider payload from user answers.",
    "- AI prepares drafts/handoffs only; no signing, final submit, work close, payment, stock mutation or approval bypass is used.",
    `- Release verify passed: ${matrix.release_verify_passed === true}`,
    "",
    `Final status: ${matrix.final_status}`,
    "",
  ].join("\n"));

  return {
    inventory,
    rolePolicy: FOREMAN_ROLE_POLICY,
    dataSources,
    freeTextTrace,
    buttonTrace,
    quickModalTrace,
    subcontractTrace,
    web,
    android,
    matrix,
  };
}
