import fs from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("request estimate web runtime camera boundary", () => {
  it("keeps expo-camera out of the initial request estimate render path", () => {
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const controller = read("src/features/consumerRepair/useConsumerRepairPhotoCaptureController.tsx");
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const cameraScreen = read("src/components/photoCapture/MobilePhotoCameraScreen.tsx");

    expect(container).toContain("useConsumerRepairPhotoCaptureController");
    expect(screen).toContain("MobilePhotoCaptureFlowNode");
    expect(controller).toContain("React.lazy");
    expect(controller).toContain('import("../../components/photoCapture/MobilePhotoCaptureFlow")');
    expect(controller).toContain("LazyMobilePhotoCaptureFlow");
    expect(controller).not.toMatch(/import\s+\{\s*MobilePhotoCaptureFlow\s*\}/);
    expect(container).not.toContain("components/photoCapture");
    expect(screen).not.toContain("expo-camera");
    expect(cameraScreen).toContain('from "expo-camera"');
  });
});
