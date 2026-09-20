import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  awaitConsumerRepairBundleDurableCommit,
  hydrateTransactionalConsumerRepairRequestStore,
} from "../../lib/consumerRequests/consumerRequestRepository";
import {
  ConsumerRepairRequestScreenController,
  shouldAutoPrepareInitialConsumerRepairRequest,
  shouldDeferInitialHistoryLoad,
  type ConsumerRepairRequestScreenProps,
} from "./ConsumerRepairRequestScreen";
import { useConsumerRepairPhotoCaptureController } from "./useConsumerRepairPhotoCaptureController";
import { buildStructuredEstimateRequestDraft } from "../../lib/estimateStructuredPipeline/structuredEstimateRequestBinding";
import {
  bindConsumerRepairCanonicalArtifactReady,
  listConsumerRepairRequestHistory,
  saveConsumerRepairCanonicalParameterCollection,
  synchronizeConsumerRepairAuthoritativePhotoAttachments,
  upsertConsumerRepairCanonicalBackendDraft,
} from "../../lib/consumerRequests/consumerRequestService";
import type { ForemanAiEstimateDraftMapping } from "../../lib/foremanAiEstimate";
import { currentUserId } from "../../lib/supabaseClient";
import {
  compileConsumerCanonicalBaseline,
  ConsumerCanonicalBaselineNeedsParametersError,
} from "./consumerCanonicalBaselineCompile";
import { canonicalEstimateRevisionIdFromRoute } from "../../lib/navigation/canonicalEstimateRevisionDeepLink";
import {
  loadConsumerCanonicalParameterSession,
  loadConsumerCanonicalRevisionDraftMapping,
  recalculateConsumerCanonicalCatalogAddition,
  recalculateConsumerCanonicalCatalogSelection,
  recalculateConsumerCanonicalEstimate,
} from "./consumerCanonicalParameterEditor";
import { applyConsumerRepairCatalogItemSelection } from "./requestEstimateScreenActions";
import {
  getCanonicalEstimateRevisionHistory,
  listCanonicalEstimatePhotoAttachments,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";
import { consumerRepairRowCode } from "./consumerRepairRowMetadata";
import { logger } from "../../lib/logger";
import { loadConsumerCanonicalReadyArtifacts } from "./consumerCanonicalArtifactHydration";

const DURABLE_HYDRATION_TIMEOUT_MS = 3_000;
const canonicalDeepLinkWorkspaceDraftIdsByConsumer = new Map<string, string>();

type DurableHydrationStatus = "loading" | "ready" | "recovery";

type BoundedDurableHydrationOutcome =
  | { status: "ready" }
  | { status: "failed" }
  | { status: "timed_out"; completion: Promise<void> };

type CanonicalEstimateMeaningfulPreview = {
  revisionId: string;
  titleRu: string;
  calculatedRows: {
    id: string;
    titleRu: string;
    quantity: number;
    unit: string;
  }[];
  calculatedRowCount: number;
  preliminaryNeedCount: number;
  saved: boolean;
  onPublished: () => void;
  onOpenFullEstimate: () => void;
};

function CanonicalEstimateMeaningfulPreviewCard({
  preview,
}: {
  preview: CanonicalEstimateMeaningfulPreview;
}): React.ReactElement {
  const publishedRevisionRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (publishedRevisionRef.current === preview.revisionId) return;
    publishedRevisionRef.current = preview.revisionId;
    preview.onPublished();
  }, [preview]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.meaningfulPreview}
      testID="consumer-estimate-meaningful-preview"
    >
      <Text style={styles.meaningfulPreviewEyebrow}>Предварительная смета рассчитана</Text>
      <Text
        style={styles.meaningfulPreviewTitle}
        testID="request-estimate-selected-work-title"
      >
        {preview.titleRu}
      </Text>
      <Text style={styles.meaningfulPreviewMeta} testID="request-estimate-row-count">
        {`С количеством: ${preview.calculatedRowCount}`}
      </Text>
      <Text style={styles.meaningfulPreviewMeta} testID="request-estimate-preliminary-need-count">
        {`Без количества: ${preview.preliminaryNeedCount}`}
      </Text>
      <View style={styles.meaningfulPreviewRows} testID="request-estimate-visible-lines">
        <Text style={styles.meaningfulPreviewSection}>Ключевые рассчитанные позиции:</Text>
        {preview.calculatedRows.map((row) => (
          <Text key={row.id} style={styles.meaningfulPreviewRow}>
            {`${row.titleRu} — ${row.quantity.toLocaleString("ru-RU")} ${row.unit}`}
          </Text>
        ))}
      </View>
      <Text style={styles.meaningfulPreviewSaving}>
        {preview.saved
          ? "Версия сохранена в черновике. Уточнения добровольны."
          : "Сохраняем версию в черновике…"}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!preview.saved}
        onPress={preview.onOpenFullEstimate}
        style={[
          styles.meaningfulPreviewOpen,
          !preview.saved && styles.meaningfulPreviewOpenDisabled,
        ]}
        testID="consumer-estimate-open-full-estimate"
      >
        <Text style={styles.meaningfulPreviewOpenText}>
          {preview.saved ? "Открыть позиции и уточнения" : "Сохраняем полную версию…"}
        </Text>
      </Pressable>
    </View>
  );
}

export function requestEstimateCanonicalDeepLinkSessionWorkspaceDraftId(input: {
  consumerUserId: string;
  componentDraftId?: string | null;
}): string | null {
  const consumerUserId = input.consumerUserId.trim();
  return input.componentDraftId?.trim()
    || (consumerUserId
      ? canonicalDeepLinkWorkspaceDraftIdsByConsumer.get(consumerUserId) ?? null
      : null);
}

export function rememberRequestEstimateCanonicalDeepLinkSessionWorkspace(input: {
  consumerUserId: string;
  draftId: string;
}): void {
  const consumerUserId = input.consumerUserId.trim();
  const draftId = input.draftId.trim();
  if (consumerUserId && draftId) {
    canonicalDeepLinkWorkspaceDraftIdsByConsumer.set(consumerUserId, draftId);
  }
}

export function requestEstimateControllerWorkspaceKey(
  props: ConsumerRepairRequestScreenProps,
): string {
  return (canonicalEstimateRevisionIdFromRoute(props.initialCanonicalRevisionId)
    ? "canonical-revision-viewer"
    : null)
    || props.launchFingerprint?.trim()
    || props.launchId?.trim()
    || props.initialDraftId?.trim()
    || "request-composer";
}

export function requestEstimateFreshBuildKey(
  props: ConsumerRepairRequestScreenProps,
): string | null {
  if (props.initialDraftId?.trim()) return null;
  const canonicalRevisionId = canonicalEstimateRevisionIdFromRoute(
    props.initialCanonicalRevisionId,
  );
  const requiresSettledBuild = Boolean(canonicalRevisionId) ||
    shouldAutoPrepareInitialConsumerRepairRequest(props);
  if (!requiresSettledBuild) return null;
  return props.launchId?.trim()
    || props.launchFingerprint?.trim()
    || canonicalRevisionId
    || props.initialProblemText?.trim()
    || null;
}

export function requestEstimateCanonicalDeepLinkWorkspaceDraftPlan(input: {
  routeRevisionId?: string | null;
  requestedRevisionId: string;
  explicitRequestDraftId?: string | null;
  matchingRevisionDraftId?: string | null;
  transientWorkspaceDraftId?: string | null;
}): {
  targetDraftId: string | null;
  replaceCanonicalRevisionHistory: boolean;
  establishTransientWorkspace: boolean;
} {
  const explicitRequestDraftId = input.explicitRequestDraftId?.trim() || null;
  if (explicitRequestDraftId) {
    return {
      targetDraftId: explicitRequestDraftId,
      replaceCanonicalRevisionHistory: false,
      establishTransientWorkspace: false,
    };
  }
  const matchingRevisionDraftId = input.matchingRevisionDraftId?.trim() || null;
  if (matchingRevisionDraftId) {
    return {
      targetDraftId: matchingRevisionDraftId,
      replaceCanonicalRevisionHistory: false,
      establishTransientWorkspace: false,
    };
  }
  const routeRevisionId = canonicalEstimateRevisionIdFromRoute(input.routeRevisionId);
  const requestedRevisionId = canonicalEstimateRevisionIdFromRoute(input.requestedRevisionId);
  if (!routeRevisionId || routeRevisionId !== requestedRevisionId) {
    return {
      targetDraftId: null,
      replaceCanonicalRevisionHistory: false,
      establishTransientWorkspace: false,
    };
  }
  const transientWorkspaceDraftId = input.transientWorkspaceDraftId?.trim() || null;
  return {
    targetDraftId: transientWorkspaceDraftId,
    replaceCanonicalRevisionHistory: true,
    establishTransientWorkspace: transientWorkspaceDraftId == null,
  };
}

async function runBoundedDurableHydration(
  requestedDraftId?: string,
): Promise<BoundedDurableHydrationOutcome> {
  const completion = hydrateTransactionalConsumerRepairRequestStore(requestedDraftId);
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const status = await Promise.race([
      completion.then(
        () => "ready" as const,
        () => "failed" as const,
      ),
      new Promise<"timed_out">((resolve) => {
        timeout = setTimeout(() => {
          resolve("timed_out");
        }, DURABLE_HYDRATION_TIMEOUT_MS);
      }),
    ]);
    return status === "timed_out" ? { status, completion } : { status };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function ConsumerRepairRequestScreen(props: ConsumerRepairRequestScreenProps): React.ReactElement {
  const [durableStatus, setDurableStatus] =
    React.useState<DurableHydrationStatus>("loading");
  const [authResolved, setAuthResolved] = React.useState(Boolean(props.consumerUserId?.trim()));
  const [resolvedConsumerUserId, setResolvedConsumerUserId] = React.useState<string | null>(
    props.consumerUserId?.trim() || null,
  );
  const hydrationAttemptRef = React.useRef(0);
  const screenRef = React.useRef<ConsumerRepairRequestScreenController>(null);
  const pendingCanonicalEstimateBundleRef = React.useRef<
    ReturnType<typeof upsertConsumerRepairCanonicalBackendDraft> | null
  >(null);
  const canonicalDeepLinkWorkspaceDraftIdRef = React.useRef<string | null>(null);
  const freshBuildKey = requestEstimateFreshBuildKey(props);
  const [settledFreshBuildKey, setSettledFreshBuildKey] = React.useState<string | null>(null);
  const [canonicalEstimatePreview, setCanonicalEstimatePreview] =
    React.useState<CanonicalEstimateMeaningfulPreview | null>(null);
  React.useEffect(() => {
    pendingCanonicalEstimateBundleRef.current = null;
    setCanonicalEstimatePreview(null);
  }, [props.launchFingerprint, props.launchId]);
  React.useEffect(() => {
    const explicit = props.consumerUserId?.trim();
    if (explicit) {
      setResolvedConsumerUserId(explicit);
      setAuthResolved(true);
      return;
    }
    let active = true;
    setAuthResolved(false);
    void currentUserId().then((userId) => {
      if (!active) return;
      setResolvedConsumerUserId(userId?.trim() || null);
      setAuthResolved(true);
    }, () => {
      if (!active) return;
      setResolvedConsumerUserId(null);
      setAuthResolved(true);
    });
    return () => { active = false; };
  }, [props.consumerUserId]);
  const hydrate = React.useCallback(() => {
    const attempt = hydrationAttemptRef.current + 1;
    hydrationAttemptRef.current = attempt;
    setDurableStatus("loading");
    void runBoundedDurableHydration(props.initialDraftId?.trim()).then((outcome) => {
      if (hydrationAttemptRef.current !== attempt) return;
      if (outcome.status === "ready") {
        if (!freshBuildKey) screenRef.current?.refreshAfterDurableHydration();
        setDurableStatus("ready");
        return;
      }
      setDurableStatus("recovery");
      if (outcome.status === "failed") return;
      void outcome.completion.then(
        () => {
          if (hydrationAttemptRef.current !== attempt) return;
          if (!freshBuildKey) screenRef.current?.refreshAfterDurableHydration();
          setDurableStatus("ready");
        },
        () => {
          // The recovery action remains available for a terminal storage error.
        },
      );
    });
  }, [freshBuildKey, props.initialDraftId]);
  React.useEffect(() => {
    if (!authResolved || !resolvedConsumerUserId) return;
    // Native effects can run before the controller's queued initial build.
    // Wait for its explicit persisted/settled signal instead of racing a fixed
    // timer against a cold Hermes module graph and a large durable history.
    if (freshBuildKey && settledFreshBuildKey !== freshBuildKey) return;
    hydrate();
    return () => {
      hydrationAttemptRef.current += 1;
    };
  }, [authResolved, freshBuildKey, hydrate, resolvedConsumerUserId, settledFreshBuildKey]);
  const photoCapture = useConsumerRepairPhotoCaptureController({
    onStatusMessage: (statusMessage) => screenRef.current?.setPhotoCaptureStatusMessage(statusMessage),
    onMaterialPhotoCaptured: (result) => {
      if (result.purpose === "line_attachment") {
        screenRef.current?.attachCapturedPhotoToLine(result);
        return;
      }
      void screenRef.current?.openMaterialCatalogFromCapturedPhoto(result);
    },
  });
  const durableHydrationPending = durableStatus === "loading" &&
    !freshBuildKey &&
    !shouldDeferInitialHistoryLoad(props);
  const persistCanonicalDraft = React.useCallback(async (
    mapping: ForemanAiEstimateDraftMapping,
    problemText: string,
    targetDraftId: string | null,
    options: {
      replaceCanonicalRevisionHistory?: boolean;
      evidenceBuildStartedAt?: number;
    } = {},
  ) => {
    if (!resolvedConsumerUserId) return;
    const evidenceBuildStartedAt = options.evidenceBuildStartedAt ?? Date.now();
    const canonicalBackend = mapping.payload.canonicalBackend;
    if (!canonicalBackend) {
      throw new Error("CANONICAL_COMPILE_HISTORY_IDENTITY_MISSING");
    }
    const calculatedRows = mapping.rows.filter((row) =>
      row.includedInEstimate
      && Number.isFinite(row.quantity)
    );
    const preliminaryNeedCount = canonicalBackend.preliminaryNeeds?.length ?? 0;
    await new Promise<void>((resolvePublished) => {
      setCanonicalEstimatePreview({
        revisionId: canonicalBackend.revisionId,
        titleRu: mapping.payload.workTitle?.trim() || "Предварительная смета",
        calculatedRows: calculatedRows.slice(0, 4).map((row) => ({
          id: row.rowId,
          titleRu: row.visibleName,
          quantity: row.quantity,
          unit: row.unit?.trim() || "ед.",
        })),
        calculatedRowCount: calculatedRows.length,
        preliminaryNeedCount,
        saved: false,
        onPublished: resolvePublished,
        onOpenFullEstimate: () => {
          const pending = pendingCanonicalEstimateBundleRef.current;
          if (!pending || !screenRef.current) return;
          screenRef.current.acceptCanonicalBackendDraft(pending, {
            persistenceStatus: "saved",
            onPublished: () => {
              pendingCanonicalEstimateBundleRef.current = null;
              setCanonicalEstimatePreview((current) =>
                current?.revisionId === canonicalBackend.revisionId ? null : current
              );
            },
          });
        },
      });
    });
    logger.releaseEvidence("RikEstimateBuild", "MEANINGFUL_UI_PUBLISHED", {
      stage: "MEANINGFUL_UI_PUBLISHED",
      elapsedMs: Date.now() - evidenceBuildStartedAt,
      calculatedRowCount: calculatedRows.length,
      preliminaryNeedCount,
    });
    try {
    const bundle = upsertConsumerRepairCanonicalBackendDraft({
      requestDraftId: targetDraftId,
      consumerUserId: resolvedConsumerUserId,
      problemText: problemText || mapping.payload.inputText,
      city: "Bishkek",
      // Preserve the complete immutable backend projection. Excluded rows keep
      // their disposition in the UI model; filtering them here made one
      // revision report different row counts in UI, history, PDF and backend.
      aiDraft: buildStructuredEstimateRequestDraft(mapping.payload),
      replaceCanonicalRevisionHistory: options.replaceCanonicalRevisionHistory === true,
    });
    logger.releaseEvidence("RikEstimatePersist", "BUNDLE_LOCAL_PROJECTION_READY", {
      stage: "BUNDLE_LOCAL_PROJECTION_READY",
      elapsedMs: Date.now() - evidenceBuildStartedAt,
      currentRevisionId: bundle.estimateDraftRevisionState?.currentRevisionId ?? null,
      revisionCount: bundle.estimateDraftRevisionState?.revisions.length ?? 0,
      diffCount: bundle.estimateDraftRevisionState?.diffs.length ?? 0,
    });
    const binding = consumerRepairCanonicalBackendBinding(bundle);
    if (
      !binding
      || binding.revisionId !== canonicalBackend.revisionId
      || binding.releaseId !== canonicalBackend.releaseId
    ) {
      throw new Error("CANONICAL_COMPILE_HISTORY_IDENTITY_MISMATCH");
    }
      const history = await getCanonicalEstimateRevisionHistory({
        catalogId: mapping.payload.canonicalBackend!.catalogId,
        limit: 100,
      });
      const historyRevision = history.revisions.find((revision) =>
        revision.revisionId === binding.revisionId
      );
      if (!historyRevision || historyRevision.releaseId !== binding.releaseId) {
        throw new Error("CANONICAL_COMPILE_HISTORY_REVISION_MISSING");
      }
      logger.releaseEvidence("RikEstimatePersist", "BUNDLE_BACKEND_HISTORY_CONFIRMED", {
        stage: "BUNDLE_BACKEND_HISTORY_CONFIRMED",
        elapsedMs: Date.now() - evidenceBuildStartedAt,
      });
      await awaitConsumerRepairBundleDurableCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId:
          bundle.estimateDraftRevisionState?.currentRevisionId ?? null,
      });
      logger.releaseEvidence("RikEstimatePersist", "BUNDLE_TRANSACTIONAL_COMMIT_CONFIRMED", {
        stage: "BUNDLE_TRANSACTIONAL_COMMIT_CONFIRMED",
        elapsedMs: Date.now() - evidenceBuildStartedAt,
      });
      if (options.evidenceBuildStartedAt != null) {
        // Persistence is complete at this boundary. The following controller
        // projection can synchronously render a large BOQ and must not inflate
        // the production first-persist measurement.
        logger.releaseEvidence("RikEstimateBuild", "BUNDLE_PERSISTED", {
          stage: "BUNDLE_PERSISTED",
          elapsedMs: Date.now() - evidenceBuildStartedAt,
        });
      }
      pendingCanonicalEstimateBundleRef.current = bundle;
      setCanonicalEstimatePreview((current) =>
        current?.revisionId === binding.revisionId
          ? { ...current, saved: true }
          : current
      );
      return bundle;
    } catch (error) {
      if (pendingCanonicalEstimateBundleRef.current?.estimateDraftRevisionState?.currentRevisionId
        === canonicalBackend.revisionId) {
        pendingCanonicalEstimateBundleRef.current = null;
      }
      setCanonicalEstimatePreview((current) =>
        current?.revisionId === canonicalBackend.revisionId ? null : current
      );
      throw error;
    }
  }, [resolvedConsumerUserId]);
  const refreshAuthoritativePhotos = React.useCallback(async (
    bundle: ReturnType<typeof upsertConsumerRepairCanonicalBackendDraft>,
    revisionId: string,
  ) => {
    if (!resolvedConsumerUserId) return bundle;
    const projection = await listCanonicalEstimatePhotoAttachments({
      revisionId,
      includeDeleted: true,
    });
    if (
      projection.attachments.length === 0 &&
      !(bundle.estimateAttachments ?? []).some((attachment) =>
        attachment.serverCommitted === true &&
        attachment.revisionId === revisionId
      )
    ) {
      return bundle;
    }
    const synchronized = synchronizeConsumerRepairAuthoritativePhotoAttachments({
      requestDraftId: bundle.draft.id,
      ownerUserId: resolvedConsumerUserId,
      revisionId,
      attachments: projection.attachments,
    });
    await awaitConsumerRepairBundleDurableCommit({
      requestDraftId: synchronized.draft.id,
      expectedStatus: synchronized.draft.status,
      expectedRevisionId:
        synchronized.estimateDraftRevisionState?.currentRevisionId ?? null,
    });
    return synchronized;
  }, [resolvedConsumerUserId]);
  React.useEffect(() => {
    const draftId = props.initialDraftId?.trim();
    if (durableStatus !== "ready" || !resolvedConsumerUserId || !draftId) return;
    const existing = listConsumerRepairRequestHistory(resolvedConsumerUserId)
      .find((candidate) => candidate.draft.id === draftId);
    const binding = consumerRepairCanonicalBackendBinding(existing ?? null);
    if (!existing || !binding) return;
    let active = true;
    void refreshAuthoritativePhotos(existing, binding.revisionId).then(() => {
      if (active) screenRef.current?.refreshAfterDurableHydration();
    }, () => {
      // Preserve the last locally confirmed metadata while the authoritative
      // projection is temporarily unavailable; it is never promoted to a new
      // server commit and the signed URL remains redacted in durable storage.
    });
    return () => { active = false; };
  }, [durableStatus, props.initialDraftId, refreshAuthoritativePhotos, resolvedConsumerUserId]);
  const authUnavailable = authResolved && !resolvedConsumerUserId;
  return (
    <View style={styles.root}>
      {!authResolved ? (
        <View testID="consumer-repair-auth-hydration-gate" style={styles.exactDraftHydrationGate} />
      ) : authUnavailable ? (
        <View testID="consumer-repair-auth-required" style={styles.storageNotice}>
          <Text style={styles.storageNoticeText}>Для сметы требуется авторизованная сессия.</Text>
        </View>
      ) : durableHydrationPending ? (
        <View testID="consumer-repair-exact-draft-hydration-gate" style={styles.exactDraftHydrationGate} />
      ) : (
        <ConsumerRepairRequestScreenController
          key={requestEstimateControllerWorkspaceKey(props)}
          ref={screenRef}
          {...props}
          consumerUserId={resolvedConsumerUserId!}
          deferFullCanonicalEstimateProjection
          onInitialLaunchBuildSettled={() => {
            if (freshBuildKey) setSettledFreshBuildKey(freshBuildKey);
          }}
          onPrepareCanonicalEstimate={async (
            problemText,
            catalogId,
            requestDraftId,
            selectedRoadScope,
            parameterOverrides,
          ) => {
            const draftId = requestDraftId?.trim();
            if (!draftId) throw new Error("INITIAL_CANONICAL_DRAFT_ID_REQUIRED");
            const buildStartedAt = Date.now();
            let mapping: ForemanAiEstimateDraftMapping;
            try {
              mapping = await compileConsumerCanonicalBaseline({
                catalogId,
                prompt: problemText,
                draftId,
                selectedRoadScope,
                parameterOverrides,
              });
            } catch (error) {
              if (!(error instanceof ConsumerCanonicalBaselineNeedsParametersError)) throw error;
              return saveConsumerRepairCanonicalParameterCollection({
                requestDraftId: draftId,
                consumerUserId: resolvedConsumerUserId!,
                problemText,
                session: error.session,
              });
            }
            logger.releaseEvidence("RikEstimateBuild", "RUNTIME_DRAFT_READY", {
              stage: "RUNTIME_DRAFT_READY",
              elapsedMs: Date.now() - buildStartedAt,
            });
            const persisted = await persistCanonicalDraft(
              mapping,
              problemText,
              draftId,
              { evidenceBuildStartedAt: buildStartedAt },
            ) ?? null;
            return persisted;
          }}
          onLoadCanonicalRevisionDraft={async ({ revisionId, requestDraftId, problemText }) => {
            const mapping = await loadConsumerCanonicalRevisionDraftMapping({
              revisionId,
              problemText,
            });
            const parentRevisionId = mapping.payload.canonicalBackend?.parentRevisionId?.trim() || null;
            const requestHistory = listConsumerRepairRequestHistory(resolvedConsumerUserId!);
            const matchingRevisionBundles = requestHistory.filter((candidate) =>
              consumerRepairCanonicalBackendBinding(candidate)?.revisionId === revisionId);
            const matchingRevisionBundle = matchingRevisionBundles.find((candidate) =>
              parentRevisionId
              && candidate.estimateDraftRevisionState?.revisions.some(
                (revision) => revision.revisionId === parentRevisionId,
              )) ?? matchingRevisionBundles[0];
            const matchingRevisionDraftId = matchingRevisionBundle?.draft.id || null;
            const workspacePlan = requestEstimateCanonicalDeepLinkWorkspaceDraftPlan({
              routeRevisionId: props.initialCanonicalRevisionId,
              requestedRevisionId: revisionId,
              explicitRequestDraftId: requestDraftId,
              matchingRevisionDraftId,
              transientWorkspaceDraftId:
                requestEstimateCanonicalDeepLinkSessionWorkspaceDraftId({
                  consumerUserId: resolvedConsumerUserId!,
                  componentDraftId: canonicalDeepLinkWorkspaceDraftIdRef.current,
                }),
            });
            // A cold route names only the requested immutable revision. Rebuild
            // its immediate parent projection first so the ordinary editor can
            // show the same parent-child history/diff that was visible when the
            // child was created. This is read-only backend hydration: it does
            // not compile or recalculate either revision.
            let targetDraftId = workspacePlan.targetDraftId;
            let replaceCanonicalRevisionHistory = workspacePlan.replaceCanonicalRevisionHistory;
            const targetBundle = targetDraftId
              ? requestHistory.find((candidate) => candidate.draft.id === targetDraftId) ?? null
              : null;
            const parentMissingFromProjection = Boolean(
              parentRevisionId
              && !targetBundle?.estimateDraftRevisionState?.revisions.some(
                (candidate) => candidate.revisionId === parentRevisionId,
              ),
            );
            if (parentRevisionId && (replaceCanonicalRevisionHistory || parentMissingFromProjection)) {
              const parentMapping = await loadConsumerCanonicalRevisionDraftMapping({
                revisionId: parentRevisionId,
                problemText,
              });
              const parentBundle = await persistCanonicalDraft(
                parentMapping,
                problemText?.trim() || parentMapping.payload.inputText,
                targetDraftId,
                { replaceCanonicalRevisionHistory: true },
              );
              if (!parentBundle) throw new Error("CANONICAL_PARENT_REVISION_HISTORY_HYDRATION_FAILED");
              targetDraftId = parentBundle.draft.id;
              replaceCanonicalRevisionHistory = false;
            }
            const bundle = await persistCanonicalDraft(
              mapping,
              problemText?.trim() || mapping.payload.inputText,
              targetDraftId,
              {
                replaceCanonicalRevisionHistory,
              },
            );
            if (bundle && workspacePlan.replaceCanonicalRevisionHistory) {
              canonicalDeepLinkWorkspaceDraftIdRef.current = bundle.draft.id;
              rememberRequestEstimateCanonicalDeepLinkSessionWorkspace({
                consumerUserId: resolvedConsumerUserId!,
                draftId: bundle.draft.id,
              });
            }
            let restoredBundle = bundle;
            if (restoredBundle) {
              const binding = consumerRepairCanonicalBackendBinding(restoredBundle);
              if (binding) {
                try {
                  const readyArtifacts = await loadConsumerCanonicalReadyArtifacts(binding);
                  for (const artifact of readyArtifacts) {
                    restoredBundle = bindConsumerRepairCanonicalArtifactReady({
                      requestDraftId: restoredBundle.draft.id,
                      artifact,
                    });
                  }
                  if (readyArtifacts.length > 0) {
                    await awaitConsumerRepairBundleDurableCommit({
                      requestDraftId: restoredBundle.draft.id,
                      expectedStatus: restoredBundle.draft.status,
                      expectedRevisionId: binding.revisionId,
                    });
                  }
                } catch (error) {
                  // The estimate itself remains usable if an artifact endpoint is
                  // temporarily unavailable. Never promote an unverified local file.
                  logger.warn("ConsumerRepairCanonicalArtifacts", "cold reopen hydration failed", error);
                }
              }
            }
            return restoredBundle
              ? await refreshAuthoritativePhotos(restoredBundle, revisionId)
              : null;
          }}
          onLoadCanonicalParameterSession={(revisionId, requestDraftId) =>
            loadConsumerCanonicalParameterSession({ revisionId, draftId: requestDraftId })}
          onRecalculateCanonicalEstimate={async ({ revisionId, requestDraftId, problemText, patches, rowOverrides }) => {
            const result = await recalculateConsumerCanonicalEstimate({
              revisionId,
              draftId: requestDraftId,
              problemText,
              patches,
              rowOverrides,
            });
            const bundle = await persistCanonicalDraft(result.mapping, problemText, requestDraftId);
            if (!bundle) throw new Error("CANONICAL_CONSUMER_CHILD_DRAFT_PERSIST_FAILED");
            return { session: result.session, bundle };
          }}
          onSelectCanonicalCatalogItem={async ({ context, problemText, catalogItem }) => {
            const mapping = await recalculateConsumerCanonicalCatalogSelection({
              revisionId: context.revisionId,
              problemText,
              rowId: context.lineId!,
              catalogItem,
            });
            const childBundle = await persistCanonicalDraft(mapping, problemText, context.draftId);
            if (!childBundle) throw new Error("CATALOG_CHILD_DRAFT_NOT_PERSISTED");
            const childItem = childBundle.items.find((item) =>
              consumerRepairRowCode(item) === context.lineId
            );
            if (!childItem) throw new Error("CATALOG_CHILD_ROW_NOT_FOUND");
            const selected = applyConsumerRepairCatalogItemSelection({
              current: childBundle,
              catalogItem,
              targetItemId: childItem.id,
            });
            screenRef.current?.acceptCanonicalBackendDraft(selected.bundle);
          }}
          onAddCanonicalCatalogItem={async ({ context, problemText, catalogItem }) => {
            const result = await recalculateConsumerCanonicalCatalogAddition({
              revisionId: context.revisionId,
              problemText,
              catalogItem,
            });
            const childBundle = await persistCanonicalDraft(
              result.mapping,
              problemText,
              context.draftId,
            );
            if (!childBundle) throw new Error("CATALOG_ADDITION_CHILD_DRAFT_NOT_PERSISTED");
            const childItem = childBundle.items.find((item) =>
              consumerRepairRowCode(item) === result.rowId
            );
            if (!childItem) throw new Error("CATALOG_ADDITION_CHILD_ROW_NOT_FOUND");
            const selected = applyConsumerRepairCatalogItemSelection({
              current: childBundle,
              catalogItem,
              targetItemId: childItem.id,
            });
            screenRef.current?.acceptCanonicalBackendDraft(selected.bundle);
          }}
          onOpenPhotoForMaterialRecognition={photoCapture.openPhotoForMaterialRecognition}
          MobilePhotoCaptureFlowNode={photoCapture.flow}
        />
      )}
      {canonicalEstimatePreview ? (
        <CanonicalEstimateMeaningfulPreviewCard preview={canonicalEstimatePreview} />
      ) : null}
      {authResolved && resolvedConsumerUserId && durableStatus === "loading" ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.storageNotice}
          testID="consumer-repair-storage-hydrating"
        >
          <Text style={styles.storageNoticeText}>
            Восстанавливаем сохранённые черновики. Экран уже доступен.
          </Text>
        </View>
      ) : null}
      {authResolved && resolvedConsumerUserId && durableStatus === "recovery" ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.storageNotice, styles.storageRecovery]}
          testID="consumer-repair-storage-recovery"
        >
          <Text style={styles.storageNoticeText}>
            Хранилище пока не ответило. Можно создать новый черновик или повторить восстановление.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={hydrate}
            style={styles.storageTryAgain}
            testID="consumer-repair-storage-try-again"
          >
            <Text style={styles.storageTryAgainText}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  exactDraftHydrationGate: {
    flex: 1,
  },
  storageNotice: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    zIndex: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  meaningfulPreview: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 72,
    gap: 10,
  },
  meaningfulPreviewEyebrow: {
    color: "#0F766E",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  meaningfulPreviewTitle: {
    color: "#0F172A",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  meaningfulPreviewMeta: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  meaningfulPreviewRows: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 6,
  },
  meaningfulPreviewSection: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  meaningfulPreviewRow: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  meaningfulPreviewSaving: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  meaningfulPreviewOpen: {
    alignSelf: "flex-start",
    borderRadius: 9,
    backgroundColor: "#0F766E",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  meaningfulPreviewOpenDisabled: {
    opacity: 0.6,
  },
  meaningfulPreviewOpenText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  storageRecovery: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  storageNoticeText: {
    color: "#134E4A",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  storageTryAgain: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0F766E",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  storageTryAgainText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
