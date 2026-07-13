import React from "react";

import {
  ConsumerRepairRequestScreenController,
  type ConsumerRepairRequestScreenProps,
} from "./ConsumerRepairRequestScreen";
import { useConsumerRepairPhotoCaptureController } from "./useConsumerRepairPhotoCaptureController";

export function ConsumerRepairRequestScreen(props: ConsumerRepairRequestScreenProps): React.ReactElement {
  const screenRef = React.useRef<ConsumerRepairRequestScreenController>(null);
  const photoCapture = useConsumerRepairPhotoCaptureController({
    onStatusMessage: (statusMessage) => screenRef.current?.setPhotoCaptureStatusMessage(statusMessage),
    onMaterialPhotoCaptured: (result) => {
      void screenRef.current?.openMaterialCatalogFromCapturedPhoto(result);
    },
  });
  return (
    <ConsumerRepairRequestScreenController
      ref={screenRef}
      {...props}
      onOpenPhotoForMaterialRecognition={photoCapture.openPhotoForMaterialRecognition}
      MobilePhotoCaptureFlowNode={photoCapture.flow}
    />
  );
}
