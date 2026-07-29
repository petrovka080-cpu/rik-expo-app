export const ELECTRICAL_DIMENSIONAL_CONTRACT_VERSION =
  "electrical-dimensional-contract:2026-07-29.v1" as const;

export type ElectricalDimensionTarget =
  | "AREA"
  | "ROUTE_LENGTH"
  | "CABLE_LENGTH"
  | "CONTAINMENT_LENGTH"
  | "POINT_COUNT"
  | "PANEL_COUNT"
  | "BREAKER_COUNT"
  | "GROUP_COUNT"
  | "SET_COUNT"
  | "TRIP_COUNT"
  | "SHIFT_COUNT";

const AREA_ONLY_TARGETS = new Set<ElectricalDimensionTarget>([
  "ROUTE_LENGTH",
  "CABLE_LENGTH",
  "CONTAINMENT_LENGTH",
  "POINT_COUNT",
  "PANEL_COUNT",
  "BREAKER_COUNT",
  "GROUP_COUNT",
  "SET_COUNT",
  "TRIP_COUNT",
  "SHIFT_COUNT",
]);

export function assertElectricalDimensionSources(input: {
  target: ElectricalDimensionTarget;
  sourceParameterIds: readonly string[];
}): void {
  if (
    AREA_ONLY_TARGETS.has(input.target) &&
    input.sourceParameterIds.length > 0 &&
    input.sourceParameterIds.every((parameterId) => parameterId === "area_m2")
  ) {
    throw new Error(
      `DIMENSION_SOURCE_INVALID:${input.target}:area_m2:${ELECTRICAL_DIMENSIONAL_CONTRACT_VERSION}`,
    );
  }
}

export function electricalCircuitCountFromConfirmedPoints(input: {
  outletCount: number;
  switchCount: number;
  lightingPointCount: number;
}): number {
  const outletCircuits = input.outletCount > 0
    ? Math.ceil(input.outletCount / 8)
    : 0;
  const lightingEndpoints = Math.max(
    input.switchCount,
    input.lightingPointCount,
  );
  const lightingCircuits = lightingEndpoints > 0
    ? Math.ceil(lightingEndpoints / 8)
    : 0;
  return outletCircuits + lightingCircuits;
}
