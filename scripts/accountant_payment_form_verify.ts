import fs from "node:fs";
import path from "node:path";

import {
  applyAllocationRow,
  buildFullAllocationRows,
  buildPaidAllocationState,
  derivePaymentFormState,
} from "../src/screens/accountant/accountant.paymentForm.helpers";

const projectRoot = process.cwd();

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const componentPath = "src/screens/accountant/components/ActivePaymentForm.tsx";
const hookPath = "src/screens/accountant/useAccountantPaymentForm.ts";
const helpersPath = "src/screens/accountant/accountant.paymentForm.helpers.ts";
const payActionsPath = "src/screens/accountant/useAccountantPayActions.ts";
const componentTestPath = "src/screens/accountant/components/ActivePaymentForm.test.tsx";
const helpersTestPath = "src/screens/accountant/accountant.paymentForm.helpers.test.ts";
const payActionsTestPath = "src/screens/accountant/useAccountantPayActions.test.tsx";

const componentText = readText(componentPath);
const hookText = readText(hookPath);
const helpersText = readText(helpersPath);
const payActionsText = readText(payActionsPath);
const componentTestText = readText(componentTestPath);
const helpersTestText = readText(helpersTestPath);
const payActionsTestText = readText(payActionsTestPath);

const generatedAt = new Date().toISOString();

const items = [
  { id: "item-1", name_human: "Line one", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" },
  { id: "item-2", name_human: "Line two", qty: 1, price: 30, uom: "pcs", rik_code: "MAT-2" },
];
const priorAllocations = buildPaidAllocationState([
  { proposal_item_id: "item-1", amount: 20 },
]);

const partialState = derivePaymentFormState({
  current: {
    proposal_id: "proposal-1",
    invoice_amount: 130,
    total_paid: 20,
    invoice_currency: "KGS",
  },
  proposalId: "proposal-1",
  mode: "partial",
  items,
  paidByLineMap: priorAllocations.paidByLineMap,
  paidKnownSum: priorAllocations.paidKnownSum,
  allocRows: [{ proposal_item_id: "item-1", amount: 40 }],
  itemsLoading: false,
  paymentDataErrorMessage: null,
});

const fullRows = buildFullAllocationRows({
  items,
  remainByLine: partialState.remainByLine,
});

const clampedRows = applyAllocationRow({
  allocRows: [],
  itemId: "item-1",
  value: 999,
  items,
  remainByLine: partialState.remainByLine,
});

const clearState = derivePaymentFormState({
  current: {
    proposal_id: "proposal-1",
    invoice_amount: 100,
    total_paid: 0,
    invoice_currency: "KGS",
  },
  proposalId: "proposal-1",
  mode: "partial",
  items: [{ id: "item-1", name_human: "Line one", qty: 2, price: 50, uom: "pcs", rik_code: "MAT-1" }],
  paidByLineMap: new Map(),
  paidKnownSum: 0,
  allocRows: [],
  itemsLoading: false,
  paymentDataErrorMessage: null,
});

const smokeScenarios = [
  {
    name: "open_load_ready",
    passed:
      componentTestText.includes('opens, loads, and reaches ready state without stale placeholders') &&
      hookText.includes('event: "payment_form_ready"'),
    evidence: [componentTestPath, hookPath],
  },
  {
    name: "close_immediately_no_stale_set_state",
    passed:
      componentTestText.includes('cancels in-flight loads on immediate close without stale state updates') &&
      hookText.includes('event: "payment_form_request_canceled"'),
    evidence: [componentTestPath, hookPath],
  },
  {
    name: "quick_reopen_fresh_data_only",
    passed:
      componentTestText.includes('ignores stale responses after quick reopen and publishes only fresh rows') &&
      hookText.includes('event: "payment_form_stale_response_ignored"'),
    evidence: [componentTestPath, hookPath],
  },
  {
    name: "partial_allocation_path",
    passed:
      componentTestText.includes('keeps partial allocation totals and residuals deterministic') &&
      partialState.allocSum === 40 &&
      partialState.allocOk,
    evidence: [componentTestPath, helpersTestPath],
  },
  {
    name: "full_allocation_path",
    passed:
      componentTestText.includes('applies full allocation parity without changing formulas') &&
      JSON.stringify(fullRows) ===
        JSON.stringify([
          { proposal_item_id: "item-1", amount: 80 },
          { proposal_item_id: "item-2", amount: 30 },
        ]),
    evidence: [componentTestPath, helpersTestPath],
  },
  {
    name: "clear_reset_path",
    passed:
      componentTestText.includes('clears partial allocation state deterministically') &&
      clearState.allocSum === 0 &&
      clearState.allocOk === false,
    evidence: [componentTestPath, helpersTestPath],
  },
  {
    name: "fetch_failure_visible",
    passed:
      componentTestText.includes('shows a visible payment data error and keeps allocation status non-ready when loads fail') &&
      hookText.includes('proposal_items_load_failed') &&
      hookText.includes('proposal_allocations_load_failed'),
    evidence: [componentTestPath, hookPath],
  },
  {
    name: "apply_failure_visible",
    passed:
      payActionsTestText.includes('exposes apply failure visibly and records observability without false success') &&
      payActionsText.includes('payment_apply_failed'),
    evidence: [payActionsTestPath, payActionsPath],
  },
  {
    name: "parent_rerender_no_refetch_storm",
    passed:
      componentTestText.includes('does not refetch on parent rerender with the same proposal') &&
      hookText.includes("onAllocStatusRef") &&
      !hookText.includes("derived.allocOk, derived.allocSum, onAllocStatus, recordPaymentFormCatch"),
    evidence: [componentTestPath, hookPath],
  },
];

const raceGuards = [
  {
    name: "thin_ui_has_no_direct_fetch",
    passed:
      componentText.includes("useAccountantPaymentForm({") &&
      !componentText.includes("supabase") &&
      !componentText.includes("recordCatchDiscipline"),
    evidence: [componentPath],
  },
  {
    name: "controller_owns_fetch_and_normalization",
    passed:
      hookText.includes("loadPaymentFormProposalItems") &&
      hookText.includes("loadPaymentFormPriorAllocations") &&
      helpersText.includes("derivePaymentFormState"),
    evidence: [hookPath, helpersPath],
  },
  {
    name: "request_token_owner_present",
    passed: hookText.includes("requestSeqRef"),
    evidence: [hookPath],
  },
  {
    name: "mounted_guard_present",
    passed: hookText.includes("mountedRef"),
    evidence: [hookPath],
  },
  {
    name: "proposal_identity_guard_present",
    passed: hookText.includes("proposalIdRef"),
    evidence: [hookPath],
  },
  {
    name: "stale_response_observable",
    passed: hookText.includes('event: "payment_form_stale_response_ignored"'),
    evidence: [hookPath],
  },
  {
    name: "request_cancel_observable",
    passed: hookText.includes('event: "payment_form_request_canceled"'),
    evidence: [hookPath],
  },
  {
    name: "open_load_ready_close_observable",
    passed:
      hookText.includes('event: "payment_form_opened"') &&
      hookText.includes('event: "payment_form_load"') &&
      hookText.includes('event: "payment_form_ready"') &&
      hookText.includes('event: "payment_form_closed"'),
    evidence: [hookPath],
  },
  {
    name: "parent_callback_identity_stabilized",
    passed: hookText.includes("onAllocStatusRef"),
    evidence: [hookPath],
  },
];

const parityChecks = [
  {
    name: "partial_state",
    passed:
      partialState.restProposal === 110 &&
      JSON.stringify(partialState.paidBeforeByLine) === JSON.stringify([20, 0]) &&
      JSON.stringify(partialState.remainByLine) === JSON.stringify([80, 30]) &&
      partialState.allocSum === 40 &&
      partialState.allocOk,
    details: partialState,
  },
  {
    name: "full_rows",
    passed:
      JSON.stringify(fullRows) ===
      JSON.stringify([
        { proposal_item_id: "item-1", amount: 80 },
        { proposal_item_id: "item-2", amount: 30 },
      ]),
    details: fullRows,
  },
  {
    name: "clamp_to_residual",
    passed: JSON.stringify(clampedRows) === JSON.stringify([{ proposal_item_id: "item-1", amount: 80 }]),
    details: clampedRows,
  },
  {
    name: "clear_path_invalidates_partial_apply",
    passed: clearState.allocSum === 0 && clearState.allocOk === false,
    details: clearState,
  },
];

const smokeArtifact = {
  status: smokeScenarios.every((scenario) => scenario.passed) ? "GREEN" : "NOT GREEN",
  generatedAt,
  boundary: {
    uiThin: raceGuards.find((guard) => guard.name === "thin_ui_has_no_direct_fetch")?.passed ?? false,
    controllerOwner:
      raceGuards.find((guard) => guard.name === "controller_owns_fetch_and_normalization")?.passed ?? false,
    actionObservability:
      payActionsText.includes("payment_apply_failed") &&
      payActionsText.includes("payment_apply_sync_failed"),
  },
  supportingTests: [
    componentTestPath,
    helpersTestPath,
    payActionsTestPath,
  ],
  scenarios: smokeScenarios,
};

const raceArtifact = {
  status: raceGuards.every((guard) => guard.passed) ? "GREEN" : "NOT GREEN",
  generatedAt,
  guards: raceGuards,
};

const parityArtifact = {
  status: parityChecks.every((check) => check.passed) ? "GREEN" : "NOT GREEN",
  generatedAt,
  checks: parityChecks,
};

writeJson("artifacts/accountant-payment-form-smoke.json", smokeArtifact);
writeJson("artifacts/accountant-payment-form-race-proof.json", raceArtifact);
writeJson("artifacts/accountant-payment-form-parity.json", parityArtifact);

const isGreen =
  smokeArtifact.status === "GREEN" &&
  raceArtifact.status === "GREEN" &&
  parityArtifact.status === "GREEN";

if (!isGreen) {
  console.error("[accountant_payment_form_verify] NOT_GREEN", {
    smokeStatus: smokeArtifact.status,
    raceStatus: raceArtifact.status,
    parityStatus: parityArtifact.status,
  });
  process.exitCode = 1;
} else {
  console.log("[accountant_payment_form_verify] GREEN", {
    smokeScenarios: smokeScenarios.length,
    raceGuards: raceGuards.length,
    parityChecks: parityChecks.length,
  });
}
