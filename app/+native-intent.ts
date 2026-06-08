import {
  normalizeIntentRoutePath,
  resolvePublicRequestDeepLinkTarget,
  splitIntentPathAndQuery,
} from "../src/lib/navigation/coreRoutes";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const publicRequestTarget = resolvePublicRequestDeepLinkTarget(path);
  if (publicRequestTarget) return publicRequestTarget.href;

  const { routePath, query } = splitIntentPathAndQuery(path);
  const normalizedPath = normalizeIntentRoutePath(routePath);

  if (normalizedPath === "/ai") {
    return `/(tabs)/ai${query}`;
  }

  return path;
}
