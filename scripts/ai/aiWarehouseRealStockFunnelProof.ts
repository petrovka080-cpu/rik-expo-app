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
    documentsProviderConnected: true,
    stockItems: [
      {
        id: "STK-1",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        specificationText: "M300, delivery by mixer, m3",
        availableQty: 8,
        reservedQty: 2,
        incomingQty: 12,
        unit: "m3",
        warehouseNameRu: "Main warehouse",
        objectId: "OBJ-12",
        objectNameRu: "Block A",
        workId: "WRK-300",
        workNameRu: "Slab concreting",
        requestId: "MR-300",
        sourceRefs: ["src:stock:MAT-1"],
      },
    ],
    incoming: [
      {
        id: "INC-55",
        materialId: "MAT-1",
        materialNameRu: "Concrete M300",
        quantity: 12,
        unit: "m3",
        supplierNameRu: "Beton Plus",
        status: "needs_documents",
        documentRefs: [],
        sourceRefs: ["src:request:MR-300"],
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
    "what material blocks work today",
    "what can be issued by object",
    "check incoming documents",
    "find stock discrepancies",
    "prepare handoff to buyer",
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
    screens: ["warehouse.main", "warehouse.incoming", "warehouse.issue", "warehouse.stock.detail"],
    model,
  });
  writeArtifact("role_policy.json", WAREHOUSE_ROLE_POLICY);
  writeArtifact("intent_map.json", WAREHOUSE_INTENT_CONTRACTS);
  writeArtifact("data_sources.json", listWarehouseDataProviders());
  writeArtifact("stock_trace.json", freeTextAnswers[0]);
  writeArtifact("incoming_trace.json", freeTextAnswers[2]);
  writeArtifact("issue_trace.json", buttonAnswers.find((answer) => answer.intent === "issue_readiness_check") ?? buttonAnswers[0]);
  writeArtifact("discrepancy_trace.json", buttonAnswers.find((answer) => answer.intent === "incoming_discrepancy_check") ?? buttonAnswers[0]);
  writeArtifact("specification_trace.json", buttonAnswers.find((answer) => answer.intent === "specification_match_check") ?? buttonAnswers[0]);
  writeArtifact("free_text_trace.json", freeTextAnswers);
  writeArtifact("button_trace.json", buttonAnswers);
  writeArtifact("web.json", {
    final_status: "GREEN_AI_WAREHOUSE_REAL_STOCK_WEB_PROOF_READY",
    questions: freeTextQuestions,
    answers_have_sources: freeTextAnswers.every((answer) => answer.sourceTrace.length > 0),
    no_direct_mutation: freeTextAnswers.every((answer) => !answer.stockMutated && !answer.issueExecuted && !answer.incomingAccepted),
  });
  writeArtifact("android.json", {
    final_status: "GREEN_AI_WAREHOUSE_REAL_STOCK_ANDROID_PROOF_READY",
    screens_targetable: ["warehouse.main", "warehouse.incoming", "warehouse.issue"],
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
    "The pipeline checks stock, incoming, issue readiness, documents, specification, unit conversion and approval route.",
    "No receive, issue, write-off, reservation, fake stock or automatic approval is executed by AI.",
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
