import React from "react";

import type { MobilePhotoCaptureFlowProps } from "../../components/photoCapture/MobilePhotoCaptureFlow";
import { getCurrentEstimateRevision } from "../../lib/ai/estimateRevisions";
import {
  createPhotoMaterialScanSession,
  PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
  type PhotoMaterialExistingRowFeaturePolicy,
  type PhotoMaterialStoredImage,
} from "../../lib/ai/photoMaterialExistingRow";
import { ensureConsumerRepairBundleEstimateRevisionState } from "../../lib/consumerRequests/consumerRequestEditableEstimateSnapshot";
import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests/consumerRequestTypes";
import type { CapturedPhotoAsset } from "../../lib/mobilePhotoCapture/mobilePhotoCaptureService";
import type { MobilePhotoStorageIdentity } from "../../lib/mobilePhotoCapture/mobilePhotoLocalRepository";
import { commitCanonicalEstimateRowPhoto } from "../../lib/estimate/backendPlatform/canonicalEstimatePhotoAttachmentService";
import type { CanonicalEstimatePhotoAttachmentView } from "../../lib/estimate/backendPlatform/contracts";
import {
  consumerRepairRowCanonicalCatalogId,
  consumerRepairRowCanonicalRevisionId,
  consumerRepairRowCode,
} from "./consumerRepairRowMetadata";

export type OpenConsumerRepairPhotoForMaterialRecognitionInput = {
  userId: string;
  draftId: string;
  canonicalRequestId?: string;
  targetItemId: string;
  workspaceGeneration?: number;
  revisionId?: string;
  lineId?: string;
  purpose?: "material_recognition" | "line_attachment";
  bundle: ConsumerRepairDraftBundle;
};

export type ConsumerRepairPhotoMaterialCaptureResult = {
  draftId: string;
  targetItemId: string;
  workspaceGeneration: number;
  scanId: string;
  asset: CapturedPhotoAsset;
  storedImage: PhotoMaterialStoredImage;
  revisionId: string | null;
  lineId: string;
  purpose: "material_recognition" | "line_attachment";
  storageIdentity: MobilePhotoStorageIdentity;
  authoritativeAttachment?: CanonicalEstimatePhotoAttachmentView;
};

type ConsumerRepairPhotoCaptureControllerInput = {
  workspaceGeneration: number;
  onStatusMessage: (message: string | null, workspaceGeneration: number) => void;
  onMaterialPhotoCaptured?: (
    result: ConsumerRepairPhotoMaterialCaptureResult,
  ) => void;
};

type ActivePhotoCapture = {
  scanId: string;
  draftId: string;
  backendRequestId: string;
  targetItemId: string;
  workspaceGeneration: number;
  targetRowId: string;
  kind: "PRODUCT_FRONT" | "OTHER";
  revisionId: string | null;
  lineId: string;
  purpose: "material_recognition" | "line_attachment";
  storageIdentity: MobilePhotoStorageIdentity;
  catalogId: string;
};

const LazyMobilePhotoCaptureFlow = React.lazy(async () => {
  const module =
    await import("../../components/photoCapture/MobilePhotoCaptureFlow");
  return { default: module.MobilePhotoCaptureFlow };
}) as React.LazyExoticComponent<
  React.ComponentType<MobilePhotoCaptureFlowProps>
>;

function photoMaterialScanFeaturePolicy(
  userId: string,
): PhotoMaterialExistingRowFeaturePolicy {
  return {
    flagName: PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
    rolloutStage: "INTERNAL",
    serverSideDisabled: false,
    internalUserIds: [userId],
    tenantAllowlist: [],
    percentBucket: 0,
  };
}

export function useConsumerRepairPhotoCaptureController({
  workspaceGeneration,
  onStatusMessage,
  onMaterialPhotoCaptured,
}: ConsumerRepairPhotoCaptureControllerInput): {
  openPhotoForMaterialRecognition: (
    input: OpenConsumerRepairPhotoForMaterialRecognitionInput,
  ) => void;
  flow: React.ReactElement | null;
} {
  const [activeCapture, setActiveCapture] =
    React.useState<ActivePhotoCapture | null>(null);
  const currentWorkspaceGenerationRef = React.useRef(workspaceGeneration);
  const activeCommitAbortRef = React.useRef<{
    scanId: string;
    workspaceGeneration: number;
    controller: AbortController;
  } | null>(null);
  currentWorkspaceGenerationRef.current = workspaceGeneration;

  const cancelActivePhotoCommit = (scanId?: string) => {
    const pending = activeCommitAbortRef.current;
    if (!pending || (scanId && pending.scanId !== scanId)) return;
    pending.controller.abort();
    activeCommitAbortRef.current = null;
  };

  React.useEffect(() => {
    const pending = activeCommitAbortRef.current;
    if (pending && pending.workspaceGeneration !== workspaceGeneration) {
      pending.controller.abort();
      activeCommitAbortRef.current = null;
    }
    setActiveCapture((current) =>
      current?.workspaceGeneration === workspaceGeneration ? current : null
    );
    return () => {
      const latest = activeCommitAbortRef.current;
      if (latest?.workspaceGeneration === workspaceGeneration) {
        latest.controller.abort();
        activeCommitAbortRef.current = null;
      }
    };
  }, [workspaceGeneration]);

  const closePhotoCapture = (scanId: string) => {
    cancelActivePhotoCommit(scanId);
    setActiveCapture((current) => current?.scanId === scanId ? null : current);
  };

  const openPhotoForMaterialRecognition = ({
    userId,
    draftId,
    canonicalRequestId,
    targetItemId,
    workspaceGeneration: requestedWorkspaceGeneration = workspaceGeneration,
    revisionId,
    lineId,
    purpose = "material_recognition",
    bundle,
  }: OpenConsumerRepairPhotoForMaterialRecognitionInput) => {
    const captureWorkspaceGeneration = Number.isSafeInteger(requestedWorkspaceGeneration)
      ? requestedWorkspaceGeneration
      : workspaceGeneration;
    try {
      if (captureWorkspaceGeneration !== currentWorkspaceGenerationRef.current) {
        throw new Error("PHOTO_WORKSPACE_REPLACED");
      }
      const exactLineId = lineId?.trim() || targetItemId;
      const backendRequestId = canonicalRequestId?.trim() || draftId;
      if (purpose === "line_attachment") {
        const item = bundle.items.find((candidate) => candidate.id === targetItemId);
        const itemLineId = consumerRepairRowCode(item);
        if (!item || (itemLineId && itemLineId !== exactLineId)) throw new Error("PHOTO_TARGET_ROW_NOT_FOUND");
        const itemRevisionId = consumerRepairRowCanonicalRevisionId(item);
        const catalogId = consumerRepairRowCanonicalCatalogId(item)
          || bundle.draft.selectedCatalogWorkId?.trim()
          || "";
        if (
          !revisionId?.trim() ||
          (itemRevisionId && itemRevisionId !== revisionId) ||
          !catalogId
        ) {
          throw new Error("PHOTO_TARGET_REVISION_MISMATCH");
        }
        setActiveCapture({
          scanId: `estimate-line-photo:${revisionId}:${exactLineId}:${Date.now()}`,
          draftId,
          backendRequestId,
          targetItemId,
          workspaceGeneration: captureWorkspaceGeneration,
          targetRowId: exactLineId,
          kind: "OTHER",
          revisionId,
          lineId: exactLineId,
          purpose,
          storageIdentity: {
            tenantId: bundle.draft.orgId?.trim() || userId,
            requestId: backendRequestId,
            revisionId,
            rowId: exactLineId,
          },
          catalogId,
        });
        onStatusMessage(null, captureWorkspaceGeneration);
        return;
      }
      const bundleWithRevision =
        ensureConsumerRepairBundleEstimateRevisionState(bundle);
      const currentRevision = getCurrentEstimateRevision(
        bundleWithRevision.estimateRevisionState!,
      );
      const row = currentRevision.editable_estimate_snapshot.rows.find((candidate) =>
        candidate.rowId === exactLineId || candidate.requestItemId === targetItemId
      );
      if (!row) throw new Error("PHOTO_TARGET_ROW_NOT_FOUND");
      const scanSession = createPhotoMaterialScanSession({
        userId,
        estimateId: currentRevision.estimate_id,
        baseRevisionId: currentRevision.revision_id,
        targetRowId: targetItemId,
        snapshot: currentRevision.editable_estimate_snapshot,
        featurePolicy: photoMaterialScanFeaturePolicy(userId),
      });

      setActiveCapture({
        scanId: scanSession.scanId,
        draftId,
        backendRequestId,
        targetItemId,
        workspaceGeneration: captureWorkspaceGeneration,
        targetRowId: scanSession.targetRowId,
        kind: "PRODUCT_FRONT",
        revisionId: revisionId?.trim() || currentRevision.revision_id,
        lineId: exactLineId,
        purpose,
        storageIdentity: {
          tenantId: bundle.draft.orgId?.trim() || userId,
          requestId: backendRequestId,
          revisionId: revisionId?.trim() || currentRevision.revision_id,
          rowId: scanSession.targetRowId,
        },
        catalogId: String(bundle.draft.selectedCatalogWorkId ?? "").trim() || currentRevision.estimate_id,
      });
      onStatusMessage(null, captureWorkspaceGeneration);
    } catch (error) {
      onStatusMessage(
        error instanceof Error
          ? error.message
          : "Не удалось открыть фото для материала.",
        captureWorkspaceGeneration,
      );
    }
  };

  return {
    openPhotoForMaterialRecognition,
    flow: activeCapture ? (
      <React.Suspense fallback={null}>
        <LazyMobilePhotoCaptureFlow
          visible
          scanId={activeCapture.scanId}
          targetRowId={activeCapture.targetRowId}
          kind={activeCapture.kind}
          queueUploadOnUse={false}
          storageIdentity={activeCapture.storageIdentity}
          commitPhotoOnUse={activeCapture.purpose === "line_attachment" ? async (asset) => {
            if (activeCapture.workspaceGeneration !== currentWorkspaceGenerationRef.current) {
              throw new Error("PHOTO_WORKSPACE_REPLACED");
            }
            cancelActivePhotoCommit();
            const controller = new AbortController();
            activeCommitAbortRef.current = {
              scanId: activeCapture.scanId,
              workspaceGeneration: activeCapture.workspaceGeneration,
              controller,
            };
            try {
              const committed = await commitCanonicalEstimateRowPhoto({
                asset,
                requestId: activeCapture.backendRequestId,
                catalogId: activeCapture.catalogId,
                revisionId: activeCapture.revisionId!,
                rowId: activeCapture.lineId,
                signal: controller.signal,
              });
              if (activeCapture.workspaceGeneration !== currentWorkspaceGenerationRef.current) {
                throw new Error("PHOTO_WORKSPACE_REPLACED");
              }
              return {
                storedImage: committed.storedImage,
                authoritativeAttachment: committed.attachment,
              };
            } finally {
              if (activeCommitAbortRef.current?.controller === controller) {
                activeCommitAbortRef.current = null;
              }
            }
          } : undefined}
          onCancel={() => closePhotoCapture(activeCapture.scanId)}
          onError={(message) => onStatusMessage(message, activeCapture.workspaceGeneration)}
          onCaptured={(result) => {
            if (activeCapture.workspaceGeneration !== currentWorkspaceGenerationRef.current) {
              closePhotoCapture(activeCapture.scanId);
              return;
            }
            onStatusMessage("Распознаём материал по фото...", activeCapture.workspaceGeneration);
            onMaterialPhotoCaptured?.({
              draftId: activeCapture.draftId,
              targetItemId: activeCapture.targetItemId,
              workspaceGeneration: activeCapture.workspaceGeneration,
              scanId: activeCapture.scanId,
              asset: result.asset,
              storedImage: result.storedImage,
              revisionId: activeCapture.revisionId,
              lineId: activeCapture.lineId,
              purpose: activeCapture.purpose,
              storageIdentity: activeCapture.storageIdentity,
              authoritativeAttachment: result.authoritativeAttachment,
            });
            closePhotoCapture(activeCapture.scanId);
          }}
        />
      </React.Suspense>
    ) : null,
  };
}
