import {
  RequestEstimateIntentLifecycle,
} from "./requestEstimateLaunchLifecycle";
import {
  resolveRequestEstimateLaunchTargetV1,
  type RequestEstimateLaunchTargetV1,
} from "./requestEstimateLaunchPayload";

function target(
  launchId: string,
  prompt: string,
  route: "/request" | "/ai" = "/request",
): RequestEstimateLaunchTargetV1 {
  const resolved = resolveRequestEstimateLaunchTargetV1(
    `rik:///${route.slice(1)}?prompt=${encodeURIComponent(prompt)}`,
    {
      issuedAt: "2026-07-28T00:00:00.000Z",
      launchId,
    },
  );
  if (!resolved) throw new Error("target required");
  return resolved;
}

describe("RequestEstimateIntentLifecycle", () => {
  it("applies one launchId once and acknowledges only after UI", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const first = target("launch:first-0001", "крыша 100 м2");

    expect(lifecycle.receive(first, "url_event").kind).toBe("accepted");
    expect(lifecycle.getPending()?.stage).toBe("INTENT_RECEIVED");
    expect(lifecycle.markStage(first.payload.launchId, "URL_PARSED")).toBe(true);
    expect(lifecycle.markStage(first.payload.launchId, "AUTH_PENDING")).toBe(true);
    expect(lifecycle.markStage(first.payload.launchId, "AUTH_RESOLVED")).toBe(true);
    expect(lifecycle.shouldApply(first.payload.launchId)).toBe(true);
    expect(lifecycle.markStage(first.payload.launchId, "INTENT_APPLIED")).toBe(true);
    expect(lifecycle.shouldApply(first.payload.launchId)).toBe(false);
    expect(lifecycle.isAcknowledged(first.payload.launchId)).toBe(false);
    expect(
      lifecycle.markStage(first.payload.launchId, "INTENT_ACKNOWLEDGED"),
    ).toBe(false);
    expect(lifecycle.markStage(first.payload.launchId, "DRAFT_SESSION_READY")).toBe(
      true,
    );
    expect(lifecycle.markStage(first.payload.launchId, "UI_READY")).toBe(true);
    expect(
      lifecycle.markStage(first.payload.launchId, "INTENT_ACKNOWLEDGED"),
    ).toBe(true);
    expect(lifecycle.getPending()).toBeNull();
    expect(lifecycle.receive(first, "snapshot").kind).toBe(
      "duplicate_acknowledged",
    );
  });

  it("treats the same payload with a new launchId as a new action", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const first = target("launch:first-0002", "электрика 180 м2");
    const second = target("launch:second-0002", "электрика 180 м2");

    lifecycle.receive(first, "url_event");
    lifecycle.markStage(first.payload.launchId, "URL_PARSED");
    lifecycle.markStage(first.payload.launchId, "AUTH_RESOLVED");
    lifecycle.markStage(first.payload.launchId, "INTENT_APPLIED");
    lifecycle.markStage(first.payload.launchId, "DRAFT_SESSION_READY");
    lifecycle.markStage(first.payload.launchId, "UI_READY");
    lifecycle.markStage(first.payload.launchId, "INTENT_ACKNOWLEDGED");
    expect(lifecycle.receive(second, "url_event")).toMatchObject({
      kind: "accepted",
      replacedLaunchId: null,
    });
    expect(lifecycle.getPending()?.target.payload.launchId).toBe(
      second.payload.launchId,
    );
  });

  it("keeps only the latest pre-auth intent across request and AI", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const staleAi = target("launch:stale-ai-0003", "брусчатка 587 м2", "/ai");
    const latestRequest = target(
      "launch:latest-request-0003",
      "гидроизоляция крыши 100 м2",
    );

    lifecycle.receive(staleAi, "url_event");
    lifecycle.markStage(staleAi.payload.launchId, "URL_PARSED");
    lifecycle.markStage(staleAi.payload.launchId, "AUTH_PENDING");
    expect(lifecycle.receive(latestRequest, "url_event")).toMatchObject({
      kind: "accepted",
      replacedLaunchId: staleAi.payload.launchId,
    });
    expect(lifecycle.getPending()?.target.payload.route).toBe("/request");
    expect(lifecycle.markStage(staleAi.payload.launchId, "UI_READY")).toBe(false);
    expect(lifecycle.getPending()?.target.payload.launchId).toBe(
      latestRequest.payload.launchId,
    );
    expect(lifecycle.receive(staleAi, "expo_linking_snapshot").kind).toBe(
      "duplicate_superseded",
    );
    expect(lifecycle.getPending()?.target.payload.launchId).toBe(
      latestRequest.payload.launchId,
    );
  });

  it("clears pending and dedupe state at a session boundary", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const first = target("launch:session-0004", "крыша");
    lifecycle.receive(first, "url_event");
    lifecycle.markStage(first.payload.launchId, "URL_PARSED");
    lifecycle.markStage(first.payload.launchId, "AUTH_RESOLVED");
    lifecycle.markStage(first.payload.launchId, "INTENT_APPLIED");
    lifecycle.markStage(first.payload.launchId, "DRAFT_SESSION_READY");
    lifecycle.markStage(first.payload.launchId, "UI_READY");
    lifecycle.markStage(first.payload.launchId, "INTENT_ACKNOWLEDGED");
    lifecycle.clearSessionBoundary();

    expect(lifecycle.isAcknowledged(first.payload.launchId)).toBe(false);
    expect(lifecycle.getPending()).toBeNull();
    expect(lifecycle.receive(first, "url_event").kind).toBe("accepted");
  });

  it("rejects skipped and regressing lifecycle stages", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const first = target("launch:ordered-0005", "facade 220 m2");

    lifecycle.receive(first, "url_event");
    expect(lifecycle.markStage(first.payload.launchId, "AUTH_RESOLVED")).toBe(
      false,
    );
    expect(lifecycle.markStage(first.payload.launchId, "URL_PARSED")).toBe(true);
    expect(lifecycle.markStage(first.payload.launchId, "AUTH_RESOLVED")).toBe(
      true,
    );
    expect(lifecycle.markStage(first.payload.launchId, "AUTH_PENDING")).toBe(
      false,
    );
  });

  it("ignores an unseen late snapshot after a newer native intent", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const current = target(
      "launch:current-native-0006",
      "электрика 180 м2",
    );
    const unseenStale = target(
      "launch:unseen-stale-snapshot-0006",
      "асфальт 587 м2",
      "/ai",
    );

    expect(lifecycle.receive(current, "native_view_intent").kind).toBe(
      "accepted",
    );
    expect(
      lifecycle.receive(unseenStale, "expo_linking_snapshot").kind,
    ).toBe("ignored_stale_snapshot");
    expect(lifecycle.getPending()?.target.payload.launchId).toBe(
      current.payload.launchId,
    );

    expect(lifecycle.receive(unseenStale, "native_view_intent")).toMatchObject({
      kind: "accepted",
      replacedLaunchId: current.payload.launchId,
    });
    expect(lifecycle.getPending()?.target.payload.launchId).toBe(
      unseenStale.payload.launchId,
    );
  });

  it("keeps C authoritative across rapid A to B to C and late A/B snapshots", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const a = target("launch:rapid-a-0007", "асфальт 100 м2", "/ai");
    const b = target("launch:rapid-b-0007", "электрика 180 м2");
    const c = target("launch:rapid-c-0007", "крыша 220 м2");

    expect(lifecycle.receive(a, "native_view_intent").kind).toBe("accepted");
    expect(lifecycle.receive(b, "url_event")).toMatchObject({
      kind: "accepted",
      replacedLaunchId: a.payload.launchId,
    });
    expect(lifecycle.receive(c, "native_view_intent")).toMatchObject({
      kind: "accepted",
      replacedLaunchId: b.payload.launchId,
    });
    expect(lifecycle.receive(a, "expo_linking_snapshot").kind).toBe(
      "duplicate_superseded",
    );
    expect(
      lifecycle.receive(b, "expo_linking_initial_url_snapshot").kind,
    ).toBe("duplicate_superseded");
    expect(lifecycle.getPending()?.target.payload.launchId).toBe(
      c.payload.launchId,
    );
  });

  it("clears authoritative source identity at a user/session boundary", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const current = target("launch:authority-current-0008", "крыша 100 м2");
    const snapshot = target(
      "launch:authority-snapshot-0008",
      "асфальт 220 м2",
      "/ai",
    );

    lifecycle.receive(current, "native_view_intent");
    expect(lifecycle.receive(snapshot, "expo_linking_snapshot").kind).toBe(
      "ignored_stale_snapshot",
    );
    lifecycle.clearSessionBoundary();
    expect(lifecycle.receive(snapshot, "expo_linking_snapshot").kind).toBe(
      "accepted",
    );
  });

  it("notifies a mounted screen when a warm launch advances or clears", () => {
    const lifecycle = new RequestEstimateIntentLifecycle();
    const warm = target(
      "launch:observable-ai-0009",
      "Р±СЂСѓСЃС‡Р°С‚РєР° 587 Рј2",
      "/ai",
    );
    const observed: Array<string | null> = [];
    const unsubscribe = lifecycle.subscribe(() => {
      observed.push(lifecycle.getPending()?.stage ?? null);
    });

    lifecycle.receive(warm, "url_event");
    lifecycle.markStage(warm.payload.launchId, "URL_PARSED");
    lifecycle.markStage(warm.payload.launchId, "AUTH_RESOLVED");
    lifecycle.markStage(warm.payload.launchId, "INTENT_APPLIED");
    lifecycle.markStage(warm.payload.launchId, "DRAFT_SESSION_READY");
    lifecycle.markStage(warm.payload.launchId, "UI_READY");
    lifecycle.markStage(warm.payload.launchId, "INTENT_ACKNOWLEDGED");
    unsubscribe();

    expect(observed).toEqual([
      "INTENT_RECEIVED",
      "URL_PARSED",
      "AUTH_RESOLVED",
      "INTENT_APPLIED",
      "DRAFT_SESSION_READY",
      "UI_READY",
      null,
    ]);
  });
});
