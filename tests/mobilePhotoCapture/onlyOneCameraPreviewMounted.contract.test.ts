import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("single camera preview lifecycle", () => {
  it("mounts exactly one CameraView component in the canonical screen", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCameraScreen.tsx");
    expect(source.match(/<CameraView/g)).toHaveLength(1);
  });
});
