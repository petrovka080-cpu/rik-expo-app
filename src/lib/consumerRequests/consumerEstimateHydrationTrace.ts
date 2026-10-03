import { logger } from "../logger";

export type ConsumerEstimatePresentationPhase =
  | "PRESENTATION_SCREEN_MODEL"
  | "PRESENTATION_DRAFT_MODEL"
  | "PRESENTATION_PUBLIC_TITLE_ADMISSION"
  | "PRESENTATION_PUBLIC_ROW_SECTIONS"
  | "PRESENTATION_VISIBLE_LINES"
  | "PRESENTATION_PREVIEW_SECTIONS"
  | "PRESENTATION_CALCULATION_PREVIEW"
  | "PRESENTATION_NORM_SOURCE_PREVIEW"
  | "PRESENTATION_REVISION_DISPLAY"
  | "PRESENTATION_HISTORY_SUMMARY"
  | "PRESENTATION_BACKEND_BINDING";
export type ConsumerEstimateTransportPhase =
  | "PARAMETER_TRANSPORT_AUTH"
  | "PARAMETER_TRANSPORT_COMPATIBILITY"
  | "PARAMETER_TRANSPORT_HTTP"
  | "PARAMETER_TRANSPORT_DECODE";
export type ConsumerEstimateHydrationPhase = ConsumerEstimatePresentationPhase | ConsumerEstimateTransportPhase
  | "DURABLE_LEGACY_COMPATIBILITY"
  | "DURABLE_QUEUE_WAIT"
  | "DURABLE_INDEX"
  | "DURABLE_BUNDLE_RECOVERY"
  | "DURABLE_LOCAL_PROJECTION"
  | "CONTROLLER_INITIAL_STATE"
  | "CONTROLLER_DEFERRED_TASK_WAIT"
  | "CONTROLLER_SESSION_COMMIT"
  | "PARAMETER_SNAPSHOT_FETCH"
  | "PARAMETER_SESSION_BUILD";
type PhaseStatus = "completed" | "failed";
export type ConsumerEstimateHydrationPhaseEvent = Readonly<{
  trace: string;
  phase: ConsumerEstimateHydrationPhase;
  status: PhaseStatus;
  durationMs: number;
  elapsedMs: number;
}>;
let sequence = 0;

/** Bounded timing only, never a second hydration state or acceptance result.
 * No draft/revision/user identifiers, storage keys, business content or errors
 * are accepted into this payload. Completion means the call returned, not that
 * a revision was validated, a native frame painted, or a cold SLO passed.
 */
export function createConsumerEstimateHydrationTrace(input: {
  clock?: () => number;
  report?: (event: ConsumerEstimateHydrationPhaseEvent) => void;
} = {}) {
  const clock = input.clock ?? Date.now;
  const readClock = (): number | null => {
    try { const value = clock(); return Number.isFinite(value) ? value : null; }
    catch { return null; }
  };
  const report = input.report ?? (event => logger.releaseEvidence("RikEstimateHydration", event.phase, { ...event }));
  const trace = `hydrate-${++sequence}`;
  const startedAt = readClock();
  const begin = (phase: ConsumerEstimateHydrationPhase): ((status?: PhaseStatus) => void) => {
    const phaseStartedAt = readClock();
    let ended = false;
    return (status = "completed") => {
      if (ended) return;
      ended = true;
      const now = readClock();
      if (now == null || phaseStartedAt == null || startedAt == null) return;
      try {
        report({ trace, phase, status, durationMs: Math.max(0, now - phaseStartedAt), elapsedMs: Math.max(0, now - startedAt) });
      } catch {
        // Diagnostics must neither fail recovery nor replace its real error.
      }
    };
  };
  return Object.freeze({
    begin,
    measureSync<T>(phase: ConsumerEstimateHydrationPhase, operation: () => T): T {
      const finish = begin(phase);
      try { const result = operation(); finish(); return result; }
      catch (error) { finish("failed"); throw error; }
    },
    async measureAsync<T>(phase: ConsumerEstimateHydrationPhase, operation: () => Promise<T>): Promise<T> {
      const finish = begin(phase);
      try { const result = await operation(); finish(); return result; }
      catch (error) { finish("failed"); throw error; }
    },
  });
}
export type ConsumerEstimateHydrationTrace = ReturnType<typeof createConsumerEstimateHydrationTrace>;

/** One synchronous sample per fixed phase and mounted presentation owner.
 * This only limits diagnostics, never caches a model/validation result. Later
 * calls still execute against their current bundle and preserve real errors.
 * No identifiers or content are retained, and no native paint is measured.
 */
export function createConsumerEstimatePresentationTrace(
  input: Parameters<typeof createConsumerEstimateHydrationTrace>[0] = {},
) {
  const trace = createConsumerEstimateHydrationTrace(input);
  const measured = new Set<ConsumerEstimatePresentationPhase>();
  return Object.freeze({
    measureSync<T>(phase: ConsumerEstimatePresentationPhase, operation: () => T): T {
      if (measured.has(phase)) return operation();
      measured.add(phase);
      return trace.measureSync(phase, operation);
    },
  });
}
export type ConsumerEstimatePresentationTrace = ReturnType<typeof createConsumerEstimatePresentationTrace>;
