export type ProfessionalEstimateRouteCapability = {
  workKey: string;
  compiler: "professional_expanded";
};

const PROFESSIONAL_ESTIMATE_ROUTE_CAPABILITIES: readonly ProfessionalEstimateRouteCapability[] = [
  {
    workKey: "paving_stone_laying",
    compiler: "professional_expanded",
  },
];

const PROFESSIONAL_ESTIMATE_ROUTE_CAPABILITY_BY_WORK_KEY = new Map(
  PROFESSIONAL_ESTIMATE_ROUTE_CAPABILITIES.map((capability) => [
    capability.workKey,
    capability,
  ]),
);

export function listProfessionalEstimateRouteCapabilities(): readonly ProfessionalEstimateRouteCapability[] {
  return PROFESSIONAL_ESTIMATE_ROUTE_CAPABILITIES;
}

export function isRouteFastPathProfessionalExpandedWorkSupported(workKey: string): boolean {
  return PROFESSIONAL_ESTIMATE_ROUTE_CAPABILITY_BY_WORK_KEY.get(workKey)?.compiler === "professional_expanded";
}
