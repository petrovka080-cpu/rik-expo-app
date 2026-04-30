import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S-RT-5 realtime fanout reduction contract", () => {
  it("records the before/after channel estimate and safety posture", () => {
    const matrix = JSON.parse(
      read("artifacts/S_RT_5_realtime_fanout_reduction_matrix.json"),
    ) as {
      baseline: { channelsPerActiveUser: number };
      result: { estimatedChannelsPerActiveUser: number; targetMet: boolean };
      safety: Record<string, boolean>;
    };

    expect(matrix.baseline.channelsPerActiveUser).toBe(14);
    expect(matrix.result.estimatedChannelsPerActiveUser).toBeLessThan(14);
    expect(matrix.result.estimatedChannelsPerActiveUser).toBeLessThanOrEqual(8);
    expect(matrix.result.targetMet).toBe(true);
    expect(matrix.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        stagingTouched: false,
        realtimeLoadGenerated: false,
        sqlRpcRlsStorageChanged: false,
        packageNativeConfigChanged: false,
        businessBehaviorChanged: false,
        otaEasPlayMarketTouched: false,
        secretsPrintedOrCommitted: false,
      }),
    );
  });

  it("keeps duplicate channel attachments on the central ref-counted path", () => {
    const source = read("src/lib/realtime/realtime.client.ts");

    expect(source).toContain("subscribers: Map");
    expect(source).toContain("channel_name_shared_ref_counted");
    expect(source).toContain("last_ref_released");
    expect(source).not.toContain("channel_name_replaced");
  });

  it("routes legacy buyer and warehouse hooks through shared screen channels", () => {
    const buyerSource = read("src/screens/buyer/buyer.subscriptions.ts");
    const warehouseSource = read("src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts");

    expect(buyerSource).toContain("subscribeChannel");
    expect(buyerSource).toContain("BUYER_REALTIME_CHANNEL_NAME");
    expect(buyerSource).not.toContain(".channel(\"notif-buyer-rt\")");
    expect(buyerSource).not.toContain(".channel(\"buyer-proposals-rt\")");

    expect(warehouseSource).toContain("subscribeChannel");
    expect(warehouseSource).toContain("WAREHOUSE_REALTIME_CHANNEL_NAME");
    expect(warehouseSource).not.toContain(".channel(\"warehouse-expense-rt\")");
  });

  it("keeps director handoff on the director screen channel", () => {
    const channelsSource = read("src/lib/realtime/realtime.channels.ts");
    const directorSource = read("src/screens/director/director.lifecycle.realtime.ts");

    expect(channelsSource).toContain(
      "DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME = DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME",
    );
    expect(directorSource).toContain("DIRECTOR_HANDOFF_BROADCAST_EVENT");
    expect(directorSource).toContain('sourcePath: "director.lifecycle.broadcast_handoff"');
    expect(directorSource).not.toContain("createDirectorHandoffChannel");
    expect(directorSource).not.toContain("handoffBudget");
  });
});
