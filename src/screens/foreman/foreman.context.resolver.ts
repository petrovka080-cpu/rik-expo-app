import { CLASS_TEMPLATES, ContextResolutionResult, ObjectClass } from "./foreman.context";

const EXACT_TYPE_CLASS_MAP: Record<string, ObjectClass> = {
  "BLD-ADMIN": "multilevel_building",
  "BLD-OFFICE": "multilevel_building",
  "BLD-RES-TOWER": "multilevel_building",
  "BLD-SOC-SCHOOL": "multilevel_building",
  "BLD-MED-HOSP": "multilevel_building",
  "BLD-SOC-HOSP": "multilevel_building",
  "BLD-EDU-UNI": "multilevel_building",
  "BLD-SOC-KINDER": "service_building",
  "BLD-MED-CLINIC": "service_building",
  "BLD-COMM-RETAIL": "service_building",
  "BLD-COMM-HORECA": "service_building",
  "BLD-HORECA-HOTEL": "service_building",
  "BLD-HORECA-FOOD": "service_building",
  "BLD-SPORT": "service_building",
  "BLD-SOC-SPORT": "service_building",
  "BLD-SPORT-ARENA": "service_building",
  "BLD-RES-DORM": "campus_block",
  "BLD-RES-BLOCK": "campus_block",
  "BLD-RES-LOW": "campus_block",
  "BLD-PARKING-OPEN": "open_site",
  "BLD-PARKING-ML": "service_building",
  "BLD-PARKING": "service_building",
  "BLD-IND-HANGAR": "industrial_hall",
  "BLD-IND-WORKSHOP": "industrial_hall",
  "BLD-IND-PLANT": "industrial_hall",
  "BLD-IND-WAREHOUSE": "warehouse_complex",
  "BLD-IND-COLD": "warehouse_complex",
  "BLD-INFRA-TERMINAL": "transport_terminal",
  "BLD-INFRA-PEDESTR": "linear_infrastructure",
  "BLD-INFRA-OVERPASS": "linear_infrastructure",
  "BLD-INFRA": "linear_infrastructure",
  "BLD-ENG-KNS": "technical_facility",
  "BLD-ENG-BOILER": "technical_facility",
  "BLD-ENG-TP": "technical_facility",
  "BLD-AGRO-GREEN": "technical_facility",
  "BLD-AGRO": "technical_facility",
  "BLD-INFRA-DEPOT": "technical_facility",
  "BLD-IND-CHEM": "technical_facility",
  "BLD-SITE-TEMP": "technical_facility",
};

function fromTypePrefix(objectType: string): ObjectClass | null {
  if (!objectType) return null;
  if (objectType in EXACT_TYPE_CLASS_MAP) return EXACT_TYPE_CLASS_MAP[objectType];

  if (objectType.startsWith("BLD-IND-")) return "industrial_hall";
  if (objectType.startsWith("BLD-ENG-")) return "technical_facility";
  if (objectType.startsWith("BLD-PARKING-")) return "service_building";
  if (objectType.startsWith("BLD-INFRA-")) return "linear_infrastructure";
  if (objectType.startsWith("BLD-RES-")) return "multilevel_building";
  if (objectType.startsWith("BLD-")) return "service_building";

  return null;
}

function fromLegacyNameFallback(objectName: string): ObjectClass | null {
  const name = (objectName || "").toLowerCase();
  if (!name) return null;

  if (name.includes("ангар") || name.includes("цех") || name.includes("завод")) return "industrial_hall";
  if (name.includes("склад") || name.includes("логист")) return "warehouse_complex";
  if (name.includes("паркинг открытый")) return "open_site";
  if (name.includes("общеж") || name.includes("вахтов")) return "campus_block";
  if (name.includes("кнс") || name.includes("итп") || name.includes("ктп") || name.includes("котель")) return "technical_facility";
  if (name.includes("терминал") || name.includes("вокзал")) return "transport_terminal";
  if (name.includes("эстакад") || name.includes("путепровод") || name.includes("переход")) return "linear_infrastructure";
  if (name.includes("админ") || name.includes("офис") || name.includes("башн") || name.includes("школ") || name.includes("корпус"))
    return "multilevel_building";

  return null;
}

export function resolveForemanContext(objectCode: string, objectName: string): ContextResolutionResult {
  const normalizedCode = String(objectCode || "").trim().toUpperCase();

  const classByType = fromTypePrefix(normalizedCode);
  if (classByType) {
    return {
      config: CLASS_TEMPLATES[classByType],
      resolvedBy: "object_type",
      confidence: "high",
    };
  }

  const classByName = fromLegacyNameFallback(objectName);
  if (classByName) {
    return {
      config: CLASS_TEMPLATES[classByName],
      resolvedBy: "name_fallback",
      confidence: "medium",
      warnings: ["legacy_name_fallback_used"],
    };
  }

  return {
    config: CLASS_TEMPLATES.generic_object,
    resolvedBy: "default",
    confidence: "low",
    warnings: ["unclassified_object_type"],
  };
}

