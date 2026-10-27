import { loadAiTaskStreamRuntime } from "../../taskStream/aiTaskStreamRuntime";
import type {
  AiTaskStreamCard,
  AiTaskStreamRuntimeEvidenceInput,
  EvidenceRef,
} from "../../taskStream/aiTaskStreamRuntimeTypes";
import type {
  AiTaskStreamTransportInput,
  AiToolTransportAuthContext,
} from "./aiToolTransportTypes";

export const TASK_STREAM_TRANSPORT_ROUTE_SCOPE = "agent.task_stream.read" as const;

export type TaskStreamTransportRequest = {
  auth: AiToolTransportAuthContext | null;
  input: AiTaskStreamTransportInput;
  evidence?: AiTaskStreamRuntimeEvidenceInput;
};

export type TaskStreamTransportOutput = {
  status: "loaded" | "empty" | "blocked";
  screenId: string;
  cards: readonly AiTaskStreamCard[];
  nextCursor: string | null;
  evidenceRefs: readonly EvidenceRef[];
  blockedReason: string | null;
  routeScope: typeof TASK_STREAM_TRANSPORT_ROUTE_SCOPE;
  boundedRequest: true;
  dtoOnly: true;
  redactionRequired: true;
  rawRowsExposed: false;
  rawProviderPayloadExposed: false;
  mutationCount: 0;
};

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().replace(/\s+/g, " ")
    : fallback;
}

export function readTaskStreamTransport(
  request: TaskStreamTransportRequest,
): TaskStreamTransportOutput {
  const runtime = loadAiTaskStreamRuntime({
    auth: request.auth,
    screenId: normalizeText(request.input.screen_id, "ai.command.center"),
    cursor: request.input.cursor,
    limit: request.input.limit,
    evidence: request.evidence,
    nowIso: request.input.now_iso,
  });

  return {
    status: runtime.status,
    screenId: runtime.screenId,
    cards: runtime.cards,
    nextCursor: runtime.nextCursor,
    evidenceRefs: runtime.evidenceRefs,
    blockedReason: runtime.blockedReason ?? null,
    routeScope: TASK_STREAM_TRANSPORT_ROUTE_SCOPE,
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
    mutationCount: 0,
  };
}
