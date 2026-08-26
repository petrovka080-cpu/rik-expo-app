export const ROUTE_TO_SCREEN_ACK_LIFECYCLE = [
  "INTENT_RECEIVED",
  "URL_PARSED",
  "AUTH_RESOLVED",
  "INTENT_APPLIED",
  "DRAFT_SESSION_READY",
  "UI_READY",
  "INTENT_ACKNOWLEDGED",
] as const;

export type RouteToScreenAckStage =
  (typeof ROUTE_TO_SCREEN_ACK_LIFECYCLE)[number];
export type ObservedRouteToScreenAckStage =
  | RouteToScreenAckStage
  | "AUTH_PENDING";

export type RouteToScreenLifecycleEvidence = {
  launchId: string;
  orderedStages: RouteToScreenAckStage[];
  observedStages: ObservedRouteToScreenAckStage[];
  authPendingObserved: boolean;
  exactOrder: boolean;
  exactlyOnce: boolean;
  acknowledged: boolean;
};

export type OfficialRouteToScreenAckCase = {
  caseId: string;
  route: "/request" | "/ai";
  context: "request" | "foreman";
  prompt: string;
  automaticParam: "autoPrepare" | "autoSend";
  requiredTestIds: readonly string[];
  representativeTokens: readonly string[];
  unitTokens: readonly string[];
};

export const OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES = [
  {
    caseId: "android_request_electrical_cable_outlets_switches",
    route: "/request",
    context: "request",
    prompt:
      "электрика под ключ 100 кв метров площадь длина трассы 500 метров 10 розеток 10 выключателей 10 точек освещения",
    automaticParam: "autoPrepare",
    requiredTestIds: [
      "request-estimate-current-launch-prompt",
      "request-estimate-summary-card",
      "request-estimate-items-editor",
      "consumer-estimate-make-pdf",
    ],
    representativeTokens: ["кабель", "розет"],
    unitTokens: ["шт", "м"],
  },
  {
    caseId: "android_request_roof_waterproofing",
    route: "/request",
    context: "request",
    prompt: "гидроизоляция крыши 100 кв м",
    automaticParam: "autoPrepare",
    requiredTestIds: [
      "request-estimate-current-launch-prompt",
      "request-estimate-summary-card",
      "request-estimate-items-editor",
      "consumer-estimate-make-pdf",
    ],
    representativeTokens: ["кров", "гидроизоля"],
    unitTokens: ["м", "м2"],
  },
  {
    caseId: "android_foreman_paving_stone",
    route: "/ai",
    context: "foreman",
    prompt: "смета на укладку брусчатки на 587 кв м",
    automaticParam: "autoSend",
    requiredTestIds: [
      "ai-estimate-table",
      "ai-estimate-visible-lines",
      "ai-estimate-make-pdf",
    ],
    representativeTokens: ["брусчат"],
    unitTokens: ["м", "м2"],
  },
  {
    caseId: "android_foreman_house_electrical",
    route: "/ai",
    context: "foreman",
    prompt: "смета на электромонтаж дома 180 кв м",
    automaticParam: "autoSend",
    requiredTestIds: [
      "ai-estimate-table",
      "ai-estimate-visible-lines",
      "ai-estimate-make-pdf",
    ],
    representativeTokens: ["кабель", "щит"],
    unitTokens: ["шт", "м"],
  },
] as const satisfies readonly OfficialRouteToScreenAckCase[];

const LIFECYCLE_STAGE_RE =
  /\[RikWarmDeepLink\]\s+(INTENT_RECEIVED|URL_PARSED|AUTH_PENDING|AUTH_RESOLVED|INTENT_APPLIED|DRAFT_SESSION_READY|UI_READY|INTENT_ACKNOWLEDGED)\b/u;

export function collectRouteToScreenLifecycleEvidence(
  logcat: string,
  launchId: string,
): RouteToScreenLifecycleEvidence {
  const observedStages = logcat
    .split(/\r?\n/u)
    .filter(
      (line) =>
        line.includes("[RikWarmDeepLink]") && line.includes(launchId),
    )
    .map((line) => line.match(LIFECYCLE_STAGE_RE)?.[1] ?? "")
    .filter((stage): stage is ObservedRouteToScreenAckStage =>
      stage === "AUTH_PENDING" ||
      ROUTE_TO_SCREEN_ACK_LIFECYCLE.includes(stage as RouteToScreenAckStage),
    );
  const expected = [...ROUTE_TO_SCREEN_ACK_LIFECYCLE];
  const expectedWithColdAuthPending: ObservedRouteToScreenAckStage[] = [
    "INTENT_RECEIVED",
    "URL_PARSED",
    "AUTH_PENDING",
    ...ROUTE_TO_SCREEN_ACK_LIFECYCLE.slice(2),
  ];
  const orderedStages = observedStages.filter(
    (stage): stage is RouteToScreenAckStage => stage !== "AUTH_PENDING",
  );
  const exactlyOnce = expected.every(
    (stage) => orderedStages.filter((value) => value === stage).length === 1,
  );
  const matches = (sequence: readonly ObservedRouteToScreenAckStage[]) =>
    observedStages.length === sequence.length &&
    observedStages.every((stage, index) => stage === sequence[index]);
  const exactOrder = matches(expected) || matches(expectedWithColdAuthPending);
  return {
    launchId,
    orderedStages,
    observedStages,
    authPendingObserved: observedStages.includes("AUTH_PENDING"),
    exactOrder,
    exactlyOnce,
    acknowledged:
      orderedStages.at(-1) === "INTENT_ACKNOWLEDGED" &&
      exactOrder &&
      exactlyOnce,
  };
}

export function isWarmAndroidActivityDelivery(output: string): boolean {
  return /delivered to currently running|activity not started|thistime\s*:\s*0/iu.test(output);
}
