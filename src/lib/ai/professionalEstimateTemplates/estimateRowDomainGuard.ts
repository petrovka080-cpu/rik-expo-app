import { detectCrossDomainRowLeaks } from "./crossDomainRowLeakDetector";
import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateRecipeRow,
  ProfessionalGroupKey,
} from "./professionalEstimateTypes";

export function assertNoCrossDomainRows(input: {
  selected_work_key: string;
  expected_domain: ProfessionalGroupKey;
  rows: readonly (ProfessionalEstimateRecipeRow | ProfessionalEstimateLine)[];
}): void {
  const leaks = detectCrossDomainRowLeaks(input);
  if (leaks.length === 0) return;

  const carpetMasonryLeak = input.selected_work_key === "carpet_laying" &&
    leaks.some((leak) => leak.expected_domain === "flooring" && /brick|masonry|кирпич|клад/i.test(leak.leaked_row));
  const blocker = carpetMasonryLeak
    ? "BLOCKED_CROSS_DOMAIN_ROW_LEAK_CARPET_USES_MASONRY_ROWS"
    : "BLOCKED_CROSS_DOMAIN_ROW_LEAK";

  throw new Error(`${blocker}:${JSON.stringify(leaks.slice(0, 5))}`);
}
