import { StackRouter, TabRouter } from "@react-navigation/routers";
import { resolvePdfViewerReturnPlan } from "./pdfViewerReturnNavigation";

const rootOptions = {
  routeNames: ["(tabs)", "pdf-viewer", "other"],
  routeParamList: {},
  routeGetIdList: {},
};
const tabOptions = {
  routeNames: ["office", "request/index"],
  routeParamList: {},
  routeGetIdList: {},
};

function nestedCaller(params: Record<string, string | undefined>) {
  const rootRouter = StackRouter({ initialRouteName: "(tabs)" });
  const tabRouter = TabRouter({ initialRouteName: "request/index" });
  const tabs = tabRouter.getInitialState(tabOptions);
  const request = { ...tabs.routes[tabs.index]!, params };
  const nested = { ...tabs, routes: tabs.routes.map((route, index) =>
    index === tabs.index ? request : route) };
  const initial = rootRouter.getInitialState(rootOptions);
  const caller = { ...initial.routes[0]!, state: nested };
  const before = { ...initial, routes: [caller] };
  const viewing = rootRouter.getStateForAction(before, {
    type: "PUSH", payload: { name: "pdf-viewer", params: { sessionId: "own-session" } },
  }, rootOptions);
  if (!viewing || viewing.stale !== false) throw new Error("Installed StackRouter must return a complete state");
  return { rootRouter, viewing, caller, request };
}

describe("PDF return preserves the installed nested navigator", () => {
  it.each([
    { draftId: "consumer_draft_own" },
    { launchId: "own-launch", launchPayloadV1: "original-payload", prompt: "Шпаклёвка стен 50 м2" },
    {},
  ])("pops to the actual request without replacing its params: %p", (params) => {
    const { rootRouter, viewing, caller, request } = nestedCaller(params);
    expect(resolvePdfViewerReturnPlan(viewing, "/request?draftId=consumer_draft_own", request.key))
      .toEqual({ kind: "preserve-caller" });
    const returned = rootRouter.getStateForAction(viewing, { type: "GO_BACK" }, rootOptions)!;
    expect(returned.routes).toHaveLength(1);
    expect(returned.routes[0]).toBe(caller);
    expect(returned.routes[0]!.state!.routes[1]).toBe(request);
    expect(request.params).toBe(params);
  });

  it("does not confuse two draft workspaces even with the same screen pathname", () => {
    const { viewing, request } = nestedCaller({ draftId: "draft_B" });
    expect(resolvePdfViewerReturnPlan(viewing, "/request?draftId=draft_A", request.key))
      .toEqual({ kind: "restore-route", href: "/request?draftId=draft_A" });
    expect(resolvePdfViewerReturnPlan(viewing, "/request"))
      .toEqual({ kind: "restore-route", href: "/request" });
    expect(resolvePdfViewerReturnPlan(viewing, "/request?draftId=draft_B", "another-caller-key"))
      .toEqual({ kind: "restore-route", href: "/request?draftId=draft_B" });
  });

  it("ignores a queued second Back after this viewer has already been popped", () => {
    const { rootRouter, viewing } = nestedCaller({ draftId: "consumer_draft_own" });
    const key = viewing.routes[viewing.index]!.key;
    const returned = rootRouter.getStateForAction(viewing, { type: "GO_BACK" }, rootOptions)!;
    expect(resolvePdfViewerReturnPlan(returned, "/request", null, key))
      .toEqual({ kind: "ignore-stale" });
  });

  it("keeps the proven cleared caller after Approve despite its old draft route param", () => {
    const { viewing, request } = nestedCaller({ draftId: "already-approved-draft" });
    expect(resolvePdfViewerReturnPlan(viewing, "/request", request.key))
      .toEqual({ kind: "preserve-caller" });
  });

  it("finds the viewer below Expo's generated root navigator", () => {
    const { rootRouter, viewing, request, caller } = nestedCaller({ draftId: "consumer_draft_own" });
    const viewerKey = viewing.routes[viewing.index]!.key;
    const containerState = { type: "stack", index: 0, routes: [
      { name: "__root", key: "generated-root-key", state: viewing },
    ] };
    expect(resolvePdfViewerReturnPlan(containerState, "/request?draftId=consumer_draft_own", request.key, viewerKey))
      .toEqual({ kind: "preserve-caller" });
    const returned = rootRouter.getStateForAction(viewing, { type: "GO_BACK" }, rootOptions)!;
    expect(returned.routes[0]).toBe(caller);
    expect(resolvePdfViewerReturnPlan({ ...containerState, routes: [
      { ...containerState.routes[0]!, state: returned },
    ] }, "/request", request.key, viewerKey)).toEqual({ kind: "ignore-stale" });
  });

  it("does not preserve a different canonical revision as the requested workspace", () => {
    const { viewing, request } = nestedCaller({ canonicalRevisionId: "revision_B" });
    expect(resolvePdfViewerReturnPlan(viewing, "/request?canonicalRevisionId=revision_A", request.key))
      .toEqual({ kind: "restore-route", href: "/request?canonicalRevisionId=revision_A" });
  });

  it("uses exact safe recovery when the previous active tab is another module", () => {
    const { viewing } = nestedCaller({ draftId: "consumer_draft_own" });
    const tabs = viewing.routes[0]!.state!;
    const otherTab = { ...viewing, routes: [
      { ...viewing.routes[0]!, state: { ...tabs, index: 0 } }, viewing.routes[1]!,
    ] };
    expect(resolvePdfViewerReturnPlan(otherTab, "/request?draftId=consumer_draft_own"))
      .toEqual({ kind: "restore-route", href: "/request?draftId=consumer_draft_own" });
  });

  it("restores an absent caller using the installed POP_TO replacement", () => {
    const rootRouter = StackRouter({ initialRouteName: "pdf-viewer" });
    const alone = rootRouter.getInitialState(rootOptions);
    expect(resolvePdfViewerReturnPlan(alone, "/request?draftId=consumer_draft_own"))
      .toEqual({ kind: "restore-route", href: "/request?draftId=consumer_draft_own" });
    const restored = rootRouter.getStateForAction(alone, {
      type: "POP_TO", payload: { name: "(tabs)", params: {
        screen: "request/index", params: { draftId: "consumer_draft_own" },
      } },
    }, rootOptions)!;
    expect(restored.routes).toHaveLength(1);
    expect(restored.routes[0]!.name).toBe("(tabs)");
    expect(restored.routes[0]!.params).toEqual({
      screen: "request/index", params: { draftId: "consumer_draft_own" },
    });
  });

  it.each(["https://example.com", "//example.com", "/auth/login", null])(
    "does not promote an unsafe return href: %p", (href) => {
      expect(resolvePdfViewerReturnPlan(undefined, href)).toEqual({ kind: "safe-back" });
    },
  );

  it("does not guess a dynamic caller path or pop a non-viewer route", () => {
    const dynamic = { type: "stack", index: 1, routes: [
      { name: "supplier/[id]" }, { name: "pdf-viewer" },
    ] };
    expect(resolvePdfViewerReturnPlan(dynamic, "/supplier/own"))
      .toEqual({ kind: "restore-route", href: "/supplier/own" });
    expect(resolvePdfViewerReturnPlan({ ...dynamic, routes: [
      { name: "request/index" }, { name: "other" },
    ] }, "/request")).toEqual({ kind: "restore-route", href: "/request" });
  });
});
