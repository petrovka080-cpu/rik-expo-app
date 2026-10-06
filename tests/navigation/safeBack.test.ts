import { hasSafeBackHistory, safeBack, type SafeBackRouterLike } from "../../src/lib/navigation/safeBack";

function createRouter(overrides?: Partial<SafeBackRouterLike>): SafeBackRouterLike {
  return {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => false),
    ...overrides,
  };
}

describe("safeBack", () => {
  it("uses router.back on native when history exists", () => {
    const router = createRouter({
      canGoBack: jest.fn(() => true),
    });

    const result = safeBack(router, "/office", { platform: "ios" });

    expect(result).toBe("back");
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("uses fallback replace on native when history is missing", () => {
    const router = createRouter({
      canGoBack: jest.fn(() => false),
    });

    const result = safeBack(router, "/office", { platform: "ios" });

    expect(result).toBe("fallback");
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/office");
  });

  it("returns a directly opened product to market even after browser reloads", () => {
    const router = createRouter();
    const result = safeBack(router, "/(tabs)/market", { platform: "web", webHistoryLength: 9 });
    expect(result).toBe("fallback");
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/market");
    expect(hasSafeBackHistory(router, { platform: "web", webHistoryLength: 1 })).toBe(false);
  });

  it("retains the real previous market screen when the navigator has history", () => {
    const router = createRouter({ canGoBack: () => true });
    expect(safeBack(router, "/(tabs)/market", { platform: "web", webHistoryLength: 1 })).toBe("back");
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
