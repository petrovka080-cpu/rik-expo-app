import pack from '../../../../data/estimate-benchmarks/source-packs/monolithic-international-stair-flights-gesn2020-r54.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
  type AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import { effectiveResourceQuantityParameterId, effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';

export const internationalStairFlightsPackR54 = pack;
export const FLIGHT_COLUMNS_R54 = ['06-19-005-01', '06-19-005-02'] as const;
export type FlightColumnR54 = typeof FLIGHT_COLUMNS_R54[number];
export const flightPrefixR54 = (column: FlightColumnR54): string => `monolithic-stair-flight:gesn2020:${column}:r54`;
export const flightParameterR54 = (column: FlightColumnR54, key: string): string =>
  `mono_international_flight_${column.replaceAll('-', '_')}_r54_${key}`;
export const flightRowR54 = (column: FlightColumnR54, key: string): string => flightPrefixR54(column) + ':' + key;

/** Exact source data over the existing automatic owner, compiler, effective
 * quantities and purchase balance. This adapter performs no source selection,
 * geometric inference, project design, price lookup or physical kit sizing. */
export function buildMonolithicInternationalStairFlightR54(column: FlightColumnR54): AutomaticOwnerDefinition {
  const sourceColumn = pack.columns.find(c => c.normId === column);
  if (!sourceColumn) throw Error('FLIGHT_R54_EXACT_WHOLE_COLUMN_REQUIRED');
  const p = (key: string) => flightParameterR54(column, key);
  const r = (key: string) => flightRowR54(column, key);
  const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: 'and', operands });
  const active = and({ kind: 'greater_than', parameterId: p('volume_m3'), value: 0 },
    { kind: 'less_than_or_equal', parameterId: p('work_elevation_m'), value: 15 });
  const ordinary: AutomaticParameterSpec[] = pack.ordinaryFields.map(field => ({
    id: p(field.key), title: field.titleRu, unitId: field.unitId, valueType: 'decimal', kind: 'ordinary', min: 0,
    ...(field.key === 'work_elevation_m' ? { max: 15 } : {}),
  }));
  const technical = (key: string, title: string, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({
    id: p(key), title, unitId: null, valueType: 'text', kind: 'conditional', requiredWhen: active, ...extra,
  });
  const unknownIds = new Set([p('unresolved_formwork_amortization'), ...pack.needs.map(n => p('unresolved_' + n.key.replaceAll('-', '_')))]);
  const facts = ['project_reference', 'actual_flight_geometry', 'inventory_formwork_bucket_method'].map(p);
  const conditional: AutomaticParameterSpec[] = [
    technical('project_reference', 'Реальная проектная документация и ППР лестничных маршей'),
    technical('actual_flight_geometry', 'Соответствие реальной геометрии выбранному виду марша'),
    technical('inventory_formwork_bucket_method', 'Совместимая инвентарная опалубка и подача бетона в бадьях по ППР'),
    technical('project_concrete_specification', 'Проектная спецификация бетонной смеси'),
    technical('project_steel_kg', 'Проектная масса арматуры по ведомости', { valueType: 'decimal', unitId: 'kg', min: 0 }),
    technical('reinforcement_installation_scope', 'Фактическое армирование и отдельная установка при превышении исходной массы'),
    technical('machine_cost_mode', 'Единственный владелец эксплуатации нормативных механизмов', {
      valueType: 'enum', values: ['OWN_OPERATION', 'HIRED_FULL_OPERATION'],
    }),
    ...[...unknownIds].map(id => ({ id, title: id === p('unresolved_formwork_amortization')
      ? 'Проектная амортизация опалубки' : pack.needs.find(n => p('unresolved_' + n.key.replaceAll('-', '_')) === id)!.titleRu,
      unitId: id === p('unresolved_formwork_amortization') ? 'set' : '', valueType: 'decimal' as const,
      kind: 'conditional' as const, min: 0 })),
  ];
  const row = (key: string, title: string, category: string, unitId: string, expression: string,
    extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({ rowId: r(key), formulaId: r('formula:' + key),
    section: 'Монолитные лестничные марши', title, category, unitId, expression, inclusion: active,
    procurement: false, inputParameterIds: facts, ...extra });
  const rows: AutomaticRowSpec[] = sourceColumn.rows.flatMap(source => {
    const { key, titleRu, category, unitId, quantityRole } = source;
    if (quantityRole === 'PROJECT_AMORTIZATION') return [row(key, titleRu, category, unitId,
      p('unresolved_formwork_amortization'), { costTreatment: 'INFORMATIONAL_SCOPE' })];
    if (quantityRole === 'PROJECT_MASS_REFERENCE_ONLY') return [row(key, titleRu, category, unitId,
      p('project_steel_kg'), { costTreatment: 'INFORMATIONAL_SCOPE' })];
    const rate = source.normalizedRatePer100M3;
    if (typeof rate !== 'string' || !/^\d+(?:\.\d+)?$/u.test(rate)) throw Error('FLIGHT_R54_EXACT_DECIMAL_RATE_REQUIRED:' + key);
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
        inclusion: and(active, { kind: 'equals', parameterId: p('machine_cost_mode'),
          value: mode === 'own' ? 'OWN_OPERATION' : 'HIRED_FULL_OPERATION' }),
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
  rows.unshift(row('net-volume', 'Объём монолитных лестничных маршей', 'control', 'm3', p('volume_m3'), {
    costTreatment: 'INFORMATIONAL_SCOPE', inputParameterIds: [],
  }));
  rows.push(...pack.needs.map(n => row('need:' + n.key, n.titleRu, 'service', '', p('unresolved_' + n.key.replaceAll('-', '_')),
    { costTreatment: 'INFORMATIONAL_SCOPE' })));
  const definition = buildAutomaticConstructionOwnerR1({ contract: pack.contract, semanticOwner: pack.catalogId,
    sourceId: pack.sourceId, normId: column, sourceMetadata: {
      source_title: 'Монолитные лестничные марши в инвентарной опалубке с подачей бетона в бадьях',
      source_document_version: pack.source.edition, definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256,
      exact_locator: 'PDF72/73 exact whole ' + column + '; general1.6.1/2/4/6/17/39/40/41/42/43/44/45',
    }, applicabilityRu: sourceColumn.choiceRu + '; отметка работ 0–15 м. Фактическая применимость, армирование и целые физические комплекты требуют проекта.',
    ordinary, profile: [], conditional, rows, deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.needs.map(n => n.missingRu),
  });
  const parameters = definition.parameters.map(parameter => {
    if (unknownIds.has(parameter.parameter_id)) return { ...parameter, required: false,
      truth_metadata: unresolvedApplicationNormTruthR1(parameter.truth_metadata,
        'Приложение ещё не установило целый совместимый комплект или норму; технический расчёт остаётся задачей приложения.') };
    if (parameter.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY') return parameter;
    const measured = pack.ordinaryFields.some(f => p(f.key) === parameter.parameter_id);
    return { ...parameter, required: measured, default_value: null,
      constraints_json: { ...parameter.constraints_json, ...(parameter.parameter_id === p('volume_m3') ? { exclusiveMin: 0 } : {}) },
      truth_metadata: { ...parameter.truth_metadata, visibility_role: measured ? 'USER_INPUT' : 'INTERNAL_ONLY',
        value_source_role: measured ? 'USER_MEASURED' : 'PROJECT_DOCUMENTATION', source_confirmation_required: false,
        provenance: { consumer_input_role_v1: measured ? 'OBJECT_FACT' : 'APPLICATION_TECHNICAL' } },
    };
  });
  const resources = definition.resources.map(resource => {
    const key = resource.row_id.slice(flightPrefixR54(column).length + 1);
    const source = sourceColumn.rows.find(s => [s.key, s.key + '-consumed', s.key + '-own', s.key + '-hired'].includes(key));
    const need = pack.needs.find(n => key === 'need:' + n.key);
    const unresolved = !!need || source?.quantityRole === 'PROJECT_AMORTIZATION';
    const body = { ...resource, resource_graph: { ...resource.resource_graph,
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: flightPrefixR54(column),
        groupTitleRu: 'Монолитные лестничные марши', operationId: r('operation:whole-cycle'),
        operationTitleRu: 'Устройство монолитного лестничного марша',
        completionCriterionRu: 'Целый исходный метод; фактическая применимость и физическое обеспечение проверяются отдельно.',
        ...(source?.key === 'workers' ? { additionalOperations: pack.operations.map((title, index) => ({
          operationId: r('operation:source-' + index), operationTitleRu: title, processOrdinal: index,
        })) } : {}),
      } }, source_metadata: { ...resource.source_metadata,
        sourceRole: unresolved ? 'UNRESOLVED_APPLICATION_NORM' : key === 'net-volume'
          ? 'USER_MEASURED_OBJECT_VOLUME_NOT_NORM' : 'ORIGINAL_RU2020_EXACT_WHOLE_COLUMN',
        ...(unresolved ? { normativeTrace: [], normative_source_ids: [] } : {}),
        source_artifact_sha256: pack.source.sha256, exact_column: column,
        normativeResourceCode: source?.sourceCode ?? null, sourceLiteralRate: source?.literalRate ?? null,
        sourceUnit: source?.sourceUnit ?? null, normativeQuantityBasis: '100m3',
        currentLegalComplianceClaim: false, sourceNormPricesImported: false, automaticGenericPriceInheritanceAllowed: false,
        full_technical_acceptance: false,
        ...(source?.category === 'equipment' && source.quantityRole === 'NORM' && !key.endsWith('-consumed')
          ? { machinePriceCoverageRequired: 'FULL_MACHINE_SOURCE_COST', machinePriceOperationScope: 'FULL_SOURCE_OPERATION',
            operatorAdditionalPaidOwnerAdmitted: false } : {}),
        ...(source?.key === 'operators' ? { informationalNotAdditionalPaidOwner: true } : {}),
        ...(source?.quantityRole === 'PROJECT_MASS_REFERENCE_ONLY' ? { printedAverageSteelRetainedOnlyAsEvidence: source.literalRate,
          actualProjectMassOnly: true, directSteelSupplyAdmitted: false, requiredWholeSupplyNeedId: r('need:whole-rebar-bbs') } : {}),
        ...(source?.quantityRole === 'TURNOVER_CONSUMPTION' ? { normativeTurnoverConsumptionNotInitialKitSupply: true,
          initialKitProcurementHeld: true } : {}),
        ...(need ? { missingFact: need.missingRu, existingWholeOwnerCandidate: need.existingWholeOwnerCandidate,
          existingWholeOwnerFitAdmitted: false } : {}),
      }, row_sha256: '' };
    return { ...body, row_sha256: hash(body) };
  });
  return { ...definition, parameters, resources, ordinaryParameterIds: pack.ordinaryFields.map(f => p(f.key)) };
}
