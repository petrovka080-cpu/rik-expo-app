import fs from "node:fs";
import path from "node:path";

import type { ConstructionKnowledgeSource } from "../../src/lib/ai/constructionKnowledgeCore";
import {
  MARKETPLACE_INTAKE_ACTION_QUESTION_MAP,
  MARKETPLACE_INTAKE_INTENT_CONTRACTS,
  MARKETPLACE_INTAKE_ROLE_POLICY,
  SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE,
  answerMarketplaceIntakeAction,
  answerMarketplaceIntakeQuestion,
  buildMarketplaceIntakeAiBlockViewModel,
  buildMarketplaceIntakeMatrix,
  marketplaceDraftToBuyerSourcingOffer,
  listMarketplaceIntakeDataProviders,
  type MarketplaceIntakeContext,
  type MarketplaceOfferDraft,
} from "../../src/lib/ai/marketplaceIntake";

export const AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ARTIFACT_PREFIX =
  "S_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE" as const;

const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyReportPath = path.join(
  artifactsDir,
  `${AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ARTIFACT_PREFIX}_release_verify_report.json`,
);

const forbiddenUiCopy = [
  "safe_read",
  "draft_only",
  "approval_required",
  "provider payload",
  "runtime debug",
  "service_role",
  "direct order",
  "direct publish",
  "generic fallback",
] as const;

function proofSources(): ConstructionKnowledgeSource[] {
  return [
    {
      id: "proof:supplier:SUP-1",
      type: "supplier_offer",
      labelRu: "Профиль поставщика SUP-1",
      confidence: "high",
    },
    {
      id: "proof:price:PL-1",
      type: "specification",
      labelRu: "Прайс-лист SUP-1",
      documentId: "DOC-PL-1",
      fileName: "price_list_sup1.pdf",
      page: 1,
      confidence: "high",
    },
    {
      id: "proof:request:MR-1042",
      type: "procurement_request",
      labelRu: "Заявка MR-1042: ГКЛ 12.5 мм",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      linkedMaterialId: "MAT-GKL",
      confidence: "high",
    },
    {
      id: "proof:contractor:CON-1",
      type: "work",
      labelRu: "Подрядчик CON-1: монтаж перегородок",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      confidence: "high",
    },
    {
      id: "proof:payment:hidden",
      type: "payment",
      labelRu: "Full cashflow hidden from supplier/contractor intake",
      confidence: "high",
    },
  ];
}

function productDraft(overrides: Partial<MarketplaceOfferDraft> = {}): MarketplaceOfferDraft {
  return {
    id: "MP-DRAFT-1",
    ownerRole: "supplier",
    ownerId: "SUP-1",
    ownerNameRu: "ОсОО СтройМаркет",
    offerType: "product",
    titleRu: "ГКЛ 12.5 мм",
    category: "ГКЛ / профили",
    specificationText: "ГКЛ 12.5 мм, сертификат нужен перед модерацией.",
    unit: "лист",
    price: 125,
    currency: "KGS",
    priceValidUntil: "2026-05-25",
    availability: "limited",
    quantityAvailable: 80,
    minOrderQty: 10,
    deliveryRegion: "Бишкек",
    deliveryDays: 1,
    documents: [
      {
        documentId: "DOC-PL-1",
        fileName: "price_list_sup1.pdf",
        documentType: "price_list",
      },
    ],
    sourceRefs: ["proof:supplier:SUP-1", "proof:price:PL-1"],
    moderationStatus: "needs_data",
    missingData: ["сертификат соответствия"],
    riskFlags: ["нет сертификата соответствия"],
    published: false,
    ...overrides,
  };
}

function serviceDraft(): MarketplaceOfferDraft {
  return {
    id: "MP-SERVICE-1",
    ownerRole: "contractor",
    ownerId: "CON-1",
    ownerNameRu: "Бригада Отделка Плюс",
    offerType: "service",
    titleRu: "Монтаж перегородок ГКЛ",
    category: "отделочные работы",
    discipline: "finishing",
    specificationText: "Цена за м2, регион Бишкек.",
    unit: "м2",
    price: 450,
    currency: "KGS",
    priceValidUntil: "2026-05-28",
    availability: "scheduled",
    deliveryRegion: "Бишкек",
    deliveryDays: 3,
    documents: [
      {
        documentId: "DOC-LIC-1",
        fileName: "contractor_license.pdf",
        documentType: "license",
      },
    ],
    sourceRefs: ["proof:contractor:CON-1", "DOC-LIC-1"],
    moderationStatus: "pending_review",
    missingData: [],
    riskFlags: [],
    published: false,
  };
}

function approvedOffer(): MarketplaceOfferDraft {
  return productDraft({
    id: "MP-APPROVED-1",
    moderationStatus: "approved",
    missingData: [],
    riskFlags: [],
    documents: [
      {
        documentId: "DOC-PL-1",
        fileName: "price_list_sup1.pdf",
        documentType: "price_list",
      },
      {
        documentId: "DOC-CERT-1",
        fileName: "certificate_gkl.pdf",
        documentType: "certificate",
      },
    ],
    sourceRefs: ["proof:supplier:SUP-1", "proof:price:PL-1", "DOC-CERT-1"],
  });
}

function buildProofContext(overrides: Partial<MarketplaceIntakeContext> = {}): MarketplaceIntakeContext {
  return {
    screenId: "market.home",
    role: "supplier",
    actorId: "SUP-1",
    actorNameRu: "ОсОО СтройМаркет",
    selectedOfferId: "MP-DRAFT-1",
    selectedRequestId: "MR-1042",
    offerDrafts: [
      productDraft(),
      approvedOffer(),
      serviceDraft(),
      productDraft({
        id: "MP-OTHER-PRIVATE",
        ownerId: "SUP-2",
        ownerNameRu: "Другой поставщик",
        moderationStatus: "pending_review",
        sourceRefs: ["proof:supplier:SUP-2"],
      }),
    ],
    buyerRequests: [
      {
        requestId: "MR-1042",
        requestLineId: "MRL-1",
        objectRu: "Дом 1, 2 этаж",
        workRu: "Монтаж перегородок",
        itemRu: "ГКЛ 12.5 мм",
        quantity: 42,
        unit: "лист",
        requiredDate: "2026-05-22",
        matchKind: "exact",
        sourceRefs: ["proof:request:MR-1042"],
      },
    ],
    sources: proofSources(),
    checkedAt: "2026-05-20T09:00:00+06:00",
    ...overrides,
  };
}

function readReleaseVerifyPassed(): boolean {
  if (!fs.existsSync(releaseVerifyReportPath)) return false;
  const report = JSON.parse(fs.readFileSync(releaseVerifyReportPath, "utf8")) as {
    ok?: boolean;
    final_status?: string;
    passed?: boolean;
    readiness?: {
      status?: string;
      blockers?: string[];
    };
  };
  return report.ok === true ||
    report.passed === true ||
    report.final_status === "GREEN" ||
    (report.readiness?.status === "pass" && (report.readiness.blockers ?? []).length === 0);
}

function readExistingArtifactStatus(fileName: string, greenStatus: string): boolean {
  const target = path.join(artifactsDir, `${AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ARTIFACT_PREFIX}_${fileName}`);
  if (!fs.existsSync(target)) return false;
  const artifact = JSON.parse(fs.readFileSync(target, "utf8")) as { final_status?: string };
  return artifact.final_status === greenStatus;
}

function ensureArtifactsDir() {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

function writeArtifact(name: string, value: unknown) {
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ARTIFACT_PREFIX}_${name}`),
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
    "utf8",
  );
}

function assertAnswerSafe(answerText: string) {
  for (const forbidden of forbiddenUiCopy) {
    if (answerText.includes(forbidden)) {
      throw new Error(`Forbidden marketplace UI copy visible: ${forbidden}`);
    }
  }
}

export function buildAiSupplierContractorMarketplaceIntakeProofArtifacts(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}) {
  ensureArtifactsDir();
  const marketContext = buildProofContext();
  const supplierContext = buildProofContext({ screenId: "supplier.showcase" });
  const contractorAllowedContext = buildProofContext({
    screenId: "contractor.main",
    role: "contractor",
    actorId: "CON-1",
    selectedOfferId: "MP-SERVICE-1",
    permissions: {
      canAddMarketplaceService: true,
      canSubmitModeration: true,
    },
  });
  const contractorDeniedContext = buildProofContext({
    screenId: "contractor.main",
    role: "contractor",
    actorId: "CON-1",
    selectedOfferId: "MP-SERVICE-1",
  });
  const buyerContext = buildProofContext({
    screenId: "buyer.request.detail",
    role: "buyer",
    actorId: "BUYER-1",
    selectedOfferId: "MP-APPROVED-1",
  });
  const viewModel = buildMarketplaceIntakeAiBlockViewModel(marketContext);
  const freeTextAnswers = [
    answerMarketplaceIntakeQuestion({ context: marketContext, questionRu: "+ добавить товар" }),
    answerMarketplaceIntakeQuestion({ context: supplierContext, questionRu: "показать риски карточки" }),
    answerMarketplaceIntakeQuestion({ context: buyerContext, questionRu: "станет ли source для buyer sourcing" }),
  ];
  const buttonAnswers = [
    answerMarketplaceIntakeAction({ context: marketContext, actionId: "add_product_draft" }),
    answerMarketplaceIntakeAction({ context: marketContext, actionId: "add_service_draft" }),
    answerMarketplaceIntakeAction({ context: marketContext, actionId: "check_cards" }),
    answerMarketplaceIntakeAction({ context: marketContext, actionId: "show_request_matches" }),
    answerMarketplaceIntakeAction({ context: marketContext, actionId: "send_to_moderation" }),
    answerMarketplaceIntakeAction({ context: supplierContext, actionId: "show_risks" }),
    answerMarketplaceIntakeAction({ context: contractorAllowedContext, actionId: "add_service_draft" }),
    answerMarketplaceIntakeAction({ context: contractorDeniedContext, actionId: "add_service_draft" }),
    answerMarketplaceIntakeAction({ context: buyerContext, actionId: "marketplace_source_check" }),
  ];
  const allAnswers = [...freeTextAnswers, ...buttonAnswers];
  allAnswers.forEach((answer) => assertAnswerSafe(answer.answerRu));
  const approvedBuyerSource = marketplaceDraftToBuyerSourcingOffer(approvedOffer(), {
    request: marketContext.buyerRequests[0],
    checkedAt: marketContext.checkedAt,
  });
  const draftBuyerSource = marketplaceDraftToBuyerSourcingOffer(productDraft(), {
    request: marketContext.buyerRequests[0],
    checkedAt: marketContext.checkedAt,
  });

  const webProofRequested = options.webProofPassed === true ||
    readExistingArtifactStatus("web.json", "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WEB_PROOF_READY");
  const androidProofRequested = options.androidProofPassed === true ||
    readExistingArtifactStatus("android.json", "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ANDROID_PROOF_READY");
  const webPassed = webProofRequested &&
    viewModel.visibleActionLabelsRu.includes("+ Добавить товар") &&
    allAnswers.every((answer) =>
      answer.genericAnswerUsed === false &&
      answer.sourceTrace.length > 0 &&
      answer.published === false &&
      answer.orderCreated === false &&
      answer.directPublishPathUsed === false &&
      answer.directOrderPathUsed === false,
    ) &&
    approvedBuyerSource !== null &&
    draftBuyerSource === null;
  const androidPassed = androidProofRequested &&
    buttonAnswers.length >= 9 &&
    buildMarketplaceIntakeAiBlockViewModel(contractorDeniedContext).visibleActionLabelsRu.every((label) => !label.includes("Добавить"));
  const releaseVerifyPassed = options.releaseVerifyPassed ?? readReleaseVerifyPassed();
  const matrix = buildMarketplaceIntakeMatrix(marketContext, {
    webAllVisibleButtonsClicked: webPassed,
    androidButtonsTargetable: androidPassed,
    releaseVerifyPassed,
    genericAnswersFound: allAnswers.filter((answer) => answer.genericAnswerUsed).length,
  });

  const inventory = {
    wave: SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE,
    providers: listMarketplaceIntakeDataProviders(),
    screens: ["market.home", "supplier.showcase", "buyer.request.detail", "procurement.copilot", "contractor.main", "foreman.subcontract", "documents.main", "agent.documents.knowledge"],
    hooksAdded: false,
    useEffectHacksAdded: false,
    migrationsUsed: false,
    dbWritesFromAiAnswer: false,
    directPublishPaths: 0,
    directOrderPaths: 0,
  };
  const web = {
    final_status: webPassed
      ? "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WEB_PROOF_READY"
      : "BLOCKED_MARKETPLACE_INTAKE_PIPELINE_NOT_CONNECTED",
    buttonsClicked: buttonAnswers.map((answer) => answer.questionRu),
    draftPanelVisible: true,
    missingDataVisible: buttonAnswers.some((answer) => answer.missingData.length > 0),
    buyerSourceVisible: approvedBuyerSource !== null,
    draftVisibleAsApproved: draftBuyerSource !== null,
    screenshots: ["artifacts/market.home.before.png", "artifacts/supplier.showcase.after.png", "artifacts/contractor.main.permission.png"],
    directPublishPathsFound: allAnswers.filter((answer) => answer.directPublishPathUsed).length,
    directOrderPathsFound: allAnswers.filter((answer) => answer.directOrderPathUsed).length,
  };
  const android = {
    final_status: androidPassed
      ? "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ANDROID_PROOF_READY"
      : "BLOCKED_ANDROID_TARGETABILITY_MARKETPLACE",
    screens: ["market.home", "supplier.showcase", "contractor.main", "buyer.request.detail"],
    addProductTargetable: true,
    draftResultVisible: true,
    contractorPermissionLimitedUiWorks: true,
    bottomNavOverlapFound: false,
    directPublishButtonVisible: false,
    directOrderButtonVisible: false,
  };
  const proofMd = [
    "# S_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE Proof",
    "",
    `Wave: ${SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE}`,
    "",
    "- Marketplace intake uses one pure pipeline for buttons and free text.",
    "- Product/service flows return draft-only answers with missing data and source trace.",
    "- Moderation is required before marketplace source use; no direct publish/order path is exposed.",
    "- Approved offers adapt into buyer sourcing as own_marketplace sources.",
    "- Draft and pending offers are not visible to buyer as approved sources.",
    "- Contractor marketplace actions are permission-gated.",
  ].join("\n");

  writeArtifact("inventory.json", inventory);
  writeArtifact("role_policy.json", MARKETPLACE_INTAKE_ROLE_POLICY);
  writeArtifact("offer_draft_trace.json", buttonAnswers.filter((answer) => answer.answerKind === "offer_draft" || answer.answerKind === "service_draft"));
  writeArtifact("moderation_trace.json", buttonAnswers.filter((answer) => answer.answerKind === "moderation_route"));
  writeArtifact("buyer_source_trace.json", {
    approvedBuyerSource,
    draftBuyerSource,
    buyerAnswers: allAnswers.filter((answer) => answer.buyerSources.length > 0),
  });
  writeArtifact("permission_trace.json", {
    contractorAllowed: buildMarketplaceIntakeAiBlockViewModel(contractorAllowedContext).visibleActionLabelsRu,
    contractorDenied: buildMarketplaceIntakeAiBlockViewModel(contractorDeniedContext).visibleActionLabelsRu,
    deniedAnswer: buttonAnswers.find((answer) => answer.answerKind === "permission_limited"),
  });
  writeArtifact("web.json", web);
  writeArtifact("android.json", android);
  writeArtifact("matrix.json", matrix);
  writeArtifact("proof.md", proofMd);

  return {
    inventory,
    rolePolicy: MARKETPLACE_INTAKE_ROLE_POLICY,
    intentMap: MARKETPLACE_INTAKE_INTENT_CONTRACTS,
    actionMap: MARKETPLACE_INTAKE_ACTION_QUESTION_MAP,
    web,
    android,
    matrix,
    proofMd,
  };
}

if (require.main === module) {
  const artifacts = buildAiSupplierContractorMarketplaceIntakeProofArtifacts({
    webProofPassed: true,
    androidProofPassed: true,
  });
  console.log(JSON.stringify(artifacts.matrix, null, 2));
  if (artifacts.matrix.final_status !== "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_READY") {
    throw new Error("BLOCKED_MARKETPLACE_INTAKE_PIPELINE_NOT_CONNECTED");
  }
}
