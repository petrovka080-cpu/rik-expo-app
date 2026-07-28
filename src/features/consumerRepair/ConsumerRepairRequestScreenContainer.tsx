import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { hydrateTransactionalConsumerRepairRequestStore } from "../../lib/consumerRequests/consumerRequestRepository";
import {
  ConsumerRepairRequestScreenController,
  type ConsumerRepairRequestScreenProps,
} from "./ConsumerRepairRequestScreen";
import { useConsumerRepairPhotoCaptureController } from "./useConsumerRepairPhotoCaptureController";

const DURABLE_HYDRATION_TIMEOUT_MS = 3_000;

type DurableHydrationStatus = "loading" | "ready" | "recovery";

async function runBoundedDurableHydration(): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      hydrateTransactionalConsumerRepairRequestStore(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("CONSUMER_REPAIR_DURABLE_HYDRATION_TIMEOUT"));
        }, DURABLE_HYDRATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function ConsumerRepairRequestScreen(props: ConsumerRepairRequestScreenProps): React.ReactElement {
  const [durableStatus, setDurableStatus] =
    React.useState<DurableHydrationStatus>("loading");
  const hydrationAttemptRef = React.useRef(0);
  const screenRef = React.useRef<ConsumerRepairRequestScreenController>(null);
  const hydrate = React.useCallback(() => {
    const attempt = hydrationAttemptRef.current + 1;
    hydrationAttemptRef.current = attempt;
    setDurableStatus("loading");
    void runBoundedDurableHydration().then(
      () => {
        if (hydrationAttemptRef.current !== attempt) return;
        screenRef.current?.refreshAfterDurableHydration();
        setDurableStatus("ready");
      },
      () => {
        if (hydrationAttemptRef.current !== attempt) return;
        setDurableStatus("recovery");
      },
    );
  }, []);
  React.useEffect(() => {
    hydrate();
    return () => {
      hydrationAttemptRef.current += 1;
    };
  }, [hydrate]);
  const photoCapture = useConsumerRepairPhotoCaptureController({
    onStatusMessage: (statusMessage) => screenRef.current?.setPhotoCaptureStatusMessage(statusMessage),
    onMaterialPhotoCaptured: (result) => {
      void screenRef.current?.openMaterialCatalogFromCapturedPhoto(result);
    },
  });
  return (
    <View style={styles.root}>
      <ConsumerRepairRequestScreenController
        ref={screenRef}
        {...props}
        onOpenPhotoForMaterialRecognition={photoCapture.openPhotoForMaterialRecognition}
        MobilePhotoCaptureFlowNode={photoCapture.flow}
      />
      {durableStatus === "loading" ? (
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
      {durableStatus === "recovery" ? (
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
