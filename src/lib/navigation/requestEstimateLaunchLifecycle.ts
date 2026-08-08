import {
  isGeneratedRequestEstimateLaunchIdV1,
  type RequestEstimateLaunchTargetV1,
} from "./requestEstimateLaunchPayload";

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
  private readonly acknowledgedFingerprints = new Set<string>();
  private readonly acknowledgedDraftIdsByLaunchId = new Map<string, string>();
  private readonly acknowledgedDraftIdsByFingerprint = new Map<string, string>();
  private readonly acknowledgedLaunchIdsByFingerprint = new Map<string, string>();
  private readonly generatedAliasAvailableFingerprints = new Set<string>();
  private readonly supersededLaunchIds = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private latestAuthoritativeLaunchId: string | null = null;
  private pendingDraftId: string | null = null;

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

  private trimAcknowledgedLaunchState(): void {
    while (this.acknowledgedLaunchIds.size > MAX_ACKNOWLEDGED_LAUNCH_IDS) {
      const oldest = this.acknowledgedLaunchIds.values().next().value;
      if (typeof oldest !== "string") break;
      this.acknowledgedLaunchIds.delete(oldest);
      this.acknowledgedDraftIdsByLaunchId.delete(oldest);
    }
  }

  private trimAcknowledgedFingerprintState(): void {
    while (this.acknowledgedFingerprints.size > MAX_ACKNOWLEDGED_LAUNCH_IDS) {
      const oldest = this.acknowledgedFingerprints.values().next().value;
      if (typeof oldest !== "string") break;
      this.acknowledgedFingerprints.delete(oldest);
      this.acknowledgedDraftIdsByFingerprint.delete(oldest);
      this.acknowledgedLaunchIdsByFingerprint.delete(oldest);
      this.generatedAliasAvailableFingerprints.delete(oldest);
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
    this.pendingDraftId = null;
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

  bindPendingDraft(launchId: string, requestDraftId: string): boolean {
    const normalizedDraftId = requestDraftId.trim();
    if (
      !normalizedDraftId ||
      this.pending?.target.payload.launchId !== launchId
    ) {
      return false;
    }
    this.pendingDraftId = normalizedDraftId;
    return true;
  }

  acknowledge(launchId: string): boolean {
    if (this.acknowledgedLaunchIds.has(launchId)) return false;
    if (
      this.pending?.target.payload.launchId !== launchId ||
      this.pending.stage !== "UI_READY"
    ) {
      return false;
    }
    const fingerprint = this.pending.target.payload.fingerprint;
    this.acknowledgedLaunchIds.add(launchId);
    if (fingerprint) {
      this.acknowledgedFingerprints.add(fingerprint);
      this.acknowledgedLaunchIdsByFingerprint.set(fingerprint, launchId);
      if (this.pendingDraftId) {
        this.acknowledgedDraftIdsByFingerprint.set(
          fingerprint,
          this.pendingDraftId,
        );
      }
      if (isGeneratedRequestEstimateLaunchIdV1({ launchId, fingerprint })) {
        this.generatedAliasAvailableFingerprints.add(fingerprint);
      }
      this.trimAcknowledgedFingerprintState();
    }
    if (this.pendingDraftId) {
      this.acknowledgedDraftIdsByLaunchId.set(launchId, this.pendingDraftId);
    }
    this.trimAcknowledgedLaunchState();
    if (this.pending?.target.payload.launchId === launchId) {
      this.pending = null;
    }
    this.pendingDraftId = null;
    this.emitChange();
    return true;
  }

  isAcknowledged(launchId: string): boolean {
    return this.acknowledgedLaunchIds.has(launchId);
  }

  isFingerprintAcknowledged(fingerprint: string): boolean {
    return this.acknowledgedFingerprints.has(fingerprint);
  }

  reconcileAcknowledgedRouteLaunch(input: {
    launchId: string | null | undefined;
    fingerprint: string | null | undefined;
  }): {
    acknowledged: boolean;
    requestDraftId: string | null;
    matchedBy:
      | "launch_id"
      | "missing_identity_fingerprint"
      | "generated_fingerprint_alias"
      | null;
  } {
    const launchId = String(input.launchId ?? "").trim();
    const fingerprint = String(input.fingerprint ?? "").trim();
    if (launchId && this.acknowledgedLaunchIds.has(launchId)) {
      return {
        acknowledged: true,
        requestDraftId:
          this.acknowledgedDraftIdsByLaunchId.get(launchId) ?? null,
        matchedBy: "launch_id",
      };
    }
    if (!fingerprint || !this.acknowledgedFingerprints.has(fingerprint)) {
      return { acknowledged: false, requestDraftId: null, matchedBy: null };
    }
    if (!launchId) {
      return {
        acknowledged: true,
        requestDraftId:
          this.acknowledgedDraftIdsByFingerprint.get(fingerprint) ?? null,
        matchedBy: "missing_identity_fingerprint",
      };
    }
    if (
      this.pending?.target.payload.launchId === launchId ||
      !isGeneratedRequestEstimateLaunchIdV1({ launchId, fingerprint }) ||
      !this.generatedAliasAvailableFingerprints.has(fingerprint) ||
      this.acknowledgedLaunchIdsByFingerprint.get(fingerprint) === launchId
    ) {
      return { acknowledged: false, requestDraftId: null, matchedBy: null };
    }

    const requestDraftId =
      this.acknowledgedDraftIdsByFingerprint.get(fingerprint) ?? null;
    this.generatedAliasAvailableFingerprints.delete(fingerprint);
    this.acknowledgedLaunchIds.add(launchId);
    if (requestDraftId) {
      this.acknowledgedDraftIdsByLaunchId.set(launchId, requestDraftId);
    }
    this.trimAcknowledgedLaunchState();
    return {
      acknowledged: true,
      requestDraftId,
      matchedBy: "generated_fingerprint_alias",
    };
  }

  clearSessionBoundary(): void {
    this.pending = null;
    this.pendingDraftId = null;
    this.acknowledgedLaunchIds.clear();
    this.acknowledgedFingerprints.clear();
    this.acknowledgedDraftIdsByLaunchId.clear();
    this.acknowledgedDraftIdsByFingerprint.clear();
    this.acknowledgedLaunchIdsByFingerprint.clear();
    this.generatedAliasAvailableFingerprints.clear();
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
