import { normalizeWorkOntologyText } from "../workOntology/constructionWorkOntologyCatalog";
import { parseNoHintWorkOntologyQuantityUnit } from "../workOntology/workOntologyCandidateRanker";
import type { WorkOntologyCountry, WorkOntologyUnit } from "../workOntology/constructionWorkOntologyTypes";
import type {
  ProfessionalEstimateCaseUnit,
  ProfessionalRegion,
} from "../professionalEstimateTemplates";
import type {
  SmartEstimatorAnalyzedInput,
  SmartEstimatorInput,
} from "./smartEstimatorTypes";

const CASE_UNITS: readonly ProfessionalEstimateCaseUnit[] = [
  "m2",
  "m3",
  "linear_m",
  "piece",
  "set",
  "kg",
  "ton",
];

function caseUnitFromWorkUnit(unit: WorkOntologyUnit | null): ProfessionalEstimateCaseUnit | null {
  if (unit && CASE_UNITS.includes(unit as ProfessionalEstimateCaseUnit)) {
    return unit as ProfessionalEstimateCaseUnit;
  }
  return null;
}

function regionFromText(userInput: string): ProfessionalRegion | null {
  const normalized = normalizeWorkOntologyText(userInput);
  if (/(?:^|\s)(?:бишкек|bishkek)(?:\s|$)/u.test(normalized)) return "KG_BISHKEK";
  if (/(?:^|\s)(?:ош|osh)(?:\s|$)/u.test(normalized)) return "KG_OSH";
  if (/(?:^|\s)(?:алматы|almaty)(?:\s|$)/u.test(normalized)) return "KZ_ALMATY";
  if (/(?:^|\s)(?:астана|astana)(?:\s|$)/u.test(normalized)) return "KZ_ASTANA";
  if (/(?:^|\s)(?:россия|москва|russia|moscow)(?:\s|$)/u.test(normalized)) return "RU_DEFAULT";
  if (/(?:^|\s)(?:ташкент|tashkent)(?:\s|$)/u.test(normalized)) return "UZ_TASHKENT";
  return null;
}

function countryFromRegion(region: ProfessionalRegion | null, fallback: WorkOntologyCountry | null): WorkOntologyCountry | null {
  if (!region) return fallback;
  if (region.startsWith("KZ_")) return "KZ";
  if (region === "RU_DEFAULT") return "RU";
  if (region === "UZ_TASHKENT") return "UZ";
  return "KG";
}

export function analyzeSmartEstimatorInput(input: SmartEstimatorInput): SmartEstimatorAnalyzedInput {
  const normalized = normalizeWorkOntologyText(input.user_input);
  const textRegion = regionFromText(input.user_input);
  const region = input.region ?? textRegion;
  const parsed = parseNoHintWorkOntologyQuantityUnit(input.user_input);
  const parsedUnit = caseUnitFromWorkUnit(parsed.unit);
  const knownQuantity = typeof input.known_quantity === "number" && Number.isFinite(input.known_quantity)
    ? input.known_quantity
    : null;
  const quantity = knownQuantity ?? parsed.quantity;
  const unit = input.known_unit ?? parsedUnit;

  return {
    user_input: input.user_input,
    normalized_input: normalized,
    region,
    region_source: input.region ? "provided" : textRegion ? "text" : "missing",
    country: countryFromRegion(region, input.country ?? null),
    quantity: quantity === null || quantity <= 0 ? null : quantity,
    unit,
    quantity_source: knownQuantity !== null ? "provided" : parsed.quantity !== null ? "text" : "missing",
    selected_work_key: input.selected_work_key ?? null,
    fake_green_claimed: false,
  };
}
