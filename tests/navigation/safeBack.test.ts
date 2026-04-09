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

  it("uses browser history on web", () => {
    const router = createRouter();

    expect(hasSafeBackHistory(router, { platform: "web", webHistoryLength: 2 })).toBe(true);
    expect(hasSafeBackHistory(router, { platform: "web", webHistoryLength: 1 })).toBe(false);
  });
});
