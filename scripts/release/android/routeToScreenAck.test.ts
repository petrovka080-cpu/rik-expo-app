import {
  ROUTE_TO_SCREEN_ACK_LIFECYCLE,
  collectRouteToScreenLifecycleEvidence,
  isWarmAndroidActivityDelivery,
} from "./routeToScreenAck";

function log(launchId: string, stages: readonly string[]): string {
  return stages
    .map(
      (stage) =>
        `08-23 12:00:00.000 I/ReactNativeJS: '[RikWarmDeepLink] ${stage} {"launchId":"${launchId}"}'`,
    )
    .join("\n");
}

describe("official Android route-to-screen ACK contract", () => {
  it("accepts one exact ordered lifecycle for the requested launchId", () => {
    const launchId = "android:official:case-0001";
    const evidence = collectRouteToScreenLifecycleEvidence(
      [
        log("android:unrelated:case-0002", ROUTE_TO_SCREEN_ACK_LIFECYCLE),
        log(launchId, ROUTE_TO_SCREEN_ACK_LIFECYCLE),
      ].join("\n"),
      launchId,
    );

    expect(evidence).toMatchObject({
      launchId,
      orderedStages: ROUTE_TO_SCREEN_ACK_LIFECYCLE,
      observedStages: ROUTE_TO_SCREEN_ACK_LIFECYCLE,
      authPendingObserved: false,
      exactOrder: true,
      exactlyOnce: true,
      acknowledged: true,
    });
  });

  it("accepts one cold AUTH_PENDING between parse and auth resolution", () => {
    const launchId = "android:official:cold-case-0003";
    const coldStages = [
      "INTENT_RECEIVED",
      "URL_PARSED",
      "AUTH_PENDING",
      ...ROUTE_TO_SCREEN_ACK_LIFECYCLE.slice(2),
    ];
    const evidence = collectRouteToScreenLifecycleEvidence(
      log(launchId, coldStages),
      launchId,
    );

    expect(evidence).toMatchObject({
      orderedStages: ROUTE_TO_SCREEN_ACK_LIFECYCLE,
      observedStages: coldStages,
      authPendingObserved: true,
      exactOrder: true,
      exactlyOnce: true,
      acknowledged: true,
    });
  });

  it("rejects missing, reordered, duplicated and invalid auth-pending lifecycles", () => {
    const launchId = "android:official:case-0003";
    const variants = [
      ROUTE_TO_SCREEN_ACK_LIFECYCLE.slice(0, -1),
      [
        ...ROUTE_TO_SCREEN_ACK_LIFECYCLE.slice(0, 4),
        "UI_READY",
        "DRAFT_SESSION_READY",
        "INTENT_ACKNOWLEDGED",
      ],
      [...ROUTE_TO_SCREEN_ACK_LIFECYCLE, "INTENT_ACKNOWLEDGED"],
      [
        "INTENT_RECEIVED",
        "AUTH_PENDING",
        ...ROUTE_TO_SCREEN_ACK_LIFECYCLE.slice(1),
      ],
      [
        "INTENT_RECEIVED",
        "URL_PARSED",
        "AUTH_PENDING",
        "AUTH_PENDING",
        ...ROUTE_TO_SCREEN_ACK_LIFECYCLE.slice(2),
      ],
    ];

    for (const stages of variants) {
      const evidence = collectRouteToScreenLifecycleEvidence(
        log(launchId, stages),
        launchId,
      );
      expect(evidence.acknowledged).toBe(false);
    }
  });

  it("requires Android warm-delivery evidence", () => {
    expect(
      isWarmAndroidActivityDelivery(
        "Warning: Activity not started, intent has been delivered to currently running top-most instance.",
      ),
    ).toBe(true);
    expect(isWarmAndroidActivityDelivery("Status: ok\nThisTime: 0")).toBe(
      true,
    );
    expect(isWarmAndroidActivityDelivery("Status: ok\nThisTime: 314")).toBe(
      false,
    );
  });
});
