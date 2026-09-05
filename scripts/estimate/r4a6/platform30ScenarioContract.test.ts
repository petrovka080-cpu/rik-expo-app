import {
  R4_A6_PLATFORM30_SCENARIO_KINDS,
  androidApi34PlatformTransport,
  assertR4A6Platform30ScenarioSet,
  assertR4A6PlatformPayloadParity,
  webPlatformTransport,
} from "./platform30ScenarioContract";

describe("R4-A6 Platform30 contract", () => {
  it("defines the fifteen distinct executions required on each platform", () => {
    expect(() => assertR4A6Platform30ScenarioSet()).not.toThrow();
    expect(R4_A6_PLATFORM30_SCENARIO_KINDS).toHaveLength(15);
    expect(R4_A6_PLATFORM30_SCENARIO_KINDS).toEqual(expect.arrayContaining([
      "professional_pdf_projection",
      "procurement_projection",
      "immutable_history_projection",
      "cold_restart_restore",
    ]));
  });

  it("preserves Russian text, decimals, nulls, and booleans across Web and Android API34 boundaries", () => {
    const payload = {
      titleRu: "Монтаж кровельной обрешётки — 200 м²",
      quantity: 216.125,
      confirmed: true,
      unitPrice: null,
      rows: [{ rowId: "материал-1", included: false }],
    };
    const web = webPlatformTransport(payload);
    const android = androidApi34PlatformTransport(payload);

    expect(() => assertR4A6PlatformPayloadParity(web, android)).not.toThrow();
    expect(android.payload).toEqual(payload);
  });

  it("fails closed when a platform projection is changed", () => {
    const web = webPlatformTransport({ rows: 45, checksum: "a".repeat(64) });
    const android = androidApi34PlatformTransport({ rows: 44, checksum: "a".repeat(64) });

    expect(() => assertR4A6PlatformPayloadParity(web, android))
      .toThrow("STOP_PLATFORM30_WEB_ANDROID_PARITY");
  });
});
