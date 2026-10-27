export type AiEstimateLimitedPublicBetaCohort =
  | "beta_residential_small"
  | "beta_commercial_fitout"
  | "beta_engineering_mep"
  | "beta_landscaping_infrastructure"
  | "beta_industrial_non_regulated";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_COHORTS: readonly AiEstimateLimitedPublicBetaCohort[] =
  Object.freeze([
    "beta_residential_small",
    "beta_commercial_fitout",
    "beta_engineering_mep",
    "beta_landscaping_infrastructure",
    "beta_industrial_non_regulated",
  ]);

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_REGULATED_EXCLUSIONS: readonly string[] =
  Object.freeze([
    "gas systems",
    "high voltage",
    "passenger elevators",
    "freight elevators",
    "industrial cranes",
    "boilers",
    "structural demolition",
    "hazardous materials",
    "hydropower commissioning",
  ]);

const RESIDENTIAL_DOMAINS = /residential|apartment|house|bathroom|kitchen|roof|window|tiling|flooring|drywall/;
const COMMERCIAL_DOMAINS = /office|retail|cafe|restaurant|warehouse_fit|clinic|fit_out|partition|canop|pedestal/;
const ENGINEERING_DOMAINS = /electrical|plumbing|water|sewer|heating|ventilation|air_conditioning|cabling|alarm|cctv|bms/;
const LANDSCAPE_INFRA_DOMAINS = /road|paving|curb|stormwater|drainage|culvert|retaining|bridge|street|telecom|site|parking|landscape|lawn|irrigation|fencing|playground|sports/;
const INDUSTRIAL_DOMAINS = /industrial|steel|sandwich|equipment|production|conveyor|compressor|pump|automation/;
const REGULATED_DOMAIN_PATTERN = /(gas|high_voltage|elevator|crane|boiler|demolition|hazardous|hydropower)/;

export function resolveLimitedPublicBetaCohort(domain: string): {
  cohort: AiEstimateLimitedPublicBetaCohort | null;
  excludedByDefault: boolean;
  regulatedSafeClassification: "REGULATED_SAFE_PROFESSIONAL_ESTIMATE" | null;
} {
  const normalized = domain.toLowerCase();
  const excludedByDefault = REGULATED_DOMAIN_PATTERN.test(normalized);
  if (excludedByDefault) {
    return {
      cohort: null,
      excludedByDefault: true,
      regulatedSafeClassification: "REGULATED_SAFE_PROFESSIONAL_ESTIMATE",
    };
  }
  if (RESIDENTIAL_DOMAINS.test(normalized)) {
    return { cohort: "beta_residential_small", excludedByDefault: false, regulatedSafeClassification: null };
  }
  if (COMMERCIAL_DOMAINS.test(normalized)) {
    return { cohort: "beta_commercial_fitout", excludedByDefault: false, regulatedSafeClassification: null };
  }
  if (ENGINEERING_DOMAINS.test(normalized)) {
    return { cohort: "beta_engineering_mep", excludedByDefault: false, regulatedSafeClassification: null };
  }
  if (LANDSCAPE_INFRA_DOMAINS.test(normalized)) {
    return { cohort: "beta_landscaping_infrastructure", excludedByDefault: false, regulatedSafeClassification: null };
  }
  if (INDUSTRIAL_DOMAINS.test(normalized)) {
    return { cohort: "beta_industrial_non_regulated", excludedByDefault: false, regulatedSafeClassification: null };
  }
  return { cohort: "beta_residential_small", excludedByDefault: false, regulatedSafeClassification: null };
}
