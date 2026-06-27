import React from "react";
import { AppState, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  createMobilePhotoCaptureService,
  type CapturedPhotoAsset,
  type MobileCameraState,
  type MobilePhotoCaptureService,
  type PhotoCaptureKind,
} from "../../lib/mobilePhotoCapture/mobilePhotoCaptureService";
import type { PhotoMaterialStoredImage } from "../../lib/ai/photoMaterialExistingRow";
import { MobilePhotoCameraScreen } from "./MobilePhotoCameraScreen";
import { MobilePhotoPermissionGate } from "./MobilePhotoPermissionGate";
import { MobilePhotoReviewScreen } from "./MobilePhotoReviewScreen";

type Props = {
  visible: boolean;
  scanId: string;
  targetRowId: string;
  kind?: PhotoCaptureKind;
  service?: MobilePhotoCaptureService;
  onCancel: () => void;
  onCaptured: (result: {
    asset: CapturedPhotoAsset;
    storedImage: PhotoMaterialStoredImage;
  }) => void;
  onError?: (messageRu: string) => void;
  queueUploadOnUse?: boolean;
};

type RecoveryBannerProps = {
  visible: boolean;
  onRestore: () => void;
};

type UploadStatusProps = {
  queued: boolean;
  completed: boolean;
};

const defaultService = createMobilePhotoCaptureService();

function MobilePhotoRecoveryBanner({ visible, onRestore }: RecoveryBannerProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <View style={styles.recoveryWrap} testID="mobile-photo-recovery-banner">
      <Text style={styles.recoveryText}>{"Найден незавершенный снимок."}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Восстановить снимок"
        onPress={onRestore}
        style={styles.recoveryButton}
        testID="mobile-photo-restore-pending"
      >
        <Text style={styles.recoveryButtonText}>{"Вернуть"}</Text>
      </Pressable>
    </View>
  );
}

function MobilePhotoUploadStatus({ queued, completed }: UploadStatusProps): React.ReactElement | null {
  if (!queued && !completed) return null;
  return (
    <View style={styles.uploadWrap} testID="mobile-photo-upload-status">
      <Text style={styles.uploadText}>
        {completed ? "Фото загружено." : "Фото сохранено и будет загружено."}
      </Text>
    </View>
  );
}

export function MobilePhotoCaptureFlow({
  visible,
  scanId,
  targetRowId,
  kind = "PRODUCT_FRONT",
  service = defaultService,
  onCancel,
  onCaptured,
  onError,
  queueUploadOnUse = true,
}: Props): React.ReactElement {
  const [cameraState, setCameraState] = React.useState<MobileCameraState>("IDLE");
  const [cameraReady, setCameraReady] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const [asset, setAsset] = React.useState<CapturedPhotoAsset | null>(null);
  const [queued, setQueued] = React.useState(false);
  const [appActive, setAppActive] = React.useState(AppState.currentState === "active");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const active = nextState === "active";
      setAppActive(active);
      if (!active && cameraState === "READY") {
        setCameraState("INTERRUPTED");
        setCameraReady(false);
      }
    });
    return () => subscription.remove();
  }, [cameraState]);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setCameraState("REQUESTING_PERMISSION");
    setErrorMessage(null);
    setQueued(false);
    service.openCamera({
      scanId,
      targetRowId,
      userAction: "PHOTO_BUTTON_PRESS",
    }).then(() => {
      if (cancelled) return;
      setCameraState("MOUNTING");
    }).catch((error) => {
      if (cancelled) return;
      const safeMessage = error && typeof error === "object" && "safeMessageRu" in error
        ? String((error as { safeMessageRu?: unknown }).safeMessageRu)
        : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443.";
      setErrorMessage(safeMessage);
      setCameraState("PERMISSION_DENIED");
      onError?.(safeMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [onError, scanId, service, targetRowId, visible]);

  React.useEffect(() => {
    if (!visible) {
      setCameraState("IDLE");
      setCameraReady(false);
      setCapturing(false);
      setAsset(null);
      setQueued(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const handleCapture = async (takePictureAsync: () => Promise<{ uri?: string | null; width?: number | null; height?: number | null } | null | undefined>) => {
    if (!cameraReady || capturing) return;
    setCapturing(true);
    setCameraState("CAPTURING");
    try {
      const nextAsset = await service.capturePhoto({
        scanId,
        kind,
        source: "IN_APP_CAMERA",
        cameraReady,
        takePictureAsync,
      });
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    } catch (error) {
      const safeMessage = error && typeof error === "object" && "safeMessageRu" in error
        ? String((error as { safeMessageRu?: unknown }).safeMessageRu)
        : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a.";
      setErrorMessage(safeMessage);
      setCameraState("FAILED");
      onError?.(safeMessage);
    } finally {
      setCapturing(false);
    }
  };

  const handleSystemCamera = async () => {
    const nextAsset = await service.launchSystemCamera({ scanId, kind });
    if (nextAsset) {
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    }
  };

  const handlePickPhoto = async () => {
    const nextAsset = await service.pickFromLibrary({ scanId, kind });
    if (nextAsset) {
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    }
  };

  const handleRestorePending = async () => {
    const nextAsset = await service.restorePendingSystemResult({ scanId, kind });
    if (nextAsset) {
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    }
  };

  const handleUsePhoto = async () => {
    if (!asset) return;
    setCameraState("STAGING");
    const attachment = await service.attachCapturedPhotoToScan({ asset });
    if (queueUploadOnUse) {
      await service.queueUpload(asset);
      setQueued(true);
    }
    setCameraState("COMPLETED");
    onCaptured({
      asset,
      storedImage: attachment.storedImage,
    });
  };

  const activePreview =
    visible &&
    appActive &&
    asset == null &&
    (cameraState === "MOUNTING" || cameraState === "READY" || cameraState === "CAPTURING");

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onCancel} testID="mobile-photo-capture-flow">
      <View style={styles.wrap}>
        <MobilePhotoRecoveryBanner visible={cameraState === "INTERRUPTED"} onRestore={handleRestorePending} />
        {errorMessage ? <Text style={styles.error} testID="mobile-photo-error">{errorMessage}</Text> : null}
        {cameraState === "PERMISSION_DENIED" ? (
          <MobilePhotoPermissionGate
            state="DENIED_CAN_ASK_AGAIN"
            onCancel={onCancel}
            onPickPhoto={handlePickPhoto}
            onRequestPermission={() => {
              setCameraState("REQUESTING_PERMISSION");
              service.openCamera({ scanId, targetRowId, userAction: "PHOTO_BUTTON_PRESS" })
                .then(() => setCameraState("MOUNTING"))
                .catch(() => setCameraState("PERMISSION_DENIED"));
            }}
          />
        ) : asset ? (
          <>
            <MobilePhotoReviewScreen
              asset={asset}
              onRetake={() => {
                void service.discardCapture(asset.captureId);
                setAsset(null);
                setCameraReady(false);
                setCameraState("MOUNTING");
              }}
              onUsePhoto={handleUsePhoto}
            />
            <MobilePhotoUploadStatus queued={queued} completed={false} />
          </>
        ) : (
          <MobilePhotoCameraScreen
            active={activePreview}
            cameraReady={cameraReady}
            capturing={capturing}
            onCancel={onCancel}
            onSystemCamera={handleSystemCamera}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraState("READY");
            }}
            onMountError={(error) => {
              const message = error instanceof Error
                ? error.message
                : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443.";
              setErrorMessage(message);
              setCameraState("FAILED");
              onError?.(message);
            }}
            onCapture={handleCapture}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#020617",
  },
  error: {
    color: "#991B1B",
    backgroundColor: "#FEE2E2",
    fontSize: 13,
    fontWeight: "800",
    padding: 10,
  },
  recoveryWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
  },
  recoveryText: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
  },
  recoveryButton: {
    minHeight: 32,
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: "#92400E",
    paddingHorizontal: 10,
  },
  recoveryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  uploadWrap: {
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
  },
  uploadText: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "800",
  },
});
