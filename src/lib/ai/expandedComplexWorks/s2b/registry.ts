import type { ExpandedComplexWorkFamilyDefinition } from "../index";
import type { S2BWave2Kind } from "./types";

export function isS2BBackendOwnedFamily(family: ExpandedComplexWorkFamilyDefinition): boolean {
  return (
    family.categoryGroup === "water_supply" ||
    family.categoryGroup === "sewer_wastewater" ||
    family.categoryGroup === "hydraulic" ||
    family.categoryGroup === "utility_connections"
  );
}

export function s2bWave2KindForFamily(family: ExpandedComplexWorkFamilyDefinition): S2BWave2Kind | null {
  const id = family.work_family_id;
  if (family.categoryGroup === "transport") return id === "road_lighting" ? "lighting" : "road";
  if (family.categoryGroup === "bridges_tunnels") {
    if (/tunnel/.test(id)) return "tunnel";
    if (/retaining|gabion/.test(id)) return "retaining_wall";
    return "bridge";
  }
  // Water, sewerage, drainage, hydraulic-water facilities and their external
  // connections are backend-owned after BATCH-006. Returning a client S2B
  // kind here would make the retired embedded compiler reachable again.
  if (isS2BBackendOwnedFamily(family)) return null;
  if (family.categoryGroup === "electrical_infrastructure") {
    if (/substation|switchgear|transformer/.test(id)) return "substation";
    if (/lighting/.test(id)) return "lighting";
    return "electrical";
  }
  if (family.categoryGroup === "gas_heat_pipelines") {
    if (/technological|process|industrial/.test(id)) return "pipeline";
    return "pipeline";
  }
  if (family.categoryGroup === "energy") {
    if (/boiler/.test(id)) return "boiler";
    if (/solar|wind|battery/.test(id)) return "solar";
    if (/substation|transformer/.test(id)) return "substation";
    return "substation";
  }
  if (family.categoryGroup === "mep_building") {
    if (/ventilation|smoke|HVAC|cooling/i.test(id)) return "heating_ventilation";
    return "electrical";
  }
  return null;
}

export function isS2BWave2Family(family: ExpandedComplexWorkFamilyDefinition): boolean {
  return s2bWave2KindForFamily(family) !== null;
}

export function isS2BRegulatedKind(kind: S2BWave2Kind): boolean {
  return ["bridge", "tunnel", "substation", "pipeline", "boiler", "well", "hydraulic"].includes(kind);
}
