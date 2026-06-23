export type CameraPermissionState =
  | "UNKNOWN"
  | "NOT_DETERMINED"
  | "GRANTED"
  | "DENIED_CAN_ASK_AGAIN"
  | "DENIED_PERMANENT"
  | "RESTRICTED";

export type CameraPermissionResult = {
  state: CameraPermissionState;
  canAskAgain: boolean;
  granted: boolean;
};

export type MobileCameraPermissionService = {
  getCameraPermission: () => Promise<CameraPermissionResult>;
  requestCameraPermission: () => Promise<CameraPermissionResult>;
};

type ExpoPermissionResponse = {
  status?: string | null;
  granted?: boolean | null;
  canAskAgain?: boolean | null;
};

type ExpoCameraPermissionModule = {
  getCameraPermissionsAsync?: () => Promise<ExpoPermissionResponse>;
  requestCameraPermissionsAsync?: () => Promise<ExpoPermissionResponse>;
  Camera?: {
    getCameraPermissionsAsync?: () => Promise<ExpoPermissionResponse>;
    requestCameraPermissionsAsync?: () => Promise<ExpoPermissionResponse>;
  };
};

function loadExpoCamera(): ExpoCameraPermissionModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-camera") as ExpoCameraPermissionModule;
  } catch {
    return null;
  }
}

export function normalizeCameraPermission(response: ExpoPermissionResponse | null | undefined): CameraPermissionResult {
  const status = String(response?.status ?? "").toLowerCase();
  const granted = response?.granted === true || status === "granted";
  const canAskAgain = response?.canAskAgain !== false;
  if (granted) return { state: "GRANTED", granted: true, canAskAgain };
  if (status === "denied" && canAskAgain) return { state: "DENIED_CAN_ASK_AGAIN", granted: false, canAskAgain };
  if (status === "denied" && !canAskAgain) return { state: "DENIED_PERMANENT", granted: false, canAskAgain };
  if (status === "limited" || status === "restricted") return { state: "RESTRICTED", granted: false, canAskAgain };
  if (status === "undetermined" || status === "not_determined") {
    return { state: "NOT_DETERMINED", granted: false, canAskAgain };
  }
  return { state: "UNKNOWN", granted: false, canAskAgain };
}

function permissionFns(module: ExpoCameraPermissionModule | null) {
  return {
    get:
      module?.getCameraPermissionsAsync ??
      module?.Camera?.getCameraPermissionsAsync,
    request:
      module?.requestCameraPermissionsAsync ??
      module?.Camera?.requestCameraPermissionsAsync,
  };
}

export function createMobileCameraPermissionService(
  loadModule: () => ExpoCameraPermissionModule | null = loadExpoCamera,
): MobileCameraPermissionService {
  return {
    async getCameraPermission() {
      const fns = permissionFns(loadModule());
      if (!fns.get) return { state: "UNKNOWN", granted: false, canAskAgain: false };
      return normalizeCameraPermission(await fns.get());
    },
    async requestCameraPermission() {
      const fns = permissionFns(loadModule());
      if (!fns.request) return { state: "UNKNOWN", granted: false, canAskAgain: false };
      return normalizeCameraPermission(await fns.request());
    },
  };
}
