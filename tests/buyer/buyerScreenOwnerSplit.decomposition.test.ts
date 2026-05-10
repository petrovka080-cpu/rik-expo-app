import fs from "fs";
import path from "path";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  useBuyerScreenContentProps,
  type BuyerScreenContentProps,
  type UseBuyerScreenContentPropsParams,
} from "../../src/screens/buyer/components/BuyerScreenContent";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const noop = () => undefined;

function createStableProxy(): unknown {
  const cache = new Map<PropertyKey, unknown>();
  const target = () => undefined;

  return new Proxy(target, {
    apply: () => undefined,
    get: (_target, prop) => {
      if (prop === "then") return undefined;
      if (!cache.has(prop)) cache.set(prop, createStableProxy());
      return cache.get(prop);
    },
  });
}

const stableProxy = createStableProxy();

function buildContentParams(
  overrides: Partial<UseBuyerScreenContentPropsParams> = {},
): UseBuyerScreenContentPropsParams {
  const renderNode = React.createElement("mock-node");
  const params: UseBuyerScreenContentPropsParams = {
    s: { screen: {}, fieldInput: {} },
    isWeb: true,
    tab: "inbox",
    buyerFio: "Buyer",
    searchQuery: "",
    onChangeSearchQuery: noop,
    onRefresh: noop,
    fetchInboxNextPage: noop,
    showWebRefreshButton: false,
    refreshAccessibilityLabel: "Refresh buyer",
    measuredHeaderMax: 96,
    scrollY: stableProxy as UseBuyerScreenContentPropsParams["scrollY"],
    stickyHeader: {
      header: renderNode,
      onHeaderMeasure: noop,
      headerHeight: stableProxy as UseBuyerScreenContentPropsParams["stickyHeader"]["headerHeight"],
      headerShadow: stableProxy as UseBuyerScreenContentPropsParams["stickyHeader"]["headerShadow"],
    },
    mainListHeaderPad: 106,
    mainList: {
      data: [],
      publicationState: "ready",
      publicationMessage: null,
      refreshing: false,
      onRefresh: noop,
      loadingInbox: false,
      loadingBuckets: false,
      loadingInboxMore: false,
      inboxHasMore: false,
      renderGroupBlock: () => null,
      renderProposalCard: () => null,
    },
    sheets: stableProxy as UseBuyerScreenContentPropsParams["sheets"],
  };

  return { ...params, ...overrides };
}

describe("BUYER_SCREEN_OWNER_SPLIT decomposition audit", () => {
  it("adds the extracted buyer owner-boundary modules", () => {
    const requiredFiles = [
      "src/screens/buyer/buyer.screen.model.ts",
      "src/screens/buyer/hooks/useBuyerScreenController.ts",
      "src/screens/buyer/hooks/useBuyerScreenUiState.ts",
      "src/screens/buyer/hooks/useBuyerScreenChromeModel.ts",
      "src/screens/buyer/components/BuyerSearchBar.tsx",
      "src/screens/buyer/components/BuyerScreenContent.tsx",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });

  it("keeps BuyerScreen as a composition shell while controller owns orchestration", () => {
    const source = readRepoFile("src/screens/buyer/BuyerScreen.tsx");
    const controllerSource = readRepoFile("src/screens/buyer/hooks/useBuyerScreenController.ts");
    const contentSource = readRepoFile("src/screens/buyer/components/BuyerScreenContent.tsx");
    const chromeSource = readRepoFile("src/screens/buyer/hooks/useBuyerScreenChromeModel.ts");
    const sideEffectsSource = readRepoFile("src/screens/buyer/hooks/useBuyerScreenSideEffects.ts");

    expect(source).toContain("useBuyerScreenController");
    expect(source).toContain("<BuyerScreenContent");
    expect(controllerSource).toContain("useBuyerScreenUiState");
    expect(controllerSource).toContain("useBuyerScreenChromeModel");
    expect(chromeSource).toContain("buildBuyerScreenViewModel");
    expect(controllerSource).toContain("useBuyerScreenLoadingPublisher");
    expect(sideEffectsSource).toContain("buildBuyerScreenLoadingState");
    expect(controllerSource).toContain("useBuyerScreenContentProps");
    expect(contentSource).toContain("export function useBuyerScreenContentProps");
    expect(source).not.toContain("TextInput");
    expect(source).not.toContain("RoleScreenLayout");
    expect(source).not.toContain("Ionicons");
    expect(source).not.toContain("BuyerScreenSheets");
    expect(source).not.toContain("supabase");
    expect(source).not.toContain("listBuyerInbox");
    expect(source).not.toContain("proposalSubmit");
    expect((source.match(/^import /gm) || []).length).toBeLessThanOrEqual(3);
    expect(source.split("\n").length).toBeLessThanOrEqual(12);
  });

  it("ratchets BuyerScreen root hook pressure below the runtime risk budget", () => {
    const source = readRepoFile("src/screens/buyer/BuyerScreen.tsx");
    const hookCalls = source.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(|React\.use[A-Z][A-Za-z0-9_]*\s*\(/g) ?? [];

    expect(hookCalls).toEqual(["useBuyerScreenController("]);
    expect(source).not.toContain("useBuyerScreenUiState({ supabase, alertUser: screenAlertUser })");
    expect(source).not.toContain("useBuyerScreenChromeModel");
    expect(source).not.toContain("useBuyerScreenStoreViewModel();");
  });

  it("keeps the search host static style in BuyerScreenContent", () => {
    const contentSource = readRepoFile("src/screens/buyer/components/BuyerScreenContent.tsx");

    expect(contentSource).toContain("const styles = StyleSheet.create");
    expect(contentSource).toContain("const rootStyle = useMemo");
    expect(contentSource).toContain("<RoleScreenLayout style={rootStyle}>");
    expect(contentSource).toContain("const searchBarHostStyle = useMemo");
    expect(contentSource).toContain("style={searchBarHostStyle}");
    expect(contentSource).toContain("top: stickyHeader.headerHeight");
  });

  it("keeps BuyerScreenContent props stable when parent recreates the params object", () => {
    const captured: BuyerScreenContentProps[] = [];
    const params = buildContentParams();

    function Probe(props: { value: UseBuyerScreenContentPropsParams }) {
      captured.push(useBuyerScreenContentProps(props.value));
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(React.createElement(Probe, { value: { ...params } }));
    });
    act(() => {
      renderer?.update(React.createElement(Probe, { value: { ...params } }));
    });

    expect(captured).toHaveLength(2);
    expect(captured[1]).toBe(captured[0]);
    expect(captured[1].stickyHeader).toBe(captured[0].stickyHeader);
    expect(captured[1].mainList).toBe(captured[0].mainList);
    expect(captured[1].sheets).toBe(captured[0].sheets);

    act(() => {
      renderer?.update(
        React.createElement(Probe, { value: { ...params, searchQuery: "needle" } }),
      );
    });

    expect(captured).toHaveLength(3);
    expect(captured[2]).not.toBe(captured[1]);
    expect(captured[2].stickyHeader).toBe(captured[1].stickyHeader);
    expect(captured[2].mainList).toBe(captured[1].mainList);
    expect(captured[2].sheets).toBe(captured[1].sheets);

    act(() => {
      renderer?.unmount();
    });
  });
});
