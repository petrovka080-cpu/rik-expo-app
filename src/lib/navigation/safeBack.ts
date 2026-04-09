import { Platform } from "react-native";
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
  options?: SafeBackOptions,
) {
  const platform = options?.platform ?? Platform.OS;

  if (platform === "web") {
    if (typeof options?.webHistoryLength === "number") {
      return options.webHistoryLength > 1;
    }
    return typeof window !== "undefined" && window.history.length > 1;
  }

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
