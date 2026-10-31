import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "../contracts/reinforcementBarScheduleProfileIdentityV1";

type Primitive = string | number | boolean;

function decimal(value: string): number | null {
  const numeric = Number(value.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function reference(text: string, label: RegExp): string | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

export function extractReinforcementBarScheduleCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (
    !/арматур/iu.test(text) ||
    !/(?:ведомост[а-яё]*\s+стержн|bar\s+bending\s+schedule)/iu.test(text) ||
    !/(?:FHWA(?:-HIF-16-026)?|RICS\s*NRM\s*2)/iu.test(text)
  ) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  };
  const weightMatch = text.match(
    /масс[а-яё]*\s+по\s+утвержд[её]нн[а-яё]*\s+ведомост[а-яё]*\s+стержн[а-яё]*\s*[:=]?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(?:кг|kg)/iu,
  );
  if (weightMatch?.[1]) {
    const weight = decimal(weightMatch[1]);
    if (weight !== null && weight > 0) result.approved_reinforcement_schedule_weight_kg = weight;
  }
  const diameterMatch = text.match(/номинальн[а-яё]*\s+диаметр[а-яё]*\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:мм|mm)/iu);
  if (diameterMatch?.[1]) {
    const diameter = decimal(diameterMatch[1]);
    if (diameter !== null && diameter > 0) result.nominal_diameter_mm = diameter;
  }
  const massMatch = text.match(/масс[а-яё]*\s+погонн[а-яё]*\s+метр[а-яё]*\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:кг\/м|kg\/m)/iu);
  if (massMatch?.[1]) {
    const mass = decimal(massMatch[1]);
    if (mass !== null && mass > 0) result.selected_standard_mass_kg_per_m = mass;
  }
  const labels: readonly (readonly [string, RegExp])[] = [
    ["bar_bending_schedule_reference", /ссылк[а-яё]*\s+на\s+ведомост[а-яё]*\s+стержн[а-яё]*/iu],
    ["structural_drawing_and_revision_reference", /конструктивн[а-яё]*\s+черт[её]ж/iu],
    ["bar_standard_and_grade", /стандарт\s+и\s+класс\s+арматур[а-яё]*/iu],
    ["bar_size_designation", /обозначени[ея]\s+размер[а-яё]*\s+стержн[а-яё]*/iu],
    ["shape_straight_bent_curved_or_link", /форм[а-яё]*\s+стержн[а-яё]*/iu],
    ["bar_count_and_cut_length_m", /числ[а-яё]*\s+стержн[а-яё]*\s+и\s+длин[а-яё]*\s+резк[а-яё]*/iu],
    ["laps_hooks_chairs_connectors_and_accessories_scope", /состав\s+нахл[её]ст[а-яё]*\s+и\s+аксессуар[а-яё]*/iu],
    ["fabrication_allowance_if_documented", /запас\s+изготовлени[а-яё]*/iu],
    ["supplier_bundle_or_length_constraints", /ограничени[а-яё]*\s+поставк[а-яё]*/iu],
    ["estimator_approval_reference", /согласовани[ея]\s+сметчик[а-яё]*/iu],
  ];
  for (const [parameterId, label] of labels) {
    const value = reference(text, label);
    if (value) result[parameterId] = value;
  }
  return Object.freeze(result);
}
