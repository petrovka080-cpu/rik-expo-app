import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { G6_COMPLETION_REQUIRED_S2741, G6_COMPLETION_NOT_REQUIRED_S2741 } from './g6PvcProjectCompletionS2741';

/** Shared input ownership for the compatible area-based PVC roof profiles.
 * Each profile retains its own source rates, material units and formulas. */
export const PVC12_CUSTOMER_FACT_IDS_S2747 = Object.freeze([
  'area_m2', 'roof_height_m', 'cleaned_surface_m2',
  'g6_cleanup_applicability', 'g6_waste_applicability',
  'g6_waste_mass_kg', 'g6_waste_loading_method',
]);
const objectFacts = new Set<string>(PVC12_CUSTOMER_FACT_IDS_S2747);

export function withPvcRoofMinimalCustomerInputS2747(base: AutomaticOwnerDefinition): AutomaticOwnerDefinition {
  const runtimeInput = { ...base.runtimeInput };
  const runtimeClassification = { ...base.runtimeClassification };
  const runtimeSourceIds = { ...base.runtimeSourceIds };
  // Fifteen metres is the norm's base range, not the actual building height.
  delete runtimeInput.roof_height_m;
  delete runtimeClassification.roof_height_m;
  delete runtimeSourceIds.roof_height_m;
  return Object.freeze({ ...base, runtimeInput, runtimeClassification, runtimeSourceIds,
    parameters: base.parameters.map(parameter => {
      if (parameter.truth_metadata.visibility_role === 'INTERNAL_ONLY') return parameter;
      const id = parameter.parameter_id;
      const advanced = Object.hasOwn(runtimeInput, id) || /_confirmed$/u.test(id);
      const role = objectFacts.has(id) ? 'OBJECT_FACT' : advanced ? 'ADVANCED_OPTION' : 'APPLICATION_TECHNICAL';
      const boundary = id === 'g6_cleanup_boundary_reference' ? 'cleanup'
        : id === 'g6_waste_boundary_reference' ? 'waste' : null;
      const guide = parameter.truth_metadata.guide as Record<string, unknown>;
      return { ...parameter,
        ...(id === 'roof_height_m' ? { default_value: null, title_ru: 'Высота кровли от земли' } : {}),
        truth_metadata: { ...parameter.truth_metadata,
          provenance: { ...(parameter.truth_metadata.provenance as Record<string, unknown> ?? {}),
            consumer_input_role_v1: role },
          ...(id === 'roof_height_m' ? { value_source_role: 'CONDITIONAL_PROJECT_FACT', runtime_profile_value: false } : {}),
          ...(boundary ? {
            visibility_role: 'USER_DERIVED_READONLY', value_source_role: 'BACKEND_DERIVED',
            derived_from: [`g6_${boundary}_applicability`],
            derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1',
              inputParameterIds: [`g6_${boundary}_applicability`], interpolation: 'FORBIDDEN',
              rows: [
                { inputValues: [G6_COMPLETION_REQUIRED_S2741], outputValue: boundary === 'cleanup'
                  ? 'Финальная уборка выбранного участка; очистка сварных зон учтена в монтаже и повторно не оплачивается'
                  : 'Фактические отходы выбранного участка; пригодные остатки материалов сохраняются' },
                { inputValues: [G6_COMPLETION_NOT_REQUIRED_S2741], outputValue: boundary === 'cleanup'
                  ? 'Отдельная финальная уборка не требуется по указанной границе участка'
                  : 'Обращение с отходами не требуется по указанной границе участка' },
              ] },
          } : {}),
          guide: { ...guide,
            ...(id === 'roof_height_m' ? { guide_kind: 'MEASUREMENT_RULE',
              guide_short_ru: 'Укажите фактическую высоту кровли. До 15 м действует базовая норма труда; выше приложение применяет поправку КРЕР.' } : {}),
            ...(boundary ? { guide_kind: 'DERIVED_VALUE_RULE',
              guide_short_ru: 'Граница формируется из вашего выбора завершения участка. Сохранённое проектное описание имеет приоритет.' } : {}),
            ...(role === 'APPLICATION_TECHNICAL' && !boundary ? {
              guide_short_ru: 'Технический показатель должен поступить из применимой нормы, паспорта или подтверждённой программы исполнителя. Заказчик не вводит его наугад.',
            } : {}),
          },
        },
      };
    }),
  });
}

export const withPvcRoofVolumeMinimalCustomerInputS2747 = withPvcRoofMinimalCustomerInputS2747;
