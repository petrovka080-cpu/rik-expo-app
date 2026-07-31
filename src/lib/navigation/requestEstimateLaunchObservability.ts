import { Platform } from "react-native";

import { recordPlatformObservability } from "../observability/platformObservability";
import { logger } from "../logger";
import type {
  RequestEstimateLaunchPayloadV1,
  RequestEstimateLaunchRouteV1,
} from "./requestEstimateLaunchPayload";

export type RequestEstimateLaunchStage =
  | "INTENT_RECEIVED"
  | "URL_PARSED"
  | "AUTH_PENDING"
  | "AUTH_RESOLVED"
  | "INTENT_APPLIED"
  | "DRAFT_SESSION_READY"
  | "UI_READY"
  | "INTENT_ACKNOWLEDGED";

export function recordRequestEstimateLaunchStage(input: {
  stage: RequestEstimateLaunchStage;
  payload?: Pick<
    RequestEstimateLaunchPayloadV1,
    "launchId" | "route" | "fingerprint"
  > | null;
  route?: RequestEstimateLaunchRouteV1 | null;
  source?: string | null;
  result?: "success" | "error" | "skipped";
  detail?: Record<string, string | number | boolean | null | undefined>;
}): void {
  const route = input.payload?.route ?? input.route ?? null;
  const safeDetail = {
    stage: input.stage,
    launchId: input.payload?.launchId ?? null,
    route,
    fingerprint: input.payload?.fingerprint ?? null,
    source: input.source ?? null,
    ...(input.detail ?? {}),
  };
  recordPlatformObservability({
    screen: route === "/ai" ? "ai" : "request",
    surface: "startup_bootstrap",
    category: "ui",
    event: `request_estimate_launch_${input.stage.toLowerCase()}`,
    result: input.result ?? "success",
    extra: safeDetail,
  });
  if (Platform.OS === "android") {
    logger.info(
      "RikWarmDeepLink",
      `${input.stage} ${JSON.stringify(safeDetail)}`,
    );
  }
}
