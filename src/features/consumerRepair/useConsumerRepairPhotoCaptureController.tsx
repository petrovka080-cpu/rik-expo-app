import React from "react";

import { MobilePhotoCaptureFlow } from "../../components/photoCapture/MobilePhotoCaptureFlow";
import type { CapturedPhotoAsset } from "../../lib/mobilePhotoCapture/mobilePhotoCaptureService";
import type { PhotoMaterialStoredImage } from "../../lib/ai/photoMaterialExistingRow";

export type OpenConsumerRepairPhotoForMaterialRecognitionInput = {
  draftId: string;
  targetItemId?: string | null;
};

export type ConsumerRepairPhotoMaterialCaptureResult = {
  draftId: string;
  targetItemId: string | null;
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
  targetItemId: string | null;
  targetRowId: string;
  kind: "PRODUCT_FRONT" | "OTHER";
};

export function useConsumerRepairPhotoCaptureController({
  onStatusMessage,
  onMaterialPhotoCaptured,
}: ConsumerRepairPhotoCaptureControllerInput): {
  openPhotoForMaterialRecognition: (input: OpenConsumerRepairPhotoForMaterialRecognitionInput) => void;
  flow: React.ReactElement | null;
} {
  const [activeCapture, setActiveCapture] = React.useState<ActivePhotoCapture | null>(null);

  const closePhotoCapture = () => setActiveCapture(null);

  const openPhotoForMaterialRecognition = ({ draftId, targetItemId = null }: OpenConsumerRepairPhotoForMaterialRecognitionInput) => {
    const targetRowId = targetItemId ?? draftId;
    setActiveCapture({
      scanId: `photo_material_search:${draftId}:${targetRowId}:${Date.now()}`,
      draftId,
      targetItemId,
      targetRowId,
      kind: "PRODUCT_FRONT",
    });
    onStatusMessage(null);
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
