import { buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition, type AutomaticParameterSpec } from './automaticConstructionOwnerR1';
import { withG6PvcProjectCompletionS2741, G6_COMPLETION_REQUIRED_S2741 } from './g6PvcProjectCompletionS2741';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import type { CanonicalCommercialCostCoverageV1 } from '../backendPlatform/canonicalCommercialCostCoverageV1';

export const G6_NEXT_MANUAL_LOADING = 'Ручная погрузка без погрузочной машины';
export const G6_NEXT_MACHINE_LOADING = 'Погрузка подтверждённой машиной';
export const G6_NEXT_LIQUID_ENERGY_SCOPE = 'Транспорт на жидком топливе; фактическое топливо указано в литрах';
export const G6_NEXT_LOADER_LIQUID_ENERGY_SCOPE = 'Погрузочная машина на жидком топливе; её фактический расход указан отдельно в литрах';
const masterSha256 = '67c5314eaf60ef88b887c3de0a4d2d39c38e406b2b58160415ccde3e8764648c';
const locator = 'MASTER S27.40 §20.42.7 и S27.41 §20.43: раскрытие фактических ресурсов полной услуги. Не норма расхода.';
type Scope = { catalogId: string; measureId: string; unitId: string; groupId: string; groupTitleRu: string };

/** Definition-owned components of an explicitly selected full waste service.
 * This bounded transport option requires an explicit liquid-fuel scope.
 * Different energy/unit/commercial methods require a compatible full profile;
 * they are not converted, defaulted, or inferred from the vehicle's name.
 */
export function withG6NextServiceComponents(base: AutomaticOwnerDefinition, scope: Scope): AutomaticOwnerDefinition {
  const current = withG6PvcProjectCompletionS2741(base, scope);
  const selected = { kind: 'equals' as const, parameterId: 'g6_waste_applicability', value: G6_COMPLETION_REQUIRED_S2741 };
  const mechanical = { kind: 'and' as const, operands: [selected,
    { kind: 'equals' as const, parameterId: 'g6_waste_loading_method', value: G6_NEXT_MACHINE_LOADING }] };
  const fact = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
    extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, valueType, unitId,
    kind: 'conditional', requiredWhen: selected, ...extra });
  const facts = [
    fact('g6_waste_vehicle_energy_scope', 'Совместимый энергоресурс транспорта полной услуги', 'enum', null, { values: [G6_NEXT_LIQUID_ENERGY_SCOPE] }),
    fact('g6_waste_vehicle_specification', 'Подтверждённый транспорт, вместимость и граница его использования', 'text', null),
    fact('g6_waste_vehicle_hours', 'Фактическое время транспорта в выбранной услуге', 'decimal', 'machine_hour', { min: 0 }),
    fact('g6_waste_crew_scope', 'Состав и граница труда погрузки и водителя; одни человеко-часы не повторяются, уборка отдельно', 'text', null),
    fact('g6_waste_crew_hours', 'Общие фактические человеко-часы погрузки и водителя без повторного учёта', 'decimal', 'man_hour', { min: 0 }),
    fact('g6_waste_loading_method', 'Способ погрузки подготовленной партии', 'enum', null, { values: [G6_NEXT_MANUAL_LOADING, G6_NEXT_MACHINE_LOADING] }),
    fact('g6_waste_loader_specification', 'Подтверждённая погрузочная машина и её граница', 'text', null, { requiredWhen: mechanical }),
    fact('g6_waste_loader_hours', 'Фактическое время погрузочной машины', 'decimal', 'machine_hour', { min: 0, requiredWhen: mechanical }),
    fact('g6_waste_loader_energy_scope', 'Совместимый энергоресурс применимой погрузочной машины', 'enum', null,
      { requiredWhen: mechanical, values: [G6_NEXT_LOADER_LIQUID_ENERGY_SCOPE] }),
    fact('g6_waste_loader_fuel_specification', 'Подтверждённая спецификация топлива погрузочной машины; топливо транспорта отдельно', 'text', null, { requiredWhen: mechanical }),
    fact('g6_waste_loader_fuel_l', 'Фактическое жидкое топливо погрузочной машины', 'decimal', 'l', { min: 0, requiredWhen: mechanical }),
    fact('g6_waste_fuel_specification', 'Подтверждённая спецификация жидкого топлива транспорта; топливо погрузочной машины отдельно', 'text', null),
    fact('g6_waste_fuel_l', 'Фактическое жидкое топливо транспорта; не расчёт по расстоянию или массе', 'decimal', 'l', { min: 0 }),
  ];
  const extension = buildAutomaticConstructionOwnerR1({ contract: 'g6-next-service-components.s27-41/prepared-v1',
    semanticOwner: scope.catalogId, sourceId: 'master_s2741_g6_full_waste_service_components', normId: 'PROJECT_FACTS_NOT_A_CONSUMPTION_NORM',
    sourceMetadata: { source_title: 'Явный компонентный состав полной услуги обращения с отходами', source_document_version: 'S27.41',
      definition_hash: masterSha256, artifact_sha256: masterSha256, exact_locator: locator },
    applicabilityRu: 'Только явно подтверждённая полная услуга: транспорт и применимая погрузочная машина на жидком топливе, виды и количества топлива раздельны. Все составляющие обеспечивает исполнитель; уборка и мешки отдельно. Другие энергоресурсы или состав оплаты требуют совместимого полного профиля.',
    ordinary: [{ id: scope.measureId, title: 'Объём исходной работы', kind: 'ordinary', valueType: 'decimal', unitId: scope.unitId, min: 0 }],
    profile: [], conditional: [...facts,
      fact('g6_waste_mass_kg', 'Измеренная масса партии', 'decimal', 'kg', { min: 0 }),
      fact('g6_waste_receiver_reference', 'Подтверждённый приём фактической партии', 'text', null)],
    deferMissingProjectFactsToRows: true,
    rows: [
      { rowId: 'g6:completion:waste-vehicle', title: 'Транспорт для вывоза подготовленной партии', section: 'Состав полной услуги', category: 'equipment',
        unitId: 'machine_hour', formulaId: 'g6_next_waste_vehicle_v1', expression: 'g6_waste_vehicle_hours', inclusion: selected,
        titleParameterIds: ['g6_waste_vehicle_specification'], inputParameterIds: ['g6_waste_vehicle_energy_scope'] },
      { rowId: 'g6:completion:waste-crew', title: 'Труд погрузки и водителя', section: 'Состав полной услуги', category: 'construction_work',
        unitId: 'man_hour', formulaId: 'g6_next_waste_crew_v1', expression: 'g6_waste_crew_hours', inclusion: selected,
        titleParameterIds: ['g6_waste_crew_scope'], inputParameterIds: ['g6_waste_loading_method'] },
      { rowId: 'g6:completion:waste-loader', title: 'Погрузочная машина', section: 'Состав полной услуги', category: 'equipment',
        unitId: 'machine_hour', formulaId: 'g6_next_waste_loader_v1', expression: 'g6_waste_loader_hours', inclusion: mechanical,
        titleParameterIds: ['g6_waste_loader_specification'], inputParameterIds: ['g6_waste_loader_energy_scope'] },
      { rowId: 'g6:completion:waste-fuel', title: 'Жидкое топливо транспорта', section: 'Состав полной услуги', category: 'material',
        unitId: 'l', formulaId: 'g6_next_waste_fuel_v1', expression: 'g6_waste_fuel_l', inclusion: selected, procurement: true,
        titleParameterIds: ['g6_waste_fuel_specification'], inputParameterIds: ['g6_waste_vehicle_energy_scope'] },
      { rowId: 'g6:completion:waste-loader-fuel', title: 'Жидкое топливо погрузочной машины', section: 'Состав полной услуги', category: 'material',
        unitId: 'l', formulaId: 'g6_next_waste_loader_fuel_v1', expression: 'g6_waste_loader_fuel_l', inclusion: mechanical, procurement: true,
        titleParameterIds: ['g6_waste_loader_fuel_specification'], inputParameterIds: ['g6_waste_loader_energy_scope'] },
      { rowId: 'g6:completion:waste-reception', title: 'Приём фактических отходов', section: 'Состав полной услуги', category: 'service',
        unitId: 'kg', formulaId: 'g6_next_waste_reception_v1', expression: 'g6_waste_mass_kg', inclusion: selected,
        titleParameterIds: ['g6_waste_receiver_reference'] },
    ], excludedUnownedAssumptions: ['Нет норм времени, топлива, состава бригады или цены',
      'Исходный монтаж, уборка и мешки не включаются в услугу повторно', 'Другие энергоресурсы не конвертируются автоматически'] });
  const ids = new Set(current.parameters.map(parameter => parameter.parameter_id));
  const parameters = extension.parameters.filter(parameter => !ids.has(parameter.parameter_id)).map((parameter, index) => ({ ...parameter,
    ordinal: current.parameters.length + index, truth_metadata: { ...parameter.truth_metadata,
      ...(parameter.parameter_id === 'g6_waste_crew_scope' ? {
        visibility_role: 'USER_DERIVED_READONLY', value_source_role: 'BACKEND_DERIVED',
        derived_from: ['g6_waste_applicability', 'g6_waste_loading_method'],
        // This is the description of the already selected service, not a
        // labour norm. Existing explicit project descriptions remain intact.
        derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1',
          inputParameterIds: ['g6_waste_applicability', 'g6_waste_loading_method'],
          rows: [
            { inputValues: [G6_COMPLETION_REQUIRED_S2741, G6_NEXT_MANUAL_LOADING],
              outputValue: 'Ручная погрузка подготовленной партии и труд водителя; входят в полную услугу, уборка отдельно' },
            { inputValues: [G6_COMPLETION_REQUIRED_S2741, G6_NEXT_MACHINE_LOADING],
              outputValue: 'Погрузка подготовленной партии машиной и труд водителя; входят в полную услугу, уборка отдельно' },
          ], interpolation: 'FORBIDDEN' },
      } : {}),
      guide: { ...(parameter.truth_metadata.guide as Record<string, unknown>),
        source_role: 'PROJECT_COMPLETION_SCOPE_NOT_A_CONSUMPTION_NORM', verified_at: '2026-10-07',
        ...(parameter.parameter_id === 'g6_waste_crew_scope' ? {
          guide_kind: 'DERIVED_VALUE_RULE',
          guide_short_ru: 'Состав труда определяется выбранным способом погрузки и границей полной услуги. Часы, число работников и цены из этого описания не выводятся.',
        } : {}),
      } } }));
  const components = extension.resources.map((row, index) => ({ ...row, ordinal: current.resources.length + index,
    source_metadata: { ...row.source_metadata, normativeTrace: [], sourceRole: 'EXPLICIT_PROJECT_COMPONENT_NOT_ENGINEERING_NORM' },
    resource_graph: { ...row.resource_graph,
      publicResourcePresentationV1: { contractVersion: 'canonical-public-resource-presentation/v1',
        sourceTitleRu: row.title_ru, nameRu: row.title_ru, brandAndModelRu: null, specificationRu: null,
        detailsRu: ['Количество и спецификация по подтверждённым фактам выбранной услуги; автоматическая норма не назначена.',
          'Обеспечивается исполнителем полной услуги; стоимость и покупка заказчиком повторно не учитываются.'] },
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
      groupId: scope.groupId, groupTitleRu: scope.groupTitleRu, operationId: 'actual-waste-handling',
      operationTitleRu: 'Обращение с фактическими отходами', processRole: 'PROCESS', processOrdinal: 21,
      completionCriterionRu: 'Фактическая партия, ресурсный состав и приём подтверждены; полная услуга оплачивается один раз' } }, row_sha256: '' }));
  const coverage: CanonicalCommercialCostCoverageV1 = { contractVersion: 'canonical-commercial-cost-coverage/v1',
    scopeId: 'g6-full-prepared-waste-service:' + scope.catalogId, sourceReference: locator,
    scopeRu: 'Погрузка, перевозка и приём подтверждённой партии; транспорт, труд погрузки и водителя, применимая погрузочная машина и жидкое топливо обеспечивает исполнитель. Уборка, мешки и исходный монтаж отдельно.',
    priceScope: 'LABOR_AND_LISTED_RESOURCES', when: selected,
    rateBasis: { kind: 'PER_MEASURE', parameterId: 'g6_waste_mass_kg', unitId: 'kg' },
    members: components.map(row => ({ rowId: row.row_id, unitId: row.unit_id,
      ...(row.category === 'material' ? { supplyParty: 'RATE_PROVIDER' as const } : {}) })) };
  const resources = current.resources.map(row => !row.row_id.startsWith('g6:completion:') ? row : ({ ...row,
    resource_graph: { ...row.resource_graph,
      publicResourcePresentationV1: { contractVersion: 'canonical-public-resource-presentation/v1',
        sourceTitleRu: row.title_ru, nameRu: row.title_ru, brandAndModelRu: null, specificationRu: null,
        detailsRu: ['Применимость, количество и граница оплаты подтверждаются отдельно; исходный монтаж не повторяется.'] },
      ...(row.row_id === 'g6:completion:waste-service' ? {
        inputParameterIds: [...(row.resource_graph.inputParameterIds as string[]), ...facts.map(fact => fact.id)],
        commercialCostCoverageV1: coverage } : {}) }, row_sha256: '' }));
  for (const row of [...resources, ...components]) if (!row.row_sha256) row.row_sha256 = estimateDeterministicHash(row);
  return Object.freeze({ ...current, parameters: [...current.parameters, ...parameters],
    formulas: [...current.formulas, ...extension.formulas], resources: [...resources, ...components] });
}
