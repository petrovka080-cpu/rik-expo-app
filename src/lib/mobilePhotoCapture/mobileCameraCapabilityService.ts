export type MobileCameraCapabilityResult = {
  nativeModuleResolved: boolean;
  cameraHardwareAvailable: boolean;
  permissionApiAvailable: boolean;
  cameraViewComponentAvailable: boolean;
};

export type MobileCameraCapabilityService = {
  checkCapability: () => Promise<MobileCameraCapabilityResult>;
};

type ExpoCameraModule = {
  CameraView?: unknown;
  Camera?: {
    isAvailableAsync?: () => Promise<boolean>;
  };
  isAvailableAsync?: () => Promise<boolean>;
  requestCameraPermissionsAsync?: unknown;
  getCameraPermissionsAsync?: unknown;
};

function loadExpoCamera(): ExpoCameraModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-camera") as ExpoCameraModule;
  } catch {
    return null;
  }
}

export function createMobileCameraCapabilityService(
  loadModule: () => ExpoCameraModule | null = loadExpoCamera,
): MobileCameraCapabilityService {
  return {
    async checkCapability() {
      const module = loadModule();
      const nativeModuleResolved = Boolean(module?.CameraView);
      const availableProbe =
        module?.Camera?.isAvailableAsync ??
        module?.isAvailableAsync;
      let cameraHardwareAvailable = nativeModuleResolved;
      if (typeof availableProbe === "function") {
        cameraHardwareAvailable = await availableProbe();
      }
      return {
        nativeModuleResolved,
        cameraHardwareAvailable,
        permissionApiAvailable: Boolean(
          module?.requestCameraPermissionsAsync ||
          module?.Camera?.isAvailableAsync ||
          module?.getCameraPermissionsAsync,
        ),
        cameraViewComponentAvailable: Boolean(module?.CameraView),
      };
    },
  };
}
