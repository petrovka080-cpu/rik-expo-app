export type MobilePhotoCaptureErrorCode =
  | "CAMERA_NATIVE_MODULE_UNAVAILABLE"
  | "CAMERA_NOT_AVAILABLE"
  | "CAMERA_PERMISSION_DENIED"
  | "CAMERA_PERMISSION_PERMANENTLY_DENIED"
  | "CAMERA_PERMISSION_RESTRICTED"
  | "CAMERA_PREVIEW_FAILED"
  | "CAMERA_NOT_READY"
  | "CAMERA_SESSION_INTERRUPTED"
  | "CAMERA_CAPTURE_FAILED"
  | "CAMERA_CAPTURE_TIMEOUT"
  | "CAMERA_CAPTURE_ALREADY_IN_PROGRESS"
  | "PHOTO_PICKER_CANCELLED"
  | "PHOTO_PICKER_RESULT_LOST"
  | "PHOTO_PICKER_ASSET_UNAVAILABLE"
  | "PHOTO_LOCAL_COPY_FAILED"
  | "PHOTO_LOCAL_FILE_MISSING"
  | "PHOTO_DECODE_FAILED"
  | "PHOTO_ORIENTATION_NORMALIZATION_FAILED"
  | "PHOTO_METADATA_STRIP_FAILED"
  | "PHOTO_COMPRESSION_FAILED"
  | "PHOTO_UPLOAD_NETWORK_UNAVAILABLE"
  | "PHOTO_UPLOAD_INTENT_FAILED"
  | "PHOTO_UPLOAD_INTENT_EXPIRED"
  | "PHOTO_UPLOAD_TIMEOUT"
  | "PHOTO_UPLOAD_HASH_MISMATCH"
  | "PHOTO_UPLOAD_ACCESS_DENIED"
  | "PHOTO_UPLOAD_RETRY_EXHAUSTED"
  | "PHOTO_SCAN_EXPIRED"
  | "PHOTO_DUPLICATE_CAPTURE";

export type MobilePhotoRecoveryAction =
  | "UPDATE_APP"
  | "OPEN_SETTINGS"
  | "RETRY_CAMERA"
  | "PICK_PHOTO"
  | "RETRY_UPLOAD"
  | "FREE_DEVICE_SPACE"
  | "CONTACT_SUPPORT";

export class MobilePhotoCaptureError extends Error {
  code: MobilePhotoCaptureErrorCode;
  retryable: boolean;
  recoveryAction: MobilePhotoRecoveryAction;
  safeMessageRu: string;

  constructor(
    code: MobilePhotoCaptureErrorCode,
    options: {
      retryable: boolean;
      recoveryAction: MobilePhotoRecoveryAction;
      safeMessageRu: string;
      cause?: unknown;
    },
  ) {
    super(code);
    this.name = "MobilePhotoCaptureError";
    this.code = code;
    this.retryable = options.retryable;
    this.recoveryAction = options.recoveryAction;
    this.safeMessageRu = options.safeMessageRu;
    this.cause = options.cause;
  }
}

export const MOBILE_PHOTO_CAPTURE_ERROR_COPY: Record<
  MobilePhotoCaptureErrorCode,
  { safeMessageRu: string; retryable: boolean; recoveryAction: MobilePhotoRecoveryAction; analyticsEvent: string }
> = {
  CAMERA_NATIVE_MODULE_UNAVAILABLE: {
    safeMessageRu: "\u041a\u0430\u043c\u0435\u0440\u0430 \u043d\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u0430 \u0432 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u0443\u044e \u0432\u0435\u0440\u0441\u0438\u044e \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f.",
    retryable: false,
    recoveryAction: "UPDATE_APP",
    analyticsEvent: "mobile_camera_native_module_missing",
  },
  CAMERA_NOT_AVAILABLE: {
    safeMessageRu: "\u041d\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430\u044f \u043a\u0430\u043c\u0435\u0440\u0430.",
    retryable: false,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_camera_not_available",
  },
  CAMERA_PERMISSION_DENIED: {
    safeMessageRu: "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u043a\u0430\u043c\u0435\u0440\u0435 \u043d\u0435 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_camera_permission_denied",
  },
  CAMERA_PERMISSION_PERMANENTLY_DENIED: {
    safeMessageRu: "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u043a\u0430\u043c\u0435\u0440\u0435 \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430.",
    retryable: false,
    recoveryAction: "OPEN_SETTINGS",
    analyticsEvent: "mobile_camera_permission_denied",
  },
  CAMERA_PERMISSION_RESTRICTED: {
    safeMessageRu: "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u043a\u0430\u043c\u0435\u0440\u0435 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d.",
    retryable: false,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_camera_permission_denied",
  },
  CAMERA_PREVIEW_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_camera_mount_failed",
  },
  CAMERA_NOT_READY: {
    safeMessageRu: "\u041a\u0430\u043c\u0435\u0440\u0430 \u0435\u0449\u0435 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  CAMERA_SESSION_INTERRUPTED: {
    safeMessageRu: "\u0421\u0435\u0441\u0441\u0438\u044f \u043a\u0430\u043c\u0435\u0440\u044b \u043f\u0440\u0435\u0440\u0432\u0430\u043d\u0430.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_camera_mount_failed",
  },
  CAMERA_CAPTURE_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  CAMERA_CAPTURE_TIMEOUT: {
    safeMessageRu: "\u0421\u044a\u0435\u043c\u043a\u0430 \u0437\u0430\u043d\u044f\u043b\u0430 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  CAMERA_CAPTURE_ALREADY_IN_PROGRESS: {
    safeMessageRu: "\u0421\u043d\u0438\u043c\u043e\u043a \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u0435\u0442\u0441\u044f.",
    retryable: true,
    recoveryAction: "RETRY_CAMERA",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_PICKER_CANCELLED: {
    safeMessageRu: "\u0412\u044b\u0431\u043e\u0440 \u0444\u043e\u0442\u043e \u043e\u0442\u043c\u0435\u043d\u0435\u043d.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_PICKER_RESULT_LOST: {
    safeMessageRu: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043a\u0430\u043c\u0435\u0440\u044b \u043d\u0435 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_pending_picker_result_restored",
  },
  PHOTO_PICKER_ASSET_UNAVAILABLE: {
    safeMessageRu: "\u0424\u043e\u0442\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_LOCAL_COPY_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a.",
    retryable: true,
    recoveryAction: "FREE_DEVICE_SPACE",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_LOCAL_FILE_MISSING: {
    safeMessageRu: "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0444\u0430\u0439\u043b \u0444\u043e\u0442\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
    retryable: false,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_capture_recovered_after_restart",
  },
  PHOTO_DECODE_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0444\u043e\u0442\u043e.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_ORIENTATION_NORMALIZATION_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u043e\u0440\u0438\u0435\u043d\u0442\u0430\u0446\u0438\u044e \u0444\u043e\u0442\u043e.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_METADATA_STRIP_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u0435\u0442\u0430\u0434\u0430\u043d\u043d\u044b\u0435 \u0444\u043e\u0442\u043e.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_COMPRESSION_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0436\u0430\u0442\u044c \u0444\u043e\u0442\u043e.",
    retryable: true,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_capture_failed",
  },
  PHOTO_UPLOAD_NETWORK_UNAVAILABLE: {
    safeMessageRu: "\u041d\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f \u043a \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0443. \u0424\u043e\u0442\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e \u0438 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043e \u043f\u043e\u0437\u0436\u0435.",
    retryable: true,
    recoveryAction: "RETRY_UPLOAD",
    analyticsEvent: "mobile_photo_upload_queued",
  },
  PHOTO_UPLOAD_INTENT_FAILED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0447\u0430\u0442\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0443.",
    retryable: true,
    recoveryAction: "RETRY_UPLOAD",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_UPLOAD_INTENT_EXPIRED: {
    safeMessageRu: "\u0421\u0435\u0441\u0441\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0438\u0441\u0442\u0435\u043a\u043b\u0430.",
    retryable: true,
    recoveryAction: "RETRY_UPLOAD",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_UPLOAD_TIMEOUT: {
    safeMessageRu: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0444\u043e\u0442\u043e \u0437\u0430\u043d\u044f\u043b\u0430 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438.",
    retryable: true,
    recoveryAction: "RETRY_UPLOAD",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_UPLOAD_HASH_MISMATCH: {
    safeMessageRu: "\u0425\u044d\u0448 \u0444\u043e\u0442\u043e \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u043b.",
    retryable: false,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_UPLOAD_ACCESS_DENIED: {
    safeMessageRu: "\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u0441\u0435\u0441\u0441\u0438\u0438 \u0441\u043a\u0430\u043d\u0430.",
    retryable: false,
    recoveryAction: "CONTACT_SUPPORT",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_UPLOAD_RETRY_EXHAUSTED: {
    safeMessageRu: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u043e\u0442\u043e.",
    retryable: true,
    recoveryAction: "RETRY_UPLOAD",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_SCAN_EXPIRED: {
    safeMessageRu: "\u0421\u0435\u0441\u0441\u0438\u044f \u0441\u043a\u0430\u043d\u0430 \u0438\u0441\u0442\u0435\u043a\u043b\u0430.",
    retryable: false,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_upload_failed",
  },
  PHOTO_DUPLICATE_CAPTURE: {
    safeMessageRu: "\u042d\u0442\u043e \u0444\u043e\u0442\u043e \u0443\u0436\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e.",
    retryable: false,
    recoveryAction: "PICK_PHOTO",
    analyticsEvent: "mobile_photo_upload_failed",
  },
};

export function createMobilePhotoCaptureError(
  code: MobilePhotoCaptureErrorCode,
  cause?: unknown,
): MobilePhotoCaptureError {
  const copy = MOBILE_PHOTO_CAPTURE_ERROR_COPY[code];
  return new MobilePhotoCaptureError(code, {
    safeMessageRu: copy.safeMessageRu,
    retryable: copy.retryable,
    recoveryAction: copy.recoveryAction,
    cause,
  });
}
