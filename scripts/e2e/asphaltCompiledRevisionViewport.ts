export const STOP_R9_HARNESS_COMPILED_REVISION_MARKER_NOT_FOUND_AFTER_BOUNDED_SCROLL =
  "STOP_R9_HARNESS_COMPILED_REVISION_MARKER_NOT_FOUND_AFTER_BOUNDED_SCROLL";
export const STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS =
  "STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS";
export const STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE =
  "STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE";
export const STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH =
  "STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH";

export type CompiledRevisionViewportNode = {
  resourceId: string;
  contentDesc: string;
  text: string;
  bounds: string;
};

export type CompiledRevisionViewportSnapshot = {
  xml: string;
  nodes: readonly CompiledRevisionViewportNode[];
  ok?: boolean;
};

export type GovernedMissingParameterDefinition = {
  canonicalKey: string;
  critical: boolean;
  internal: boolean;
};

export type GovernedMissingParameterClassification = {
  criticalKeys: string[];
  nonCriticalKeys: string[];
  unknownKeys: string[];
};

export type CompiledRevisionExpectedIdentity = {
  selectedCatalogId: string;
  selectedWorkKey: string;
  canonicalOwner: string;
  previousRevisionId: string | null;
  baselineRevisionOrdinal: number;
  /** Null only for the first observed revision when the backend catalog owns
   * a global durable ordinal. Its exact successor is still checked as N+1. */
  expectedRevisionOrdinal?: number | null;
  baselineBuildCount: number;
  expectedBuildDelta: 0 | 1;
  expectedRowCount: number | null;
  expectedCalculationStatus: "draft_ready" | "needs_more_params_but_preliminary_available";
};

export type CompiledRevisionIdentityEvidence = {
  selected_catalog_id: string;
  selected_work_key: string;
  canonical_owner: string;
  current_revision_id: string;
  revision_ordinal: number;
  compiled_row_count: number;
  build_count_delta: number;
  calculation_status: "draft_ready" | "needs_more_params_but_preliminary_available";
};

export type CompiledRevisionTransitionAssessment =
  | { status: "pending"; evidence: null; failureToken: null }
  | { status: "ready"; evidence: CompiledRevisionIdentityEvidence; failureToken: null }
  | {
    status: "identity_mismatch";
    evidence: null;
    failureToken: typeof STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH;
  };

export type CompiledRevisionViewportSearchResult = {
  status: "found" | "not_found" | "no_progress" | "ui_dump_unavailable" | "identity_mismatch";
  snapshot: CompiledRevisionViewportSnapshot;
  evidence: CompiledRevisionIdentityEvidence | null;
  failureToken:
    | typeof STOP_R9_HARNESS_COMPILED_REVISION_MARKER_NOT_FOUND_AFTER_BOUNDED_SCROLL
    | typeof STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS
    | typeof STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE
    | typeof STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH
    | null;
  swipes: number;
  viewportFingerprints: string[];
};

type CompiledRevisionViewportSearchOptions = {
  expected: CompiledRevisionExpectedIdentity;
  currentBuildCount: number;
  readViewport: () => Promise<CompiledRevisionViewportSnapshot>;
  scrollKnownContainerUp: (snapshot: CompiledRevisionViewportSnapshot) => Promise<boolean>;
  readSettledViewport: (previousFingerprint: string) => Promise<CompiledRevisionViewportSnapshot>;
  recoverKnownAnchor?: (
    displacedSnapshot: CompiledRevisionViewportSnapshot,
  ) => Promise<CompiledRevisionViewportSnapshot | null>;
  fingerprint: (snapshot: CompiledRevisionViewportSnapshot) => string;
  onViewport?: (
    phase: "before" | "pending_poll" | "anchor_recovery" | "after_scroll" | "final",
    step: number,
    snapshot: CompiledRevisionViewportSnapshot,
  ) => void | Promise<void>;
  maxSwipes?: number;
  maxPendingMarkerPolls?: number;
};

const COMPILED_REVISION_MARKER_PREFIX = "estimate-compiled-revision-v1--";

type ParsedCompiledRevisionMarker = {
  raw: string;
  selectedCatalogId: string;
  selectedWorkKey: string;
  canonicalOwner: string;
  revisionId: string;
  revisionOrdinal: number;
  rowCount: number;
  calculationStatus: string;
};

function normalizedNodeIds(node: CompiledRevisionViewportNode): string[] {
  return [node.resourceId, node.contentDesc]
    .map((value) => value.trim().replace(/^.*(?:\:id\/|\/)/, ""))
    .filter(Boolean);
}

const MISSING_PARAMETER_MARKER_PREFIX = "request-estimate-missing-param-";

export function classifyGovernedMissingParameterKeys(
  nodes: readonly CompiledRevisionViewportNode[],
  definitions: readonly GovernedMissingParameterDefinition[],
): GovernedMissingParameterClassification {
  const exactMissingKeys = Array.from(new Set(nodes.flatMap((node) =>
    normalizedNodeIds(node)
      .filter((id) => id.startsWith(MISSING_PARAMETER_MARKER_PREFIX))
      .map((id) => id.slice(MISSING_PARAMETER_MARKER_PREFIX.length))
      .filter(Boolean)
  )));
  const definitionsByKey = new Map(definitions.map((definition) => [
    definition.canonicalKey,
    definition,
  ]));
  const unknownKeys = exactMissingKeys.filter((key) => !definitionsByKey.has(key));
  const governedKeys = definitions
    .filter((definition) => exactMissingKeys.includes(definition.canonicalKey))
    .filter((definition) => !definition.internal);
  return {
    criticalKeys: governedKeys
      .filter((definition) => definition.critical)
      .map((definition) => definition.canonicalKey),
    nonCriticalKeys: governedKeys
      .filter((definition) => !definition.critical)
      .map((definition) => definition.canonicalKey),
    unknownKeys,
  };
}

function compiledRevisionMarkerIds(
  nodes: readonly CompiledRevisionViewportNode[],
): string[] {
  return Array.from(new Set(nodes.flatMap((node) =>
    normalizedNodeIds(node).filter((id) => id.startsWith(COMPILED_REVISION_MARKER_PREFIX))
  )));
}

function parseCompiledRevisionMarker(raw: string): ParsedCompiledRevisionMarker | null {
  const match = raw.match(
    /^estimate-compiled-revision-v1--catalog-(.*?)--work-(.*?)--owner-(.*?)--revision-(.*?)--ordinal-(\d+)--rows-(\d+)--status-([A-Za-z0-9_-]+)$/,
  );
  if (!match) return null;
  return {
    raw,
    selectedCatalogId: match[1] ?? "",
    selectedWorkKey: match[2] ?? "",
    canonicalOwner: match[3] ?? "",
    revisionId: match[4] ?? "",
    revisionOrdinal: Number(match[5]),
    rowCount: Number(match[6]),
    calculationStatus: match[7] ?? "",
  };
}

export function assessCompiledRevisionTransition(input: {
  nodes: readonly CompiledRevisionViewportNode[];
  expected: CompiledRevisionExpectedIdentity;
  currentBuildCount: number;
}): CompiledRevisionTransitionAssessment {
  const { expected } = input;
  const buildDelta = input.currentBuildCount - expected.baselineBuildCount;
  if (buildDelta > expected.expectedBuildDelta || buildDelta < 0) {
    return {
      status: "identity_mismatch",
      evidence: null,
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    };
  }

  const rawMarkers = compiledRevisionMarkerIds(input.nodes);
  const markers = rawMarkers.map(parseCompiledRevisionMarker);
  if (rawMarkers.length > 1 || markers.some((marker) => marker == null)) {
    return {
      status: "identity_mismatch",
      evidence: null,
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    };
  }
  const marker = markers[0] ?? null;
  const currentRevisionId = marker?.revisionId ?? null;
  if (
    currentRevisionId
    && expected.previousRevisionId
    && currentRevisionId === expected.previousRevisionId
  ) {
    return { status: "pending", evidence: null, failureToken: null };
  }

  if (!marker) return { status: "pending", evidence: null, failureToken: null };

  const expectedOrdinal = expected.expectedRevisionOrdinal === null
    ? null
    : expected.expectedRevisionOrdinal ?? expected.baselineRevisionOrdinal + 1;
  if (
    marker.selectedCatalogId !== expected.selectedCatalogId
    || marker.selectedWorkKey !== expected.selectedWorkKey
    || marker.canonicalOwner !== expected.canonicalOwner
    || marker.revisionOrdinal <= 0
    || (expectedOrdinal != null && marker.revisionOrdinal !== expectedOrdinal)
    || marker.rowCount <= 0
    || (expected.expectedRowCount != null && marker.rowCount !== expected.expectedRowCount)
    || marker.calculationStatus !== expected.expectedCalculationStatus
  ) {
    return {
      status: "identity_mismatch",
      evidence: null,
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    };
  }

  if (
    buildDelta !== expected.expectedBuildDelta
    || !currentRevisionId
  ) {
    return { status: "pending", evidence: null, failureToken: null };
  }

  return {
    status: "ready",
    evidence: {
      selected_catalog_id: expected.selectedCatalogId,
      selected_work_key: expected.selectedWorkKey,
      canonical_owner: expected.canonicalOwner,
      current_revision_id: currentRevisionId,
      revision_ordinal: marker.revisionOrdinal,
      compiled_row_count: marker.rowCount,
      build_count_delta: buildDelta,
      calculation_status: expected.expectedCalculationStatus,
    },
    failureToken: null,
  };
}

export function assessNoRevisionTransition(input: {
  baselineBuildCount: number;
  currentBuildCount: number;
  maximumBuildDelta: 0 | 1;
  visibleRevisionIds: readonly string[];
}): { ok: boolean; failureToken: string | null } {
  const logicalRevisionIds = Array.from(new Set(input.visibleRevisionIds.filter(Boolean)));
  const buildDelta = input.currentBuildCount - input.baselineBuildCount;
  const ok = buildDelta >= 0
    && buildDelta <= input.maximumBuildDelta
    && logicalRevisionIds.length === 0;
  return {
    ok,
    failureToken: ok ? null : STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
  };
}

export function visibleCompiledRevisionIds(
  nodes: readonly CompiledRevisionViewportNode[],
): string[] {
  return compiledRevisionMarkerIds(nodes)
    .map(parseCompiledRevisionMarker)
    .filter((marker): marker is ParsedCompiledRevisionMarker => marker != null)
    .map((marker) => marker.revisionId);
}

export async function findCompiledRevisionMarkerAcrossViewport(
  options: CompiledRevisionViewportSearchOptions,
): Promise<CompiledRevisionViewportSearchResult> {
  const maxSwipes = Math.min(12, Math.max(0, options.maxSwipes ?? 12));
  // A runtime build can finish before the transactional durable projection is
  // committed back into the React Native tree. Keep the exact old marker in
  // place and poll it for a bounded window long enough to cover that commit;
  // identity, ordinal, row-count and status checks below remain fail-closed.
  const maxPendingMarkerPolls = Math.min(12, Math.max(0, options.maxPendingMarkerPolls ?? 12));
  let snapshot = await options.readViewport();
  if (snapshot.ok === false) {
    return {
      status: "ui_dump_unavailable",
      snapshot,
      evidence: null,
      failureToken: STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE,
      swipes: 0,
      viewportFingerprints: [],
    };
  }
  let fingerprint = options.fingerprint(snapshot);
  const viewportFingerprints = [fingerprint];
  let noProgressCount = 0;
  let pendingMarkerPolls = 0;
  await options.onViewport?.("before", 0, snapshot);

  // A previous case can leave the shared request ScrollView inside an open,
  // long parameter panel. Scanning only farther down from that displaced
  // viewport can never reach the revision marker beside the summary. Recover
  // the known summary anchor once before the bounded forward scan; the exact
  // identity assessment below remains unchanged and fail-closed.
  if (compiledRevisionMarkerIds(snapshot.nodes).length === 0 && options.recoverKnownAnchor) {
    const recovered = await options.recoverKnownAnchor(snapshot);
    if (recovered) {
      if (recovered.ok === false) {
        return {
          status: "ui_dump_unavailable",
          snapshot: recovered,
          evidence: null,
          failureToken: STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE,
          swipes: 0,
          viewportFingerprints,
        };
      }
      snapshot = recovered;
      fingerprint = options.fingerprint(snapshot);
      viewportFingerprints.push(fingerprint);
      await options.onViewport?.("anchor_recovery", 0, snapshot);
    }
  }

  for (let step = 0; step <= maxSwipes; step += 1) {
    let assessment = assessCompiledRevisionTransition({
      nodes: snapshot.nodes,
      expected: options.expected,
      currentBuildCount: options.currentBuildCount,
    });
    while (
      assessment.status === "pending"
      && compiledRevisionMarkerIds(snapshot.nodes).length === 1
      && pendingMarkerPolls < maxPendingMarkerPolls
    ) {
      const next = await options.readSettledViewport(fingerprint);
      if (next.ok === false) {
        return {
          status: "ui_dump_unavailable",
          snapshot: next,
          evidence: null,
          failureToken: STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE,
          swipes: step,
          viewportFingerprints,
        };
      }
      snapshot = next;
      fingerprint = options.fingerprint(snapshot);
      viewportFingerprints.push(fingerprint);
      pendingMarkerPolls += 1;
      await options.onViewport?.("pending_poll", pendingMarkerPolls, snapshot);
      if (
        compiledRevisionMarkerIds(snapshot.nodes).length === 0
        && options.recoverKnownAnchor
      ) {
        const recovered = await options.recoverKnownAnchor(snapshot);
        if (recovered) {
          if (recovered.ok === false) {
            return {
              status: "ui_dump_unavailable",
              snapshot: recovered,
              evidence: null,
              failureToken: STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE,
              swipes: step,
              viewportFingerprints,
            };
          }
          snapshot = recovered;
          fingerprint = options.fingerprint(snapshot);
          viewportFingerprints.push(fingerprint);
          await options.onViewport?.("anchor_recovery", pendingMarkerPolls, snapshot);
        }
      }
      assessment = assessCompiledRevisionTransition({
        nodes: snapshot.nodes,
        expected: options.expected,
        currentBuildCount: options.currentBuildCount,
      });
    }
    if (assessment.status === "ready") {
      await options.onViewport?.("final", step, snapshot);
      return {
        status: "found",
        snapshot,
        evidence: assessment.evidence,
        failureToken: null,
        swipes: step,
        viewportFingerprints,
      };
    }
    if (assessment.status === "identity_mismatch") {
      await options.onViewport?.("final", step, snapshot);
      return {
        status: "identity_mismatch",
        snapshot,
        evidence: null,
        failureToken: assessment.failureToken,
        swipes: step,
        viewportFingerprints,
      };
    }
    if (
      assessment.status === "pending"
      && compiledRevisionMarkerIds(snapshot.nodes).length === 1
      && pendingMarkerPolls >= maxPendingMarkerPolls
    ) {
      await options.onViewport?.("final", step, snapshot);
      return {
        status: "identity_mismatch",
        snapshot,
        evidence: null,
        failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
        swipes: step,
        viewportFingerprints,
      };
    }
    if (step === maxSwipes) break;
    if (!await options.scrollKnownContainerUp(snapshot)) {
      await options.onViewport?.("final", step, snapshot);
      return {
        status: "no_progress",
        snapshot,
        evidence: null,
        failureToken: STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS,
        swipes: step,
        viewportFingerprints,
      };
    }
    const next = await options.readSettledViewport(fingerprint);
    if (next.ok === false) {
      return {
        status: "ui_dump_unavailable",
        snapshot: next,
        evidence: null,
        failureToken: STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE,
        swipes: step + 1,
        viewportFingerprints,
      };
    }
    const nextFingerprint = options.fingerprint(next);
    noProgressCount = nextFingerprint === fingerprint ? noProgressCount + 1 : 0;
    snapshot = next;
    fingerprint = nextFingerprint;
    viewportFingerprints.push(fingerprint);
    await options.onViewport?.("after_scroll", step + 1, snapshot);
    if (noProgressCount >= 3) {
      await options.onViewport?.("final", step + 1, snapshot);
      return {
        status: "no_progress",
        snapshot,
        evidence: null,
        failureToken: STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS,
        swipes: step + 1,
        viewportFingerprints,
      };
    }
  }

  await options.onViewport?.("final", maxSwipes, snapshot);
  return {
    status: "not_found",
    snapshot,
    evidence: null,
    failureToken: STOP_R9_HARNESS_COMPILED_REVISION_MARKER_NOT_FOUND_AFTER_BOUNDED_SCROLL,
    swipes: maxSwipes,
    viewportFingerprints,
  };
}
