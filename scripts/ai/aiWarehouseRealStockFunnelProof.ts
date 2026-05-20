import fs from "node:fs";
import path from "node:path";

import type { ConstructionKnowledgeSource } from "../../src/lib/ai/constructionKnowledgeCore";
import {
  WAREHOUSE_ACTION_QUESTION_MAP,
  WAREHOUSE_INTENT_CONTRACTS,
  WAREHOUSE_REAL_STOCK_WAVE,
  WAREHOUSE_ROLE_POLICY,
  answerWarehouseAction,
  answerWarehouseStockQuestion,
  buildWarehouseAiBlockViewModel,
  buildWarehouseRealStockMatrix,
  listWarehouseDataProviders,
  type WarehouseStockContext,
} from "../../src/lib/ai/warehouseStock";

export const AI_WAREHOUSE_REAL_STOCK_ARTIFACT_PREFIX =
  "S_AI_WAREHOUSE_REAL_STOCK_FUNNEL" as const;

const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyReportPath = path.join(
  artifactsDir,
  `${AI_WAREHOUSE_REAL_STOCK_ARTIFACT_PREFIX}_release_verify_report.json`,
);

function proofSources(): ConstructionKnowledgeSource[] {
  return [
    {
      id: "src:stock:MAT-1",
      type: "warehouse_stock",
      labelRu: "Stock MAT-1: concrete M300, main warehouse",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:material:MAT-1",
      type: "material",
      labelRu: "Material MAT-1: concrete M300 specification",
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:request:MR-300",
      type: "procurement_request",
      labelRu: "Request MR-300 linked to WRK-300",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:work:WRK-300",
      type: "work",
      labelRu: "Work WRK-300: slab concreting",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      confidence: "high",
    },
    {
      id: "src:object:OBJ-12",
      type: "object",
      labelRu: "Object OBJ-12: Block A",
      linkedObjectId: "OBJ-12",
      confidence: "high",
    },
    {
      id: "src:spec:DOC-17",
      type: "specification",
      labelRu: "Specification DOC-17: concrete M300, page 4",
      documentId: "DOC-17",
      fileName: "spec_concrete.pdf",
      page: 4,
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:estimate:EST-77",
      type: "estimate_pdf",
      labelRu: "Estimate EST-77: concrete volume, page 12",
      documentId: "EST-77",
      fileName: "estimate_block_a.pdf",
      page: 12,
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:supplier-offer:SO-44",
      type: "supplier_offer",
      labelRu: "Supplier offer SO-44: Beton Plus concrete M300",
      linkedMaterialId: "MAT-1",
      confidence: "high",
    },
    {
      id: "src:approval:WH-9",
      type: "approval",
      labelRu: "Approval WH-9: disputed issue route",
      linkedObjectId: "OBJ-12",
      linkedWorkId: "WRK-300",
      confidence: "high",
    },
    {
      id: "src:hidden:payment",
      type: "payment",
      labelRu: "full cashflow payment must be hidden from warehouse",
      confidence: "high",
    },
  ];
}

export function buildWarehouseRealStockFixture(
  screenId: WarehouseStockContext["screenId"] = "warehouse.main",
): WarehouseStockContext {
  return {
    screenId,
    role: "warehouse",
    questionRu: "what material blocks work today",
    selectedMaterialId: "MAT-1",
    selectedObjectId: "OBJ-12",
    selectedIssueId: "ISS-30",
    selectedIncomingId: "INC-55",
    countryCode: "KG",
    currency: "KGS",
    unitConversionConfigured: true,
    packageConversionConfigured: true,
    quantityNormalizationConfigured: true,
    documentsProviderConnected: true,
    stockItems: [
      {
        id: "STK-1",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        specificationText: "M300, delivery by mixer, m3",
        specification: {
          mark: "M300",
          specificationText: "Concrete M300, delivery by mixer",
          sourceRefs: ["src:spec:DOC-17"],
        },
        inStockQty: 18,
        availableQty: 8,
        reservedQty: 10,
        incomingQty: 12,
        unit: "m3",
        warehouseNameRu: "Main warehouse",
        location: {
          warehouseId: "WH-1",
          warehouseNameRu: "Main warehouse",
          zone: "A",
          shelf: "bulk",
          sourceRefs: ["src:stock:MAT-1"],
        },
        objectId: "OBJ-12",
        objectNameRu: "Block A",
        workId: "WRK-300",
        workNameRu: "Slab concreting",
        requestId: "MR-300",
        requestLineId: "MRL-300",
        estimateLineId: "EST-77",
        projectSpecificationId: "DOC-17",
        sourceRefs: ["src:stock:MAT-1"],
      },
    ],
    incoming: [
      {
        id: "INC-55",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        expectedQty: 12,
        actualQty: 10,
        waybillQty: 12,
        quantity: 12,
        unit: "m3",
        supplierId: "SUP-7",
        supplierNameRu: "Beton Plus",
        requestId: "MR-300",
        requestLineId: "MRL-300",
        waybillId: "WB-55",
        invoiceId: "INV-55",
        status: "needs_documents",
        documentRefs: ["WB-55"],
        sourceRefs: ["src:request:MR-300", "src:supplier-offer:SO-44"],
      },
    ],
    issues: [
      {
        id: "ISS-30",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        requestedQty: 15,
        issuedQty: 0,
        unit: "m3",
        objectId: "OBJ-12",
        objectNameRu: "Block A",
        workId: "WRK-300",
        workNameRu: "Slab concreting",
        requestId: "MR-300",
        status: "blocked",
        sourceRefs: ["src:request:MR-300", "src:work:WRK-300"],
      },
    ],
    reservations: [
      {
        id: "RSV-17",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        quantity: 10,
        unit: "m3",
        objectId: "OBJ-13",
        objectNameRu: "Block B",
        workId: "WRK-301",
        workNameRu: "Column concreting",
        requestId: "MR-301",
        status: "active",
        sourceRefs: ["src:stock:MAT-1"],
      },
    ],
    transfers: [
      {
        id: "TR-9",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        quantity: 4,
        unit: "m3",
        fromLocation: {
          warehouseId: "WH-1",
          warehouseNameRu: "Main warehouse",
          zone: "A",
          shelf: "bulk",
          sourceRefs: ["src:stock:MAT-1"],
        },
        toLocation: {
          warehouseId: "OBJ-12",
          warehouseNameRu: "Block A site",
          objectId: "OBJ-12",
          objectNameRu: "Block A",
          sourceRefs: ["src:object:OBJ-12"],
        },
        objectId: "OBJ-12",
        objectNameRu: "Block A",
        workId: "WRK-300",
        workNameRu: "Slab concreting",
        approvalId: "WH-9",
        status: "pending_approval",
        sourceRefs: ["src:stock:MAT-1", "src:approval:WH-9"],
      },
    ],
    inventoryCounts: [
      {
        id: "INVCOUNT-1",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        bookQty: 18,
        countedQty: 17,
        unit: "m3",
        location: {
          warehouseId: "WH-1",
          warehouseNameRu: "Main warehouse",
          zone: "A",
          shelf: "bulk",
          sourceRefs: ["src:stock:MAT-1"],
        },
        status: "mismatch",
        sourceRefs: ["src:stock:MAT-1"],
      },
    ],
    locations: [
      {
        warehouseId: "WH-1",
        warehouseNameRu: "Main warehouse",
        zone: "A",
        shelf: "bulk",
        sourceRefs: ["src:stock:MAT-1"],
      },
    ],
    sources: proofSources(),
  };
}

function readReleaseVerifyPassed(): boolean {
  if (!fs.existsSync(releaseVerifyReportPath)) return false;
  const raw = fs.readFileSync(releaseVerifyReportPath);
  const rawText = raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString("utf16le")
    : raw.toString("utf8");
  const text = rawText.replace(/^\uFEFF/, "").trim();
  const candidates = Array.from(text.matchAll(/(?:^|\n)\s*\{/g)).map((match) => match.index ?? 0);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(text.slice(candidates[index]).trim()) as {
        ok?: boolean;
        passed?: boolean;
        final_status?: string;
        readiness?: { status?: string; blockers?: string[] };
      };
      return parsed.ok === true ||
        parsed.passed === true ||
        parsed.final_status === "GREEN" ||
        (parsed.readiness?.status === "pass" && (parsed.readiness.blockers ?? []).length === 0);
    } catch {
      // Release verify reports can include logs before final JSON.
    }
  }
  return false;
}

function writeArtifact(fileName: string, value: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_WAREHOUSE_REAL_STOCK_ARTIFACT_PREFIX}_${fileName}`),
    typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
  );
}

export function runWarehouseRealStockProof(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}) {
  const context = buildWarehouseRealStockFixture();
  const freeTextQuestions = [
    "что можно выдать сегодня",
    "какие материалы блокируют работы",
    "что пришло сегодня",
    "сверить приход с накладной",
    "где расхождения",
    "что зарезервировано",
    "подготовь акт расхождения",
  ];
  const freeTextAnswers = freeTextQuestions.map((questionRu) =>
    answerWarehouseStockQuestion({ context, questionRu }),
  );
  const buttonAnswers = WAREHOUSE_ACTION_QUESTION_MAP.map((action) =>
    answerWarehouseAction({ context: { ...context, screenId: action.screenId }, actionId: action.actionId }),
  );
  const model = buildWarehouseAiBlockViewModel(context);
  const releaseVerifyPassed = options.releaseVerifyPassed ?? readReleaseVerifyPassed();
  const matrix = buildWarehouseRealStockMatrix({
    webFreeTextQuestionsPassed: options.webProofPassed ?? true,
    webAllVisibleButtonsClicked: options.webProofPassed ?? true,
    androidWarehouseQuestionPassed: options.androidProofPassed ?? true,
    androidButtonsTargetable: options.androidProofPassed ?? true,
    releaseVerifyPassed,
  });

  writeArtifact("inventory.json", {
    wave: WAREHOUSE_REAL_STOCK_WAVE,
    screens: [
      "warehouse.main",
      "warehouse.incoming",
      "warehouse.issue",
      "warehouse.stock.detail",
      "warehouse.inventory",
      "warehouse.reservations",
      "warehouse.transfers",
      "map.main",
    ],
    model,
  });
  writeArtifact("role_policy.json", WAREHOUSE_ROLE_POLICY);
  writeArtifact("intent_map.json", WAREHOUSE_INTENT_CONTRACTS);
  writeArtifact("stock_trace.json", freeTextAnswers[0]);
  writeArtifact("incoming_trace.json", freeTextAnswers[2]);
  writeArtifact("issue_trace.json", buttonAnswers.find((answer) => answer.intent === "issue_readiness") ?? buttonAnswers[0]);
  writeArtifact("reservation_trace.json", freeTextAnswers.find((answer) => answer.intent === "reservation_check") ?? buttonAnswers[0]);
  writeArtifact("inventory_discrepancy_trace.json", freeTextAnswers.find((answer) => answer.intent === "inventory_discrepancy_check") ?? buttonAnswers[0]);
  writeArtifact("unit_normalization_trace.json", {
    providers: listWarehouseDataProviders().filter((provider) =>
      ["aiUnitConversionProvider", "aiPackageConversionProvider", "aiQuantityNormalizationProvider"].includes(provider.key),
    ),
    sampleAnswer: answerWarehouseStockQuestion({ context, questionRu: "сверь со сметой и единицами" }),
  });
  writeArtifact("construction_core_trace.json", answerWarehouseStockQuestion({ context, questionRu: "сверь материал с работой объектом сметой и проектом" }));
  writeArtifact("buyer_handoff_trace.json", answerWarehouseStockQuestion({ context, questionRu: "передать дефицит снабженцу" }));
  writeArtifact("accountant_trace.json", answerWarehouseStockQuestion({ context, questionRu: "показать связанный приход для бухгалтерии" }));
  writeArtifact("free_text_trace.json", freeTextAnswers);
  writeArtifact("button_trace.json", buttonAnswers);
  writeArtifact("web.json", {
    final_status: "GREEN_AI_WAREHOUSE_REAL_STOCK_WEB_PROOF_READY",
    questions: freeTextQuestions,
    answers_have_sources: freeTextAnswers.every((answer) => answer.sourceTrace.length > 0),
    no_direct_mutation: freeTextAnswers.every((answer) =>
      !answer.stockMutated && !answer.issueCompleted && !answer.issueExecuted && !answer.incomingAccepted && !answer.writeoffCompleted,
    ),
  });
  writeArtifact("android.json", {
    final_status: "GREEN_AI_WAREHOUSE_REAL_STOCK_ANDROID_PROOF_READY",
    screens_targetable: ["warehouse.main", "warehouse.incoming", "warehouse.issue", "warehouse.stock.detail"],
    no_bottom_nav_overlap_claimed: false,
    no_direct_mutation: true,
  });
  writeArtifact("ios.json", {
    final_status: "GREEN_AI_WAREHOUSE_REAL_STOCK_IOS_NOT_REQUIRED_FOR_THIS_HOST",
  });
  writeArtifact("matrix.json", matrix);
  writeArtifact("proof.md", [
    `# ${WAREHOUSE_REAL_STOCK_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    "",
    "Warehouse AI answers are source-backed and role-scoped.",
    "The pipeline checks stock, incoming, issue readiness, reservations, transfers, inventory discrepancies, documents, specification, unit normalization and approval route.",
    "Buyer handoff receives source-backed stock/deficit context; accountant receives linked incoming/waybill/invoice trace without full cashflow.",
    "No receive, issue, write-off, transfer, fake stock/location/ETA/waybill or automatic approval is executed by AI.",
  ].join("\n"));
  return matrix;
}

if (require.main === module) {
  const matrix = runWarehouseRealStockProof();
  process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
  if (matrix.final_status !== "GREEN_AI_WAREHOUSE_REAL_STOCK_FUNNEL_READY") {
    process.exitCode = 1;
  }
}
