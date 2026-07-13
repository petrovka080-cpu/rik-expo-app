import { pluginEntry, readMobilePhotoSource } from "./mobilePhotoCaptureTestHelpers";

describe("record audio permission policy", () => {
  it("disables camera audio recording for the photo capture wave", () => {
    expect(JSON.stringify(pluginEntry("expo-camera"))).toContain('"recordAudioAndroid":false');
    expect(readMobilePhotoSource()).not.toContain("RECORD_AUDIO");
  });
});
