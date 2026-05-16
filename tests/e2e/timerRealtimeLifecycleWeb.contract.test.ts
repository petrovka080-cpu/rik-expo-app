import fs from "node:fs";
import path from "node:path";

describe("S_SCALE_03 timer/realtime lifecycle web runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runTimerRealtimeLifecycleWeb.ts"),
    "utf8",
  );

  it("targets long-session realtime screens without mutation shortcuts", () => {
    for (const screenId of [
      "director.dashboard",
      "director.reports",
      "director.finance",
      "warehouse.main",
      "buyer.main",
      "ai.assistant",
    ]) {
      expect(source).toContain(screenId);
    }

    expect(source).toContain("activeTimersReturnToBaseline");
    expect(source).toContain("activeChannelsReturnToBaseline");
    expect(source).toContain("noDuplicateSubscriptions");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(source).not.toContain("listUsers");
  });

  it("updates lifecycle proof artifacts and blocks raw secrets/payloads", () => {
    expect(source).toContain("verifyLongSessionLifecycleSafety");
    expect(source).toContain("noSecretsPrinted");
    expect(source).toContain("noRawChannelPayloadsPrinted");
    expect(source).toContain("noDbWrites");
    expect(source).toContain("noProviderCall");
    expect(source).toContain("S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_web.json");
  });
});
