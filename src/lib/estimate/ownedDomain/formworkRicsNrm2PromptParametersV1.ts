import { RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID } from "../contracts/ricsNrm2FormworkProfileIdentityV1";

type Primitive = string | number | boolean;

function decimal(value: string): number | null {
  const numeric = Number(value.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function reference(text: string, label: RegExp): string | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

export function extractRicsNrm2FormworkCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/опалубк/iu.test(text) || !/(?:RICS\s*)?NRM\s*2/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  };
  const areaMatch = text.match(
    /измеренн[а-яё]*\s+площад[ьи]\s+контакт[а-яё]*\s*[:=]?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(?:м2|м²|m2|sqm)/iu,
  );
  if (areaMatch?.[1]) {
    const area = decimal(areaMatch[1]);
    if (area !== null && area > 0) result.measured_formwork_contact_area_m2 = area;
  }
  const labels: readonly (readonly [string, RegExp])[] = [
    ["project_drawing_reference", /ссылк[а-яё]*\s+на\s+черт[её]ж/iu],
    ["element_type", /тип\s+элемент[а-яё]*/iu],
    ["element_dimensions_and_face_count", /размер[а-яё]*\s+и\s+количеств[а-яё]*\s+гран[а-яё]*/iu],
    ["plain_or_special_finish", /отделк[а-яё]*/iu],
    ["vertical_battered_horizontal_or_curved_class", /класс\s+геометри[а-яё]*/iu],
    ["single_or_double_sided_scope", /сторон[а-яё]*\s+опалубк[а-яё]*/iu],
    ["openings_voids_and_deduction_rule", /правил[а-яё]*\s+про[её]м[а-яё]*\s+и\s+пустот[а-яё]*/iu],
    ["permanent_or_removable_formwork", /тип\s+опалубк[а-яё]*/iu],
    ["project_measurement_rule_reference", /правил[а-яё]*\s+измерени[а-яё]*\s+проект[а-яё]*/iu],
    ["estimator_approval_reference", /согласовани[ея]\s+сметчик[а-яё]*/iu],
  ];
  for (const [parameterId, label] of labels) {
    const value = reference(text, label);
    if (value) result[parameterId] = value;
  }
  return Object.freeze(result);
}
