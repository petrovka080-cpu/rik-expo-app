import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel/resolveEstimatorOutcome";
import type { DynamicProfessionalBoqRow } from "../../src/lib/ai/estimatorKernel/estimatorKernelTypes";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";

type ResolvedEstimatorOutcome = ReturnType<typeof resolveEstimatorOutcome>;
type ResolvedEstimatorPlan = NonNullable<ResolvedEstimatorOutcome["plan"]>;

export const CONCRETE_PEDESTAL_PROMPT = "смета на заливку бетонных тумб 12 шт";
export const CONCRETE_SLAB_PROMPT = "бетонная плита 120 м2 толщина 200 мм";
export const CONCRETE_SCREED_PROMPT = "бетонная стяжка пола 80 м2 толщина 70 мм";

export const CONCRETE_PEDESTAL_VARIANTS = [
  "смета на бетонные тумбы под оборудование 8 шт",
  "бетонные постаменты под станки 4 шт",
  "бетонные пьедесталы под колонны 16 шт",
  "бетонные опоры под навес 20 шт",
  "заливка отдельных бетонных оснований под стойки 10 шт",
  "устройство фундаментных стаканов 6 шт",
] as const;

export const REQUIRED_PEDESTAL_ROW_TOKENS = [
  "разметка осей и мест установки тумб",
  "выемка грунта под отдельные тумбы",
  "уплотнение основания",
  "песчано-щебеночная подушка",
  "геотекстиль",
  "опалубка тумб",
  "арматурный каркас",
  "вязальная проволока",
  "закладные детали",
  "анкерные болты",
  "бетон",
  "подача / укладка бетона",
  "вибрирование бетона",
  "выравнивание верха тумб",
  "уход за бетоном",
  "распалубка",
  "обратная засыпка / зачистка",
  "доставка материалов",
  "контроль геометрии и отметок",
  "резерв",
] as const;

export const FORBIDDEN_PEDESTAL_ROW_TOKENS = [
  "бетонная плита",
  "устройство плиты",
  "армирование плиты",
  "заливка плиты",
  "стяжка пола",
  "пол по грунту",
] as const;

export function pedestalOutcome(prompt = CONCRETE_PEDESTAL_PROMPT): ResolvedEstimatorOutcome & { plan: ResolvedEstimatorPlan } {
  const outcome = resolveEstimatorOutcome({ text: prompt, currency: "KGS" });
  if (!outcome.plan) throw new Error(`PEDESTAL_PLAN_MISSING:${prompt}`);
  return { ...outcome, plan: outcome.plan };
}

export function pedestalRows(prompt = CONCRETE_PEDESTAL_PROMPT): DynamicProfessionalBoqRow[] {
  return compileDynamicProfessionalBoq(pedestalOutcome(prompt).plan).rows;
}

export function rowText(rows: { name: string }[]): string {
  return rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU");
}

export function estimateRowText(estimate: GlobalEstimateResult): string {
  return rowText(estimate.sections.flatMap((section) => section.rows));
}

export function expectTokens(text: string, tokens: readonly string[]): void {
  for (const token of tokens) expect(text).toContain(token.toLocaleLowerCase("ru-RU"));
}

export function expectForbiddenTokensAbsent(text: string, tokens: readonly string[]): void {
  for (const token of tokens) expect(text).not.toContain(token.toLocaleLowerCase("ru-RU"));
}
