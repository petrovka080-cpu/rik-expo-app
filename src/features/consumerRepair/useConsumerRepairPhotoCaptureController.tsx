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
  targetItemId: string;
  revisionId?: string;
  lineId?: string;
  purpose?: "material_recognition" | "line_attachment";
  bundle: ConsumerRepairDraftBundle;
};

export type ConsumerRepairPhotoMaterialCaptureResult = {
  draftId: string;
  targetItemId: string;
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
  onStatusMessage: (message: string | null) => void;
  onMaterialPhotoCaptured?: (
    result: ConsumerRepairPhotoMaterialCaptureResult,
  ) => void;
};

type ActivePhotoCapture = {
  scanId: string;
  draftId: string;
  targetItemId: string;
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

  const closePhotoCapture = () => setActiveCapture(null);

  const openPhotoForMaterialRecognition = ({
    userId,
    draftId,
    targetItemId,
    revisionId,
    lineId,
    purpose = "material_recognition",
    bundle,
  }: OpenConsumerRepairPhotoForMaterialRecognitionInput) => {
    try {
      const exactLineId = lineId?.trim() || targetItemId;
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
          targetItemId,
          targetRowId: exactLineId,
          kind: "OTHER",
          revisionId,
          lineId: exactLineId,
          purpose,
          storageIdentity: {
            tenantId: bundle.draft.orgId?.trim() || userId,
            requestId: draftId,
            revisionId,
            rowId: exactLineId,
          },
          catalogId,
        });
        onStatusMessage(null);
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
        targetItemId,
        targetRowId: scanSession.targetRowId,
        kind: "PRODUCT_FRONT",
        revisionId: revisionId?.trim() || currentRevision.revision_id,
        lineId: exactLineId,
        purpose,
        storageIdentity: {
          tenantId: bundle.draft.orgId?.trim() || userId,
          requestId: draftId,
          revisionId: revisionId?.trim() || currentRevision.revision_id,
          rowId: scanSession.targetRowId,
        },
        catalogId: String(bundle.draft.selectedCatalogWorkId ?? "").trim() || currentRevision.estimate_id,
      });
      onStatusMessage(null);
    } catch (error) {
      onStatusMessage(
        error instanceof Error
          ? error.message
          : "Не удалось открыть фото для материала.",
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
            const committed = await commitCanonicalEstimateRowPhoto({
              asset,
              requestId: activeCapture.draftId,
              catalogId: activeCapture.catalogId,
              revisionId: activeCapture.revisionId!,
              rowId: activeCapture.lineId,
            });
            return {
              storedImage: committed.storedImage,
              authoritativeAttachment: committed.attachment,
            };
          } : undefined}
          onCancel={closePhotoCapture}
          onError={onStatusMessage}
          onCaptured={(result) => {
            onStatusMessage("Распознаём материал по фото...");
            onMaterialPhotoCaptured?.({
              draftId: activeCapture.draftId,
              targetItemId: activeCapture.targetItemId,
              scanId: activeCapture.scanId,
              asset: result.asset,
              storedImage: result.storedImage,
              revisionId: activeCapture.revisionId,
              lineId: activeCapture.lineId,
              purpose: activeCapture.purpose,
              storageIdentity: activeCapture.storageIdentity,
              authoritativeAttachment: result.authoritativeAttachment,
            });
            closePhotoCapture();
          }}
        />
      </React.Suspense>
    ) : null,
  };
}
