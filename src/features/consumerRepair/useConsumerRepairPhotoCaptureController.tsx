import React from "react";

import { MobilePhotoCaptureFlow } from "../../components/photoCapture/MobilePhotoCaptureFlow";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests";

export type OpenConsumerRepairPhotoForEstimateItemInput = {
  draftId: string;
  item: Pick<ConsumerRepairRequestItem, "id" | "itemType"> | null;
};

type ConsumerRepairPhotoCaptureControllerInput = {
  onStatusMessage: (message: string | null) => void;
};

type ActivePhotoCapture = {
  scanId: string;
  targetItemId: string;
};

export function useConsumerRepairPhotoCaptureController({
  onStatusMessage,
}: ConsumerRepairPhotoCaptureControllerInput): {
  openPhotoForEstimateItem: (input: OpenConsumerRepairPhotoForEstimateItemInput) => void;
  flow: React.ReactElement | null;
} {
  const [activeCapture, setActiveCapture] = React.useState<ActivePhotoCapture | null>(null);

  const closePhotoCapture = () => setActiveCapture(null);

  const openPhotoForEstimateItem = ({ draftId, item }: OpenConsumerRepairPhotoForEstimateItemInput) => {
    if (!item || item.itemType !== "material") {
      onStatusMessage("Фото товара доступно только для строки материала.");
      return;
    }
    setActiveCapture({
      scanId: `photo_material_scan:${draftId}:${item.id}:${Date.now()}`,
      targetItemId: item.id,
    });
    onStatusMessage(null);
  };

  return {
    openPhotoForEstimateItem,
    flow: activeCapture ? (
      <MobilePhotoCaptureFlow
        visible
        scanId={activeCapture.scanId}
        targetRowId={activeCapture.targetItemId}
        onCancel={closePhotoCapture}
        onError={onStatusMessage}
        onCaptured={() => {
          closePhotoCapture();
          onStatusMessage("Фото сохранено для scan session и поставлено в очередь загрузки.");
        }}
      />
    ) : null,
  };
}
