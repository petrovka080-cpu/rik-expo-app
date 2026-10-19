import React from "react";
import { enrichCanonicalPreliminaryNamingEvidence,
  type CanonicalPreliminaryNamingEvidence } from '../../lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import { canonicalPreviewQuantityCounts } from './consumerCanonicalPreviewQuantityCounts';
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import { canonicalPublicResourcePresentationV1 } from "../../lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  awaitConsumerRepairBundleDurableCommit,
  findConsumerRepairBundle,
  saveConsumerRepairBundle,
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
  listConsumerRepairWorkspaceHistory,
  saveConsumerRepairCanonicalParameterCollection,
  synchronizeConsumerRepairAuthoritativePhotoAttachments,
  upsertConsumerRepairCanonicalBackendDraft,
} from "../../lib/consumerRequests/consumerRequestService";
import type { ForemanAiEstimateDraftMapping } from "../../lib/foremanAiEstimate";
import {
  assertConsumerRepairCanonicalDraftWriteSource,
  captureConsumerRepairCanonicalDraftWriteSource,
  type ConsumerRepairCanonicalDraftWriteSource,
} from "../../lib/consumerRequests/consumerCanonicalParameterCollection";
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
  recalculateAndPersistConsumerCanonicalEstimate,
} from "./consumerCanonicalParameterEditor";
import { applyConsumerRepairCatalogItemSelection } from "./requestEstimateScreenActions";
import {
  getCanonicalEstimateRevision,
  listCanonicalEstimatePhotoAttachments,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";
import { consumerRepairRowCode } from "./consumerRepairRowMetadata";
import { isConsumerEstimateCompositionVisibleItem } from "../../lib/consumerRequests/consumerEstimateReadiness";
import { logger } from "../../lib/logger";
import { loadConsumerCanonicalReadyArtifacts } from "./consumerCanonicalArtifactHydration";
import {
  ConsumerCanonicalReleaseMigrationConfirmation,
  useConsumerCanonicalReleaseMigrationConfirmation,
} from "./ConsumerCanonicalReleaseMigrationConfirmation";

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
  explicitValidationFixture: boolean;
  calculatedRows: {
    id: string;
    titleRu: string;
    quantity: number;
    unit: string;
  }[];
  calculatedRowCount: number;
  preliminaryNeedCount: number;
  missingQuantityCount: number;
  saved: boolean;
  onPublished: () => void;
  onOpenFullEstimate: () => void;
};

export async function loadConsumerRepairCanonicalNamingEvidence(input: {
  revisionId: string; requestDraftId: string; consumerUserId: string | null;
  workspaceGenerationRef: {current: number};
}): Promise<CanonicalPreliminaryNamingEvidence | null> {
  const {revisionId, requestDraftId, consumerUserId, workspaceGenerationRef} = input;
  const generation = workspaceGenerationRef.current;
  const existing = findConsumerRepairBundle(requestDraftId);
  if (!existing || existing.draft.consumerUserId !== consumerUserId
    || consumerRepairCanonicalBackendBinding(existing)?.revisionId !== revisionId) return null;
  // The caller's live copy may still be legacy even if another opening has
  // already enriched the repository. Return the original owner evidence to it.
  const revision = await getCanonicalEstimateRevision(revisionId);
  const latest = findConsumerRepairBundle(requestDraftId);
  if (workspaceGenerationRef.current !== generation || !latest
    || latest.draft.consumerUserId !== consumerUserId
    || latest.estimateDraftRevisionState?.currentRevisionId !== revisionId
    || consumerRepairCanonicalBackendBinding(latest)?.revisionId !== revisionId) return null;
  const evidence: CanonicalPreliminaryNamingEvidence = {compilerOwner: 'backend',
    revisionId: revision.revisionId, releaseId: revision.releaseId, catalogId: revision.catalogId,
    checksumSha256: revision.checksumSha256, preliminaryNeeds: revision.preliminaryNeeds};
  if (evidence.revisionId !== revisionId) return null;
  const enriched = enrichCanonicalPreliminaryNamingEvidence(latest, evidence);
  if (enriched !== latest) saveConsumerRepairBundle(enriched);
  return evidence;
}

export function canonicalEstimatePreviewIsExplicitValidationFixture(sourceRequestText?: string | null): boolean {
  return /^ДЕМО\s*\/\s*VALIDATION_FIXTURE\s*:/iu.test(String(sourceRequestText ?? "").trim());
}

export function canonicalEstimatePreviewSaveStatusRu(input: { saved: boolean; preliminaryNeedCount: number }): string {
  if (!input.saved) return "Сохраняем смету в черновике…";
  return input.preliminaryNeedCount > 0
    ? "Смета сохранена в черновике. Для полного расчёта нужны исходные сведения о количествах и условиях. Полный итог не рассчитан."
    : "Смета сохранена в черновике. Откройте позиции и проверьте количества, источники и цены.";
}

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
      {preview.explicitValidationFixture ? (
        <Text style={styles.meaningfulPreviewSaving} testID="consumer-estimate-preview-fixture-marker">
          Проверочный пример. Проектная смета не утверждена.
        </Text>
      ) : null}
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
        {`Требуют уточнения: ${preview.preliminaryNeedCount} · без количества: ${preview.missingQuantityCount}`}
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
        {canonicalEstimatePreviewSaveStatusRu(preview)}
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
          {preview.saved ? "Открыть позиции и уточнения" : "Сохраняем полный расчёт…"}
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

function useResolvedConsumerRepairUserId(explicitUserId?: string): {
  authResolved: boolean;
  resolvedConsumerUserId: string | null;
} {
  const explicit = explicitUserId?.trim() || null;
  const [authResolved, setAuthResolved] = React.useState(Boolean(explicit));
  const [resolvedConsumerUserId, setResolvedConsumerUserId] = React.useState<string | null>(explicit);
  React.useEffect(() => {
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
  }, [explicit]);
  return { authResolved, resolvedConsumerUserId };
}

function ConsumerRepairStorageStatus({
  authResolved,
  consumerUserId,
  durableStatus,
  onRetry,
}: {
  authResolved: boolean;
  consumerUserId: string | null;
  durableStatus: DurableHydrationStatus;
  onRetry: () => void;
}): React.ReactElement | null {
  if (!authResolved || !consumerUserId || durableStatus === "ready") return null;
  if (durableStatus === "loading") {
    return (
      <View accessibilityLiveRegion="polite" style={styles.storageNotice} testID="consumer-repair-storage-hydrating">
        <Text style={styles.storageNoticeText}>
          Восстанавливаем сохранённые черновики. Экран уже доступен.
        </Text>
      </View>
    );
  }
  return (
    <View accessibilityLiveRegion="polite" style={[styles.storageNotice, styles.storageRecovery]} testID="consumer-repair-storage-recovery">
      <Text style={styles.storageNoticeText}>
        Хранилище пока не ответило. Можно создать новый черновик или повторить восстановление.
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.storageTryAgain} testID="consumer-repair-storage-try-again">
        <Text style={styles.storageTryAgainText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

type ConsumerRepairCanonicalBundle = ReturnType<
  typeof upsertConsumerRepairCanonicalBackendDraft
>;

type DurablySavedCanonicalPreviewWorkspace = {
  draftId: string;
  ownerUserId: string;
  revisionId: string;
  workspaceGeneration: number;
};

function requestEstimateDurablySavedPreviewMatchesWorkspace(input: {
  savedWorkspace: DurablySavedCanonicalPreviewWorkspace | null;
  requestedDraftId?: string;
  consumerUserId: string | null;
  workspaceGeneration: number;
}): boolean {
  const saved = input.savedWorkspace;
  if (!saved || saved.workspaceGeneration !== input.workspaceGeneration
    || saved.ownerUserId !== input.consumerUserId
    || saved.draftId !== input.requestedDraftId?.trim()) return false;
  const bundle = findConsumerRepairBundle(saved.draftId);
  // The exact draft was already transactionally committed by this workspace.
  // Hydrating unrelated history must not unmount its preview's editor. A cold
  // or changed workspace still uses the ordinary durable hydration gate.
  return bundle?.draft.status === "draft"
    && bundle.draft.consumerUserId === saved.ownerUserId
    && consumerRepairCanonicalBackendBinding(bundle)?.revisionId === saved.revisionId;
}

type PersistConsumerCanonicalDraftOptions = {
  replaceCanonicalRevisionHistory?: boolean;
  evidenceBuildStartedAt?: number;
  expectedWorkspaceGeneration?: number;
  expectedDraftWriteSource?: ConsumerRepairCanonicalDraftWriteSource;
  showInitialPreview?: boolean;
};

export function shouldPublishInitialConsumerCanonicalPreview(
  options: Pick<PersistConsumerCanonicalDraftOptions, "showInitialPreview">,
  contentWithdrawalReasonRu?: string | null,
): boolean {
  // A normal editor amendment must stay in the current form. The early,
  // full-screen result belongs only to an explicitly requested initial build.
  return options.showInitialPreview === true && !contentWithdrawalReasonRu;
}

function useConsumerCanonicalDraftPersistence(input: {
  consumerUserId: string | null;
  screenRef: React.RefObject<ConsumerRepairRequestScreenController | null>;
  workspaceGenerationRef: React.MutableRefObject<number>;
  pendingBundleRef: React.MutableRefObject<ConsumerRepairCanonicalBundle | null>;
  savedPreviewWorkspaceRef: React.MutableRefObject<DurablySavedCanonicalPreviewWorkspace | null>;
  currentRouteDraftIdRef: React.MutableRefObject<string | null>;
  pendingPreviewPublishedRef: React.MutableRefObject<(() => void) | null>;
  setPreview: React.Dispatch<React.SetStateAction<CanonicalEstimateMeaningfulPreview | null>>;
}): (
  mapping: ForemanAiEstimateDraftMapping,
  problemText: string,
  targetDraftId: string | null,
  options?: PersistConsumerCanonicalDraftOptions,
) => Promise<ConsumerRepairCanonicalBundle | undefined> {
  const {
    consumerUserId,
    screenRef,
    workspaceGenerationRef,
    pendingBundleRef,
    savedPreviewWorkspaceRef,
    currentRouteDraftIdRef,
    pendingPreviewPublishedRef,
    setPreview,
  } = input;
  return React.useCallback(async (
    mapping: ForemanAiEstimateDraftMapping,
    problemText: string,
    targetDraftId: string | null,
    options: PersistConsumerCanonicalDraftOptions = {},
  ) => {
    if (!consumerUserId) return;
    const assertCurrentWorkspace = () => {
      if (
        options.expectedWorkspaceGeneration != null &&
        workspaceGenerationRef.current !== options.expectedWorkspaceGeneration
      ) {
        throw new Error("CANONICAL_WORKSPACE_REPLACED");
      }
    };
    assertCurrentWorkspace();
    const assertDraftSource = () => {
      if (options.expectedDraftWriteSource) {
        if (!targetDraftId || targetDraftId !== options.expectedDraftWriteSource.draftId
          || consumerUserId !== options.expectedDraftWriteSource.ownerUserId) {
          throw new Error("CANONICAL_WORKSPACE_REPLACED");
        }
        assertConsumerRepairCanonicalDraftWriteSource(options.expectedDraftWriteSource, findConsumerRepairBundle(targetDraftId));
      }
    };
    assertDraftSource();
    const evidenceBuildStartedAt = options.evidenceBuildStartedAt ?? Date.now();
    const previewWorkspaceGeneration = workspaceGenerationRef.current;
    const canonicalBackend = mapping.payload.canonicalBackend;
    if (!canonicalBackend) {
      throw new Error("CANONICAL_COMPILE_HISTORY_IDENTITY_MISSING");
    }
    const calculatedRows = mapping.rows.filter((row) =>
      isConsumerEstimateCompositionVisibleItem(row.structuredRow)
      && Number.isFinite(row.quantity)
    );
    const preliminaryNeedCount = canonicalBackend.preliminaryNeeds?.length ?? 0;
    const quantityCounts = canonicalPreviewQuantityCounts({ calculatedRowIds: calculatedRows.map(row => row.rowId),
      preliminaryNeeds: canonicalBackend.preliminaryNeeds ?? [] });
    const publishInitialPreview = shouldPublishInitialConsumerCanonicalPreview(options, canonicalBackend.contentWithdrawalReasonRu);
    if (publishInitialPreview) {
      let fullEstimateOpenRequested = false;
      await new Promise<void>((resolvePublished) => {
        const settlePublished = () => {
          if (pendingPreviewPublishedRef.current === settlePublished) {
            pendingPreviewPublishedRef.current = null;
          }
          resolvePublished();
        };
        pendingPreviewPublishedRef.current = settlePublished;
        setPreview({
          revisionId: canonicalBackend.revisionId,
          titleRu: mapping.payload.workTitle?.trim() || "Предварительная смета",
          explicitValidationFixture: canonicalEstimatePreviewIsExplicitValidationFixture(canonicalBackend.sourceRequestText),
          calculatedRows: calculatedRows.slice(0, 4).map((row) => {
            const presentation = canonicalPublicResourcePresentationV1({ titleRu: row.visibleName,
              descriptor: row.structuredRow.sourceParameters?.canonicalPublicResourcePresentationV1,
              manualTitleOverride: row.structuredRow.sourceParameters?.canonicalManualTitleOverride === true });
            return { id: row.rowId, titleRu: presentation?.nameRu ?? row.visibleName,
              quantity: row.quantity, unit: formatEstimateUnitLabel(row.unit?.trim() || "ед.") };
          }),
          calculatedRowCount: quantityCounts.knownQuantityCount,
          preliminaryNeedCount,
          missingQuantityCount: quantityCounts.missingQuantityCount,
          saved: false,
          onPublished: settlePublished,
          onOpenFullEstimate: () => {
            if (fullEstimateOpenRequested) return;
            const pending = pendingBundleRef.current;
            if (!pending || !screenRef.current
              || workspaceGenerationRef.current !== previewWorkspaceGeneration
              || pending.draft.consumerUserId !== consumerUserId
              || (currentRouteDraftIdRef.current != null && currentRouteDraftIdRef.current !== pending.draft.id)
              || consumerRepairCanonicalBackendBinding(pending)?.revisionId !== canonicalBackend.revisionId) return;
            fullEstimateOpenRequested = true;
            screenRef.current.acceptCanonicalBackendDraft(pending, {
              persistenceStatus: "saved",
              onPublished: () => {
                if (pendingBundleRef.current === pending) pendingBundleRef.current = null;
                setPreview((current) =>
                  current?.revisionId === canonicalBackend.revisionId ? null : current
                );
              },
            });
          },
        });
      });
      assertCurrentWorkspace();
      logger.releaseEvidence("RikEstimateBuild", "MEANINGFUL_UI_PUBLISHED", {
        stage: "MEANINGFUL_UI_PUBLISHED",
        elapsedMs: Date.now() - evidenceBuildStartedAt,
        calculatedRowCount: calculatedRows.length,
        preliminaryNeedCount,
      });
    }
    try {
      assertCurrentWorkspace();
      assertDraftSource();
      const bundle = upsertConsumerRepairCanonicalBackendDraft({
        requestDraftId: targetDraftId,
        consumerUserId,
        problemText: problemText || mapping.payload.inputText,
        city: "Bishkek",
        // Preserve the complete immutable backend projection. Excluded rows keep
        // their disposition in the UI model; filtering them here made one
        // revision report different row counts in UI, history, PDF and backend.
        aiDraft: buildStructuredEstimateRequestDraft(mapping.payload),
        replaceCanonicalRevisionHistory: options.replaceCanonicalRevisionHistory === true,
        expectedDraftWriteSource: options.expectedDraftWriteSource,
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
        !binding ||
        binding.revisionId !== canonicalBackend.revisionId ||
        binding.releaseId !== canonicalBackend.releaseId
      ) {
        throw new Error("CANONICAL_COMPILE_HISTORY_IDENTITY_MISMATCH");
      }
      // A deep link may legitimately point at a revision older than the first
      // history page. Confirm the immutable revision by its exact identity;
      // using the latest-100 history page here made valid older estimates fail
      // locally after enough later calculations were created.
      const backendRevision = await getCanonicalEstimateRevision(binding.revisionId);
      if (
        backendRevision.revisionId !== binding.revisionId
        || backendRevision.releaseId !== binding.releaseId
      ) {
        throw new Error("CANONICAL_COMPILE_REVISION_IDENTITY_MISMATCH");
      }
      assertCurrentWorkspace();
      logger.releaseEvidence("RikEstimatePersist", "BUNDLE_BACKEND_REVISION_CONFIRMED", {
        stage: "BUNDLE_BACKEND_REVISION_CONFIRMED",
        elapsedMs: Date.now() - evidenceBuildStartedAt,
      });
      await awaitConsumerRepairBundleDurableCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId: bundle.estimateDraftRevisionState?.currentRevisionId ?? null,
      });
      logger.releaseEvidence("RikEstimatePersist", "BUNDLE_TRANSACTIONAL_COMMIT_CONFIRMED", {
        stage: "BUNDLE_TRANSACTIONAL_COMMIT_CONFIRMED",
        elapsedMs: Date.now() - evidenceBuildStartedAt,
      });
      assertCurrentWorkspace();
      if (options.evidenceBuildStartedAt != null) {
        // Persistence is complete at this boundary. The following controller
        // projection can synchronously render a large BOQ and must not inflate
        // the production first-persist measurement.
        logger.releaseEvidence("RikEstimateBuild", "BUNDLE_PERSISTED", {
          stage: "BUNDLE_PERSISTED",
          elapsedMs: Date.now() - evidenceBuildStartedAt,
        });
      }
      if (publishInitialPreview) {
        pendingBundleRef.current = bundle;
        savedPreviewWorkspaceRef.current = {
          draftId: bundle.draft.id,
          ownerUserId: consumerUserId,
          revisionId: binding.revisionId,
          workspaceGeneration: previewWorkspaceGeneration,
        };
      }
      setPreview((current) =>
        current?.revisionId === binding.revisionId ? { ...current, saved: true } : current
      );
      return bundle;
    } catch (error) {
      if (
        pendingBundleRef.current?.estimateDraftRevisionState?.currentRevisionId ===
        canonicalBackend.revisionId
      ) {
        pendingBundleRef.current = null;
      }
      setPreview((current) =>
        current?.revisionId === canonicalBackend.revisionId ? null : current
      );
      throw error;
    }
  }, [
    consumerUserId,
    pendingBundleRef,
    pendingPreviewPublishedRef,
    savedPreviewWorkspaceRef,
    currentRouteDraftIdRef,
    screenRef,
    setPreview,
    workspaceGenerationRef,
  ]);
}

export function ConsumerRepairRequestScreen(props: ConsumerRepairRequestScreenProps): React.ReactElement {
  const [durableStatus, setDurableStatus] =
    React.useState<DurableHydrationStatus>("loading");
  const { authResolved, resolvedConsumerUserId } =
    useResolvedConsumerRepairUserId(props.consumerUserId);
  const hydrationAttemptRef = React.useRef(0);
  const screenRef = React.useRef<ConsumerRepairRequestScreenController>(null);
  const pendingCanonicalEstimateBundleRef = React.useRef<
    ReturnType<typeof upsertConsumerRepairCanonicalBackendDraft> | null
  >(null);
  const pendingPreviewPublishedRef = React.useRef<(() => void) | null>(null);
  const savedPreviewWorkspaceRef = React.useRef<DurablySavedCanonicalPreviewWorkspace | null>(null);
  const currentRouteDraftIdRef = React.useRef<string | null>(null);
  currentRouteDraftIdRef.current = props.initialDraftId?.trim() || null;
  const canonicalDeepLinkWorkspaceDraftIdRef = React.useRef<string | null>(null);
  const controllerWorkspaceKey = requestEstimateControllerWorkspaceKey(props);
  const canonicalRouteRevisionId = canonicalEstimateRevisionIdFromRoute(
    props.initialCanonicalRevisionId,
  );
  const routeWorkspaceIdentity = [
    controllerWorkspaceKey,
    canonicalRouteRevisionId ?? "",
    resolvedConsumerUserId ?? "",
  ].join("\u0000");
  const routeWorkspaceIdentityRef = React.useRef(routeWorkspaceIdentity);
  const workspaceGenerationRef = React.useRef(0);
  if (routeWorkspaceIdentityRef.current !== routeWorkspaceIdentity) {
    routeWorkspaceIdentityRef.current = routeWorkspaceIdentity;
    workspaceGenerationRef.current += 1;
  }
  const releaseMigrationConfirmation = useConsumerCanonicalReleaseMigrationConfirmation(routeWorkspaceIdentity);
  const captureRecalculationSource = (draftId: string, revisionId: string) => {
    const current = findConsumerRepairBundle(draftId);
    if (!current || current.draft.consumerUserId !== resolvedConsumerUserId
      || consumerRepairCanonicalBackendBinding(current)?.revisionId !== revisionId) {
      throw new Error("CANONICAL_WORKSPACE_REPLACED");
    }
    const expectedDraftWriteSource = captureConsumerRepairCanonicalDraftWriteSource(current);
    const expectedWorkspaceGeneration = workspaceGenerationRef.current;
    return {
      expectedDraftWriteSource,
      expectedWorkspaceGeneration,
      assertMutationSource: () => {
        if (workspaceGenerationRef.current !== expectedWorkspaceGeneration) throw new Error("CANONICAL_WORKSPACE_REPLACED");
        assertConsumerRepairCanonicalDraftWriteSource(expectedDraftWriteSource, findConsumerRepairBundle(draftId));
      },
    };
  };
  const freshBuildKey = requestEstimateFreshBuildKey(props);
  const [settledFreshBuildKey, setSettledFreshBuildKey] = React.useState<string | null>(null);
  const freshBuildKeyRef = React.useRef<string | null>(freshBuildKey);
  const freshBuildWorkspaceRef = React.useRef<string | null>(
    freshBuildKey ? routeWorkspaceIdentity : null,
  );
  const settledFreshBuildWorkspaceRef = React.useRef<string | null>(null);
  if (freshBuildKey) {
    freshBuildKeyRef.current = freshBuildKey;
    freshBuildWorkspaceRef.current = routeWorkspaceIdentity;
  }
  const [canonicalEstimatePreview, setCanonicalEstimatePreview] =
    React.useState<CanonicalEstimateMeaningfulPreview | null>(null);
  React.useEffect(() => {
    settledFreshBuildWorkspaceRef.current = null;
    setSettledFreshBuildKey(null);
    pendingPreviewPublishedRef.current?.();
    pendingPreviewPublishedRef.current = null;
    pendingCanonicalEstimateBundleRef.current = null;
    savedPreviewWorkspaceRef.current = null;
    setCanonicalEstimatePreview(null);
    return () => {
      pendingPreviewPublishedRef.current?.();
      pendingPreviewPublishedRef.current = null;
    };
  }, [routeWorkspaceIdentity]);
  React.useEffect(() => {
    const requestedDraftId = props.initialDraftId?.trim();
    const saved = savedPreviewWorkspaceRef.current;
    if (saved && requestedDraftId && saved.draftId !== requestedDraftId) {
      savedPreviewWorkspaceRef.current = null;
      pendingCanonicalEstimateBundleRef.current = null;
      setCanonicalEstimatePreview(null);
    }
  }, [props.initialDraftId]);
  React.useEffect(() => {
    if (!canonicalRouteRevisionId && !props.initialDraftId?.trim()) {
      canonicalDeepLinkWorkspaceDraftIdRef.current = null;
      if (resolvedConsumerUserId) {
        canonicalDeepLinkWorkspaceDraftIdsByConsumer.delete(resolvedConsumerUserId);
      }
    }
  }, [
    canonicalRouteRevisionId,
    props.initialDraftId,
    resolvedConsumerUserId,
  ]);
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
    workspaceGeneration: workspaceGenerationRef.current,
    onStatusMessage: (statusMessage, workspaceGeneration) => {
      if (workspaceGeneration !== workspaceGenerationRef.current) return;
      screenRef.current?.setPhotoCaptureStatusMessage(statusMessage);
    },
    onMaterialPhotoCaptured: (result) => {
      if (result.workspaceGeneration !== workspaceGenerationRef.current) return;
      if (result.purpose === "line_attachment") {
        screenRef.current?.attachCapturedPhotoToLine(result);
        return;
      }
      void screenRef.current?.openMaterialCatalogFromCapturedPhoto(result);
    },
  });
  const durableHydrationPending = durableStatus === "loading" &&
    !freshBuildKey &&
    freshBuildWorkspaceRef.current !== routeWorkspaceIdentity &&
    settledFreshBuildWorkspaceRef.current !== routeWorkspaceIdentity &&
    !shouldDeferInitialHistoryLoad(props) &&
    !requestEstimateDurablySavedPreviewMatchesWorkspace({
      savedWorkspace: savedPreviewWorkspaceRef.current,
      requestedDraftId: props.initialDraftId,
      consumerUserId: resolvedConsumerUserId,
      workspaceGeneration: workspaceGenerationRef.current,
    });
  const persistCanonicalDraft = useConsumerCanonicalDraftPersistence({
    consumerUserId: resolvedConsumerUserId,
    screenRef,
    workspaceGenerationRef,
    pendingBundleRef: pendingCanonicalEstimateBundleRef,
    savedPreviewWorkspaceRef,
    currentRouteDraftIdRef,
    pendingPreviewPublishedRef,
    setPreview: setCanonicalEstimatePreview,
  });
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
    const existing = findConsumerRepairBundle(draftId);
    if (existing?.draft.consumerUserId !== resolvedConsumerUserId || existing.draft.deletedAt) return;
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
          <Text style={styles.storageNoticeText}>Не удалось открыть персональную сессию сметы.</Text>
        </View>
      ) : durableHydrationPending ? (
        <View testID="consumer-repair-exact-draft-hydration-gate" style={styles.exactDraftHydrationGate} />
      ) : (
        <View
          style={styles.root}
          testID="consumer-repair-controller-surface"
          pointerEvents={canonicalEstimatePreview ? "none" : "auto"}
          accessibilityElementsHidden={Boolean(canonicalEstimatePreview)}
          importantForAccessibility={canonicalEstimatePreview ? "no-hide-descendants" : "auto"}
        >
        <ConsumerRepairRequestScreenController
          key={controllerWorkspaceKey}
          ref={screenRef}
          {...props}
          consumerUserId={resolvedConsumerUserId!}
          deferFullCanonicalEstimateProjection
          onInitialLaunchBuildSettled={() => {
            const settledKey = freshBuildKey ?? freshBuildKeyRef.current;
            if (!settledKey) return;
            settledFreshBuildWorkspaceRef.current = routeWorkspaceIdentity;
            setSettledFreshBuildKey(settledKey);
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
            const expectedWorkspaceGeneration = workspaceGenerationRef.current;
            const expectedDraft = findConsumerRepairBundle(draftId);
            if (!expectedDraft || expectedDraft.draft.consumerUserId !== resolvedConsumerUserId) {
              throw new Error("CANONICAL_WORKSPACE_REPLACED");
            }
            const expectedDraftWriteSource = captureConsumerRepairCanonicalDraftWriteSource(expectedDraft);
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
              if (workspaceGenerationRef.current !== expectedWorkspaceGeneration) {
                throw new Error("CANONICAL_WORKSPACE_REPLACED");
              }
              assertConsumerRepairCanonicalDraftWriteSource(expectedDraftWriteSource, findConsumerRepairBundle(draftId));
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
              {
                evidenceBuildStartedAt: buildStartedAt,
                expectedWorkspaceGeneration,
                expectedDraftWriteSource,
                showInitialPreview: true,
              },
            ) ?? null;
            return persisted;
          }}
          onLoadCanonicalRevisionDraft={async ({ revisionId, requestDraftId, problemText }) => {
            const expectedWorkspaceGeneration = workspaceGenerationRef.current;
            const mapping = await loadConsumerCanonicalRevisionDraftMapping({
              revisionId,
              problemText,
            });
            const parentRevisionId = mapping.payload.canonicalBackend?.parentRevisionId?.trim() || null;
            const requestHistory = listConsumerRepairWorkspaceHistory(resolvedConsumerUserId!, { exactDraftId: requestDraftId ?? undefined });
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
                {
                  replaceCanonicalRevisionHistory: true,
                  expectedWorkspaceGeneration,
                },
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
                expectedWorkspaceGeneration,
                // Reopening an immutable revision is one authoritative restore.
                // A fresh-build preview would retain the pre-artifact bundle and
                // publish it again when the user opens the full estimate.
                showInitialPreview: false,
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
          onLoadCanonicalNamingEvidence={(revisionId, requestDraftId) => loadConsumerRepairCanonicalNamingEvidence({
            revisionId, requestDraftId, consumerUserId: resolvedConsumerUserId, workspaceGenerationRef})}
          onRecalculateCanonicalEstimate={async (command) => {
            const {revisionId,requestDraftId,problemText,patches,rowOverrides}=command;
            const source = captureRecalculationSource(requestDraftId, revisionId);
            return await recalculateAndPersistConsumerCanonicalEstimate({
              revisionId,
              draftId: requestDraftId,
              problemText,
              patches,
              rowOverrides,
              ...(Object.hasOwn(command,'selectedMaterialDeliveryRequestV1')?{selectedMaterialDeliveryRequestV1:command.selectedMaterialDeliveryRequestV1}:{}),
              ...(Object.hasOwn(command,'roofPrimerPrerequisiteV1')?{roofPrimerPrerequisiteV1:command.roofPrimerPrerequisiteV1}:{}),
              ...(Object.hasOwn(command,'compositionSelectionV1')?{compositionSelectionV1:command.compositionSelectionV1}:{}),
              confirmReleaseMigration: releaseMigrationConfirmation.confirmReleaseMigration,
              assertMutationSource: source.assertMutationSource,
              persist: (mapping, nextProblemText, targetDraftId) =>
                persistCanonicalDraft(mapping, nextProblemText, targetDraftId, {
                  expectedWorkspaceGeneration: source.expectedWorkspaceGeneration,
                  expectedDraftWriteSource: source.expectedDraftWriteSource,
                }),
            });
          }}
          onSelectCanonicalCatalogItem={async ({ context, problemText, catalogItem }) => {
            const source = captureRecalculationSource(context.draftId, context.revisionId);
            const mapping = await recalculateConsumerCanonicalCatalogSelection({
              revisionId: context.revisionId,
              problemText,
              rowId: context.lineId!,
              catalogItem,
              confirmReleaseMigration: releaseMigrationConfirmation.confirmReleaseMigration,
              assertMutationSource: source.assertMutationSource,
            });
            source.assertMutationSource();
            const childBundle = await persistCanonicalDraft(
              mapping,
              problemText,
              context.draftId,
              { expectedWorkspaceGeneration: source.expectedWorkspaceGeneration, expectedDraftWriteSource: source.expectedDraftWriteSource },
            );
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
            const source = captureRecalculationSource(context.draftId, context.revisionId);
            const result = await recalculateConsumerCanonicalCatalogAddition({
              revisionId: context.revisionId,
              problemText,
              catalogItem,
              confirmReleaseMigration: releaseMigrationConfirmation.confirmReleaseMigration,
              assertMutationSource: source.assertMutationSource,
            });
            source.assertMutationSource();
            const childBundle = await persistCanonicalDraft(
              result.mapping,
              problemText,
              context.draftId,
              { expectedWorkspaceGeneration: source.expectedWorkspaceGeneration, expectedDraftWriteSource: source.expectedDraftWriteSource },
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
          onOpenPhotoForMaterialRecognition={(input) =>
            photoCapture.openPhotoForMaterialRecognition({
              ...input,
              workspaceGeneration: workspaceGenerationRef.current,
            })}
          MobilePhotoCaptureFlowNode={photoCapture.flow}
        />
        </View>
      )}
      {canonicalEstimatePreview ? (
        <CanonicalEstimateMeaningfulPreviewCard preview={canonicalEstimatePreview} />
      ) : null}
      <ConsumerCanonicalReleaseMigrationConfirmation
        prompt={releaseMigrationConfirmation.prompt}
        onConfirm={releaseMigrationConfirmation.confirm}
        onCancel={releaseMigrationConfirmation.cancel}
      />
      <ConsumerRepairStorageStatus
        authResolved={authResolved}
        consumerUserId={resolvedConsumerUserId}
        durableStatus={durableStatus}
        onRetry={hydrate}
      />
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
