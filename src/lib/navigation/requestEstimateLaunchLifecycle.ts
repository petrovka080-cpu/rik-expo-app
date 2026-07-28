import type { RequestEstimateLaunchTargetV1 } from "./requestEstimateLaunchPayload";

export type RequestEstimateIntentLifecycleStage =
  | "INTENT_RECEIVED"
  | "URL_PARSED"
  | "AUTH_PENDING"
  | "AUTH_RESOLVED"
  | "INTENT_APPLIED"
  | "DRAFT_SESSION_READY"
  | "UI_READY"
  | "INTENT_ACKNOWLEDGED";

export type PendingRequestEstimateIntent = {
  target: RequestEstimateLaunchTargetV1;
  source: string;
  stage: RequestEstimateIntentLifecycleStage;
};

export type RequestEstimateIntentReceiveResult =
  | {
      kind: "accepted";
      pending: PendingRequestEstimateIntent;
      replacedLaunchId: string | null;
    }
  | {
      kind:
        | "duplicate_pending"
        | "duplicate_acknowledged"
        | "duplicate_superseded"
        | "ignored_stale_snapshot";
      pending: PendingRequestEstimateIntent | null;
      replacedLaunchId: null;
    };

const MAX_ACKNOWLEDGED_LAUNCH_IDS = 128;
const AUTHORITATIVE_INTENT_SOURCES = new Set([
  "native_view_intent",
  "url_event",
]);
const ALLOWED_NEXT_STAGES: Readonly<
  Record<
    Exclude<RequestEstimateIntentLifecycleStage, "INTENT_ACKNOWLEDGED">,
    readonly RequestEstimateIntentLifecycleStage[]
  >
> = {
  INTENT_RECEIVED: ["URL_PARSED"],
  URL_PARSED: ["AUTH_PENDING", "AUTH_RESOLVED"],
  AUTH_PENDING: ["AUTH_RESOLVED"],
  AUTH_RESOLVED: ["INTENT_APPLIED"],
  INTENT_APPLIED: ["DRAFT_SESSION_READY"],
  DRAFT_SESSION_READY: ["UI_READY"],
  UI_READY: ["INTENT_ACKNOWLEDGED"],
};

export class RequestEstimateIntentLifecycle {
  private pending: PendingRequestEstimateIntent | null = null;
  private readonly acknowledgedLaunchIds = new Set<string>();
  private readonly supersededLaunchIds = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private latestAuthoritativeLaunchId: string | null = null;

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private trimTerminalIds(ids: Set<string>): void {
    while (ids.size > MAX_ACKNOWLEDGED_LAUNCH_IDS) {
      const oldest = ids.values().next().value;
      if (typeof oldest !== "string") break;
      ids.delete(oldest);
    }
  }

  receive(
    target: RequestEstimateLaunchTargetV1,
    source: string,
  ): RequestEstimateIntentReceiveResult {
    const launchId = target.payload.launchId;
    const authoritativeSource = AUTHORITATIVE_INTENT_SOURCES.has(source);
    if (this.acknowledgedLaunchIds.has(launchId)) {
      return {
        kind: "duplicate_acknowledged",
        pending: this.pending,
        replacedLaunchId: null,
      };
    }
    if (this.supersededLaunchIds.has(launchId)) {
      return {
        kind: "duplicate_superseded",
        pending: this.pending,
        replacedLaunchId: null,
      };
    }
    if (this.pending?.target.payload.launchId === launchId) {
      if (authoritativeSource) {
        this.latestAuthoritativeLaunchId = launchId;
      }
      return {
        kind: "duplicate_pending",
        pending: this.pending,
        replacedLaunchId: null,
      };
    }
    if (
      !authoritativeSource &&
      this.latestAuthoritativeLaunchId != null &&
      launchId !== this.latestAuthoritativeLaunchId
    ) {
      return {
        kind: "ignored_stale_snapshot",
        pending: this.pending,
        replacedLaunchId: null,
      };
    }
    const replacedLaunchId = this.pending?.target.payload.launchId ?? null;
    if (replacedLaunchId) {
      this.supersededLaunchIds.add(replacedLaunchId);
      this.trimTerminalIds(this.supersededLaunchIds);
    }
    if (authoritativeSource) {
      this.latestAuthoritativeLaunchId = launchId;
    }
    this.pending = {
      target,
      source,
      stage: "INTENT_RECEIVED",
    };
    this.emitChange();
    return {
      kind: "accepted",
      pending: this.pending,
      replacedLaunchId,
    };
  }

  getPending(): PendingRequestEstimateIntent | null {
    return this.pending;
  }

  markStage(
    launchId: string,
    stage: RequestEstimateIntentLifecycleStage,
  ): boolean {
    if (stage === "INTENT_ACKNOWLEDGED") {
      return this.acknowledge(launchId);
    }
    if (this.pending?.target.payload.launchId !== launchId) return false;
    if (this.pending.stage === stage) return false;
    if (
      this.pending.stage === "INTENT_ACKNOWLEDGED" ||
      !ALLOWED_NEXT_STAGES[this.pending.stage].includes(stage)
    ) {
      return false;
    }
    this.pending = { ...this.pending, stage };
    this.emitChange();
    return true;
  }

  shouldApply(launchId: string): boolean {
    return (
      this.pending?.target.payload.launchId === launchId &&
      this.pending.stage === "AUTH_RESOLVED"
    );
  }

  acknowledge(launchId: string): boolean {
    if (this.acknowledgedLaunchIds.has(launchId)) return false;
    if (
      this.pending?.target.payload.launchId !== launchId ||
      this.pending.stage !== "UI_READY"
    ) {
      return false;
    }
    this.acknowledgedLaunchIds.add(launchId);
    this.trimTerminalIds(this.acknowledgedLaunchIds);
    if (this.pending?.target.payload.launchId === launchId) {
      this.pending = null;
    }
    this.emitChange();
    return true;
  }

  isAcknowledged(launchId: string): boolean {
    return this.acknowledgedLaunchIds.has(launchId);
  }

  clearSessionBoundary(): void {
    this.pending = null;
    this.acknowledgedLaunchIds.clear();
    this.supersededLaunchIds.clear();
    this.latestAuthoritativeLaunchId = null;
    this.emitChange();
  }
}

export const requestEstimateIntentLifecycle =
  new RequestEstimateIntentLifecycle();

export function markRequestEstimateIntentStage(
  launchId: string | null | undefined,
  stage: RequestEstimateIntentLifecycleStage,
): boolean {
  const normalizedLaunchId = String(launchId ?? "").trim();
  return normalizedLaunchId
    ? requestEstimateIntentLifecycle.markStage(normalizedLaunchId, stage)
    : false;
}
