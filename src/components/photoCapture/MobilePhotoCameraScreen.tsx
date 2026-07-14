import React from "react";
import { StyleSheet, View } from "react-native";
import { CameraView } from "expo-camera";

import { MobilePhotoCaptureOverlay } from "./MobilePhotoCaptureOverlay";

type CameraHandle = {
  takePictureAsync: (options?: { quality?: number; skipProcessing?: boolean }) => Promise<{
    uri?: string | null;
    width?: number | null;
    height?: number | null;
  } | null | undefined>;
};

type Props = {
  active: boolean;
  cameraReady: boolean;
  capturing: boolean;
  onCameraReady: () => void;
  onMountError: (error: unknown) => void;
  onCapture: (takePictureAsync: CameraHandle["takePictureAsync"]) => void;
  onCancel: () => void;
  onPickPhoto: () => void;
  onSystemCamera: () => void;
};

export function MobilePhotoCameraScreen({
  active,
  cameraReady,
  capturing,
  onCameraReady,
  onMountError,
  onCapture,
  onCancel,
  onPickPhoto,
  onSystemCamera,
}: Props): React.ReactElement {
  const cameraRef = React.useRef<CameraHandle | null>(null);

  if (!active) {
    return <View style={styles.inactive} testID="mobile-photo-camera-inactive" />;
  }

  return (
    <View style={styles.wrap} testID="mobile-photo-camera-screen">
      <CameraView
        ref={(ref) => {
          cameraRef.current = ref as CameraHandle | null;
        }}
        active={active}
        facing="back"
        onCameraReady={onCameraReady}
        onMountError={onMountError}
        style={styles.camera}
      />
      <MobilePhotoCaptureOverlay
        cameraReady={cameraReady}
        capturing={capturing}
        onCancel={onCancel}
        onPickPhoto={onPickPhoto}
        onSystemCamera={onSystemCamera}
        onCapture={() => {
          const takePictureAsync = cameraRef.current?.takePictureAsync;
          if (takePictureAsync) onCapture((options) => takePictureAsync.call(cameraRef.current, options));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 420,
    backgroundColor: "#020617",
  },
  camera: {
    flex: 1,
  },
  inactive: {
    minHeight: 240,
    backgroundColor: "#020617",
  },
});
