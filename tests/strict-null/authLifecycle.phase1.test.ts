import { POST_AUTH_ENTRY_ROUTE } from "../../src/lib/authRouting";
import {
  isAuthStackRoute,
  isProtectedAppRoute,
  isRootEntryPath,
  resolveRouteFromAuth,
  type AuthSessionState,
} from "../../src/lib/auth/useAuthLifecycle";

const authenticatedState: AuthSessionState = {
  status: "authenticated",
  reason: "bootstrap_authenticated",
};

const unknownState: AuthSessionState = {
  status: "unknown",
  reason: "bootstrap_pending",
};

const unauthenticatedState: AuthSessionState = {
  status: "unauthenticated",
  reason: "bootstrap_no_session",
};

describe("strict-null phase 1 auth lifecycle slice", () => {
  it("treats nullish and root paths as non-protected entry points", () => {
    expect(isRootEntryPath(undefined)).toBe(true);
    expect(isRootEntryPath(null)).toBe(true);
    expect(isRootEntryPath("/")).toBe(true);
    expect(isRootEntryPath("/index")).toBe(true);
    expect(isRootEntryPath("/(tabs)/profile")).toBe(false);
  });

  it("handles missing auth segments safely", () => {
    expect(isAuthStackRoute(undefined)).toBe(false);
    expect(isAuthStackRoute([])).toBe(false);
    expect(isAuthStackRoute(["auth"])).toBe(true);
  });

  it("keeps nullish and auth-stack routes out of protected-route classification", () => {
    expect(isProtectedAppRoute(undefined, undefined)).toBe(false);
    expect(isProtectedAppRoute(null, undefined)).toBe(false);
    expect(isProtectedAppRoute("/auth/login", ["auth"])).toBe(false);
    expect(isProtectedAppRoute("/", [])).toBe(false);
    expect(isProtectedAppRoute("/(tabs)/profile", [])).toBe(true);
  });

  it("does not redirect before auth truth is loaded", () => {
    expect(
      resolveRouteFromAuth({
        sessionLoaded: false,
        sessionState: unknownState,
        inAuthStack: false,
        isPdfViewerRoute: false,
        hasRecentAuthExit: false,
      }),
    ).toEqual({
      type: "none",
      reason: "session_not_loaded",
    });
  });

  it("sends authenticated auth-stack sessions to the unified post-auth route", () => {
    expect(
      resolveRouteFromAuth({
        sessionLoaded: true,
        sessionState: authenticatedState,
        inAuthStack: true,
        isPdfViewerRoute: false,
        hasRecentAuthExit: false,
      }),
    ).toEqual({
      type: "redirect_post_auth_entry",
      target: POST_AUTH_ENTRY_ROUTE,
      reason: "bootstrap_authenticated",
    });
  });

  it("waits during the recent auth-exit settle window instead of redirecting immediately", () => {
    expect(
      resolveRouteFromAuth({
        sessionLoaded: true,
        sessionState: unauthenticatedState,
        inAuthStack: false,
        isPdfViewerRoute: false,
        hasRecentAuthExit: true,
      }),
    ).toEqual({
      type: "wait_for_post_auth_settle",
      reason: "recent_auth_stack_exit",
    });
  });

  it("keeps unknown and pdf-viewer unauthenticated states non-redirecting", () => {
    expect(
      resolveRouteFromAuth({
        sessionLoaded: true,
        sessionState: unknownState,
        inAuthStack: false,
        isPdfViewerRoute: false,
        hasRecentAuthExit: false,
      }),
    ).toEqual({
      type: "none",
      reason: "session_unknown_on_route",
    });

    expect(
      resolveRouteFromAuth({
        sessionLoaded: true,
        sessionState: unauthenticatedState,
        inAuthStack: false,
        isPdfViewerRoute: true,
        hasRecentAuthExit: false,
      }),
    ).toEqual({
      type: "none",
      reason: "session_absent_on_pdf_viewer",
    });
  });
});
