/**
 * safeBack — navigation safety boundary tests.
 *
 * WAVE I: Verifies that safeBack checks canGoBack before calling back,
 * and falls back to router.replace when no history is available.
 */

import { hasSafeBackHistory, safeBack } from "./safeBack";
import type { SafeBackRouterLike } from "./safeBack";

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

function createRouter(overrides?: Partial<SafeBackRouterLike>): SafeBackRouterLike {
  return {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    ...overrides,
  };
}

describe("hasSafeBackHistory", () => {
  it("returns true when canGoBack() returns true on native", () => {
    const r = createRouter({ canGoBack: jest.fn().mockReturnValue(true) });
    expect(hasSafeBackHistory(r, { platform: "ios" })).toBe(true);
  });

  it("returns false when canGoBack() returns false on native", () => {
    const r = createRouter({ canGoBack: jest.fn().mockReturnValue(false) });
    expect(hasSafeBackHistory(r, { platform: "android" })).toBe(false);
  });

  it("returns false when canGoBack is undefined", () => {
    const r = createRouter({ canGoBack: undefined });
    expect(hasSafeBackHistory(r, { platform: "ios" })).toBe(false);
  });

  it("checks web history length on web platform", () => {
    const r = createRouter();
    expect(hasSafeBackHistory(r, { platform: "web", webHistoryLength: 3 })).toBe(true);
    expect(hasSafeBackHistory(r, { platform: "web", webHistoryLength: 1 })).toBe(false);
    expect(hasSafeBackHistory(r, { platform: "web", webHistoryLength: 0 })).toBe(false);
  });
});

describe("safeBack", () => {
  it("calls router.back() when canGoBack is true and returns 'back'", () => {
    const r = createRouter({ canGoBack: jest.fn().mockReturnValue(true) });
    const result = safeBack(r, "/fallback" as any, { platform: "ios" });
    expect(result).toBe("back");
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(r.replace).not.toHaveBeenCalled();
  });

  it("calls router.replace(fallback) when canGoBack is false and returns 'fallback'", () => {
    const r = createRouter({ canGoBack: jest.fn().mockReturnValue(false) });
    const result = safeBack(r, "/office" as any, { platform: "ios" });
    expect(result).toBe("fallback");
    expect(r.replace).toHaveBeenCalledWith("/office");
    expect(r.back).not.toHaveBeenCalled();
  });

  it("calls router.replace(fallback) when canGoBack is undefined", () => {
    const r = createRouter({ canGoBack: undefined });
    const result = safeBack(r, "/office" as any, { platform: "android" });
    expect(result).toBe("fallback");
    expect(r.replace).toHaveBeenCalledWith("/office");
    expect(r.back).not.toHaveBeenCalled();
  });
});
