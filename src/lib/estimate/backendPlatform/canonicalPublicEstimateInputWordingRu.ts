/** Presentation of an exact, inspected legacy family. This does not admit its
 * unproved point composition or change a saved value, unit or formula. */
export type CanonicalPublicInputContext = {
  catalogId?: string | null;
  unitId?: string | null;
  descriptionRu?: string | null;
};

export type CanonicalPublicInputWording = {
  labelRu: string;
  guideRu: string;
};

const plumbingVariants = new Set(['standard', 'high_load', 'large_area', 'small_area', 'technical_room', 'wet_zone']);

export function canonicalPublicEstimateInputWordingRu(
  parameterId: string, titleRu: string, context: CanonicalPublicInputContext = {},
): CanonicalPublicInputWording | undefined {
  if (parameterId !== 'q' || context.unitId !== 'point') return undefined;
  const match = /^canonical-work:base:plumbing_interior_(riser|water_pipe)_install_(.+)$/u.exec(context.catalogId ?? '');
  if (!match || !plumbingVariants.has(match[2]!)) return undefined;
  const labelRu = match[1] === 'riser' ? 'Количество точек монтажа стояка' : 'Количество точек монтажа водопровода';
  if (!['Объем работ', 'Объём работ', labelRu].includes(titleRu)) return undefined;
  return {
    labelRu,
    guideRu: 'Состав одной точки в этом старом шаблоне не подтверждён: сначала уточните у сантехника состав работ и ведомость точек, затем вводите их число (например, 4); метры трубы сюда не вводят. Пока данных нет, оставьте поле пустым — значение 100 из шаблона не подтверждает объём вашего объекта.',
  };
}
