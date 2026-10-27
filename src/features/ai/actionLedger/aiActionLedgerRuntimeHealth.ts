import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  AI_ACTION_LEDGER_RPC_FUNCTIONS,
  type AiActionLedgerRpcTransport,
} from "./aiActionLedgerRpcTypes";

export type AiActionLedgerRuntimeHealthStatus =
  | "GREEN_AI_ACTION_LEDGER_RUNTIME_HEALTH_READY"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
  | "BLOCKED_LEDGER_RPC_NOT_DEPLOYED";

export type AiActionLedgerRuntimeHealth = {
  status: AiActionLedgerRuntimeHealthStatus;
  rpcProbe: "PASS" | "BLOCKED";
  checkedRpc: typeof AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus;
  authRequired: true;
  roleResolvedServerSide: true;
  evidenceRequired: true;
  auditRequired: true;
  idempotencyRequired: true;
  redactedPayloadOnly: true;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  rawProviderPayloadStored: false;
  secretsPrinted: false;
  serviceRoleFromMobile: false;
  blocker: Exclude<AiActionLedgerRuntimeHealthStatus, "GREEN_AI_ACTION_LEDGER_RUNTIME_HEALTH_READY"> | null;
  exactReason: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function hasMissingRpcShape(error: unknown): boolean {
  if (typeof error === "string") {
    return /PGRST202|Could not find the function|schema cache/i.test(error);
  }
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  const combined = [record.code, record.message, record.details, record.hint]
    .map(text)
    .filter(Boolean)
    .join(" ");
  return /PGRST202|Could not find the function|schema cache/i.test(combined);
}

function blocked(
  status: Exclude<AiActionLedgerRuntimeHealthStatus, "GREEN_AI_ACTION_LEDGER_RUNTIME_HEALTH_READY">,
  exactReason: string,
): AiActionLedgerRuntimeHealth {
  return {
    status,
    rpcProbe: "BLOCKED",
    checkedRpc: AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
    authRequired: true,
    roleResolvedServerSide: true,
    evidenceRequired: true,
    auditRequired: true,
    idempotencyRequired: true,
    redactedPayloadOnly: true,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    rawProviderPayloadStored: false,
    secretsPrinted: false,
    serviceRoleFromMobile: false,
    blocker: status,
    exactReason,
  };
}

export async function probeAiActionLedgerRuntimeHealth(params: {
  transport: AiActionLedgerRpcTransport | null | undefined;
  probeActionId: string;
  actorRole: AiUserRole;
}): Promise<AiActionLedgerRuntimeHealth> {
  if (!params.transport) {
    return blocked(
      "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      "AI action ledger persistence transport is not mounted.",
    );
  }

  const result = await params.transport(AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus, {
    p_action_id: params.probeActionId,
    p_actor_role: params.actorRole,
  });
  if (result.error) {
    return blocked(
      hasMissingRpcShape(result.error)
        ? "BLOCKED_LEDGER_RPC_NOT_DEPLOYED"
        : "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      hasMissingRpcShape(result.error)
        ? "AI action ledger RPC functions are not deployed in the PostgREST schema cache."
        : "AI action ledger RPC transport returned a persistence blocker.",
    );
  }

  return {
    status: "GREEN_AI_ACTION_LEDGER_RUNTIME_HEALTH_READY",
    rpcProbe: "PASS",
    checkedRpc: AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
    authRequired: true,
    roleResolvedServerSide: true,
    evidenceRequired: true,
    auditRequired: true,
    idempotencyRequired: true,
    redactedPayloadOnly: true,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    rawProviderPayloadStored: false,
    secretsPrinted: false,
    serviceRoleFromMobile: false,
    blocker: null,
    exactReason: null,
  };
}
