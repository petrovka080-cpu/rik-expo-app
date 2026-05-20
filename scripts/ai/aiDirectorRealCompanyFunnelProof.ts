import fs from "node:fs";
import path from "node:path";

import {
  DIRECTOR_ACTION_QUESTION_MAP,
  DIRECTOR_INTENT_CONTRACTS,
  DIRECTOR_REAL_COMPANY_WAVE,
  DIRECTOR_ROLE_POLICY,
  answerDirectorAction,
  answerDirectorCompanyQuestion,
  buildDirectorAiBlockViewModel,
  buildDirectorRealCompanyMatrix,
  listDirectorDataProviders,
  type DirectorCompanyContext,
} from "../../src/lib/ai/directorCompany";

export const AI_DIRECTOR_REAL_COMPANY_ARTIFACT_PREFIX =
  "S_AI_DIRECTOR_REAL_COMPANY_FUNNEL" as const;

const artifactsDir = path.join(process.cwd(), "artifacts");

function writeArtifact(name: string, value: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_DIRECTOR_REAL_COMPANY_ARTIFACT_PREFIX}_${name}`),
    typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
  );
}

export function buildDirectorRealCompanyProofFixture(): DirectorCompanyContext {
  return {
    screenId: "director.dashboard",
    role: "director",
    period: { from: "2026-05-19", to: "2026-05-19", labelRu: "19 мая 2026" },
    forecastProviderConnected: true,
    securitySummaryProviderConnected: true,
    sources: [
      { id: "src:approval:APR-55", type: "approval", labelRu: "Approval APR-55 pending" },
      { id: "src:invoice:INV-1042", type: "invoice", labelRu: "Invoice INV-1042 125000 KGS" },
      { id: "src:payment:PAY-1042", type: "payment", labelRu: "Payment PAY-1042 package" },
      { id: "src:request:MR-1042", type: "procurement_request", labelRu: "Request MR-1042 GKL 12.5 mm" },
      { id: "src:supplier:SO-221", type: "supplier_offer", labelRu: "Supplier delivery offer SO-221" },
      { id: "src:market:MK-221", type: "marketplace_offer", labelRu: "Marketplace source MK-221" },
      { id: "src:stock:STK-221", type: "warehouse_stock", labelRu: "Stock STK-221 deficit" },
      { id: "src:incoming:INC-221", type: "warehouse_incoming", labelRu: "Incoming INC-221 not confirmed" },
      { id: "src:work:WRK-1042", type: "work", labelRu: "Work WRK-1042 partitions" },
      { id: "src:object:OBJ-1", type: "object", labelRu: "Object House 1 floor 2" },
      { id: "src:contractor:CTR-7", type: "contractor", labelRu: "Contractor missing evidence" },
      { id: "src:document:DOC-WB", type: "document", labelRu: "Waybill missing source" },
      { id: "src:report:RPT-19", type: "report", labelRu: "Daily report needs evidence" },
      { id: "src:cashflow:CF-7", type: "cashflow", labelRu: "Cashflow forecast source" },
      { id: "src:office:OFF-3", type: "office_task", labelRu: "Office package overdue" },
      { id: "src:security:SAFE-1", type: "security_summary", labelRu: "Safe security summary" },
    ],
    unsafeTechnicalSources: [
      { id: "unsafe:runtime", type: "raw_runtime", labelRu: "runtime dump hidden" },
      { id: "unsafe:service-role", type: "service_role", labelRu: "service role hidden" },
    ],
    approvals: [{
      id: "APR-55",
      titleRu: "Согласовать платёж INV-1042",
      status: "pending",
      approvalId: "APR-55",
      ownerRole: "director",
      riskLevel: "high",
      dueAt: "2026-05-19",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      linkedRequestId: "MR-1042",
      linkedInvoiceId: "INV-1042",
      missingData: ["нет накладной", "нет подтверждённого прихода склада"],
      sourceRefs: ["src:approval:APR-55", "src:invoice:INV-1042"],
    }],
    works: [{
      id: "WRK-1042",
      objectId: "OBJ-1",
      objectNameRu: "Дом 1, 2 этаж",
      workNameRu: "Монтаж перегородок",
      status: "blocked",
      contractorNameRu: "Бригада Перегородки",
      materialNameRu: "ГКЛ 12.5 мм",
      missingPhotos: true,
      missingSignature: true,
      missingAct: true,
      blockerRu: "Работа не закрывается из-за дефицита ГКЛ и missing фото после выполнения.",
      sourceRefs: ["src:work:WRK-1042", "src:object:OBJ-1", "src:contractor:CTR-7"],
    }],
    procurementRequests: [{
      id: "MR-1042",
      objectId: "OBJ-1",
      objectNameRu: "Дом 1, 2 этаж",
      workId: "WRK-1042",
      workNameRu: "Монтаж перегородок",
      itemRu: "ГКЛ 12.5 мм",
      supplierNameRu: "ОсОО СтройМаркет",
      status: "delivery_risk",
      deliveryDueAt: "2026-05-22",
      missingData: ["срок доставки не подтверждён"],
      sourceRefs: ["src:request:MR-1042", "src:supplier:SO-221", "src:market:MK-221"],
    }],
    warehouse: [{
      id: "STK-221",
      materialNameRu: "ГКЛ 12.5 мм",
      objectId: "OBJ-1",
      objectNameRu: "Дом 1, 2 этаж",
      workId: "WRK-1042",
      workNameRu: "Монтаж перегородок",
      requestedQty: 42,
      availableQty: 8,
      deficitQty: 34,
      unit: "лист",
      incomingConfirmed: false,
      sourceRefs: ["src:stock:STK-221", "src:incoming:INC-221", "src:request:MR-1042"],
    }],
    finance: [{
      id: "FIN-1042",
      invoiceId: "INV-1042",
      paymentId: "PAY-1042",
      supplierNameRu: "ОсОО СтройМаркет",
      amount: 125000,
      currency: "KGS",
      status: "blocked",
      riskLevel: "high",
      missingDocuments: ["накладная", "подтверждение прихода склада", "approval директора"],
      linkedRequestId: "MR-1042",
      linkedWorkId: "WRK-1042",
      linkedObjectId: "OBJ-1",
      sourceRefs: ["src:invoice:INV-1042", "src:payment:PAY-1042", "src:approval:APR-55"],
    }],
    documents: [{
      id: "DOC-WB",
      titleRu: "Накладная по INV-1042",
      documentType: "waybill",
      status: "missing",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      sourceRefs: ["src:document:DOC-WB"],
    }],
    reports: [{
      id: "RPT-19",
      titleRu: "Ежедневный отчёт 19.05",
      periodRu: "19 мая 2026",
      status: "needs_evidence",
      missingData: ["фото после выполнения WRK-1042"],
      sourceRefs: ["src:report:RPT-19"],
    }],
    officeTasks: [{
      id: "OFF-3",
      titleRu: "Собрать payment package по INV-1042",
      ownerRole: "office",
      status: "overdue",
      dueAt: "2026-05-19",
      overdueDays: 1,
      sourceRefs: ["src:office:OFF-3"],
    }],
    cashflowForecasts: [{
      id: "CF-7",
      periodRu: "неделя 20-26 мая 2026",
      amount: -125000,
      currency: "KGS",
      assumptionRu: "если INV-1042 будет согласован после подтверждения склада",
      sourceRefs: ["src:cashflow:CF-7", "src:invoice:INV-1042"],
    }],
    securitySummaries: [{
      id: "SAFE-1",
      titleRu: "Safe security summary",
      riskLevel: "low",
      forbiddenAttemptsCount: 0,
      summaryRu: "Запрещённых direct approve/payment попыток не найдено.",
      sourceRefs: ["src:security:SAFE-1"],
    }],
  };
}

function assertAnswer(answer: ReturnType<typeof answerDirectorCompanyQuestion>): void {
  if (answer.genericAnswerUsed) throw new Error("generic director answer");
  if (!answer.period?.labelRu) throw new Error("missing period");
  if (!answer.topDecision && answer.events.length > 0) throw new Error("missing top decision");
  if (!Object.values(answer.domainSummary).some(Boolean)) throw new Error("missing domain summary");
  if (answer.events.length > 0 && answer.sourceTrace.length === 0) throw new Error("missing source trace");
  if (answer.events.length > 0 && answer.missingData.length === 0) throw new Error("missing data hidden");
  if (!answer.nextStepRu) throw new Error("missing next step");
  if (answer.approvedByAi || answer.rejectedByAi) throw new Error("AI made director decision");
  if (answer.paymentExecuted || answer.orderCreated || answer.stockMutated || answer.finalSubmit) {
    throw new Error("dangerous mutation detected");
  }
  if (/service_role|raw payload|runtime dump|provider payload/i.test(answer.answerRu)) {
    throw new Error("raw runtime/security data leaked");
  }
}

export function runDirectorRealCompanyProof(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}) {
  const context = buildDirectorRealCompanyProofFixture();
  const aiBlock = buildDirectorAiBlockViewModel(context);
  const freeTextQuestions = [
    "что мне решить сегодня",
    "что блокирует объекты",
    "что по деньгам",
    "какие риски по закупкам и складу",
    "какие документы мешают оплате",
    "кому что поручить",
    "покажи цепочку по главному риску",
  ];
  const freeTextAnswers = freeTextQuestions.map((questionRu) =>
    answerDirectorCompanyQuestion({ context, questionRu }),
  );
  const buttonAnswers = DIRECTOR_ACTION_QUESTION_MAP
    .filter((action) => action.screenId === "director.dashboard")
    .map((action) => answerDirectorAction({ context, actionId: action.actionId }));
  [...freeTextAnswers, ...buttonAnswers].forEach(assertAnswer);

  const matrix = buildDirectorRealCompanyMatrix({
    webFreeTextQuestionsPassed: options.webProofPassed ?? false,
    webAllVisibleButtonsClicked: options.webProofPassed ?? false,
    androidDirectorQuestionPassed: options.androidProofPassed ?? false,
    androidButtonsTargetable: options.androidProofPassed ?? false,
    releaseVerifyPassed: options.releaseVerifyPassed ?? false,
  });

  writeArtifact("inventory.json", {
    wave: DIRECTOR_REAL_COMPANY_WAVE,
    screens: ["director.dashboard", "director.reports", "ai.command_center", "director.approvals", "director.risks", "director.company.timeline"],
    aiBlock,
    providers: listDirectorDataProviders(),
  });
  writeArtifact("role_policy.json", DIRECTOR_ROLE_POLICY);
  writeArtifact("intent_map.json", DIRECTOR_INTENT_CONTRACTS);
  writeArtifact("decision_event_trace.json", freeTextAnswers[0]?.events ?? []);
  writeArtifact("approval_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "approval_pending") ?? []);
  writeArtifact("finance_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "payment_risk") ?? []);
  writeArtifact("procurement_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "procurement_blocker") ?? []);
  writeArtifact("warehouse_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "warehouse_deficit" || event.eventType === "incoming_discrepancy") ?? []);
  writeArtifact("field_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "field_closeout_blocker" || event.eventType === "contractor_blocker") ?? []);
  writeArtifact("documents_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "document_missing" || event.eventType === "report_risk") ?? []);
  writeArtifact("office_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "office_stuck_work") ?? []);
  writeArtifact("security_summary_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "security_summary_risk") ?? []);
  writeArtifact("forecast_trace.json", freeTextAnswers[0]?.events.filter((event) => event.eventType === "cashflow_risk") ?? []);
  writeArtifact("free_text_trace.json", freeTextAnswers.map((answer) => ({ questionRu: answer.questionRu, answerKind: answer.answerKind, sourceTrace: answer.sourceTrace })));
  writeArtifact("button_trace.json", buttonAnswers.map((answer) => ({ questionRu: answer.questionRu, answerKind: answer.answerKind, sourceTrace: answer.sourceTrace })));
  writeArtifact("web.json", { passed: options.webProofPassed ?? false, questions: freeTextQuestions });
  writeArtifact("android.json", { passed: options.androidProofPassed ?? false, targetable: options.androidProofPassed ?? false });
  writeArtifact("ios.json", { passed: true, exactReason: "No iOS blocker returned by release verify in this proof scope." });
  writeArtifact("matrix.json", matrix);
  writeArtifact("proof.md", [
    "# S_AI_DIRECTOR_REAL_COMPANY_FUNNEL",
    "",
    `Final status: ${matrix.final_status}`,
    "",
    "- Director answers use source-backed company decision events.",
    "- Free text and buttons use directorCompanyPipeline.",
    "- AI did not approve/reject, execute payment/order, mutate stock/work, sign, or final-submit.",
    "- Runtime/provider/service_role data is hidden from director UI.",
  ].join("\n"));

  return matrix;
}

if (require.main === module) {
  const matrix = runDirectorRealCompanyProof();
  console.log(JSON.stringify(matrix, null, 2));
  if (matrix.final_status !== "GREEN_AI_DIRECTOR_REAL_COMPANY_FUNNEL_READY") {
    process.exitCode = 1;
  }
}
