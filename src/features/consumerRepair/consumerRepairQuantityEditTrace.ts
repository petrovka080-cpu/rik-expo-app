export type ConsumerRepairQuantityEditSource = "stepper" | "direct_input" | "programmatic";

export type ConsumerRepairQuantityEditStage =
  | "QUANTITY_ACTION_RECEIVED"
  | "VISIBLE_INPUT_UPDATED"
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
