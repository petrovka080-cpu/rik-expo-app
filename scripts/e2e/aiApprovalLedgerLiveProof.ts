import fs from "node:fs";
import path from "node:path";

export type AiApprovalLedgerLiveProof = {
  green: boolean;
  matrixPath: string;
  status: string;
  exactReason: string | null;
  submitForApprovalPersistedPending: boolean;
  getStatusReadsPending: boolean;
  approvePersistsApproved: boolean;
  getStatusReadsApproved: boolean;
  executeApprovedCentralGateway: boolean;
  getStatusReadsExecuted: boolean;
  idempotencyReplaySafe: boolean;
  auditRequired: boolean;
  evidenceRequired: boolean;
  ledgerMutationsCreated: number;
  boundedProcurementDraftMutationCreated: boolean;
  unsafeDomainMutationsCreated: number;
  androidRuntimeSmoke: "PASS" | "BLOCKED";
  developerControlE2e: "PASS" | "BLOCKED";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bool(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function numberValue(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function resolveAiApprovalLedgerLiveProof(
  projectRoot = process.cwd(),
): AiApprovalLedgerLiveProof {
  const matrixPath = path.join(
    projectRoot,
    "artifacts",
    "S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E_matrix.json",
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as unknown;
  } catch {
    return {
      green: false,
      matrixPath,
      status: "missing",
      exactReason: "Canonical live approval ledger proof artifact is missing or invalid.",
      submitForApprovalPersistedPending: false,
      getStatusReadsPending: false,
      approvePersistsApproved: false,
      getStatusReadsApproved: false,
      executeApprovedCentralGateway: false,
      getStatusReadsExecuted: false,
      idempotencyReplaySafe: false,
      auditRequired: false,
      evidenceRequired: false,
      ledgerMutationsCreated: 0,
      boundedProcurementDraftMutationCreated: false,
      unsafeDomainMutationsCreated: 0,
      androidRuntimeSmoke: "BLOCKED",
      developerControlE2e: "BLOCKED",
    };
  }

  if (!isRecord(parsed)) {
    return {
      green: false,
      matrixPath,
      status: "invalid",
      exactReason: "Canonical live approval ledger proof artifact is not a JSON object.",
      submitForApprovalPersistedPending: false,
      getStatusReadsPending: false,
      approvePersistsApproved: false,
      getStatusReadsApproved: false,
      executeApprovedCentralGateway: false,
      getStatusReadsExecuted: false,
      idempotencyReplaySafe: false,
      auditRequired: false,
      evidenceRequired: false,
      ledgerMutationsCreated: 0,
      boundedProcurementDraftMutationCreated: false,
      unsafeDomainMutationsCreated: 0,
      androidRuntimeSmoke: "BLOCKED",
      developerControlE2e: "BLOCKED",
    };
  }

  const status = text(parsed, "final_status");
  const submitForApprovalPersistedPending = bool(parsed, "submit_for_approval_persisted_pending");
  const getStatusReadsPending = bool(parsed, "get_status_reads_pending");
  const approvePersistsApproved = bool(parsed, "approve_persists_approved");
  const getStatusReadsApproved = bool(parsed, "get_status_reads_approved");
  const executeApprovedCentralGateway = bool(parsed, "execute_approved_central_gateway");
  const getStatusReadsExecuted = bool(parsed, "get_status_reads_executed");
  const idempotencyReplaySafe = bool(parsed, "idempotency_replay_safe");
  const auditRequired = bool(parsed, "audit_required");
  const evidenceRequired = bool(parsed, "evidence_required");
  const ledgerMutationsCreated = numberValue(parsed, "ledger_mutations_created");
  const boundedProcurementDraftMutationCreated = bool(parsed, "bounded_procurement_draft_mutation_created");
  const unsafeDomainMutationsCreated = numberValue(parsed, "unsafe_domain_mutations_created");
  const androidRuntimeSmoke = text(parsed, "android_runtime_smoke") === "PASS" ? "PASS" : "BLOCKED";
  const developerControlE2e = text(parsed, "developer_control_e2e") === "PASS" ? "PASS" : "BLOCKED";

  const requiredChecks: Record<string, boolean> = {
    final_status: status === "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E",
    signature_aware_rpc_verify: bool(parsed, "signature_aware_rpc_verify"),
    ledger_rpc_visible: bool(parsed, "ledger_rpc_visible"),
    pgrst202_false: parsed.pgrst202 === false,
    pgrst203_false: parsed.pgrst203 === false,
    old_stub_overloads_false: parsed.old_stub_overloads === false,
    active_rpc_count_6: numberValue(parsed, "active_rpc_count") === 6,
    submit_for_approval_persisted_pending: submitForApprovalPersistedPending,
    get_status_reads_pending: getStatusReadsPending,
    approve_persists_approved: approvePersistsApproved,
    get_status_reads_approved: getStatusReadsApproved,
    execute_approved_central_gateway: executeApprovedCentralGateway,
    get_status_reads_executed: getStatusReadsExecuted,
    idempotency_replay_safe: idempotencyReplaySafe,
    audit_required: auditRequired,
    evidence_required: evidenceRequired,
    ledger_mutations_created: ledgerMutationsCreated === 1,
    unsafe_domain_mutations_created: unsafeDomainMutationsCreated === 0,
    supplier_confirmed_false: parsed.supplier_confirmed === false,
    order_created_false: parsed.order_created === false,
    warehouse_mutated_false: parsed.warehouse_mutated === false,
    payment_created_false: parsed.payment_created === false,
    external_live_fetch_false: parsed.external_live_fetch === false,
    android_runtime_smoke_pass: androidRuntimeSmoke === "PASS",
    developer_control_e2e_pass: developerControlE2e === "PASS",
    fake_execution_false: parsed.fake_execution === false,
    fake_green_claimed_false: parsed.fake_green_claimed === false,
    secrets_printed_false: parsed.secrets_printed === false,
  };
  const failedChecks = Object.entries(requiredChecks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    green: failedChecks.length === 0,
    matrixPath,
    status,
    exactReason:
      failedChecks.length === 0
        ? null
        : `Canonical live approval ledger proof is not green: ${failedChecks.join(", ")}.`,
    submitForApprovalPersistedPending,
    getStatusReadsPending,
    approvePersistsApproved,
    getStatusReadsApproved,
    executeApprovedCentralGateway,
    getStatusReadsExecuted,
    idempotencyReplaySafe,
    auditRequired,
    evidenceRequired,
    ledgerMutationsCreated,
    boundedProcurementDraftMutationCreated,
    unsafeDomainMutationsCreated,
    androidRuntimeSmoke,
    developerControlE2e,
  };
}
