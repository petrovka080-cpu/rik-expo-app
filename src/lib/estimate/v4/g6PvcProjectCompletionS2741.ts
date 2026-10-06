import { buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition, type AutomaticParameterSpec } from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const G6_COMPLETION_REQUIRED_S2741 = 'Требуется в границе выбранного участка';
export const G6_COMPLETION_NOT_REQUIRED_S2741 = 'Не требуется по подтверждённой границе участка';
export const G6_WASTE_SERVICE_PRICE_SCOPE_S2741 = 'Погрузка, перевозка и приём подготовленной партии; транспорт, водитель и топливо включены; уборка и мешки не включены';
const sourceId = 'master_s2741_g6_project_completion_programme';
const masterSha256 = '67c5314eaf60ef88b887c3de0a4d2d39c38e406b2b58160415ccde3e8764648c';
const locator = 'MASTER S27.40 §20.42.7 и S27.41 §20.43: применимое завершение с фактическими ресурсами и отдельной границей оплаты. Не норма расхода или цена.';

/** Prepared next step of the same three-binding family. Nothing here is a
 * runtime default or a share deducted from the existing installation norm.
 * Cleanup and waste handling have independent applicability and quantities.
 * Roof repair/protective layers outside the selected installation boundary
 * require their existing complete construction profile, not an invented row.
 */
export function withG6PvcProjectCompletionS2741(base: AutomaticOwnerDefinition, scope: {
  catalogId: string; measureId: string; unitId: string; groupId: string; groupTitleRu: string;
}): AutomaticOwnerDefinition {
  const selected = (programme: string) => ({ kind: 'equals' as const,
    parameterId: `g6_${programme}_applicability`, value: G6_COMPLETION_REQUIRED_S2741 });
  const positive = { kind: 'greater_than' as const, parameterId: scope.measureId, value: 0 };
  const fact = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
    programme: string, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, valueType, unitId,
      kind: 'conditional', requiredWhen: selected(programme), ...extra });
  const programmes = ['cleanup', 'waste'] as const;
  const conditional: AutomaticParameterSpec[] = programmes.flatMap(programme => [
    { id: `g6_${programme}_applicability`, title: programme === 'cleanup' ? 'Финальная уборка участка' : 'Обращение с фактическими отходами',
      kind: 'conditional' as const, valueType: 'enum' as const, unitId: null, requiredWhen: positive,
      values: [G6_COMPLETION_REQUIRED_S2741, G6_COMPLETION_NOT_REQUIRED_S2741] },
    { id: `g6_${programme}_boundary_reference`, title: programme === 'cleanup'
      ? 'Подтверждённая граница уборки и её оплаты; очистка сварных зон и исходный монтаж не оплачиваются повторно'
      : 'Подтверждённый поток отходов, состав услуги и приём; пригодный остаток материала отходами не считается',
      kind: 'conditional' as const, valueType: 'text' as const, unitId: null, requiredWhen: positive },
  ]);
  conditional.push(
    fact('g6_cleanup_worker_h', 'Фактические трудозатраты финальной уборки; отдельно от нормы монтажа', 'decimal', 'man_hour', 'cleanup', { min: 0 }),
    fact('g6_cleanup_bag_count', 'Фактическое число расходуемых мешков для уборки', 'integer', 'piece', 'cleanup', { min: 0 }),
    fact('g6_cleanup_bag_specification', 'Мешки: подтверждённые размеры, вместимость и пригодность для выбранных отходов', 'text', null, 'cleanup'),
    fact('g6_cleanup_bag_stock', 'Пригодное выделенное наличие мешков', 'integer', 'piece', 'cleanup', { min: 0 }),
    fact('g6_cleanup_bag_reserve', 'Сохраняемый резерв мешков после уборки', 'integer', 'piece', 'cleanup', { min: 0 }),
    fact('g6_cleanup_bag_quantum', 'Число мешков в фактической неделимой упаковке', 'integer', 'piece', 'cleanup', { min: 1 }),
    fact('g6_waste_mass_kg', 'Измеренная масса фактических отходов; не остаток рулона и не разность площадей', 'decimal', 'kg', 'waste', { min: 0 }),
    fact('g6_waste_service_scope', 'Совместимая граница расценки обращения с подготовленной партией отходов', 'enum', null, 'waste',
      { values: [G6_WASTE_SERVICE_PRICE_SCOPE_S2741] }),
    fact('g6_waste_service_specification', 'Фактический транспорт, погрузка, маршрут и приём подготовленной партии; уборка и мешки по другим строкам', 'text', null, 'waste'),
    fact('g6_waste_receiver_reference', 'Подтверждённое место приёма выбранного потока отходов и его условия', 'text', null, 'waste'),
  );
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: 'g6:completion:bags', orderUnitId: 'piece',
    consumed: 'g6_cleanup_bag_count', stock: 'g6_cleanup_bag_stock', reserve: 'g6_cleanup_bag_reserve', quantum: 'g6_cleanup_bag_quantum' });
  const extension = buildAutomaticConstructionOwnerR1({ contract: 'g6-pvc-project-completion.s27-41/v1',
    semanticOwner: scope.catalogId, sourceId, normId: 'PROJECT_PROGRAMME_NOT_A_CONSUMPTION_NORM',
    sourceMetadata: { source_title: 'Фактическая программа завершения выбранного участка', source_document_version: 'S27.41',
      definition_hash: masterSha256, artifact_sha256: masterSha256, exact_locator: locator },
    applicabilityRu: 'Уборка и обращение с отходами назначаются независимо по фактической границе. Услуга обращения с подготовленной партией имеет одну полную расценку за кг, включает погрузку, перевозку и приём с транспортом, водителем и топливом. Уборка и мешки по другим строкам; другое покрытие требует совместимого предложения.',
    ordinary: [{ id: scope.measureId, title: 'Объём исходной работы', kind: 'ordinary', valueType: 'decimal', unitId: scope.unitId, min: 0 }],
    profile: [], conditional, deferMissingProjectFactsToRows: true,
    rows: [
      ...programmes.map(programme => ({ rowId: `g6:completion:${programme}-boundary`, section: 'Граница завершения', category: 'service',
        title: programme === 'cleanup' ? 'Граница финальной уборки' : 'Граница обращения с отходами', unitId: scope.unitId,
        formulaId: `g6_completion_${programme}_boundary_v1`, expression: scope.measureId, costTreatment: 'INFORMATIONAL_SCOPE' as const,
        inputParameterIds: [`g6_${programme}_applicability`, `g6_${programme}_boundary_reference`] })),
      { rowId: 'g6:completion:cleanup-workers', section: 'Завершение участка', category: 'construction_work', title: 'Финальная уборка участка',
        unitId: 'man_hour', formulaId: 'g6_completion_cleanup_workers_v1', expression: 'g6_cleanup_worker_h', inclusion: selected('cleanup'),
        inputParameterIds: ['g6_cleanup_boundary_reference'] },
      { rowId: 'g6:completion:bags', section: 'Расходники уборки', category: 'material', title: 'Мешки для сбора фактических отходов',
        unitId: 'piece', formulaId: 'g6_completion_bags_v1', expression: 'ceil(max(0,g6_cleanup_bag_count+g6_cleanup_bag_reserve-g6_cleanup_bag_stock)/g6_cleanup_bag_quantum)*g6_cleanup_bag_quantum', procurement: true, inclusion: selected('cleanup'),
        inputParameterIds: ['g6_cleanup_boundary_reference', 'g6_cleanup_bag_specification'], titleParameterIds: ['g6_cleanup_bag_specification'], ...balance.owner },
      { rowId: 'g6:completion:waste-service', section: 'Завершение участка', category: 'service', title: 'Обращение с фактическими отходами: полная услуга',
        unitId: 'kg', formulaId: 'g6_completion_waste_service_v1', expression: 'g6_waste_mass_kg', inclusion: selected('waste'),
        titleParameterIds: ['g6_waste_service_specification'], inputParameterIds: ['g6_waste_boundary_reference', 'g6_waste_service_scope',
          'g6_waste_service_specification', 'g6_waste_receiver_reference'] },
    ], excludedUnownedAssumptions: ['Нет автоматической нормы уборки, массы отходов, цены или применимости',
      'Пригодный остаток рулона сохраняется в закупочном балансе', 'Смежные слои, ремонт и защита требуют применимого полного профиля',
      'Услуга обращения с отходами допустима только как явно полный состав; отдельные компоненты требуют иного совместимого предложения'] });
  const added = extension.resources.map((row, index) => {
    const cleanup = !row.row_id.startsWith('g6:completion:waste-');
    const boundary = row.row_id.endsWith('-boundary');
    const resource = { ...row, ordinal: base.resources.length + index,
      source_metadata: { ...row.source_metadata, normativeTrace: [], sourceRole: 'EXPLICIT_PROJECT_COMPLETION_NOT_ENGINEERING_NORM',
        originalInstallationLaborUnchanged: true, runtimeFactsDefaulted: false },
      resource_graph: { ...row.resource_graph, operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
        groupId: scope.groupId, groupTitleRu: scope.groupTitleRu, operationId: cleanup ? 'final-cleanup' : 'actual-waste-handling',
        operationTitleRu: cleanup ? 'Финальная уборка участка' : 'Обращение с фактическими отходами', processRole: boundary ? 'REFERENCE_ONLY' : 'PROCESS', processOrdinal: cleanup ? 20 : 21,
        completionCriterionRu: cleanup ? 'Граница уборки, отдельные трудозатраты и совместимые расходники подтверждены; стоимость монтажа не повторена'
          : 'Фактический поток и масса, полный состав услуги и место приёма подтверждены; пригодные остатки сохранены' } }, row_sha256: '' };
    resource.row_sha256 = estimateDeterministicHash(resource); return resource;
  });
  return Object.freeze({ ...base, parameters: [...base.parameters, ...extension.parameters.filter(p => p.parameter_id !== scope.measureId)
    .map((p, index) => ({ ...p, ordinal: base.parameters.length + index, truth_metadata: { ...p.truth_metadata,
      ...(p.truth_metadata.guide ? { guide: { ...(p.truth_metadata.guide as Record<string, unknown>),
        source_role: 'PROJECT_COMPLETION_SCOPE_NOT_A_CONSUMPTION_NORM', verified_at: '2026-10-07' } } : {}) } }))], formulas: [...base.formulas, ...extension.formulas],
    resources: [...base.resources, ...added] });
}
