import { createMobilePhotoCaptureService } from "../../src/lib/mobilePhotoCapture";

describe("mobile photo capture production binary contract", () => {
  it("fails closed when the installed binary does not expose the camera module", async () => {
    const service = createMobilePhotoCaptureService({
      capability: {
        async checkCapability() {
          return {
            nativeModuleResolved: false,
            cameraHardwareAvailable: false,
            permissionApiAvailable: false,
            cameraViewComponentAvailable: false,
          };
        },
      },
    });
    await expect(service.openCamera({
      scanId: "scan-1",
      targetRowId: "row-1",
      userAction: "PHOTO_BUTTON_PRESS",
    })).rejects.toMatchObject({
      code: "CAMERA_NATIVE_MODULE_UNAVAILABLE",
    });
  });
});
