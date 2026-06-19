import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 install fallback", () => {
  it("uses adb push plus pm install when streamed install fails", () => {
    expectFileToContain("scripts/e2e/androidApi34InstallIfNeeded.ts", '"push"');
    expectFileToContain("scripts/e2e/androidApi34InstallIfNeeded.ts", '"pm", "install", "-r"');
    expectFileToContain("scripts/e2e/androidApi34InstallIfNeeded.ts", "300000");
  });
});
