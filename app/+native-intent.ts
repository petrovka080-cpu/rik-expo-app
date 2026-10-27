import {
  normalizeIntentRoutePath,
  resolvePublicRequestDeepLinkTarget,
  splitIntentPathAndQuery,
} from "../src/lib/navigation/coreRoutes";
import {
  RequestEstimateLaunchPayloadError,
  resolveRequestEstimateLaunchTargetV1,
} from "../src/lib/navigation/requestEstimateLaunchPayload";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const requestEstimateTarget = resolveRequestEstimateLaunchTargetV1(path);
    if (requestEstimateTarget) return requestEstimateTarget.href;
  } catch (error) {
    if (error instanceof RequestEstimateLaunchPayloadError) {
      if (error.code === "REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED") {
        const publicRequestTarget = resolvePublicRequestDeepLinkTarget(path);
        if (publicRequestTarget) return publicRequestTarget.href;
      }
      const { routePath } = splitIntentPathAndQuery(path);
      const normalizedPath = normalizeIntentRoutePath(routePath);
      const target = normalizedPath === "/ai" ? "/(tabs)/ai" : "/(tabs)/request";
      return `${target}?launchError=${encodeURIComponent(error.code)}`;
    }
    throw error;
  }

  const publicRequestTarget = resolvePublicRequestDeepLinkTarget(path);
  if (publicRequestTarget) return publicRequestTarget.href;

  const { routePath, query } = splitIntentPathAndQuery(path);
  const normalizedPath = normalizeIntentRoutePath(routePath);

  if (normalizedPath === "/ai") {
    return `/(tabs)/ai${query}`;
  }

  return path;
}
