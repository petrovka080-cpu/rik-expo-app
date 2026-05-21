import crypto from "node:crypto";

import type {
  AiApprovalActionKind,
  AiApprovalExecutionIdempotency,
  AiApprovalRequest,
  AiExecutionBoundaryResult,
} from "./aiApprovalTypes";

export function stableAiApprovalHash(value: unknown): string {
  const hash = crypto.createHash("sha256");
  hash.write(JSON.stringify(value));
  hash.end();
  return hash.digest("hex").slice(0, 24);
}

export function createAiApprovalExecutionIdempotency(params: {
  request: AiApprovalRequest;
  actionKind?: AiApprovalActionKind;
}): AiApprovalExecutionIdempotency {
  return {
    idempotencyKey: stableAiApprovalHash([
      params.request.id,
      params.actionKind ?? params.request.actionKind,
      params.request.sourceRefIds,
      params.request.impactDiff,
    ]),
    approvalRequestId: params.request.id,
    actionKind: params.actionKind ?? params.request.actionKind,
    payloadHash: stableAiApprovalHash(params.request.impactDiff),
    status: "not_executed",
    resultRefIds: [],
  };
}

export function markAiApprovalExecutionIdempotencyResult(params: {
  idempotency: AiApprovalExecutionIdempotency;
  result: AiExecutionBoundaryResult;
  executedAt: string;
}): AiApprovalExecutionIdempotency {
  return {
    ...params.idempotency,
    firstExecutionAt: params.result.status === "executed" ? params.executedAt : params.idempotency.firstExecutionAt,
    status:
      params.result.status === "executed" || params.result.status === "already_executed"
        ? "executed"
        : params.result.status === "failed"
          ? "execution_failed"
          : "blocked",
    resultRefIds: params.result.createdOrChangedRefs.map((ref) => ref.sourceRefId ?? ref.entityId),
  };
}

export function isAiApprovalDuplicateExecution(params: {
  idempotency: AiApprovalExecutionIdempotency;
  idempotencyKey: string;
}): boolean {
  return params.idempotency.status === "executed" && params.idempotency.idempotencyKey === params.idempotencyKey;
}
