import { logger } from "../../lib/logger";

export type ConsumerRepairQuantityEditSource = "stepper" | "direct_input" | "programmatic";

export type ConsumerRepairQuantityEditStage =
  | "QUANTITY_ACTION_RECEIVED"
  | "VISIBLE_INPUT_UPDATED"
  | "ROW_DRAFT_REACT_COMMITTED"
  | "CANONICAL_MUTATION_APPLIED"
  | "PERSISTENCE_ENQUEUED"
  | "RECALCULATION_STARTED"
  | "RECALCULATION_COMPLETED"
  | "PERSISTENCE_STARTED"
  | "PERSISTENCE_COMMITTED"
  | "REVISION_CONFIRMED"
  | "PERSISTENCE_FAILED";

export type ConsumerRepairQuantityChangeMeta = {
  operationId: string;
  source: ConsumerRepairQuantityEditSource;
  previousQuantity: number | null;
  nextQuantity: number | null;
};

export type ConsumerRepairQuantityEditTraceEvent = ConsumerRepairQuantityChangeMeta & {
  stage: ConsumerRepairQuantityEditStage;
  itemId: string;
  requestDraftId?: string | null;
  baseRevisionId?: string | null;
  resultingRevisionId?: string | null;
  resultingRowsHash?: string | null;
  rowCount?: number | null;
  elapsedMs?: number | null;
  errorCode?: string | null;
  createdAt: string;
  monotonicMs: number;
};

type QuantityEditTraceStore = {
  schema: "consumer_repair_quantity_edit_trace_v1";
  events: ConsumerRepairQuantityEditTraceEvent[];
};

type QuantityEditTraceGlobal = typeof globalThis & {
  __consumerRepairQuantityEditTrace?: QuantityEditTraceStore;
};

const MAX_TRACE_EVENTS = 160;

/** Developer-only attribution of synchronous work during a pending row action. */
export function measureConsumerRepairQuantityRenderWork<T>(
  phase: "SCREEN_RENDER_MODEL" | "DRAFT_VIEW_MODEL" | "PUBLIC_TITLE_ADMISSION"
    | "PUBLIC_ROW_SECTIONS" | "VISIBLE_LINES" | "PREVIEW_SECTIONS" | "CALCULATION_PREVIEW" | "NORM_SOURCE_PREVIEW",
  work: () => T,
): T {
  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
  if (!isDev) return work();
  let action: ConsumerRepairQuantityEditTraceEvent | undefined;
  let startedAt: number | undefined;
  try {
    const events = (globalThis as QuantityEditTraceGlobal).__consumerRepairQuantityEditTrace?.events ?? [];
    for (let index = events.length - 1; index >= 0; index -= 1) {
      if (events[index]?.stage === "QUANTITY_ACTION_RECEIVED") { action = events[index]; break; }
    }
    const now = nowMonotonicMs();
    if (action && now >= action.monotonicMs && now - action.monotonicMs <= 5_000
      && !events.some(event => event.operationId === action!.operationId && event.stage === "ROW_DRAFT_REACT_COMMITTED")) {
      startedAt = now;
    }
  } catch { /* Diagnostics cannot prevent synchronous product work. */ }
  try {
    return work();
  } finally {
    if (startedAt != null) {
      try {
        const elapsed = nowMonotonicMs() - startedAt;
        logger.info("RikEstimateRowRenderWork", JSON.stringify({
          phase, elapsedMs: Number.isFinite(elapsed) && elapsed >= 0 ? Math.round(elapsed * 100) / 100 : null,
          measurementScope: "SYNCHRONOUS_JS_WORK_NOT_NATIVE_FRAME_OR_SAVE",
        }));
      } catch { /* Preserve the result or original product error. */ }
    }
  }
}

function nowMonotonicMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === "function" ? Math.round(perf.now() * 100) / 100 : Date.now();
}

export function createConsumerRepairQuantityEditOperationId(input: {
  itemId: string;
  source: ConsumerRepairQuantityEditSource;
  nextQuantity: number | null;
}): string {
  const monotonic = Math.round(nowMonotonicMs() * 1000).toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return ["quantity", input.source, input.itemId, input.nextQuantity ?? "null", monotonic, random].join(":");
}

export function recordConsumerRepairQuantityEditStage(
  event: Omit<ConsumerRepairQuantityEditTraceEvent, "createdAt" | "monotonicMs">,
): void {
  try {
    const target = globalThis as QuantityEditTraceGlobal;
    const trace = target.__consumerRepairQuantityEditTrace ?? {
      schema: "consumer_repair_quantity_edit_trace_v1" as const,
      events: [],
    };
    trace.events.push({
      ...event,
      createdAt: new Date().toISOString(),
      monotonicMs: nowMonotonicMs(),
    });
    if (trace.events.length > MAX_TRACE_EVENTS) {
      trace.events.splice(0, trace.events.length - MAX_TRACE_EVENTS);
    }
    target.__consumerRepairQuantityEditTrace = trace;
  } catch {
    // Trace is diagnostic-only and must never block estimate editing.
  }
}

/** React commit acknowledgement, not a native frame/p95 or durable save. */
export function recordConsumerRepairQuantityReactCommit(
  event: ConsumerRepairQuantityChangeMeta & { itemId: string; baseRevisionId: string },
): number | null {
  try {
    const trace = (globalThis as QuantityEditTraceGlobal).__consumerRepairQuantityEditTrace;
    const action = trace?.events.find(candidate => candidate.operationId === event.operationId
      && candidate.itemId === event.itemId && candidate.stage === "QUANTITY_ACTION_RECEIVED");
    const elapsed = action ? nowMonotonicMs() - action.monotonicMs : null;
    const elapsedMs = elapsed != null && Number.isFinite(elapsed) && elapsed >= 0
      ? Math.round(elapsed * 100) / 100 : null;
    recordConsumerRepairQuantityEditStage({ ...event, stage: "ROW_DRAFT_REACT_COMMITTED", elapsedMs });
    // Keep developer evidence small, without a title, quantity, price or token.
    // A missing/evicted start is unknown, never a fabricated zero-duration PASS.
    logger.info("RikEstimateRowReaction", JSON.stringify({
      stage: "ROW_DRAFT_REACT_COMMITTED", source: event.source, elapsedMs,
      measurementScope: "JS_ACTION_TO_REACT_COMMIT_NOT_NATIVE_FRAME_OR_SAVE",
    }));
    return elapsedMs;
  } catch {
    return null;
  }
}
