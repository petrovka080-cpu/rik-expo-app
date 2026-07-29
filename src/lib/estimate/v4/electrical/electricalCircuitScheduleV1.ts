import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type {
  CanonicalParameterSession,
} from "../../canonicalParameters/canonicalParameterCore";
import {
  assertElectricalDimensionSources,
  electricalCircuitCountFromConfirmedPoints,
} from "./electricalDimensionalContractV1";

export const ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID =
  "electrical-circuit-schedule:2026-07-29.v1" as const;
export const ELECTRICAL_CIRCUIT_SCHEDULE_VERSION = "1.0.0" as const;

export type ElectricalCircuitScheduleStatus =
  | "BLOCKING_REQUIRED"
  | "ASSUMPTION_REQUIRES_CONFIRMATION"
  | "CONFIRMED";

export type ElectricalCircuitScheduleSource =
  | "USER_PROVIDED"
  | "PROJECT_IMPORTED"
  | "VISIBLE_ASSUMPTION"
  | "BLOCKING_REQUIRED";

export type ElectricalCircuitScheduleLineV1 = {
  circuitId: string;
  purpose: "OUTLETS" | "LIGHTING";
  zoneOrRoom: string;
  phase: 1 | 2 | 3;
  estimatedLoadKw: number;
  routeLengthM: number;
  cableType: string;
  cableSectionMm2: number;
  coreCount: number;
  wiringMethod: string;
  containmentType: string;
  protectionDevice: string;
  ratedCurrentA: number;
  rcdRequired: boolean;
  rcdCurrentMa: number;
  endpointsCount: number;
  groundingRequired: boolean;
  status: Exclude<ElectricalCircuitScheduleStatus, "BLOCKING_REQUIRED">;
  source: ElectricalCircuitScheduleSource;
};

export type ElectricalCircuitScheduleV1 = {
  schemaId: typeof ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID;
  schemaVersion: typeof ELECTRICAL_CIRCUIT_SCHEDULE_VERSION;
  scheduleId: string;
  status: ElectricalCircuitScheduleStatus;
  source: ElectricalCircuitScheduleSource;
  missingParameterIds: readonly string[];
  assumptions: readonly string[];
  lines: readonly ElectricalCircuitScheduleLineV1[];
  fingerprint: string;
};

function numeric(
  session: CanonicalParameterSession,
  parameterId: string,
): number | null {
  const value = session.parameters.find(
    (parameter) => parameter.parameterId === parameterId,
  )?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(
  session: CanonicalParameterSession,
  parameterId: string,
  fallback: string,
): string {
  const value = session.parameters.find(
    (parameter) => parameter.parameterId === parameterId,
  )?.value;
  return typeof value === "string" && value.trim() ? value : fallback;
}

function splitQuantity(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor((total / parts) * 1000) / 1000;
  const result = Array.from({ length: parts }, () => base);
  result[result.length - 1] = Math.round(
    (total - base * (parts - 1)) * 1000,
  ) / 1000;
  return result;
}

function splitInteger(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from(
    { length: parts },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

function buildPurposeLines(input: {
  purpose: ElectricalCircuitScheduleLineV1["purpose"];
  circuitCount: number;
  endpointsCount: number;
  routeLengthM: number;
  phase: 1 | 2 | 3;
  wiringMethod: string;
  containmentType: string;
  estimatedLoadKw: number | null;
}): ElectricalCircuitScheduleLineV1[] {
  const endpointParts = splitInteger(input.endpointsCount, input.circuitCount);
  const routeParts = splitQuantity(input.routeLengthM, input.circuitCount);
  const loadTotal = input.estimatedLoadKw ??
    (input.purpose === "OUTLETS" ? input.circuitCount * 2.5 : input.circuitCount * 0.8);
  const loadParts = splitQuantity(loadTotal, input.circuitCount);
  return Array.from({ length: input.circuitCount }, (_, index) => ({
    circuitId: `${input.purpose.toLocaleLowerCase("en-US")}-${index + 1}`,
    purpose: input.purpose,
    zoneOrRoom: "Требуется разбивка по помещениям",
    phase: input.phase,
    estimatedLoadKw: loadParts[index],
    routeLengthM: routeParts[index],
    cableType: input.purpose === "OUTLETS" ? "ВВГнг-LS 3x2.5" : "ВВГнг-LS 3x1.5",
    cableSectionMm2: input.purpose === "OUTLETS" ? 2.5 : 1.5,
    coreCount: 3,
    wiringMethod: input.wiringMethod,
    containmentType: input.containmentType,
    protectionDevice: input.purpose === "OUTLETS" ? "Дифавтомат C16" : "Дифавтомат C10",
    ratedCurrentA: input.purpose === "OUTLETS" ? 16 : 10,
    rcdRequired: true,
    rcdCurrentMa: 30,
    endpointsCount: endpointParts[index],
    groundingRequired: true,
    status: "ASSUMPTION_REQUIRES_CONFIRMATION",
    source: "VISIBLE_ASSUMPTION",
  }));
}

export function buildElectricalCircuitScheduleV1(
  session: CanonicalParameterSession,
): ElectricalCircuitScheduleV1 {
  const missingParameterIds = [...session.blockingMissingParameterIds];
  if (session.status === "BLOCKING_REQUIRED" || session.status === "INVALID") {
    const fingerprint = estimateDeterministicHash({
      schemaId: ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID,
      status: "BLOCKING_REQUIRED",
      missingParameterIds,
      lines: [],
    });
    return Object.freeze({
      schemaId: ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID,
      schemaVersion: ELECTRICAL_CIRCUIT_SCHEDULE_VERSION,
      scheduleId: `electrical-circuit-schedule:${fingerprint}`,
      status: "BLOCKING_REQUIRED",
      source: "BLOCKING_REQUIRED",
      missingParameterIds: Object.freeze(missingParameterIds),
      assumptions: Object.freeze([]),
      lines: Object.freeze([]),
      fingerprint,
    });
  }

  const routeLengthM = numeric(session, "route_length_m")!;
  const outletCount = numeric(session, "outlet_count")!;
  const switchCount = numeric(session, "switch_count")!;
  const lightingPointCount = numeric(session, "lighting_point_count")!;
  assertElectricalDimensionSources({
    target: "ROUTE_LENGTH",
    sourceParameterIds: ["route_length_m"],
  });
  assertElectricalDimensionSources({
    target: "GROUP_COUNT",
    sourceParameterIds: [
      "outlet_count",
      "switch_count",
      "lighting_point_count",
    ],
  });
  const totalEndpoints = outletCount + switchCount + lightingPointCount;
  const outletCircuits = outletCount > 0 ? Math.ceil(outletCount / 8) : 0;
  const lightingEndpoints = switchCount + lightingPointCount;
  const totalCircuitCount = electricalCircuitCountFromConfirmedPoints({
    outletCount,
    switchCount,
    lightingPointCount,
  });
  const lightingCircuits = totalCircuitCount - outletCircuits;
  const outletRoute = totalEndpoints > 0
    ? Math.round(routeLengthM * (outletCount / totalEndpoints) * 1000) / 1000
    : 0;
  const lightingRoute = Math.round((routeLengthM - outletRoute) * 1000) / 1000;
  const phaseValue = numeric(session, "phase_count");
  const phase = phaseValue === 3 ? 3 : 1;
  const wiringMethod = stringValue(
    session,
    "wiring_method",
    "Требуется подтверждение способа прокладки",
  );
  const containmentType = stringValue(
    session,
    "containment_type",
    "Требуется подтверждение кабеленесущей системы",
  );
  const estimatedLoadKw = numeric(session, "estimated_load_kw");
  const lines = [
    ...buildPurposeLines({
      purpose: "OUTLETS",
      circuitCount: outletCircuits,
      endpointsCount: outletCount,
      routeLengthM: outletRoute,
      phase,
      wiringMethod,
      containmentType,
      estimatedLoadKw: estimatedLoadKw == null || totalEndpoints === 0
        ? null
        : estimatedLoadKw * (outletCount / totalEndpoints),
    }),
    ...buildPurposeLines({
      purpose: "LIGHTING",
      circuitCount: lightingCircuits,
      endpointsCount: lightingEndpoints,
      routeLengthM: lightingRoute,
      phase,
      wiringMethod,
      containmentType,
      estimatedLoadKw: estimatedLoadKw == null || totalEndpoints === 0
        ? null
        : estimatedLoadKw * (lightingEndpoints / totalEndpoints),
    }),
  ];
  const assumptions = [
    "Трасса распределена между розеточными и осветительными цепями пропорционально явно указанным точкам.",
    "Назначение помещений, кабели, аппараты защиты и нагрузки линий являются видимыми допущениями до проектного подтверждения.",
  ];
  const fingerprint = estimateDeterministicHash({
    schemaId: ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID,
    schemaVersion: ELECTRICAL_CIRCUIT_SCHEDULE_VERSION,
    lines,
    assumptions,
  });
  return Object.freeze({
    schemaId: ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID,
    schemaVersion: ELECTRICAL_CIRCUIT_SCHEDULE_VERSION,
    scheduleId: `electrical-circuit-schedule:${fingerprint}`,
    status: "ASSUMPTION_REQUIRES_CONFIRMATION",
    source: "VISIBLE_ASSUMPTION",
    missingParameterIds: Object.freeze([]),
    assumptions: Object.freeze(assumptions),
    lines: Object.freeze(lines.map((line) => Object.freeze(line))),
    fingerprint,
  });
}
