import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 install fallback", () => {
  it("uses adb push plus pm install when streamed install fails", () => {
    expectFileToContain("scripts/release/android/installProofApk.ts", '"push"');
    expectFileToContain("scripts/release/android/installProofApk.ts", '"pm", "install", "-r"');
    expectFileToContain("scripts/release/android/installProofApk.ts", "300_000");
  });
});
