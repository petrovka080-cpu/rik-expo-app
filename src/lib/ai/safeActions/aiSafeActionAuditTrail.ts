import { stableAiSafeActionHash } from "./aiSafeActionIdempotency";
import type { AiSafeActionAuditEvent, AiSafeActionDraft } from "./aiSafeActionTypes";

export function createAiSafeActionAuditEvent(params: {
  actionDraftId: string;
  event: AiSafeActionAuditEvent["event"];
  actor: AiSafeActionAuditEvent["actor"];
  userId?: string;
  timestamp: string;
  sourceTraceId?: string;
}): AiSafeActionAuditEvent {
  return {
    id: `safe_action_audit:${stableAiSafeActionHash([
      params.actionDraftId,
      params.event,
      params.actor,
      params.timestamp,
    ].join(":"))}`,
    actionDraftId: params.actionDraftId,
    event: params.event,
    actor: params.actor,
    userId: params.userId,
    timestamp: params.timestamp,
    sourceTraceId: params.sourceTraceId,
    safeToShowToUser: true,
  };
}

export function createAiSafeActionAuditTrail(draft: Pick<AiSafeActionDraft, "id" | "userId" | "createdAt" | "sourceTraceId">): AiSafeActionAuditEvent[] {
  return [
    createAiSafeActionAuditEvent({
      actionDraftId: draft.id,
      event: "draft_proposed_by_ai",
      actor: "ai",
      userId: draft.userId,
      timestamp: draft.createdAt,
      sourceTraceId: draft.sourceTraceId,
    }),
    createAiSafeActionAuditEvent({
      actionDraftId: draft.id,
      event: "preconditions_checked",
      actor: "system",
      userId: draft.userId,
      timestamp: draft.createdAt,
      sourceTraceId: draft.sourceTraceId,
    }),
    createAiSafeActionAuditEvent({
      actionDraftId: draft.id,
      event: "impact_diff_shown",
      actor: "system",
      userId: draft.userId,
      timestamp: draft.createdAt,
      sourceTraceId: draft.sourceTraceId,
    }),
  ];
}
