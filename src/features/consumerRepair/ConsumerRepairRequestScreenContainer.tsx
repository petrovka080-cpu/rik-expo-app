import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { hydrateTransactionalConsumerRepairRequestStore } from "../../lib/consumerRequests/consumerRequestRepository";
import {
  ConsumerRepairRequestScreenController,
  shouldAutoPrepareInitialConsumerRepairRequest,
  shouldDeferInitialHistoryLoad,
  type ConsumerRepairRequestScreenProps,
} from "./ConsumerRepairRequestScreen";
import { useConsumerRepairPhotoCaptureController } from "./useConsumerRepairPhotoCaptureController";
import ProfessionalEstimateComposer from "../../components/estimate/ProfessionalEstimateComposer";
import { buildStructuredEstimateRequestDraft } from "../../lib/estimateStructuredPipeline/structuredEstimateRequestBinding";
import { upsertConsumerRepairCanonicalBackendDraft } from "../../lib/consumerRequests/consumerRequestService";
import type { ForemanAiEstimateDraftMapping } from "../../lib/foremanAiEstimate";
import { currentUserId } from "../../lib/supabaseClient";
import { compileConsumerCanonicalBaseline } from "./consumerCanonicalBaselineCompile";
import { canonicalEstimateRevisionIdFromRoute } from "../../lib/navigation/canonicalEstimateRevisionDeepLink";
import {
  loadConsumerCanonicalParameterSession,
  recalculateConsumerCanonicalCatalogSelection,
  recalculateConsumerCanonicalEstimate,
} from "./consumerCanonicalParameterEditor";
import { applyConsumerRepairCatalogItemSelection } from "./requestEstimateScreenActions";

const DURABLE_HYDRATION_TIMEOUT_MS = 3_000;

type DurableHydrationStatus = "loading" | "ready" | "recovery";

type BoundedDurableHydrationOutcome =
  | { status: "ready" }
  | { status: "failed" }
  | { status: "timed_out"; completion: Promise<void> };

export function requestEstimateControllerWorkspaceKey(
  props: ConsumerRepairRequestScreenProps,
): string {
  return canonicalEstimateRevisionIdFromRoute(props.initialCanonicalRevisionId)
    || props.launchFingerprint?.trim()
    || props.launchId?.trim()
    || props.initialDraftId?.trim()
    || "request-composer";
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
  const routeCanonicalRevisionId = canonicalEstimateRevisionIdFromRoute(
    props.initialCanonicalRevisionId,
  );
  const [durableStatus, setDurableStatus] =
    React.useState<DurableHydrationStatus>("loading");
  const [authResolved, setAuthResolved] = React.useState(Boolean(props.consumerUserId?.trim()));
  const [resolvedConsumerUserId, setResolvedConsumerUserId] = React.useState<string | null>(
    props.consumerUserId?.trim() || null,
  );
  const hydrationAttemptRef = React.useRef(0);
  const screenRef = React.useRef<ConsumerRepairRequestScreenController>(null);
  const [canonicalComposerVisible, setCanonicalComposerVisible] = React.useState(
    Boolean(routeCanonicalRevisionId),
  );
  const [canonicalPrompt, setCanonicalPrompt] = React.useState(props.initialProblemText ?? "");
  const [canonicalInitialRevisionId, setCanonicalInitialRevisionId] = React.useState<string | null>(
    routeCanonicalRevisionId,
  );
  const [canonicalTargetDraftId, setCanonicalTargetDraftId] = React.useState<string | null>(null);
  const freshBuildKey = shouldAutoPrepareInitialConsumerRepairRequest(props) &&
    props.initialProblemText?.trim() &&
    !props.initialDraftId?.trim()
    ? props.launchId?.trim() || props.launchFingerprint?.trim() || props.initialProblemText.trim()
    : null;
  const [settledFreshBuildKey, setSettledFreshBuildKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!routeCanonicalRevisionId) return;
    setCanonicalPrompt("");
    setCanonicalInitialRevisionId(routeCanonicalRevisionId);
    setCanonicalTargetDraftId(null);
    setCanonicalComposerVisible(true);
  }, [routeCanonicalRevisionId]);
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
        screenRef.current?.refreshAfterDurableHydration();
        setDurableStatus("ready");
        return;
      }
      setDurableStatus("recovery");
      if (outcome.status === "failed") return;
      void outcome.completion.then(
        () => {
          if (hydrationAttemptRef.current !== attempt) return;
          screenRef.current?.refreshAfterDurableHydration();
          setDurableStatus("ready");
        },
        () => {
          // The recovery action remains available for a terminal storage error.
        },
      );
    });
  }, [props.initialDraftId]);
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
    !shouldDeferInitialHistoryLoad(props);
  const persistCanonicalDraft = React.useCallback(async (
    mapping: ForemanAiEstimateDraftMapping,
    problemText: string,
    targetDraftId: string | null,
  ) => {
    if (!resolvedConsumerUserId) return;
    const bundle = upsertConsumerRepairCanonicalBackendDraft({
      requestDraftId: targetDraftId,
      consumerUserId: resolvedConsumerUserId,
      problemText: problemText || mapping.payload.inputText,
      city: "Bishkek",
      // Preserve the complete immutable backend projection. Excluded rows keep
      // their disposition in the UI model; filtering them here made one
      // revision report different row counts in UI, history, PDF and backend.
      aiDraft: buildStructuredEstimateRequestDraft(mapping.payload),
    });
    screenRef.current?.acceptCanonicalBackendDraft(bundle);
    return bundle;
  }, [resolvedConsumerUserId]);
  const acceptCanonicalDraft = React.useCallback(async (mapping: ForemanAiEstimateDraftMapping) => {
    await persistCanonicalDraft(mapping, canonicalPrompt, canonicalTargetDraftId);
    setCanonicalComposerVisible(false);
    setCanonicalInitialRevisionId(null);
    setCanonicalTargetDraftId(null);
  }, [canonicalPrompt, canonicalTargetDraftId, persistCanonicalDraft]);
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
          onInitialLaunchBuildSettled={() => {
            if (freshBuildKey) setSettledFreshBuildKey(freshBuildKey);
          }}
          onOpenCanonicalEstimate={(problemText, revisionId, requestDraftId) => {
            setCanonicalPrompt(problemText);
            setCanonicalInitialRevisionId(revisionId?.trim() || null);
            setCanonicalTargetDraftId(requestDraftId?.trim() || null);
            setCanonicalComposerVisible(true);
          }}
          onPrepareCanonicalEstimate={async (problemText, catalogId, requestDraftId) => {
            const mapping = await compileConsumerCanonicalBaseline({ catalogId, prompt: problemText });
            await persistCanonicalDraft(mapping, problemText, requestDraftId?.trim() || null);
          }}
          onLoadCanonicalParameterSession={(revisionId, requestDraftId) =>
            loadConsumerCanonicalParameterSession({ revisionId, draftId: requestDraftId })}
          onRecalculateCanonicalEstimate={async ({ revisionId, requestDraftId, problemText, patches }) => {
            const result = await recalculateConsumerCanonicalEstimate({
              revisionId,
              draftId: requestDraftId,
              problemText,
              patches,
            });
            await persistCanonicalDraft(result.mapping, problemText, requestDraftId);
            return result.session;
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
              item.sourceParameters?.rowCode === context.lineId
            );
            if (!childItem) throw new Error("CATALOG_CHILD_ROW_NOT_FOUND");
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
      {resolvedConsumerUserId && canonicalComposerVisible ? <ProfessionalEstimateComposer
        visible
        mode="consumer"
        context={{ objectName: "Заявка на ремонт", levelName: "", systemName: "", zoneName: "", sourceScreen: "foreman_materials" }}
        initialText={canonicalPrompt}
        initialRevisionId={canonicalInitialRevisionId}
        onClose={() => {
          setCanonicalComposerVisible(false);
          setCanonicalInitialRevisionId(null);
          setCanonicalTargetDraftId(null);
        }}
        onDraftCreated={acceptCanonicalDraft}
      /> : null}
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
