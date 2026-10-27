import pack from '../../../../data/estimate-benchmarks/source-packs/monolithic-international-stair-landing-gesn2020-r53.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
  type AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import { effectiveResourceQuantityParameterId, effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

// Private exact-column adapter. It is not registered or bound to a public card.
// Source-profile routing and each whole physical fit must precede publication.
export const internationalStairLandingPackR53 = pack;
export const LANDING_PREFIX_R53 = 'monolithic-stair-landing:gesn2020:06-20-001-01:r53';
export const landingParameterR53 = (key: string): string => 'mono_international_landing_r53_' + key;
export const landingRowR53 = (key: string): string => LANDING_PREFIX_R53 + ':' + key;
const p = landingParameterR53, r = landingRowR53;
const geometryKeys = ['length_m', 'width_m', 'thickness_mm', 'identical_count', 'work_elevation_m'];
// Only the existing canonical compiler evaluates this expression.
export const landingVolumeExpressionR53 = `${p('length_m')}*${p('width_m')}*${p('thickness_mm')}/1000*${p('identical_count')}`;
const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: 'and', operands });
const active = and(...geometryKeys.slice(0, 4).map(key => ({ kind: 'greater_than' as const, parameterId: p(key), value: 0 })),
  { kind: 'less_than_or_equal', parameterId: p('work_elevation_m'), value: 15 });

/** Finite declarations over the retained owner factory, effective quantity and
 * purchase balance. No source selection, project facts, prices or kit counts
 * are manufactured by this adapter. */
export function buildMonolithicInternationalStairLandingR53(): AutomaticOwnerDefinition {
  const ordinary: AutomaticParameterSpec[] = pack.futureOrdinaryGeometry.fields.map(field => ({
    id: p(field.key), title: field.titleRu, unitId: field.unitId,
    valueType: field.valueType === 'integer' ? 'integer' : 'decimal', kind: 'ordinary',
    min: field.key === 'identical_count' ? 1 : 0,
    ...(field.key === 'work_elevation_m' ? { max: 15 } : {}),
  }));
  const technical = (key: string, title: string, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({
    id: p(key), title, unitId: null, valueType: 'text', kind: 'conditional', requiredWhen: active, ...extra,
  });
  const facts = ['project_reference', 'rectangular_solid_geometry', 'small_panel_bracket_scaffold_method', 'concrete_feed_method'].map(p);
  const unknownIds = new Set([p('unresolved_formwork_amortization'), ...pack.needs.map(need => p('unresolved_' + need.key.replace(/-/gu, '_')))]);
  const conditional: AutomaticParameterSpec[] = [
    technical('project_reference', 'Реальная проектная документация и ППР площадок'),
    technical('rectangular_solid_geometry', 'Прямоугольные сплошные площадки по проекту'),
    technical('small_panel_bracket_scaffold_method', 'Совместимая мелкощитовая опалубка и леса на скобах по ППР'),
    technical('concrete_feed_method', 'Реальный метод подачи бетона и граница дополнительной переноски'),
    technical('project_concrete_specification', 'Проектная спецификация бетонной смеси'),
    technical('project_steel_a1_kg', 'Проектная масса арматуры класса А-I', { valueType: 'decimal', unitId: 'kg', min: 0 }),
    technical('project_steel_a3_kg', 'Проектная масса арматуры класса А-III', { valueType: 'decimal', unitId: 'kg', min: 0 }),
    technical('reinforcement_installation_scope', 'Применимость нормативного монтажа к фактическому армированию и отдельный расчёт превышения'),
    technical('machine_cost_mode', 'Единственный владелец эксплуатации нормативных механизмов', {
      valueType: 'enum', values: ['OWN_OPERATION', 'HIRED_FULL_OPERATION'],
    }),
    ...[...unknownIds].map(id => ({ id, title: id === p('unresolved_formwork_amortization')
      ? 'Проектная амортизация опалубки' : pack.needs.find(need => p('unresolved_' + need.key.replace(/-/gu, '_')) === id)!.titleRu,
      unitId: id === p('unresolved_formwork_amortization') ? 'set' : '', valueType: 'decimal' as const, kind: 'conditional' as const, min: 0 })),
  ];
  const row = (key: string, title: string, category: string, unitId: string, expression: string,
    extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
    rowId: r(key), formulaId: r('formula:' + key), title, section: 'Монолитные лестничные площадки',
    category, unitId, expression, inclusion: active, procurement: false, inputParameterIds: facts, ...extra,
  });
  const rows: AutomaticRowSpec[] = pack.rows.flatMap(source => {
    const { key, titleRu, category, unitId, quantityRole } = source;
    if (quantityRole === 'PROJECT_AMORTIZATION') return [row(key, titleRu, category, unitId, p('unresolved_formwork_amortization'), { costTreatment: 'INFORMATIONAL_SCOPE' })];
    if (quantityRole === 'PROJECT_MASS_REFERENCE_ONLY') return [row(key, titleRu, category, unitId,
      p(key === 'reinforcing-steel-a1' ? 'project_steel_a1_kg' : 'project_steel_a3_kg'), { costTreatment: 'INFORMATIONAL_SCOPE' })];
    // Source unit normalization is a pinned exact decimal, never a binary
    // floating-point multiplication (e.g. 0.0132t must be exactly13.2kg).
    const rate = source.normalizedRatePer100M3;
    if (typeof rate !== 'string' || !/^\d+(?:\.\d+)?$/u.test(rate)) throw Error('LANDING_R53_FINITE_EXACT_SOURCE_RATE_REQUIRED:' + key);
    const expression = `${p('volume_m3')}*${rate}/100`;
    if (category === 'labor') return [row(key, titleRu, category, unitId, expression, {
      costTreatment: key === 'workers' ? 'OWN_COST' : 'INFORMATIONAL_SCOPE',
      inputParameterIds: [...facts, p('reinforcement_installation_scope')],
    })];
    const effective = effectiveResourceQuantityParameterId(r(key + '-consumed'));
    const consumed = row(key + '-consumed', titleRu, category, unitId, expression, {
      costTreatment: 'INFORMATIONAL_SCOPE', effectiveQuantityOutput: { parameterId: effective, unitId },
      ...(category === 'material' ? { purchaseBalanceOwnerRowId: r(key) } : {}),
    });
    if (category === 'equipment') return [consumed, ...(['own', 'hired'] as const).map(mode => row(key + '-' + mode,
      titleRu, category, unitId, effective, { costTreatment: 'OWN_COST', procurement: mode === 'hired',
        inclusion: and(active, { kind: 'equals', parameterId: p('machine_cost_mode'), value: mode === 'own' ? 'OWN_OPERATION' : 'HIRED_FULL_OPERATION' }),
        inputParameterIds: [...facts, p('reinforcement_installation_scope')],
      }))];
    const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: r(key), orderUnitId: unitId,
      consumed: effective, stock: '0', reserve: '0', quantityMode: 'canonical_decimal', balanceScope: 'new_order_vs_required_consumption' });
    return [consumed, row(key, titleRu, category, unitId, effective, {
      costTreatment: 'OWN_COST', procurement: quantityRole !== 'TURNOVER_CONSUMPTION', ...balance.owner,
      ...(key === 'heavy-concrete' ? { titleParameterIds: [p('project_concrete_specification')],
        inputParameterIds: [...facts, p('project_concrete_specification')] } : {}),
    })];
  });
  rows.unshift(row('net-volume', 'Объём монолитных лестничных площадок', 'control', 'm3', landingVolumeExpressionR53, {
    costTreatment: 'INFORMATIONAL_SCOPE', inputParameterIds: [],
    effectiveQuantityOutput: { parameterId: p('volume_m3'), unitId: 'm3' },
  }));
  rows.push(...pack.needs.map(need => row('need:' + need.key, need.titleRu, 'service', '',
    p('unresolved_' + need.key.replace(/-/gu, '_')), { costTreatment: 'INFORMATIONAL_SCOPE' })));
  const definition = buildAutomaticConstructionOwnerR1({ contract: pack.contract, semanticOwner: pack.catalogId,
    sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: {
      source_title: 'Монолитные лестничные площадки в инвентарной мелкощитовой опалубке',
      source_document_version: pack.source.edition, definition_hash: pack.source.sha256,
      artifact_sha256: pack.source.sha256, exact_locator: pack.source.exactLocator,
    }, applicabilityRu: 'Одинаковые прямоугольные сплошные площадки, мелкощитовая инвентарная опалубка и леса на скобах; отметка работ 0–15 м. Применимость, армирование и физический комплект требуют реального проекта.',
    ordinary, profile: [], conditional, rows, deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.needs.map(need => need.missingRu),
  });
  const parameters = definition.parameters.map(parameter => {
    if (unknownIds.has(parameter.parameter_id)) return { ...parameter, required: false,
      truth_metadata: unresolvedApplicationNormTruthR1(parameter.truth_metadata, 'Приложение ещё не установило норму или целый совместимый комплект; пользователь не вводит техническую норму вместо приложения.') };
    if (parameter.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY') return parameter;
    const geometry = geometryKeys.some(key => p(key) === parameter.parameter_id);
    return { ...parameter, required: false, default_value: null,
      constraints_json: { ...parameter.constraints_json,
        ...(geometryKeys.slice(0, 3).some(key => p(key) === parameter.parameter_id) ? { exclusiveMin: 0 } : {}) },
      truth_metadata: { ...parameter.truth_metadata, visibility_role: geometry ? 'USER_INPUT' : 'INTERNAL_ONLY',
        value_source_role: geometry ? 'USER_MEASURED' : 'PROJECT_DOCUMENTATION', source_confirmation_required: false,
        provenance: { consumer_input_role_v1: geometry ? 'OBJECT_FACT' : 'APPLICATION_TECHNICAL' } },
    };
  });
  const resources = definition.resources.map(resource => {
    const key = resource.row_id.slice(LANDING_PREFIX_R53.length + 1);
    const source = pack.rows.find(source => [source.key, source.key + '-consumed', source.key + '-own', source.key + '-hired'].includes(key));
    const need = pack.needs.find(need => key === 'need:' + need.key);
    const unresolved = !!need || source?.quantityRole === 'PROJECT_AMORTIZATION';
    const body = { ...resource, resource_graph: { ...resource.resource_graph,
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: LANDING_PREFIX_R53,
        groupTitleRu: 'Монолитные лестничные площадки', operationId: r('operation:whole-cycle'),
        operationTitleRu: 'Устройство монолитной лестничной площадки',
        completionCriterionRu: 'Целый исходный метод; проектная применимость и физическое обеспечение проверяются отдельно.',
        ...(source?.key === 'workers' ? { additionalOperations: pack.operations.map((title, index) => ({
          operationId: r('operation:source-' + index), operationTitleRu: title, processOrdinal: index,
        })) } : {}),
      } }, source_metadata: { ...resource.source_metadata,
      sourceRole: unresolved ? 'UNRESOLVED_APPLICATION_NORM' : key === 'net-volume'
        ? 'COMPILER_DERIVED_GEOMETRY_NOT_NORM_QUANTITY' : 'ORIGINAL_RU2020_EXACT_WHOLE_COLUMN',
      ...(unresolved ? { normativeTrace: [], normative_source_ids: [] } : {}),
      source_artifact_sha256: pack.source.sha256, exact_column: pack.normId,
      normativeResourceCode: source?.sourceCode ?? null, sourceLiteralRate: source?.literalRate ?? null,
      sourceUnit: source?.sourceUnit ?? null, normativeQuantityBasis: '100m3',
      currentLegalComplianceClaim: false, sourceNormPricesImported: false,
      automaticGenericPriceInheritanceAllowed: false, full_technical_acceptance: false,
      ...(source?.category === 'equipment' && source.quantityRole === 'NORM' && !key.endsWith('-consumed')
        ? { machinePriceCoverageRequired: 'FULL_MACHINE_SOURCE_COST', machinePriceOperationScope: 'FULL_SOURCE_OPERATION', operatorAdditionalPaidOwnerAdmitted: false } : {}),
      ...(source?.key === 'operators' ? { informationalNotAdditionalPaidOwner: true } : {}),
      ...(source?.quantityRole === 'PROJECT_MASS_REFERENCE_ONLY' ? { printedAverageSteelRetainedOnlyAsEvidence: source.literalRate,
        actualProjectMassOnly: true, directSteelSupplyAdmitted: false, requiredWholeSupplyNeedId: r('need:whole-rebar-bbs') } : {}),
      ...(source?.quantityRole === 'TURNOVER_CONSUMPTION' ? { normativeTurnoverConsumptionNotInitialKitSupply: true, initialKitProcurementHeld: true } : {}),
      ...(need ? { missingFact: need.missingRu, existingWholeOwnerCandidate: need.existingWholeOwnerCandidate, existingWholeOwnerFitAdmitted: false } : {}),
    }, row_sha256: '' };
    return { ...body, row_sha256: estimateDeterministicHash(body) };
  });
  return { ...definition, parameters, resources, ordinaryParameterIds: geometryKeys.map(p) };
}
