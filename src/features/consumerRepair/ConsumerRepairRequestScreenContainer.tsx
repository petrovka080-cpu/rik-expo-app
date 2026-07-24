import React from "react";

import { initializeConsumerRepairTransactionalDurableStorage } from "../../lib/consumerRequests";
import {
  ConsumerRepairRequestScreenController,
  type ConsumerRepairRequestScreenProps,
} from "./ConsumerRepairRequestScreen";
import { useConsumerRepairPhotoCaptureController } from "./useConsumerRepairPhotoCaptureController";

export function ConsumerRepairRequestScreen(props: ConsumerRepairRequestScreenProps): React.ReactElement {
  const [durableReady, setDurableReady] = React.useState(false);
  const screenRef = React.useRef<ConsumerRepairRequestScreenController>(null);
  React.useEffect(() => {
    let active = true;
    void initializeConsumerRepairTransactionalDurableStorage().finally(() => {
      if (active) setDurableReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const photoCapture = useConsumerRepairPhotoCaptureController({
    onStatusMessage: (statusMessage) => screenRef.current?.setPhotoCaptureStatusMessage(statusMessage),
    onMaterialPhotoCaptured: (result) => {
      void screenRef.current?.openMaterialCatalogFromCapturedPhoto(result);
    },
  });
  if (!durableReady) return <></>;
  return (
    <ConsumerRepairRequestScreenController
      ref={screenRef}
      {...props}
      onOpenPhotoForMaterialRecognition={photoCapture.openPhotoForMaterialRecognition}
      MobilePhotoCaptureFlowNode={photoCapture.flow}
    />
  );
}
