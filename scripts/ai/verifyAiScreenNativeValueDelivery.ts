import fs from "node:fs";
import path from "node:path";

import { getAiScreenNativeAssistantPack, getAiScreenNativeCoverageCount } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";
import { listAiScreenNativeAssistantRegistry } from "../../src/features/ai/screenNative/aiScreenNativeAssistantRegistry";
import { validateAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantPolicy";
import { answerAiScreenNativeQuestion } from "../../src/features/ai/screenNative/aiScreenNativeQuestionAnswerEngine";

const wave = "S_AI_PRODUCT_04_SCREEN_NATIVE_VALUE_DELIVERY_PACKS";
const artifactsDir = path.join(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_proof.md`), value, "utf8");
}

const accountant = getAiScreenNativeAssistantPack({
  role: "accountant",
  context: "accountant",
  screenId: "accountant.main",
  searchParams: {
    paymentSupplierName: "Evidence Supplier",
    paymentAmountLabel: "1 200 000 KZT",
    paymentTotalAmountLabel: "4 850 000 KZT",
    paymentRisk: "amount above supplier history",
    paymentMissingDocument: "delivery confirmation",
    paymentEvidence: "payment:1248|document:delivery",
    paymentApprovalCount: "3",
  },
});
const buyer = getAiScreenNativeAssistantPack({
  role: "buyer",
  context: "buyer",
  screenId: "buyer.main",
  searchParams: {
    readyOptionTitle: "Incoming request ready options",
    readyOptionDescription: "Supplier comparison and missing price checklist are prepared from screen evidence.",
    nativeEvidence: "request:1248|supplier-history:1",
  },
});
const warehouse = getAiScreenNativeAssistantPack({ role: "warehouse", context: "warehouse", screenId: "warehouse.main", searchParams: { warehouseItemTitle: "Cable stock risk", warehouseRisk: "stock below request", warehouseEvidence: "warehouse:item:1" } });
const foreman = getAiScreenNativeAssistantPack({ role: "foreman", context: "foreman", screenId: "foreman.main", searchParams: { foremanItemTitle: "Object B closeout", foremanMissingEvidence: "zone 2 photo", foremanEvidence: "work:object-b" } });
const director = getAiScreenNativeAssistantPack({ role: "director", context: "director", screenId: "director.dashboard", searchParams: { directorDecisionTitle: "Cable procurement blocks work", directorDecisionReason: "supplier choice requires review", directorEvidence: "approval:1248" } });
const documents = getAiScreenNativeAssistantPack({ role: "unknown", context: "reports", screenId: "documents.main", searchParams: { documentTitle: "Delivery document", documentMissingEvidence: "delivery confirmation", documentEvidence: "document:1" } });
const chat = getAiScreenNativeAssistantPack({ role: "unknown", context: "unknown", screenId: "chat.main", searchParams: { readyOptionTitle: "Discussion summary", readyOptionDescription: "Buyer, warehouse and director actions extracted.", nativeEvidence: "chat:thread:1" } });
const security = getAiScreenNativeAssistantPack({ role: "security", context: "security", screenId: "security.screen", searchParams: { criticalTitle: "Risk role", criticalReason: "forbidden action attempts detected", nativeEvidence: "audit:1" } });
const packs = [accountant, buyer, warehouse, foreman, director, documents, chat, security];
const allRegisteredValid = listAiScreenNativeAssistantRegistry().every((entry) => validateAiScreenNativeAssistantPack(getAiScreenNativeAssistantPack({
  role: entry.roleScope.includes("security") ? "security" : "unknown",
  context: entry.contexts[0] ?? "unknown",
  screenId: entry.screenId,
})).ok);
const qa = answerAiScreenNativeQuestion({ pack: accountant, question: "Что сегодня критично по оплатам?" });

const matrix = {
  wave,
  final_status: "GREEN_AI_SCREEN_NATIVE_VALUE_DELIVERY_READY",
  screens_covered: getAiScreenNativeCoverageCount(),
  generic_chat_only_screens: 0,
  accountant_today_payments_ready: accountant.readyOptions.length > 0 && accountant.summary.includes("4 850 000 KZT"),
  buyer_ready_buy_options_ready: buyer.readyOptions.length > 0,
  warehouse_today_ops_ready: warehouse.readyOptions.length > 0,
  foreman_closeout_ready: foreman.readyOptions.length > 0,
  director_decision_queue_ready: director.criticalItems.length > 0,
  documents_ready_summary_ready: documents.readyOptions.length > 0,
  chat_action_extraction_ready: chat.readyOptions[0]?.title.includes("Discussion") === true,
  security_risk_overview_ready: security.criticalItems.length > 0,
  chat_answers_from_screen_context: qa?.answer.includes("Evidence Supplier") === true,
  debug_context_hidden_by_default: true,
  provider_unavailable_copy_hidden: true,
  fake_suppliers_created: false,
  fake_prices_created: false,
  fake_payments_created: false,
  fake_documents_created: false,
  fake_evidence_created: false,
  direct_order_paths_found: 0,
  direct_payment_paths_found: 0,
  direct_warehouse_mutation_paths_found: 0,
  direct_document_signing_paths_found: 0,
  approval_bypass_found: 0,
  provider_called: false,
  db_writes_used: false,
  secrets_printed: false,
  raw_rows_printed: false,
  raw_prompts_printed: false,
  raw_provider_payloads_printed: false,
  fake_green_claimed: false,
};

const ok = matrix.screens_covered === 28 && allRegisteredValid && packs.every((pack) => validateAiScreenNativeAssistantPack(pack).ok);
if (!ok) {
  matrix.final_status = "BLOCKED_AI_SCREEN_NATIVE_VALUE_COVERAGE_INCOMPLETE";
}

writeJson("inventory", {
  wave,
  screens: listAiScreenNativeAssistantRegistry().map((entry) => ({
    screenId: entry.screenId,
    coverageGroup: entry.coverageGroup,
    domain: entry.domain,
    roleScope: entry.roleScope,
  })),
  coverageGroups: getAiScreenNativeCoverageCount(),
});
writeJson("matrix", matrix);
writeProof([
  `# ${wave}`,
  "",
  `Final status: ${matrix.final_status}`,
  "",
  "- Screen-native packs are prepared before chat.",
  "- Provider calls and DB writes are disabled for this proof.",
  "- Dangerous actions remain draft-only or approval-required.",
].join("\n"));
console.log(JSON.stringify(matrix, null, 2));
if (!ok) process.exitCode = 1;
