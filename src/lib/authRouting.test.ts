import { POST_AUTH_ENTRY_ROUTE } from "./authRouting";
import {
  resolveRouteFromAuth,
  type AuthSessionState,
} from "./auth/useAuthLifecycle";

function resolveWith(params: {
  sessionState: AuthSessionState;
  inAuthStack?: boolean;
  isPdfViewerRoute?: boolean;
  hasRecentAuthExit?: boolean;
  sessionLoaded?: boolean;
}) {
  return resolveRouteFromAuth({
    sessionLoaded: params.sessionLoaded ?? true,
    sessionState: params.sessionState,
    inAuthStack: params.inAuthStack ?? false,
    isPdfViewerRoute: params.isPdfViewerRoute ?? false,
    hasRecentAuthExit: params.hasRecentAuthExit ?? false,
  });
}

describe("authRouting", () => {
  it("keeps profile as the unified post-auth entry route", () => {
    expect(POST_AUTH_ENTRY_ROUTE).toBe("/(tabs)/profile");
  });

  it("redirects authenticated auth-stack sessions to the post-auth entry route", () => {
    expect(
      resolveWith({
        sessionState: {
          status: "authenticated",
          reason: "bootstrap_authenticated",
        },
        inAuthStack: true,
      }),
    ).toEqual({
      type: "redirect_post_auth_entry",
      target: POST_AUTH_ENTRY_ROUTE,
      reason: "bootstrap_authenticated",
    });
  });

  it("keeps unknown session states non-redirecting until auth truth settles", () => {
    expect(
      resolveWith({
        sessionState: {
          status: "unknown",
          reason: "bootstrap_protected_route_unknown",
        },
      }),
    ).toEqual({
      type: "none",
      reason: "session_unknown_on_route",
    });
  });

  it("waits for the post-auth settle window before redirecting a recent auth exit", () => {
    expect(
      resolveWith({
        sessionState: {
          status: "unauthenticated",
          reason: "terminal_sign_out",
        },
        hasRecentAuthExit: true,
      }),
    ).toEqual({
      type: "wait_for_post_auth_settle",
      reason: "recent_auth_stack_exit",
    });
  });

  it("redirects confirmed unauthenticated protected routes to login", () => {
    expect(
      resolveWith({
        sessionState: {
          status: "unauthenticated",
          reason: "bootstrap_no_session",
        },
      }),
    ).toEqual({
      type: "redirect_login",
      target: "/auth/login",
      reason: "bootstrap_no_session",
    });
  });

  it("does not redirect confirmed unauthenticated pdf viewer routes", () => {
    expect(
      resolveWith({
        sessionState: {
          status: "unauthenticated",
          reason: "terminal_sign_out",
        },
        isPdfViewerRoute: true,
      }),
    ).toEqual({
      type: "none",
      reason: "session_absent_on_pdf_viewer",
    });
  });
});
