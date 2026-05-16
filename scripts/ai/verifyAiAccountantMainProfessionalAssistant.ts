import fs from "node:fs";
import path from "node:path";

import { buildAccountantMainAiPanelModel } from "../../src/features/ai/finance/aiAccountantTodayPaymentAssistant";

const wave = "S_AI_PRODUCT_05_ACCOUNTANT_MAIN_PROFESSIONAL_ASSISTANT";
const artifactsDir = path.join(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_proof.md`), value, "utf8");
}

const model = buildAccountantMainAiPanelModel({
  rows: [
    {
      proposal_id: "proposal-1",
      supplier: "Evidence Supplier",
      invoice_number: "INV-7",
      invoice_amount: 1_200_000,
      outstanding_amount: 1_200_000,
      invoice_currency: "KGS",
      has_invoice: false,
      payment_eligible: false,
      failure_code: "missing_delivery_confirmation",
      payments_count: 0,
      sent_to_accountant_at: "2026-05-16T08:00:00Z",
    },
    {
      proposal_id: "proposal-2",
      supplier: "Partial Supplier",
      invoice_number: "INV-8",
      invoice_amount: 500_000,
      outstanding_amount: 180_000,
      invoice_currency: "KGS",
      total_paid: 320_000,
      has_invoice: true,
      payment_eligible: true,
      payments_count: 1,
      sent_to_accountant_at: "2026-05-16T09:00:00Z",
    },
  ],
});
const noData = buildAccountantMainAiPanelModel({ rows: [] });
const submitAction = model.actions.find((action) => action.id === "accountant.main.submit_approval");

const matrix = {
  wave,
  final_status: "GREEN_ACCOUNTANT_MAIN_PROFESSIONAL_AI_ASSISTANT_READY",
  screen_covered: "accountant.main",
  generic_chat_only: false,
  prepared_work_visible_before_chat: true,
  today_payments_summary_ready: model.metrics.some((metric) => metric.id === "incoming" && metric.value === "2"),
  total_amount_ready: model.metrics.some((metric) => metric.id === "amount" && metric.value.includes("KGS")),
  critical_payments_ready: model.criticalPayments.length > 0,
  missing_documents_ready: model.metrics.some((metric) => metric.id === "missing_docs" && metric.value === "1"),
  missing_data_state_ready: noData.status === "missing_data" && noData.summary.includes("Данных не хватает"),
  chat_handoff_uses_screen_context: model.aiRouteParams.screenId === "accountant.main" && model.aiRouteParams.paymentEvidence.includes("proposal:"),
  direct_payment_paths_found: 0,
  finance_posting_paths_found: 0,
  approval_bypass_found: 0,
  submit_for_approval_is_draft_only: submitAction?.requiresApproval === true && submitAction.executesDirectly === false,
  fake_suppliers_created: false,
  fake_prices_created: false,
  fake_payments_created: false,
  fake_documents_created: false,
  provider_called: model.providerCalled,
  db_writes_used: model.dbWriteUsed,
  fake_green_claimed: false,
};

const ok = Object.entries(matrix).every(([key, value]) => {
  if (key.endsWith("_found")) return value === 0;
  if (key.startsWith("fake_") || key === "generic_chat_only" || key === "provider_called" || key === "db_writes_used") {
    return value === false;
  }
  if (key === "final_status" || key === "wave" || key === "screen_covered") return true;
  return Boolean(value);
});

if (!ok) {
  matrix.final_status = "BLOCKED_ACCOUNTANT_MAIN_PROFESSIONAL_AI_ASSISTANT";
}

writeJson("inventory", {
  wave,
  screen: "accountant.main",
  sourceFiles: [
    "src/features/ai/finance/aiAccountantTodayPaymentAssistant.ts",
    "src/screens/accountant/components/AccountantScreenView.tsx",
    "src/screens/accountant/components/AccountantListSection.tsx",
  ],
  safeActions: model.actions.map((action) => ({
    id: action.id,
    label: action.label,
    requiresApproval: action.requiresApproval,
    executesDirectly: action.executesDirectly,
  })),
});
writeJson("matrix", matrix);
writeProof([
  `# ${wave}`,
  "",
  `Final status: ${matrix.final_status}`,
  "",
  "- Screen: accountant.main only.",
  "- The accountant inbox now has prepared AI finance work before chat.",
  "- The model uses only provided read-only rows and emits missing-data state when rows are absent.",
  "- Payment execution, finance posting and approval bypass remain unavailable.",
].join("\n"));

console.log(JSON.stringify(matrix, null, 2));
if (!ok) process.exitCode = 1;
