import pack from '../../../../data/estimate-benchmarks/source-packs/monolithic-strength-repair-hand-source-r3.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';
import { effectivePurchaseBalanceExpressionsR1, effectiveResourceQuantityParameterId } from './effectivePurchaseBalanceR1';

export const repairSourcePackR3 = pack;
export const repairParameterR3 = (key: string): string => 'mono_repair_r3_' + key;
export const repairRowR3 = (key: string): string => 'monolithic-strength-repair:r3:' + key;
const p = repairParameterR3;
const r = repairRowR3;
type RepairOperation = keyof typeof pack.operationTitles;
function operationKey(key: string): RepairOperation {
  if (!Object.prototype.hasOwnProperty.call(pack.operationTitles, key)) {
    throw new Error('REPAIR_R3_UNKNOWN_SOURCE_OPERATION:' + key);
  }
  // This predicate validates the JSON boundary before indexing the typed map.
  return key as RepairOperation;
}

/** Unpublished international profile using the exact GB product instructions.
 * Source geometry and initial station inventory use the existing compiler.
 * Technical completeness and local regulatory claims are separate contracts. */
export function buildMonolithicRepairHandSourceCandidateR3(): AutomaticOwnerDefinition {
  const active = { kind: 'greater_than' as const, parameterId: p('patch_count'), value: 0 };
  const station = { kind: 'greater_than' as const, parameterId: p('station_count'), value: 0 };
  const parameter = (key: string, title: string, unitId: string | null,
    extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({
      id: p(key), title, unitId, kind: 'conditional', valueType: 'decimal', min: 0, ...extra,
    });
  const geometryKeys = ['geometry_ref', 'length_m', 'width_m', 'depth_m', 'substrate',
    'ambient_c', 'substrate_c', 'method_ref'].map(p);
  const stationKeys = ['station_ref', 'voltage_v', 'gear', 'paddle_mm',
    'container_ref', 'paddle_key_mm'].map(p);
  // A programme may specify whole 25 kg charges and an actual water dose
  // within the manufacturer's interval. Neither is inferred from a hole,
  // station count, container capacity or theoretical patch consumption.
  const chargeProgrammeKeys = ['mixing_programme_ref', 'whole_charge_count'].map(p);
  const supplyKeys = ['dry_supply_ref', 'dry_stock_bags', 'dry_reserve_bags'].map(p);
  const conditional: AutomaticParameterSpec[] = [
    parameter('geometry_ref', 'Ведомость фактических участков ремонта', null, { valueType: 'text', requiredWhen: active }),
    parameter('method_ref', 'Программа локального ремонта выбранным составом', null, { valueType: 'text', requiredWhen: active }),
    parameter('length_m', 'Длина подготовленного участка ремонта', 'meter', { min: 0.000001, requiredWhen: active }),
    parameter('width_m', 'Ширина подготовленного участка ремонта', 'meter', { min: 0.000001, requiredWhen: active }),
    parameter('depth_m', 'Толщина одного ремонтного слоя', 'meter', {
      min: pack.rules.handLayerMinM, max: pack.rules.handLayerMaxM, requiredWhen: active }),
    parameter('substrate', 'Состояние основания выбранного способа ремонта', null, { valueType: 'enum',
      values: ['SOUND_ROUGH_NO_EXPOSED_REBAR_NO_SEPARATE_PRIMER'], requiredWhen: active }),
    ...['ambient_c', 'substrate_c'].map(key => parameter(key,
      key === 'ambient_c' ? 'Температура воздуха при ремонте, °C' : 'Температура бетона при ремонте, °C', null,
      { min: pack.rules.ambientMinC, max: pack.rules.ambientMaxC, requiredWhen: active })),
    parameter('station_count', 'Число фактически развёрнутых ремонтных постов', 'piece', { valueType: 'integer', min: 1 }),
    parameter('station_ref', 'Ведомость полного начального оснащения ремонтных постов', null, { valueType: 'text', requiredWhen: station }),
    parameter('container_ref', 'Подтверждённая ёмкость и безопасный рабочий объём замеса', null, { valueType: 'text', requiredWhen: station }),
    parameter('voltage_v', 'Напряжение выбранного ремонтного поста, В', null,
      { valueType: 'integer', min: 230, max: 230, requiredWhen: station }),
    parameter('gear', 'Механическая передача выбранного миксера', null,
      { valueType: 'integer', min: 1, max: 1, requiredWhen: station }),
    parameter('paddle_mm', 'Диаметр выбранной мешалки, мм', null,
      { valueType: 'integer', min: 140, max: 140, requiredWhen: station }),
    parameter('paddle_key_mm', 'Размер ключа для фактической мешалки, мм', null,
      { valueType: 'enum', values: ['22', '24'], requiredWhen: station }),
    parameter('mixing_programme_ref', 'Программа целых замесов и принятой дозировки воды', null,
      { valueType: 'text', requiredWhen: active }),
    parameter('whole_charge_count', 'Число предусмотренных полных замесов по 25 кг', 'piece',
      { valueType: 'integer', min: 1, requiredWhen: active }),
    parameter('water_l_per_charge', 'Дозировка воды на полный замес 25 кг', 'l',
      { min: pack.rules.waterMinLPerBag, max: pack.rules.waterMaxLPerBag, requiredWhen: active }),
    parameter('dry_supply_ref', 'Ведомость пригодных мешков выбранного ремонтного состава', null,
      { valueType: 'text', requiredWhen: active }),
    parameter('dry_stock_bags', 'Пригодные полные мешки по 25 кг в наличии', 'piece',
      { valueType: 'integer', min: 0, requiredWhen: active }),
    parameter('dry_reserve_bags', 'Полные мешки по 25 кг для сохраняемого запаса', 'piece',
      { valueType: 'integer', min: 0, requiredWhen: active }),
  ];
  const row = (key: string, operation: keyof typeof pack.operationTitles, title: string,
    unitId: string, category: string, expression: string, facts: string[]): AutomaticRowSpec => ({
      rowId: r(key), formulaId: r('formula:' + key), section: pack.operationTitles[operation],
      title, unitId, category, expression, inputParameterIds: facts,
      inclusion: active, costTreatment: 'INFORMATIONAL_SCOPE', procurement: false,
    });
  const volume = `${p('patch_count')}*${p('length_m')}*${p('width_m')}*${p('depth_m')}`;
  const rows: AutomaticRowSpec[] = [
    row('measured-volume', 'apply', 'Объём подготовленных участков ремонта', 'm3', 'control', volume, geometryKeys),
    row('theoretical-dry', 'apply', 'Ремонтный состав по теоретическому расходу', 'kg', 'material',
      `${volume}*1000*${pack.rules.dryKgPerM2PerMm}`, geometryKeys),
  ];
  const operationByKey = new Map<string, keyof typeof pack.operationTitles>([
    ['measured-volume', 'apply'], ['theoretical-dry', 'apply'],
  ]);
  const mixingFacts = [...geometryKeys, ...stationKeys, p('station_count'), ...chargeProgrammeKeys];
  const charges = p('whole_charge_count');
  const mixingRows: AutomaticRowSpec[] = [
    row('mixing-charge-dry', 'mix', 'Сухой состав для полных замесов', 'kg', 'control',
      `${charges}*${pack.rules.bagKg}`, mixingFacts),
    row('mixing-water-minimum', 'mix', 'Нижняя граница воды для замесов', 'm3', 'control',
      `${charges}*${pack.rules.waterMinLPerBag}/1000`, mixingFacts),
    row('mixing-water-maximum', 'mix', 'Верхняя граница воды для замесов', 'm3', 'control',
      `${charges}*${pack.rules.waterMaxLPerBag}/1000`, mixingFacts),
    { ...row('mixing-charge-shortage', 'mix', 'Недостающий сухой состав для ремонта', 'kg', 'control',
      `max(0,(${volume}*1000*${pack.rules.dryKgPerM2PerMm})-${charges}*${pack.rules.bagKg})`, mixingFacts),
      formulaOutputBounds: { schemaVersion: 'canonical_formula_output_bounds_v1', unitId: 'kg', maximum: 0,
        reasonRu: 'Программа целых замесов не покрывает даже теоретический расход. Потери и весь способ ремонта проверяются отдельно.' } },
  ];
  rows.push(...mixingRows);
  for (const item of mixingRows) operationByKey.set(item.rowId.slice(r('').length), 'mix');
  const supplyFacts = [...mixingFacts, p('water_l_per_charge'), ...supplyKeys];
  const consumed = `${charges}*${pack.rules.bagKg}`;
  const stock = `${p('dry_stock_bags')}*${pack.rules.bagKg}`;
  const reserve = `${p('dry_reserve_bags')}*${pack.rules.bagKg}`;
  const supply = effectivePurchaseBalanceExpressionsR1({ ownerRowId: r('dry-material-order'), orderUnitId: 'kg',
    consumed, stock, reserve, quantum: String(pack.rules.bagKg),
    manualQuantumViolationPolicy: 'retain-raw-and-block-quantum' });
  const order: AutomaticRowSpec = {
    ...row('dry-material-order', 'handle', 'Ремонтный состав для бетона, мешок 25 кг', 'kg', 'material',
      `ceil(max(0,(${consumed})+(${reserve})-(${stock}))/${pack.rules.bagKg})*${pack.rules.bagKg}`, supplyFacts),
    ...supply.owner, costTreatment: 'OWN_COST', procurement: true,
  };
  rows.push(order); operationByKey.set('dry-material-order', 'handle');
  for (const [key, title, unit, expression] of [
    ['dry-order-bags', 'Мешки ремонтного состава к приобретению', 'piece', supply.packages],
    ['dry-remaining', 'Остаток сухого ремонтного состава', 'kg', supply.remaining],
    ['dry-free', 'Свободный остаток сухого ремонтного состава', 'kg', supply.free],
    ['dry-consumption-shortage', 'Недостающий состав для замесов', 'kg', supply.consumptionShortage],
    ['dry-reserve-deficit', 'Недостающий сохраняемый запас состава', 'kg', supply.reserveDeficit],
  ] as const) {
    rows.push({ ...row(key, 'handle', title, unit, 'control', expression, supplyFacts),
      purchaseBalanceOwnerRowId: r('dry-material-order') });
    operationByKey.set(key, 'handle');
  }
  for (const item of pack.initialStationKit) {
    rows.push({ ...row(item.key, operationKey(item.operation), item.titleRu,
      'piece', 'equipment', p('station_count'), [...geometryKeys, ...stationKeys]),
      effectiveQuantityOutput: { parameterId: effectiveResourceQuantityParameterId(r(item.key)), unitId: 'piece' } });
    operationByKey.set(item.key, operationKey(item.operation));
  }
  // Count the actual retained resources, including manual edits/exclusions.
  // This checks the documented initial stock only; it cannot establish labour,
  // throughput, wear, PPE or completeness of the repair method.
  const initialKitDeviation = pack.initialStationKit.map(item => {
    const effective = effectiveResourceQuantityParameterId(r(item.key));
    return `max(0,${effective}-${p('station_count')})+max(0,${p('station_count')}-${effective})`;
  }).join('+');
  const initialKitFacts = [...geometryKeys, ...stationKeys, p('station_count')];
  rows.push(row('initial-station-kit-check', 'mix', 'Сверка начального оснащения ремонтных постов',
    'piece', 'control', initialKitDeviation, initialKitFacts));
  operationByKey.set('initial-station-kit-check', 'mix');
  for (const item of pack.unresolvedRoles) {
    if (item.key === 'mixing-water') {
      rows.push(row(item.key, 'mix', item.titleRu, item.unitId, item.category,
        `${charges}*${p('water_l_per_charge')}/1000`, [...mixingFacts, p('water_l_per_charge')]));
      operationByKey.set(item.key, 'mix');
      continue;
    }
    const key = 'application_' + item.key.replace(/-/gu, '_');
    conditional.push(parameter(key, item.titleRu, item.unitId, { kind: 'internal' }));
    rows.push(row(item.key, operationKey(item.operation),
      item.titleRu, item.unitId, item.category, p(key), geometryKeys));
    operationByKey.set(item.key, operationKey(item.operation));
  }
  const owner = buildAutomaticConstructionOwnerR1({
    contract: pack.contract, semanticOwner: 'monolithic-strength-repair:r3', sourceId: pack.sourceId,
    normId: 'GB4200-202504-HAND-PATCH-SOURCE-CANDIDATE',
    sourceMetadata: { source_title: 'Локальное восстановление бетона после испытаний',
      source_document_version: 'GB April2025 v01.02; mixer31May2022; own140mm paddle',
      definition_hash: hash(pack), exact_locator: 'PDS2-4, local restrictions5; mixerRU89-91',
      artifact_sha256: pack.sourceArtifacts[0].sha256 },
    applicabilityRu: pack.scope, ordinary: [{ id: p('patch_count'), title: 'Число одинаковых подготовленных участков ремонта',
      unitId: 'piece', kind: 'ordinary', valueType: 'integer', min: 0 }],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.notTransferred,
  });
  const publicGeometry = new Set(['patch_count', 'length_m', 'width_m', 'depth_m'].map(p));
  const parameters = owner.parameters.map(definition => {
    if (definition.parameter_id.startsWith(p('application_'))) return {
      ...definition, truth_metadata: unresolvedApplicationNormTruthR1(definition.truth_metadata,
        'Не подтверждена норма всего способа ремонта; пользователь не вводит отсутствующую норму.'),
    };
    if (definition.truth_metadata.effective_resource_quantity_v1) return definition;
    if (publicGeometry.has(definition.parameter_id)) return definition;
    // Deployment and method facts belong to the accepted programme/import,
    // never to an additional consumer questionnaire about missing norms.
    const provenance = definition.truth_metadata.provenance;
    return { ...definition, truth_metadata: { ...definition.truth_metadata,
      visibility_role: 'INTERNAL_ONLY',
      value_source_role: stationKeys.includes(definition.parameter_id) ? 'SELECTED_EQUIPMENT_PASSPORT' : 'PROJECT_DOCUMENTATION',
      provenance: { ...(provenance && typeof provenance === 'object' && !Array.isArray(provenance) ? provenance : {}),
        consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } };
  });
  const resources = owner.resources.map(resource => {
    const key = resource.row_id.slice(r('').length);
    const operation = operationByKey.get(key);
    if (!operation) throw new Error('REPAIR_R3_RESOURCE_OPERATION_MISSING:' + key);
    const operationIds = Object.keys(pack.operationTitles);
    const body = { ...resource, resource_graph: { ...resource.resource_graph,
      ...(key === 'initial-station-kit-check' ? { scopeRequirementV1: {
        contractVersion: 'canonical-scope-requirement/v1', kind: 'OBJECT_SCOPE',
        groupId: 'monolithic-strength-repair:r3', groupTitleRu: 'Начальное оснащение ремонтных постов',
        titleRu: 'Полный начальный инвентарный комплект ремонтного поста',
        reasonRu: 'Каждая предусмотренная часть должна соответствовать документированному числу развёрнутых постов. Эта сверка не закрывает остальные ресурсы и нормы ремонта.',
        exactScopeWhen: { kind: 'and', operands: [active,
          { kind: 'not', operand: { kind: 'formula_greater_than', expression: initialKitDeviation,
            unitId: 'piece', value: 0 } }] },
        coveringRowIds: pack.initialStationKit.map(item => r(item.key)), originalRowIds: [],
        objectFactParameterId: p('station_ref'), objectFactMode: 'PROJECT_APPLICABILITY_ONLY',
        unknownObjectValues: [], requiredFactParameterIds: initialKitFacts,
        sourceEvidence: [{ sha256: pack.sourceArtifacts[2].sha256,
          locator: 'RU89-91; accepted exact230V mixer and initial station programme;140mm paddle separately retained in source pack' }],
      } } : {}),
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
        groupId: 'monolithic-strength-repair:r3', groupTitleRu: 'Восстановление мест испытаний',
        operationId: r('operation:' + operation), operationTitleRu: pack.operationTitles[operation],
        processOrdinal: operationIds.indexOf(operation), processRole: 'PROCESS',
        completionCriterionRu: 'Выполнен весь применимый состав выбранной операции ремонта.' } },
      source_metadata: { ...resource.source_metadata, sourceTerritory: pack.territory,
        internationalProfile: pack.internationalProfile, localComplianceAsserted: false,
        localComplianceBlocksTechnicalProfile: false,
        sourceCandidateOnly: true, full_technical_acceptance: false, newFullTechnologies: 0,
        noNewPaidOwner: key !== 'dry-material-order', noNewProcurementOwner: key !== 'dry-material-order',
        quantityScope: key === 'dry-material-order' || key.startsWith('dry-')
          ? 'SINGLE_ACTUAL_WHOLE_CHARGE_SUPPLY_BALANCE_NOT_THEORETICAL_PATCH_WASTE_NORM'
          : key === 'mixing-water' ? 'ACTUAL_PROGRAMME_DOSE_WITHIN_EXACT_SOURCE_INTERVAL'
          : key.startsWith('mixing-water-') ? 'SOURCE_INTERVAL_LIMIT_NOT_ADDITIONAL_CONSUMPTION'
          : key === 'mixing-charge-dry' || key === 'mixing-charge-shortage' ? 'DOCUMENTED_WHOLE_CHARGE_PROGRAMME_NOT_TOTAL_REPAIR_ACCEPTANCE'
          : key === 'theoretical-dry' ? 'THEORETICAL_EXCLUDING_VARIATION_AND_WASTE'
          : key === 'measured-volume' ? 'ACTUAL_PREPARED_PATCH_GEOMETRY'
          : key === 'initial-station-kit-check' ? 'INITIAL_STATION_STOCK_DEVIATION_NOT_WHOLE_REPAIR_ACCEPTANCE'
            : pack.initialStationKit.some(item => item.key === key) ? 'DOCUMENTED_INITIAL_STATION_STOCK_ONLY'
              : 'UNRESOLVED_APPLICATION_NORM' }, row_sha256: '' };
    return { ...body, row_sha256: hash(body) };
  });
  return Object.freeze({ ...owner, parameters: Object.freeze(parameters), resources: Object.freeze(resources) });
}
