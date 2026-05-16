import fs from "fs";
import path from "path";

describe("AI screen-native value delivery Maestro runner", () => {
  it("locks Android targetability without fake green or provider calls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenNativeValueDeliveryMaestro.ts"), "utf8");

    expect(source).toContain("ai.screen_native_value_pack");
    expect(source).toContain("GREEN_AI_SCREEN_NATIVE_VALUE_DELIVERY_MAESTRO_TARGETABLE");
    expect(source).toContain("fakeGreenClaimed: false");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("dbWritesUsed: false");
  });
});
