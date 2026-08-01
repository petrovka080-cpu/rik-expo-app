import fs from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("request estimate intent lifecycle owners", () => {
  it("acknowledges request and AI launches only after draft and UI readiness", () => {
    for (const relativePath of [
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "src/features/ai/AIAssistantScreen.helpers.ts",
    ]) {
      const source = read(relativePath);
      const draft = source.indexOf('"DRAFT_SESSION_READY"');
      const ui = source.indexOf('"UI_READY"', draft + 1);
      const acknowledged = source.indexOf('"INTENT_ACKNOWLEDGED"', ui + 1);

      expect(draft).toBeGreaterThan(-1);
      expect(ui).toBeGreaterThan(draft);
      expect(acknowledged).toBeGreaterThan(ui);
    }
    const requestOwner = read(
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    );
    expect(requestOwner).toContain(
      "const launchChanged = prevProps.launchId !== this.props.launchId",
    );
    expect(requestOwner).toContain("this.launchIntentAcknowledged = false");
    expect(requestOwner).toContain("acknowledgePromptComposerLaunch");
    expect(requestOwner).toContain('draftSessionStatus: "PROMPT_COMPOSER_READY"');
    expect(requestOwner).toContain('projection: "request_prompt_composer"');
    expect(requestOwner).toContain("isRequestEstimatePromptComposerRendered");
    expect(requestOwner).toContain("input.bundle == null");
    expect(requestOwner).toContain(
      "current.bundle?.draft.problemText?.trim() === expectedPrompt",
    );
    expect(requestOwner).not.toContain("hasExactPendingLaunchProjection");
    expect(requestOwner).not.toContain("pendingLaunchPrompt");
    expect(requestOwner).toContain("this.renderScreenView(this.state)");
    expect(requestOwner).toContain("this.cachedScreenViewState === state");
    expect(requestOwner).not.toContain("renderedLaunchId");
    expect(requestOwner).toContain(
      "() => runAfterNextPaint(() => this.applyInitialLaunchFlow())",
    );
    const aiScreen = read("src/features/ai/AIAssistantScreen.tsx");
    const aiLaunchOwner = read(
      "src/features/ai/AIAssistantScreen.helpers.ts",
    );
    expect(aiScreen).toContain("hasInteractiveLaunchPrompt");
    expect(aiScreen).toContain(
      "effectiveLaunchPayload?.parameters.autoSend ?? routeAutoSend",
    );
    expect(aiScreen).toContain(
      "void initialize(hasInteractiveLaunchPrompt)",
    );
    expect(aiScreen).toContain("acknowledgedPromptLaunchRef");
    expect(aiLaunchOwner).toContain("input.trim() !== launchPrompt");
    expect(aiLaunchOwner).toContain(
      "requestEstimateIntentLifecycle.subscribe",
    );
    expect(aiScreen).toContain("runtimeLaunchPayload");

    const requestRoute = read("app/(tabs)/request/index.tsx");
    expect(requestRoute).toContain(
      'key={`${launchId || "direct"}::${draftId || "new"}::${prompt}::${autoPrepare ? "prepare" : "manual"}::${autoPdf ? "pdf" : "screen"}`}',
    );
    const aiRoute = read("app/(tabs)/ai.tsx");
    expect(aiRoute).not.toContain(
      'key={launchPayload?.launchId ?? "direct-ai"}',
    );

    const tabsOwner = read("app/(tabs)/_layout.tsx");
    expect(tabsOwner).toContain("draftId: undefined");
    expect(tabsOwner).toContain("autoPrepare: undefined");
    expect(tabsOwner).toContain("...target.params");
    expect(tabsOwner).toContain(
      'target.navigationPathname === "/(tabs)/ai"',
    );
    expect(tabsOwner).toContain('const aiTabAvailable');
    expect(tabsOwner).toContain("route.name === targetRouteName");

    const rootOwner = read("app/_layout.tsx");
    expect(rootOwner).toContain("aiTabNavigationApplied");
    expect(rootOwner).toContain(
      "navigatePublicRequestTab(target)",
    );
    expect(rootOwner).toContain('"ai_route_applied"');
    const aiApplyStage = rootOwner.lastIndexOf(
      'target.payload.launchId,\n        "INTENT_APPLIED"',
    );
    const aiTabDispatch = rootOwner.lastIndexOf(
      "navigatePublicRequestTab(target)",
    );
    expect(aiApplyStage).toBeGreaterThan(-1);
    expect(aiApplyStage).toBeLessThan(aiTabDispatch);
  });

  it("clears pending and acknowledged launch IDs on logout and user change", () => {
    const root = read("app/_layout.tsx");

    expect(root).toContain("previousAuthenticatedUserIdRef");
    expect(root).toContain("authState.authenticatedUserId");
    expect(root).toContain("currentUserId === previousUserId");
    expect(root.match(/requestEstimateIntentLifecycle\.clearSessionBoundary\(\)/g)).toHaveLength(
      2,
    );
  });

  it("recovers a post-login pending intent only from a readable real session", () => {
    const root = read("app/_layout.tsx");

    expect(root).toContain("recoverReadableSessionForPendingIntent");
    expect(root).toContain('caller: "request_estimate_pending_intent"');
    expect(root).toContain("!session?.user");
    expect(root).toContain(
      "pending?.target.payload.launchId !== launchId",
    );
    expect(root).toContain('status: "authenticated"');
    expect(root).toContain(
      "authState.loadRoleForCurrentSession(session.user)",
    );
  });
});
