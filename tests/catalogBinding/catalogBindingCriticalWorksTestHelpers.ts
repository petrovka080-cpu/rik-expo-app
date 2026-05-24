import { bindWithFixtureCatalog, estimateFor, validateFixtureBinding } from "./catalogBindingTestHelpers";

export const CRITICAL_WORK_PROMPTS: Record<string, string> = {
  strip_foundation: "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м",
  brick_masonry: "дай смету на кладку кирпича 74 кв метров",
  gable_roof_installation: "дай смету на устройство двускатной крыши основание 100 кв метров",
  asphalt_paving: "дай смету на прокладку асфальта на 1000 кв метров",
  ceramic_tile_floor_laying: "смета на укладку кафельной плитки на пол 174 кв м",
  drywall_wall_cladding: "установка гкл на стены 352 кв м",
};

export async function expectCriticalWorkBinding(workKey: string): Promise<void> {
  const estimate = estimateFor(CRITICAL_WORK_PROMPTS[workKey]);
  expect(estimate.work.workKey).toBe(workKey);
  const binding = await bindWithFixtureCatalog(estimate);
  const validation = validateFixtureBinding(estimate, binding);
  expect(validation.ok).toBe(true);
  expect(validation.materialRowsTotal).toBeGreaterThan(0);
  expect(validation.materialRowsWithRateKeys).toBe(validation.materialRowsTotal);
  expect(binding.rows.some((row) => row.catalogCandidates.length > 0)).toBe(true);
}
