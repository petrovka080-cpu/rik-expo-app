import type { Href } from "expo-router";

export type SafeBackRouterLike = {
  back: () => void;
  replace: (href: Href) => void;
  canGoBack?: () => boolean;
};

type SafeBackOptions = {
  platform?: string;
  webHistoryLength?: number;
};

export function hasSafeBackHistory(
  router: Pick<SafeBackRouterLike, "canGoBack">,
  _options?: SafeBackOptions,
) {
  // Browser history also contains reloads and pages outside this navigator.
  // router.back dispatches GO_BACK, so only the router can admit that action.
  return typeof router.canGoBack === "function" && Boolean(router.canGoBack());
}

export function safeBack(
  router: SafeBackRouterLike,
  fallbackRoute: Href,
  options?: SafeBackOptions,
) {
  if (hasSafeBackHistory(router, options)) {
    router.back();
    return "back";
  }

  router.replace(fallbackRoute);
  return "fallback";
}
