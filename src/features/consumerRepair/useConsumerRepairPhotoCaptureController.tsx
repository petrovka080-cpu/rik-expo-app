import React from "react";

import { MobilePhotoCaptureFlow } from "../../components/photoCapture/MobilePhotoCaptureFlow";
import { getCurrentEstimateRevision } from "../../lib/ai/estimateRevisions";
import {
  createPhotoMaterialScanSession,
  PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
  type PhotoMaterialExistingRowFeaturePolicy,
  type PhotoMaterialStoredImage,
} from "../../lib/ai/photoMaterialExistingRow";
import {
  ensureConsumerRepairBundleEstimateRevisionState,
  type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import type { CapturedPhotoAsset } from "../../lib/mobilePhotoCapture/mobilePhotoCaptureService";

export type OpenConsumerRepairPhotoForMaterialRecognitionInput = {
  userId: string;
  draftId: string;
  targetItemId: string;
  bundle: ConsumerRepairDraftBundle;
};

export type ConsumerRepairPhotoMaterialCaptureResult = {
  draftId: string;
  targetItemId: string;
  scanId: string;
  asset: CapturedPhotoAsset;
  storedImage: PhotoMaterialStoredImage;
};

type ConsumerRepairPhotoCaptureControllerInput = {
  onStatusMessage: (message: string | null) => void;
  onMaterialPhotoCaptured?: (result: ConsumerRepairPhotoMaterialCaptureResult) => void;
};

type ActivePhotoCapture = {
  scanId: string;
  draftId: string;
  targetItemId: string;
  targetRowId: string;
  kind: "PRODUCT_FRONT" | "OTHER";
};

function photoMaterialScanFeaturePolicy(userId: string): PhotoMaterialExistingRowFeaturePolicy {
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
  openPhotoForMaterialRecognition: (input: OpenConsumerRepairPhotoForMaterialRecognitionInput) => void;
  flow: React.ReactElement | null;
} {
  const [activeCapture, setActiveCapture] = React.useState<ActivePhotoCapture | null>(null);

  const closePhotoCapture = () => setActiveCapture(null);

  const openPhotoForMaterialRecognition = ({
    userId,
    draftId,
    targetItemId,
    bundle,
  }: OpenConsumerRepairPhotoForMaterialRecognitionInput) => {
    try {
      const bundleWithRevision = ensureConsumerRepairBundleEstimateRevisionState(bundle);
      const currentRevision = getCurrentEstimateRevision(bundleWithRevision.estimateRevisionState!);
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
      });
      onStatusMessage(null);
    } catch (error) {
      onStatusMessage(error instanceof Error ? error.message : "Не удалось открыть фото для материала.");
    }
  };

  return {
    openPhotoForMaterialRecognition,
    flow: activeCapture ? (
      <MobilePhotoCaptureFlow
        visible
        scanId={activeCapture.scanId}
        targetRowId={activeCapture.targetRowId}
        kind={activeCapture.kind}
        queueUploadOnUse={false}
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
          });
          closePhotoCapture();
        }}
      />
    ) : null,
  };
}
