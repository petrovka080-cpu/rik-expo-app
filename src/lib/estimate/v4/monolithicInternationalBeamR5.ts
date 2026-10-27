import pack from '../../../../data/estimate-benchmarks/source-packs/monolithic-international-beam-gesn2020-r5.json';
import {
  buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec,
  type AutomaticRowSpec, type AutomaticInclusionCondition,
} from './automaticConstructionOwnerR1';
import { effectiveResourceQuantityParameterId, effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import type { CanonicalSourceProfileSelectionV1 } from '../backendPlatform/canonicalSourceProfileSelectionV1';

// A whole alternate source column, never a repair of the unreadable KG cell.
// The existing owner factory, profile resolver and compiler perform all maths.
export const internationalBeamPackR5 = pack;
export const INTERNATIONAL_BEAM_SELECTOR_R5 = 'mono_family_source_method_r1';
export const INTERNATIONAL_BEAM_PREFIX_R5 = 'monolithic-beam:gesn2020:06-19-003-01:r5';
export const internationalBeamParameterR5 = (key: string): string => 'mono_international_beam_r5_' + key;
export const internationalBeamGeometryR5 = (key: string): string => 'monolithic_geometry_r3_beam_' + key;
export const internationalBeamRowR5 = (key: string): string => INTERNATIONAL_BEAM_PREFIX_R5 + ':' + key;

const p = internationalBeamParameterR5, g = internationalBeamGeometryR5, r = internationalBeamRowR5;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const geometryKeys = ['volume_m3', 'depth_mm', 'support_height_m', 'work_elevation_m'];
const operations: Readonly<Record<string, string>> = {
  'whole-cycle': 'Целый нормативный цикл устройства балки', formwork: 'Устройство и разборка опалубки',
  reinforcement: 'Установка арматуры', placement: 'Укладка и уплотнение бетона',
  curing: 'Уход за бетоном', handling: 'Подача бетона и перемещение материалов',
};
const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: 'and', operands });
const selected: AutomaticInclusionCondition = { kind: 'equals', parameterId: INTERNATIONAL_BEAM_SELECTOR_R5, value: pack.choiceRu };
const active = and(selected, { kind: 'greater_than', parameterId: g('volume_m3'), value: 0 });
const technical = (key: string, title: string, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({
  id: p(key), title, unitId: null, valueType: 'text', kind: 'conditional', requiredWhen: active, ...extra,
});

/** Source selection is an application-owned preliminary reference. It does not
 * assert a real inventory formwork programme, bucket feed, design or supply. */
export function internationalBeamSourceSelectionR5(): CanonicalSourceProfileSelectionV1 {
  const gt = (key: string, value: number, unitId: string) => ({ kind: 'formula_greater_than', expression: g(key), value, unitId });
  return { contract: 'canonical-source-profile-selection/v1', selectorParameterId: INTERNATIONAL_BEAM_SELECTOR_R5,
    geometryParameterIds: geometryKeys.map(g), profiles: [{ selectorValue: pack.choiceRu,
      sources: [{ sourceId: pack.sourceId, artifactSha256: pack.source.sha256, locator: pack.source.exactLocator }],
      when: { kind: 'and', operands: [gt('volume_m3', 0, 'm3'), gt('depth_mm', 0, 'mm'),
        { kind: 'not', operand: gt('depth_mm', 500, 'mm') }, gt('support_height_m', 0, 'm'),
        { kind: 'not', operand: gt('support_height_m', 6, 'm') },
        { kind: 'or', operands: [{ kind: 'equals', parameterId: g('work_elevation_m'), value: 0 }, gt('work_elevation_m', 0, 'm')] },
        { kind: 'not', operand: gt('work_elevation_m', 15, 'm') }] }, geometryCopies: [] }] };
}

export function buildMonolithicInternationalBeamR5(): AutomaticOwnerDefinition {
  const ordinary: AutomaticParameterSpec[] = [
    { id: g('volume_m3'), title: 'Чистый объём балки', unitId: 'm3', valueType: 'decimal', kind: 'ordinary', min: 0 },
    { id: g('depth_mm'), title: 'Высота балки', unitId: 'mm', valueType: 'decimal', kind: 'ordinary', min: 0, max: 500 },
    { id: g('support_height_m'), title: 'Высота от опорной площадки', unitId: 'm', valueType: 'decimal', kind: 'ordinary', min: 0, max: 6 },
    { id: g('work_elevation_m'), title: 'Отметка выполнения работ', unitId: 'm', valueType: 'decimal', kind: 'ordinary', min: 0, max: 15 },
    { id: INTERNATIONAL_BEAM_SELECTOR_R5, title: 'Исходный расчётный профиль', unitId: null, valueType: 'enum', kind: 'ordinary', values: [pack.choiceRu] },
  ];
  const methodFacts = ['project_reference', 'shape', 'formwork_method', 'concrete_feed'].map(p);
  const geometryFacts = geometryKeys.slice(1).map(g);
  const physicalNeedIds = new Set(pack.needs.map(n => p('unresolved_' + n.key.replace(/-/gu, '_'))));
  const unresolvedIds = new Set([...physicalNeedIds, p('unresolved_formMetal')]);
  const conditional: AutomaticParameterSpec[] = [
    technical('project_reference', 'Конструкция и реальный ППР принятого метода'),
    technical('shape', 'Геометрическая форма по проекту', { valueType: 'enum', values: ['STRAIGHT_HORIZONTAL'] }),
    technical('formwork_method', 'Принятая система опалубки', { valueType: 'enum', values: ['INDUSTRIAL_INVENTORY'] }),
    technical('concrete_feed', 'Принятый способ подачи бетона', { valueType: 'enum', values: ['BUCKET'] }),
    technical('project_concrete_specification', 'Проектная спецификация бетонной смеси'),
    technical('project_steel_kg', 'Масса арматуры из проектной ведомости', { valueType: 'decimal', unitId: 'kg', min: 0 }),
    technical('machine_cost_mode', 'Владелец полной эксплуатации нормативных механизмов', { valueType: 'enum', values: ['OWN_OPERATION', 'HIRED_FULL_OPERATION'] }),
    ...[...unresolvedIds].map(id => ({ id, title: id === p('unresolved_formMetal') ? 'Проектная амортизация элементов опалубки' : pack.needs.find(n => p('unresolved_' + n.key.replace(/-/gu, '_')) === id)!.titleRu,
      unitId: id === p('unresolved_formMetal') ? 'set' : '', valueType: 'decimal' as const, kind: 'conditional' as const, min: 0 })),
  ];
  const row = (key: string, title: string, category: string, unitId: string, expression: string,
    extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({ rowId: r(key), formulaId: r('formula:' + key),
      title, section: 'Монолитная железобетонная балка', category, unitId, expression, procurement: false,
      inclusion: active, inputParameterIds: [...geometryFacts, ...methodFacts], ...extra });
  const rows: AutomaticRowSpec[] = pack.rows.flatMap(source => {
    const { key, titleRu, category, unitId } = source;
    if (source.quantityRole === 'PROJECT_AMORTIZATION') return [row(key, titleRu, category, unitId, p('unresolved_formMetal'), { costTreatment: 'INFORMATIONAL_SCOPE' })];
    // The BBS supply owner remains the only future steel payment/procurement
    // owner. Neither printed31t nor a second aggregate order is manufactured.
    if (key === 'rebar') return [row(key, titleRu, category, unitId, p('project_steel_kg'), { costTreatment: 'INFORMATIONAL_SCOPE' })];
    const rate = Number(source.literalRate) * (source.sourceUnit === 't' ? 1000 : 1);
    if (!Number.isFinite(rate)) throw Error('INTERNATIONAL_BEAM_FINITE_LITERAL_REQUIRED:' + key);
    const expression = g('volume_m3') + '*' + rate + '/100';
    if (category === 'labor') return [row(key, titleRu, category, unitId, expression, {
      costTreatment: key === 'workers' ? 'OWN_COST' : 'INFORMATIONAL_SCOPE',
    })];
    const effective = effectiveResourceQuantityParameterId(r(key + '-consumed'));
    const consumed = row(key + '-consumed', titleRu, category, unitId, expression, {
      costTreatment: 'INFORMATIONAL_SCOPE', effectiveQuantityOutput: { parameterId: effective, unitId },
      ...(category === 'material' ? { purchaseBalanceOwnerRowId: r(key) } : {}),
    });
    if (category === 'equipment') return [consumed, ...(['own', 'hired'] as const).map(mode => row(key + '-' + mode,
      titleRu, category, unitId, effective, { costTreatment: 'OWN_COST', procurement: mode === 'hired',
        inclusion: and(active, { kind: 'equals', parameterId: p('machine_cost_mode'), value: mode === 'own' ? 'OWN_OPERATION' : 'HIRED_FULL_OPERATION' }) }))];
    const heldInitialSupply = source.quantityRole === 'TURNOVER_CONSUMPTION';
    const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: r(key), orderUnitId: unitId,
      consumed: effective, stock: '0', reserve: '0', quantityMode: 'canonical_decimal', balanceScope: 'new_order_vs_required_consumption' });
    return [consumed, row(key, titleRu, category, unitId, effective, {
      costTreatment: 'OWN_COST', procurement: !heldInitialSupply,
      ...(key === 'concrete' ? { titleParameterIds: [p('project_concrete_specification')],
        inputParameterIds: [...geometryFacts, ...methodFacts, p('project_concrete_specification')] } : {}),
      ...balance.owner,
    })];
  });
  rows.push(...pack.needs.map(need => row('need:' + need.key, need.titleRu, 'service', '',
    p('unresolved_' + need.key.replace(/-/gu, '_')), { costTreatment: 'INFORMATIONAL_SCOPE' })));
  const definition = buildAutomaticConstructionOwnerR1({ contract: pack.contract, semanticOwner: pack.catalogId,
    sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: { source_title: 'Устройство железобетонных балок для перекрытий',
      source_document_version: pack.source.edition, definition_hash: pack.source.sha256,
      artifact_sha256: pack.source.sha256, exact_locator: pack.source.exactLocator },
    applicabilityRu: 'Прямолинейная горизонтальная балка до 500 мм, опоры до 6 м, отметка до 15 м; инвентарная опалубка и подача бетона в бадьях. Сам расчётный профиль не подтверждает ППР.',
    ordinary, profile: [], conditional, rows, deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.needs.map(n => n.missingRu),
  });
  const parameters = definition.parameters.map(parameter => {
    if (unresolvedIds.has(parameter.parameter_id)) return { ...parameter, required: false,
      truth_metadata: unresolvedApplicationNormTruthR1(parameter.truth_metadata,
        'Количественная норма или полный реальный комплект не установлены; пользователь не задаёт неизвестную норму как0/1.') };
    if (parameter.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY') return parameter;
    const isGeometry = geometryKeys.some(key => g(key) === parameter.parameter_id), isSelector = parameter.parameter_id === INTERNATIONAL_BEAM_SELECTOR_R5;
    const guide = record(parameter.truth_metadata.guide) ? parameter.truth_metadata.guide : {};
    return { ...parameter, required: false, default_value: null,
      constraints_json: { ...parameter.constraints_json,
        ...(isGeometry && parameter.parameter_id !== g('work_elevation_m') ? { exclusiveMin: 0 } : {}) },
      truth_metadata: { ...parameter.truth_metadata, visibility_role: isGeometry ? 'USER_INPUT' : 'INTERNAL_ONLY',
        value_source_role: isGeometry ? 'USER_MEASURED' : isSelector ? 'SOURCE_BACKED_PRELIMINARY_PROFILE' : 'PROJECT_DOCUMENTATION',
        source_confirmation_required: false,
        provenance: { consumer_input_role_v1: isGeometry ? 'OBJECT_FACT' : 'APPLICATION_TECHNICAL' },
        ...(!isGeometry ? { guide: { ...guide,
          guide_kind: 'PROJECT_DEFINED', source_role: 'PROJECT_DOCUMENTATION',
          guide_short_ru: 'Приложение использует зарегистрированный источник и подтверждённые данные проекта. Геометрия не подтверждает ППР или физическое оснащение.' } } : {}),
      } };
  });
  const resources = definition.resources.map(resource => {
    const key = resource.row_id.slice(INTERNATIONAL_BEAM_PREFIX_R5.length + 1);
    const source = pack.rows.find(s => [s.key, s.key + '-consumed', s.key + '-own', s.key + '-hired'].includes(key));
    const need = pack.needs.find(n => key === 'need:' + n.key);
    const unknown = !!need || source?.quantityRole === 'PROJECT_AMORTIZATION';
    const op = source?.operation ?? need?.operation ?? 'whole-cycle';
    const machineOwner = source?.category === 'equipment' && !key.endsWith('-consumed');
    const result = { ...resource, resource_graph: { ...resource.resource_graph,
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: INTERNATIONAL_BEAM_PREFIX_R5,
        groupTitleRu: 'Монолитная железобетонная балка', operationId: r('operation:' + op), operationTitleRu: operations[op],
        completionCriterionRu: 'Количественный состав соответствует целому исходному методу; физическое обеспечение и проектная применимость проверяются отдельно.',
        ...(source?.key === 'workers' ? { additionalOperations: pack.operations.map((title, index) => ({
          operationId: r('operation:source-' + index), operationTitleRu: title, processOrdinal: index,
        })) } : {}),
      } }, source_metadata: { ...resource.source_metadata,
      sourceRole: unknown ? 'UNRESOLVED_APPLICATION_NORM' : 'ORIGINAL_RU2020_EXACT_WHOLE_COLUMN',
      ...(unknown ? { normativeTrace: [], normative_source_ids: [] } : {}),
      source_artifact_sha256: pack.source.sha256, exact_column: pack.normId,
      normativeResourceCode: source?.sourceCode ?? null, sourceLiteralRate: source?.literalRate ?? null,
      sourceUnit: source?.sourceUnit ?? null, normativeQuantityBasis: '100m3', sourceEdition: pack.source.edition,
      currentLegalComplianceClaim: false, sourceNormPricesImported: false, automaticGenericPriceInheritanceAllowed: false,
      full_technical_acceptance: false,
      ...(machineOwner ? { machinePriceCoverageRequired: 'FULL_MACHINE_SOURCE_COST', machinePriceOperationScope: 'FULL_SOURCE_OPERATION', operatorAdditionalPaidOwnerAdmitted: false } : {}),
      ...(source?.key === 'operators' ? { informationalNotAdditionalPaidOwner: true, operatorPriceIncludedInSourceMachineOperation: true } : {}),
      ...(source?.key === 'rebar' ? { printedAverageSteelRetainedOnlyAsEvidence: source.literalRate,
        actualProjectMassOnly: true, directSteelSupplyAdmitted: false, requiredWholeSupplyNeedId: r('need:reinforcement-bom-fabrication') } : {}),
      ...(source?.key === 'concrete' ? { projectConcreteSpecificationRequired: true, sourceCodeIsNotAutomaticProjectSku: true } : {}),
      ...(source?.quantityRole === 'TURNOVER_CONSUMPTION' ? { normativeTurnoverConsumptionNotInitialKitSupply: true,
        initialKitProcurementHeld: true, requiredWholeSupplyNeedId: r('need:formwork-shoring-kit') } : {}),
      ...(source?.quantityRole === 'PROJECT_AMORTIZATION' ? { sourceProjectP: true, quantityMustNotBeZeroOrOne: true,
        completeInitialKitNotDefined: true } : {}),
      ...(need ? { missingFact: need.missingRu, existingWholeOwnerCandidate: need.existingWholeOwnerCandidate,
        existingWholeOwnerFitAdmitted: false, resolutionOwner: 'APPLICATION_SOURCE_AUTHOR_AND_REAL_PROJECT_SCOPE' } : {}),
    }, row_sha256: '' };
    return { ...result, row_sha256: estimateDeterministicHash(result) };
  });
  return { ...definition, parameters, resources, ordinaryParameterIds: geometryKeys.map(g) };
}
