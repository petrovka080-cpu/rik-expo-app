import { pluginEntry, readMobilePhotoSource } from "./mobilePhotoCaptureTestHelpers";

describe("photo capture microphone policy", () => {
  it("does not request microphone from photo capture or image picker", () => {
    expect(JSON.stringify(pluginEntry("expo-image-picker"))).toContain('"microphonePermission":false');
    expect(readMobilePhotoSource()).not.toMatch(/requestMicrophone|microphonePermission: true/i);
  });
});
