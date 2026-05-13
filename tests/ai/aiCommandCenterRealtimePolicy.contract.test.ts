import fs from "node:fs";
import path from "node:path";

import {
  AI_COMMAND_CENTER_REALTIME_POLICY,
  assertNoAiCommandCenterRealtimeSubscription,
  decideAiCommandCenterRealtimeUsage,
} from "../../src/features/ai/commandCenter/aiCommandCenterRealtimePolicy";

describe("AI Command Center realtime policy", () => {
  it("disables realtime subscriptions by default and forbids per-card subscriptions", () => {
    expect(AI_COMMAND_CENTER_REALTIME_POLICY).toMatchObject({
      realtimeEnabledByDefault: false,
      perCardRealtimeSubscriptionAllowed: false,
      globalRealtimeSubscriptionAllowed: false,
      maxSubscriptionsPerScreen: 0,
      maxSubscriptionsPerCard: 0,
    });
    expect(decideAiCommandCenterRealtimeUsage()).toEqual({
      realtimeEnabled: false,
      perCardSubscriptionAllowed: false,
      globalSubscriptionAllowed: false,
      pollingFallbackAllowed: true,
      reason: "realtime_disabled_by_budget",
    });
  });

  it("keeps Command Center source free of realtime subscription calls", () => {
    const commandCenterDir = path.join(process.cwd(), "src", "features", "ai", "commandCenter");
    const source = fs
      .readdirSync(commandCenterDir)
      .filter((fileName) => /\.(ts|tsx)$/.test(fileName))
      .map((fileName) => fs.readFileSync(path.join(commandCenterDir, fileName), "utf8"))
      .join("\n");

    expect(assertNoAiCommandCenterRealtimeSubscription(source)).toBe(true);
  });
});
