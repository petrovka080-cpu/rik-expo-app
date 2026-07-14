import { pluginEntry, readAppJson, readPackageJson } from "./mobilePhotoCaptureTestHelpers";

describe("mobile photo capture native dependency contract", () => {
  it("configures Expo-compatible camera dependencies and native permissions", () => {
    const pkg = readPackageJson();
    const app = readAppJson();
    expect(pkg.dependencies?.["expo-camera"]).toMatch(/^~17\./);
    expect(pkg.dependencies?.["expo-image-picker"]).toMatch(/^~17\./);
    expect(pkg.dependencies?.["expo-image-manipulator"]).toMatch(/^~14\./);
    expect(pluginEntry("expo-camera")).toBeTruthy();
    expect(pluginEntry("expo-image-picker")).toBeTruthy();
    expect(app.expo.android?.permissions).toContain("android.permission.CAMERA");
    expect(app.expo.ios?.infoPlist?.NSCameraUsageDescription).toEqual(expect.any(String));
    expect(app.expo.ios?.infoPlist?.NSPhotoLibraryUsageDescription).toEqual(expect.any(String));
  });
});
