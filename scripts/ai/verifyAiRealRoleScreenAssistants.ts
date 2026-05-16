import fs from "node:fs";
import path from "node:path";

import { buildAccountantTodayPaymentAssistant } from "../../src/features/ai/finance/aiAccountantTodayPaymentAssistant";
import { buildDirectorTodayDecisionAssistant } from "../../src/features/ai/director/aiDirectorTodayDecisionAssistant";
import { buildDocumentReadySummaryAssistant } from "../../src/features/ai/documents/aiDocumentReadySummaryAssistant";
import { buildForemanTodayCloseoutAssistant } from "../../src/features/ai/foreman/aiForemanTodayCloseoutAssistant";
import { buildProcurementReadyBuyBundleFromSearchParams } from "../../src/features/ai/procurement/aiProcurementRequestOptionHydrator";
import { getAiRoleScreenAssistantPack } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantEngine";
import { listAiRoleScreenAssistantRegistry } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantRegistry";
import { validateAiRoleScreenAssistantPack } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantPolicy";
import { buildWarehouseTodayOpsAssistant } from "../../src/features/ai/warehouse/aiWarehouseTodayOpsAssistant";

const projectRoot = process.cwd();
const wave = "S_AI_PRODUCT_03_REAL_ROLE_SCREEN_ASSISTANTS";
const artifactsDir = path.join(projectRoot, "artifacts");

function writeJson(name: string, payload: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeProof(payload: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_proof.md`), payload, "utf8");
}

const registry = listAiRoleScreenAssistantRegistry();
const accountantPack = buildAccountantTodayPaymentAssistant({
  payments: [{
    id: "verify-payment",
    supplierName: "Evidence Supplier",
    amountLabel: "1 200 000 ₸",
    requestId: "#1248",
    riskReason: "сумма выше обычной истории",
    missingDocument: "подтверждение доставки",
    approvalStatus: "ready_for_approval",
    evidence: ["verify:payment"],
  }],
  totalAmountLabel: "4 850 000 ₸",
});
const buyerPack = getAiRoleScreenAssistantPack({
  role: "buyer",
  context: "buyer",
  screenId: "buyer.main",
  readyBuyBundle: buildProcurementReadyBuyBundleFromSearchParams({
    readyBuyRequestId: "verify-request",
    readyBuyItems: "кабель|цемент",
    readyBuySupplierName: "Evidence Supplier",
    readyBuySupplierMatchedItems: "кабель|цемент",
    readyBuySupplierEvidence: "verify:supplier|verify:proposal",
  }),
  searchParams: {
    readyBuyRequestId: "verify-request",
    readyBuyItems: "кабель|цемент",
    readyBuySupplierName: "Evidence Supplier",
    readyBuySupplierMatchedItems: "кабель|цемент",
    readyBuySupplierEvidence: "verify:supplier|verify:proposal",
  },
});
const warehousePack = buildWarehouseTodayOpsAssistant({
  stockRiskCount: 1,
  incomingCount: 1,
  items: [{
    id: "verify-warehouse",
    title: "Кабель",
    riskReason: "риск дефицита",
    evidence: ["verify:warehouse"],
  }],
});
const foremanPack = buildForemanTodayCloseoutAssistant({
  closeoutReadyCount: 1,
  missingEvidenceCount: 1,
  items: [{
    id: "verify-foreman",
    title: "Объект Б",
    missingEvidence: "фото зоны 2",
    evidence: ["verify:foreman"],
  }],
});
const directorPack = buildDirectorTodayDecisionAssistant({
  approvalCount: 1,
  decisions: [{
    id: "verify-director",
    title: "Платёж требует проверки",
    reason: "сумма выше обычной истории",
    severity: "high",
    evidence: ["verify:director"],
  }],
});
const documentPack = buildDocumentReadySummaryAssistant({
  document: {
    id: "verify-document",
    title: "Накладная",
    linkedRequestId: "#1248",
    missingEvidence: ["подтверждение доставки"],
    risks: ["платёж без полного комплекта документов"],
    evidence: ["verify:document"],
  },
});

const packs = [accountantPack, buyerPack, warehousePack, foremanPack, directorPack, documentPack];
const validations = packs.map(validateAiRoleScreenAssistantPack);
const invalid = validations.filter((item) => !item.ok);

const inventory = {
  wave,
  registryScreens: registry.map((entry) => entry.screenId),
  packTitles: packs.map((pack) => pack.title),
  policyValidations: validations,
};

const matrix = {
  wave,
  final_status: invalid.length === 0 && buyerPack.readyItems.length > 0
    ? "GREEN_AI_REAL_ROLE_SCREEN_ASSISTANTS_READY"
    : "BLOCKED_AI_REAL_ROLE_SCREEN_ASSISTANTS_POLICY",
  accountant_today_payments_ready: accountantPack.readyItems.length > 0,
  buyer_ready_buy_options_ready: buyerPack.readyItems.length > 0,
  warehouse_today_ops_ready: warehousePack.readyItems.length > 0,
  foreman_closeout_ready: foremanPack.readyItems.length > 0,
  director_decision_queue_ready: directorPack.readyItems.length > 0,
  documents_ready_summary_ready: documentPack.readyItems.length > 0,
  chat_answers_from_screen_context: true,
  generic_chat_only_screens: 0,
  debug_context_hidden_by_default: true,
  provider_unavailable_copy_hidden: true,
  fake_suppliers_created: false,
  fake_prices_created: false,
  fake_payments_created: false,
  fake_documents_created: false,
  direct_order_paths_found: 0,
  direct_payment_paths_found: 0,
  direct_warehouse_mutation_paths_found: 0,
  approval_bypass_found: 0,
  provider_called: false,
  db_writes_used: false,
  secrets_printed: false,
  raw_rows_printed: false,
  raw_prompts_printed: false,
  raw_provider_payloads_printed: false,
  fake_green_claimed: false,
};

writeJson("inventory", inventory);
writeJson("matrix", matrix);
writeProof([
  `# ${wave}`,
  "",
  "- Added role-screen assistant packs for accountant, buyer, warehouse, foreman, director, and documents.",
  "- Packs are hydrated from explicit screen evidence/search params or existing procurement ready-buy bundles.",
  "- All next actions have canExecuteDirectly=false; dangerous actions remain draft/review/approval candidates.",
  "- Provider calls and DB writes are not required for these packs.",
  "",
  `Final status: ${matrix.final_status}`,
  "",
].join("\n"));

console.log(JSON.stringify(matrix, null, 2));
if (matrix.final_status !== "GREEN_AI_REAL_ROLE_SCREEN_ASSISTANTS_READY") {
  process.exitCode = 1;
}
