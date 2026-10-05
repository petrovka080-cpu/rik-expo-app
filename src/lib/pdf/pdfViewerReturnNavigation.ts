import { normalizePostAuthReturnTo } from "../authRouting";

type ViewerNavigationRoute = {
  key?: string;
  name: string;
  params?: Readonly<object>;
  state?: ViewerNavigationState;
};

export type ViewerNavigationState = {
  type?: string;
  index?: number;
  routes: readonly ViewerNavigationRoute[];
};

export type PdfViewerReturnPlan =
  | { kind: "preserve-caller" }
  | { kind: "restore-route"; href: string }
  | { kind: "ignore-stale" }
  | { kind: "safe-back" };

function staticPath(parts: readonly string[]): string | null {
  const segments = parts.flatMap((part) => part.split("/"))
    .filter((part) => part && part !== "index" && !/^\([^/]+\)$/u.test(part));
  // Dynamic routes need their exact href; do not guess missing path parameters.
  if (segments.some((part) => /[\[\]]/u.test(part))) return null;
  return `/${segments.join("/")}`;
}

function activeRouteIdentity(route: ViewerNavigationRoute) {
  const names = [route.name];
  let state = route.state;
  while (state) {
    if (!Number.isInteger(state.index)) return null;
    const child = state.routes[state.index!];
    if (!child) return null;
    names.push(child.name);
    route = child;
    state = child.state;
  }
  return { pathname: staticPath(names), route };
}

/** Keep the actual caller's route and all of its launch/local state intact. */
export function resolvePdfViewerReturnPlan(
  state: ViewerNavigationState | undefined,
  returnTo: string | null | undefined,
  callerRouteKey?: string | null,
  viewerRouteKey?: string,
): PdfViewerReturnPlan {
  // The container ref can include Expo's generated root navigator above the
  // layout Stack. Find the viewer along the active branch, not only at depth 0.
  let viewerStack = state;
  while (viewerStack && Number.isInteger(viewerStack.index)) {
    const active = viewerStack.routes[viewerStack.index!];
    if (!active) break;
    if (viewerRouteKey ? active.key === viewerRouteKey : active.name === "pdf-viewer") break;
    viewerStack = active.state;
  }
  const current = viewerStack && Number.isInteger(viewerStack.index)
    ? viewerStack.routes[viewerStack.index!] : undefined;
  if (state && viewerRouteKey && current?.key !== viewerRouteKey) return { kind: "ignore-stale" };
  const href = normalizePostAuthReturnTo(returnTo);
  if (!href) return { kind: "safe-back" };
  const targetPath = staticPath([href.split(/[?#]/u, 1)[0]!]);
  if (viewerStack?.type === "stack" && Number.isInteger(viewerStack.index) && viewerStack.index! > 0) {
    const caller = viewerStack.routes[viewerStack.index! - 1];
    const identity = caller && activeRouteIdentity(caller);
    const query = new URLSearchParams(href.split("?", 2)[1]?.split("#", 1)[0] ?? "");
    const exactCaller = Boolean(callerRouteKey && identity?.route.key === callerRouteKey);
    const workspaceMatches = identity && ["draftId", "canonicalRevisionId"].every((key) => {
      const target = query.get(key) || "";
      const actual = String(identity.route.params ? Reflect.get(identity.route.params, key) ?? "" : "");
      // A proven live caller can acquire/clear a draft without changing its
      // route params. Defined, conflicting identities still cannot be popped.
      return exactCaller ? !target || !actual || target === actual : target === actual;
    });
    if (current?.name === "pdf-viewer" && targetPath && identity?.pathname === targetPath &&
        workspaceMatches && (!callerRouteKey || exactCaller)) {
      // The viewer was pushed over this caller. Back preserves its params even
      // when a proven caller's recovery draftId omits its launchPayloadV1.
      return { kind: "preserve-caller" };
    }
  }
  // Expo Router dismissTo also replaces the viewer when the target is absent.
  return { kind: "restore-route", href };
}
