import type { AppSupabaseClient } from "../../lib/dbContract.types";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  classifyProposalActionFailure,
  getProposalActionErrorMessage,
  readbackApprovedProposalTruth,
  type ApprovedProposalServerTruth,
  type ProposalActionTerminalClass,
} from "../../lib/api/proposalActionBoundary";
import { toProposalRequestItemIntegrityDegradedError } from "../../lib/api/proposalIntegrity";
import {
  isRpcBoolean,
  isRpcOptionalBoolean,
  isRpcOptionalString,
  isRpcRecord,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import { callDirectorApprovePipelineRpc } from "./director.approve.transport";

export type DirectorApprovePipelineResult = {
  proposalId: string;
  purchaseId: string | null;
  workSeedOk: boolean;
  workSeedError: string | null;
  idempotentReplay: boolean;
  terminalClass: "success";
  serverTruth: ApprovedProposalServerTruth;
};

export class DirectorApproveBoundaryError extends Error {
  readonly terminalClass: ProposalActionTerminalClass;
  readonly failureCode: string | null;
  readonly causeError: unknown;

  constructor(params: {
    message: string;
    terminalClass: ProposalActionTerminalClass;
    failureCode?: string | null;
    causeError?: unknown;
  }) {
    super(params.message);
    this.name = "DirectorApproveBoundaryError";
    this.terminalClass = params.terminalClass;
    this.failureCode = params.failureCode ?? null;
    this.causeError = params.causeError;
  }
}

const text = (value: unknown): string => String(value ?? "").trim();

const isDirectorApprovePipelineResponse = (value: unknown): value is Record<string, unknown> => {
  if (!isRpcRecord(value)) return false;
  if (value.ok === false) {
    return isRpcOptionalString(value.failure_code) && isRpcOptionalString(value.failure_message);
  }

  return (
    (value.ok == null || isRpcBoolean(value.ok)) &&
    isRpcOptionalString(value.purchase_id) &&
    isRpcOptionalBoolean(value.work_seed_ok) &&
    isRpcOptionalString(value.work_seed_error) &&
    isRpcOptionalBoolean(value.idempotent_replay)
  );
};

const recordApproveEvent = (
  event: string,
  result: "success" | "error",
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "director",
    surface: "director_proposal_approve",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:director:approve_proposal",
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error ? getProposalActionErrorMessage(error, "director approve failed") : undefined,
    extra,
  });
};

export async function runDirectorApprovePipelineAction(params: {
  supabase: AppSupabaseClient;
  proposalId: string;
  clientMutationId: string;
}): Promise<DirectorApprovePipelineResult> {
  const proposalId = text(params.proposalId);
  const clientMutationId = text(params.clientMutationId);
  const eventBase = { proposalId, clientMutationId };

  recordApproveEvent("director_approve_started", "success", eventBase);

  try {
    recordApproveEvent("director_approve_rpc_invoked", "success", eventBase);
    const { data, error } = await callDirectorApprovePipelineRpc(params.supabase, {
      p_proposal_id: proposalId,
      p_comment: null,
      p_invoice_currency: "KGS",
      p_client_mutation_id: clientMutationId,
    });

    if (error) {
      const normalized = toProposalRequestItemIntegrityDegradedError(error) ?? error;
      throw new DirectorApproveBoundaryError({
        message: getProposalActionErrorMessage(
          normalized,
          "Не удалось утвердить предложение.",
        ),
        terminalClass: classifyProposalActionFailure(normalized),
        causeError: normalized,
      });
    }

    const result = validateRpcResponse(data, isDirectorApprovePipelineResponse, {
      rpcName: "director_approve_pipeline_v1",
      caller: "src/screens/director/director.approve.boundary.runDirectorApprovePipelineAction",
      domain: "director",
    });
    recordApproveEvent("director_approve_result_received", "success", {
      ...eventBase,
      ok: result?.ok !== false,
      idempotentReplay: result?.idempotent_replay === true,
    });

    if (result && result.ok === false) {
      const failureMessage =
        text(result.failure_message) || "Не удалось утвердить предложение.";
      throw new DirectorApproveBoundaryError({
        message: failureMessage,
        terminalClass: classifyProposalActionFailure({
          code: result.failure_code,
          message: failureMessage,
        }),
        failureCode: text(result.failure_code) || null,
        causeError: result,
      });
    }

    recordApproveEvent("director_approve_readback_started", "success", eventBase);
    const serverTruth = await readbackApprovedProposalTruth(params.supabase, proposalId);
    recordApproveEvent("director_approve_readback_completed", "success", {
      ...eventBase,
      sentToAccountantAt: serverTruth.sentToAccountantAt,
      status: serverTruth.status,
    });

    const approved: DirectorApprovePipelineResult = {
      proposalId,
      purchaseId: result ? text(result.purchase_id) || null : null,
      workSeedOk: result ? result.work_seed_ok !== false : true,
      workSeedError: result ? text(result.work_seed_error) || null : null,
      idempotentReplay: result ? result.idempotent_replay === true : false,
      terminalClass: "success",
      serverTruth,
    };

    recordApproveEvent("director_approve_terminal_success", "success", {
      ...eventBase,
      purchaseId: approved.purchaseId,
      idempotentReplay: approved.idempotentReplay,
    });

    return approved;
  } catch (error) {
    const normalized =
      error instanceof DirectorApproveBoundaryError
        ? error
        : new DirectorApproveBoundaryError({
            message: getProposalActionErrorMessage(
              toProposalRequestItemIntegrityDegradedError(error) ?? error,
              "Не удалось утвердить предложение.",
            ),
            terminalClass: classifyProposalActionFailure(error),
            causeError: error,
          });

    recordApproveEvent("director_approve_terminal_failure", "error", {
      ...eventBase,
      terminalClass: normalized.terminalClass,
      failureCode: normalized.failureCode,
    }, normalized);

    throw normalized;
  }
}
