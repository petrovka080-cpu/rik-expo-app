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
  });
  return (
    <ConsumerRepairRequestScreenController
      ref={screenRef}
      {...props}
      onOpenPhotoForEstimateItem={photoCapture.openPhotoForEstimateItem}
      MobilePhotoCaptureFlowNode={photoCapture.flow}
    />
  );
}
