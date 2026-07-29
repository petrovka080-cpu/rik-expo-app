import {
  REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM,
  REQUEST_ESTIMATE_LAUNCH_READY_MARKER_PREFIX,
  RequestEstimateLaunchPayloadError,
  buildRequestEstimateLaunchReadyMarkerId,
  createRequestEstimateLaunchPayloadV1,
  decodeRequestEstimateLaunchPayloadV1,
  encodeRequestEstimateLaunchPayloadV1,
  resolveRequestEstimateLaunchTargetV1,
} from "./requestEstimateLaunchPayload";

describe("RequestEstimateLaunchPayloadV1", () => {
  const issuedAt = "2026-07-28T12:00:00.000Z";

  it("builds a bounded resource-safe marker for exact launch identity", () => {
    const marker = buildRequestEstimateLaunchReadyMarkerId(
      "android:launch/roof?attempt=2",
    );

    expect(marker).toBe(
      `${REQUEST_ESTIMATE_LAUNCH_READY_MARKER_PREFIX}android_launch_roof_attempt_2`,
    );
    expect(marker).not.toMatch(/[:/?=]/);
  });

  it("canonically round-trips Cyrillic and reserved URI characters", () => {
    const target = resolveRequestEstimateLaunchTargetV1(
      "rik:///request?prompt=%D1%81%D0%BC%D0%B5%D1%82%D0%B0+100+%D0%BA%D0%B2+%D0%BC+%26+PDF&autoPrepare=1",
      { issuedAt },
    );

    expect(target).not.toBeNull();
    expect(target?.payload).toMatchObject({
      version: 1,
      route: "/request",
      workIntent: "смета 100 кв м & PDF",
      actorContext: { role: "buyer", source: "route_default" },
    });
    expect(target?.params.prompt).toBe("смета 100 кв м & PDF");
    expect(target?.params.autoPrepare).toBe("1");
    expect(target?.href).toContain(
      encodeURIComponent(REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM),
    );
    expect(
      resolveRequestEstimateLaunchTargetV1(target?.href, { issuedAt })?.payload,
    ).toEqual(target?.payload);
  });

  it("gives cold and warm owners the same result for the same launch identity", () => {
    const uri =
      "rik:///ai?prompt=%D1%81%D0%BC%D0%B5%D1%82%D0%B0+%D0%BD%D0%B0+%D0%B1%D1%80%D1%83%D1%81%D1%87%D0%B0%D1%82%D0%BA%D1%83&context=foreman&autoSend=1";
    const options = {
      issuedAt,
      launchId: "request-estimate:fixed-launch-0001",
    };

    const cold = resolveRequestEstimateLaunchTargetV1(uri, options);
    const warm = resolveRequestEstimateLaunchTargetV1(uri, options);

    expect(warm).toEqual(cold);
    expect(cold?.payload.actorContext).toEqual({
      role: "foreman",
      source: "route_parameter",
    });
    expect(cold?.navigationPathname).toBe("/(tabs)/ai");
  });

  it("treats an explicit launchId as identity instead of a draft parameter", () => {
    const target = resolveRequestEstimateLaunchTargetV1(
      "rik:///request?prompt=roof&launchId=android%3Aexplicit-0001&autoPrepare=1",
      { issuedAt: "2026-07-28T00:00:00.000Z" },
    );
    expect(target?.payload.launchId).toBe("android:explicit-0001");
    expect(target?.payload.parameters).toEqual({
      autoPrepare: "1",
      prompt: "roof",
    });
  });

  it("rejects corrupt, oversized, unknown-field, and empty-work payloads", () => {
    const valid = createRequestEstimateLaunchPayloadV1({
      route: "/request",
      workIntent: "крыша 100 кв м",
      parameters: { prompt: "крыша 100 кв м" },
      issuedAt,
    });
    const encoded = encodeRequestEstimateLaunchPayloadV1(valid);
    expect(decodeRequestEstimateLaunchPayloadV1(encoded)).toEqual(valid);

    for (const corrupt of [
      "{",
      JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, futureRequiredField: "must-not-be-dropped" }),
      JSON.stringify({ ...valid, workIntent: "" }),
      "x".repeat(8_193),
    ]) {
      expect(() => decodeRequestEstimateLaunchPayloadV1(corrupt)).toThrow(
        RequestEstimateLaunchPayloadError,
      );
    }
  });

  it("does not turn a route without a work intent into an empty estimate", () => {
    expect(() =>
      resolveRequestEstimateLaunchTargetV1("rik:///request?autoPrepare=1", {
        issuedAt,
      }),
    ).toThrow("REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED");
  });
});
