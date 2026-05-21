import type { UniversalRoleQaOpenLink } from "../universalRoleQa";

export type AiLiveDeepLinkClickResult = {
  sourceRefId: string;
  labelRu: string;
  routeBefore: string;
  routeAfter: string;
  clicked: boolean;
  routeChanged: boolean;
  objectOpened: boolean;
  failureReason?: "missing_route" | "disabled_link" | "route_not_changed";
};

export function validateAiLiveDeepLinkClick(input: {
  link: UniversalRoleQaOpenLink;
  currentRoute: string;
}): AiLiveDeepLinkClickResult {
  if (!input.link.enabled) {
    return {
      sourceRefId: input.link.sourceRefId,
      labelRu: input.link.labelRu,
      routeBefore: input.currentRoute,
      routeAfter: input.currentRoute,
      clicked: false,
      routeChanged: false,
      objectOpened: false,
      failureReason: "disabled_link",
    };
  }
  if (!input.link.route) {
    return {
      sourceRefId: input.link.sourceRefId,
      labelRu: input.link.labelRu,
      routeBefore: input.currentRoute,
      routeAfter: input.currentRoute,
      clicked: false,
      routeChanged: false,
      objectOpened: false,
      failureReason: "missing_route",
    };
  }
  const routeAfter = input.link.route;
  const routeChanged = routeAfter !== input.currentRoute;
  return {
    sourceRefId: input.link.sourceRefId,
    labelRu: input.link.labelRu,
    routeBefore: input.currentRoute,
    routeAfter,
    clicked: true,
    routeChanged,
    objectOpened: routeChanged,
    failureReason: routeChanged ? undefined : "route_not_changed",
  };
}
