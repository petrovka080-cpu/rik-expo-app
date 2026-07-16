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

export type MobilePhotoCaptureFlowProps = {
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
const PHOTO_KIND_OPTIONS: { kind: PhotoCaptureKind; label: string; testID: string }[] = [
  { kind: "PRODUCT_FRONT", label: "\u0422\u043e\u0432\u0430\u0440", testID: "mobile-photo-kind-product-front" },
  { kind: "BARCODE", label: "\u0428\u0442\u0440\u0438\u0445\u043a\u043e\u0434", testID: "mobile-photo-kind-barcode" },
  { kind: "PRICE_TAG", label: "\u0426\u0435\u043d\u043d\u0438\u043a", testID: "mobile-photo-kind-price-tag" },
];

function MobilePhotoKindSelector({
  value,
  onChange,
  disabled,
}: {
  value: PhotoCaptureKind;
  onChange: (kind: PhotoCaptureKind) => void;
  disabled: boolean;
}): React.ReactElement {
  return (
    <View style={styles.kindWrap} testID="mobile-photo-kind-selector">
      {PHOTO_KIND_OPTIONS.map((option) => {
        const active = option.kind === value;
        return (
          <Pressable
            key={option.kind}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => onChange(option.kind)}
            style={[styles.kindButton, active && styles.kindButtonActive]}
            testID={option.testID}
          >
            <Text style={[styles.kindButtonText, active && styles.kindButtonTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
}: MobilePhotoCaptureFlowProps): React.ReactElement {
  const [cameraState, setCameraState] = React.useState<MobileCameraState>("IDLE");
  const [cameraReady, setCameraReady] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const [selectedKind, setSelectedKind] = React.useState<PhotoCaptureKind>(kind);
  const [asset, setAsset] = React.useState<CapturedPhotoAsset | null>(null);
  const [queued, setQueued] = React.useState(false);
  const [uploadCompleted, setUploadCompleted] = React.useState(false);
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
    setSelectedKind(kind);
    setCameraState("REQUESTING_PERMISSION");
    setErrorMessage(null);
    setQueued(false);
    setUploadCompleted(false);
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
  }, [kind, onError, scanId, service, targetRowId, visible]);

  React.useEffect(() => {
    if (!visible) {
      setCameraState("IDLE");
      setCameraReady(false);
      setCapturing(false);
      setAsset(null);
      setQueued(false);
      setUploadCompleted(false);
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
        kind: selectedKind,
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
    const nextAsset = await service.launchSystemCamera({ scanId, kind: selectedKind });
    if (nextAsset) {
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    }
  };

  const handlePickPhoto = async () => {
    const nextAsset = await service.pickFromLibrary({ scanId, kind: selectedKind });
    if (nextAsset) {
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    }
  };

  const handleRestorePending = async () => {
    const nextAsset = await service.restorePendingSystemResult({ scanId, kind: selectedKind });
    if (nextAsset) {
      setAsset(nextAsset);
      setCameraState("REVIEWING");
    }
  };

  const handleUsePhoto = async () => {
    if (!asset) return;
    setCameraState("STAGING");
    try {
      if (queueUploadOnUse) {
        await service.queueUpload(asset);
        setQueued(true);
        await service.completeQueuedUploads();
        setUploadCompleted(true);
      }
      const attachment = await service.attachCapturedPhotoToScan({ asset });
      setCameraState("COMPLETED");
      onCaptured({
        asset,
        storedImage: attachment.storedImage,
      });
    } catch (error) {
      const safeMessage = error && typeof error === "object" && "safeMessageRu" in error
        ? String((error as { safeMessageRu?: unknown }).safeMessageRu)
        : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u043e\u0442\u043e.";
      setErrorMessage(safeMessage);
      setCameraState("FAILED");
      onError?.(safeMessage);
    }
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
            <MobilePhotoUploadStatus queued={queued} completed={uploadCompleted} />
          </>
        ) : (
          <>
            <MobilePhotoKindSelector
              value={selectedKind}
              onChange={setSelectedKind}
              disabled={capturing || cameraState === "CAPTURING"}
            />
            <MobilePhotoCameraScreen
              active={activePreview}
              cameraReady={cameraReady}
              capturing={capturing}
              onCancel={onCancel}
              onPickPhoto={handlePickPhoto}
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
          </>
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
  kindWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
    backgroundColor: "#0F172A",
  },
  kindButton: {
    minHeight: 34,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 10,
  },
  kindButtonActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  kindButtonText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "900",
  },
  kindButtonTextActive: {
    color: "#0F172A",
  },
});
