import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const extractRealtimeChannelNames = (source: string) => {
  const matches = source.matchAll(
    /export const [A-Z_]+_REALTIME_CHANNEL_NAME = "([^"]+)";/g,
  );
  return Array.from(matches, (match) => match[1]);
};
const directClientCall = (method: string) => `supabase.${method}`;

describe("S-RT-6 realtime fanout budget proof", () => {
  it("recomputes the persistent mounted channel budget without regressing S-RT-5", () => {
    const channelsSource = read("src/lib/realtime/realtime.channels.ts");
    const clientSource = read("src/lib/realtime/realtime.client.ts");
    const srt5Matrix = JSON.parse(
      read("artifacts/S_RT_5_realtime_fanout_reduction_matrix.json"),
    ) as { result: { estimatedChannelsPerActiveUser: number } };
    const srt6Matrix = JSON.parse(
      read("artifacts/S_RT_6_realtime_fanout_budget_proof_matrix.json"),
    ) as {
      status: string;
      result: {
        persistentChannelsPerActiveUser: number;
        roleScreenChannels: number;
        scopedChatChannelsPerActiveChatUser: number;
        regressedFromSrt5: boolean;
      };
      checks: Record<string, boolean>;
    };

    const roleChannels = extractRealtimeChannelNames(channelsSource);

    expect(roleChannels).toEqual([
      "buyer:screen:realtime",
      "accountant:screen:realtime",
      "warehouse:screen:realtime",
      "contractor:screen:realtime",
      "director:screen:realtime",
      "director:finance:realtime",
      "director:reports:realtime",
    ]);
    expect(new Set(roleChannels).size).toBe(roleChannels.length);
    expect(clientSource).toContain("REALTIME_ACTIVE_CHANNEL_BUDGET = 8");
    expect(srt6Matrix.status).toBe("GREEN_REALTIME_FANOUT_BUDGET_PROVEN");
    expect(srt6Matrix.result.roleScreenChannels).toBe(roleChannels.length);
    expect(srt6Matrix.result.scopedChatChannelsPerActiveChatUser).toBe(1);
    expect(srt6Matrix.result.persistentChannelsPerActiveUser).toBe(
      roleChannels.length + 1,
    );
    expect(srt6Matrix.result.persistentChannelsPerActiveUser).toBe(
      srt5Matrix.result.estimatedChannelsPerActiveUser,
    );
    expect(srt6Matrix.result.regressedFromSrt5).toBe(false);
    expect(Object.values(srt6Matrix.checks).every(Boolean)).toBe(true);
  });

  it("keeps duplicate collapse and cleanup/ref-count behavior on the central path", () => {
    const clientSource = read("src/lib/realtime/realtime.client.ts");
    const channelBudgetSource = read("src/lib/realtime/realtime.channels.ts");

    expect(clientSource).toContain("const activeChannels = new Map");
    expect(clientSource).toContain("subscribers: Map");
    expect(clientSource).toContain("channel_name_shared_ref_counted");
    expect(clientSource).toContain("last_ref_released");
    expect(clientSource).toContain("current.subscribers.size > 0");
    expect(clientSource).toContain("cleanupRealtimeChannel");
    expect(channelBudgetSource).toContain("const activeBudgetEntries = new Map");
    expect(channelBudgetSource).toContain("status: \"duplicate\"");
    expect(channelBudgetSource).toContain("release: () => undefined");
  });

  it("keeps direct mounted channel growth bounded to documented owners only", () => {
    const clientSource = read("src/lib/realtime/realtime.client.ts");
    const directorSource = read("src/screens/director/director.lifecycle.realtime.ts");
    const directorTransportSource = read(
      "src/screens/director/director.lifecycle.realtime.transport.ts",
    );
    const draftSyncSource = read("src/lib/api/requestDraftSync.service.ts");
    const draftSyncTransportSource = read("src/lib/api/requestDraftSync.transport.ts");
    const requestRepositorySource = read("src/lib/api/request.repository.ts");
    const chatSource = read("src/lib/chat_api.ts");

    expect(clientSource).toContain("client.channel(params.name)");
    expect(directorSource).toContain("createDirectorScreenRealtimeChannel");
    expect(directorTransportSource).toContain(
      ".channel(DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME",
    );
    expect(directorTransportSource).toContain("removeDirectorRealtimeChannel");
    expect(directorSource).toContain("claimRealtimeChannel");
    expect(directorSource).toContain("maxChannelsForSource: 1");
    expect(directorSource).toContain("screenBudget?.release()");
    expect(directorSource).toContain("cleanupRealtimeChannel");

    expect(draftSyncSource).toContain("createDirectorHandoffBroadcastChannel");
    expect(draftSyncSource).toContain(
      "removeDirectorHandoffBroadcastChannel(channel)",
    );
    expect(draftSyncTransportSource).toContain(
      "DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME",
    );
    expect(draftSyncTransportSource).toContain(
      `${directClientCall("removeChannel")}(channel)`,
    );
    expect(requestRepositorySource).toContain("DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME");
    expect(requestRepositorySource).toContain("createDirectorHandoffBroadcastChannel");
    expect(requestRepositorySource).toContain("removeDirectorHandoffBroadcastChannel(channel)");
    expect(requestRepositorySource).not.toContain("supabase.removeChannel(channel)");

    expect(chatSource).toContain("const buildListingChatChannelName");
    expect(chatSource).toContain("subscribeChannel({");
    expect(chatSource).toContain("filter: `supplier_id=eq.${listingId}`");

    const mountedSources = [
      "src/screens/buyer/buyer.realtime.lifecycle.ts",
      "src/screens/buyer/buyer.subscriptions.ts",
      "src/screens/accountant/accountant.realtime.lifecycle.ts",
      "src/screens/warehouse/warehouse.realtime.lifecycle.ts",
      "src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts",
      "src/screens/contractor/contractor.realtime.lifecycle.ts",
      "src/screens/director/director.finance.realtime.lifecycle.ts",
      "src/screens/director/director.reports.realtime.lifecycle.ts",
    ];

    for (const relativePath of mountedSources) {
      const source = read(relativePath);
      expect(source).toContain("subscribeChannel");
      expect(source).not.toContain("supabase.channel(");
      expect(source).not.toContain(".channel(\"notif-buyer-rt\")");
      expect(source).not.toContain(".channel(\"buyer-proposals-rt\")");
      expect(source).not.toContain(".channel(\"warehouse-expense-rt\")");
    }
  });
});
