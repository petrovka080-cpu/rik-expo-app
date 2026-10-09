import pack from '../../../../data/estimate-benchmarks/source-packs/hep2o15-visible-line-s27-54.json';
import accepted from '../../../../data/estimate-norms/professional/plumbing.json';
import {
  buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
} from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const hep2o15VisibleLinePackS2754 = pack;
export const hep2o15VisibleLinePrefixS2754 = (index: number) => `plumbing:hep2o15-visible:${pack.types[index]?.key ?? 'INVALID'}`;
const sleeveNorm = accepted.norm_items.find(n => n.norm_id === 'plumbing_wavin_hep2o_smartsleeve_piece_connection_v1');
if (accepted.source_pack_version !== pack.acceptedPhysicalSourceVersion || sleeveNorm?.rate.value !== 1) {
  throw Error('ACCEPTED_HEP2O_SMARTSLEEVE_PROFILE_REQUIRED');
}

// Both orientations use the existing compiler and supply balance. The selected
// visible installation has the stricter 300 mm recommendation for both types.
export function hep2o15VisibleLineDefinitionS2754(index: number): AutomaticOwnerDefinition {
  const type = pack.types[index];
  if (!type || !accepted.norm_items.some(n => n.norm_id === type.normId)) throw Error('EXACT_HEP2O15_ORIENTATION_REQUIRED');
  const prefix = hep2o15VisibleLinePrefixS2754(index);
  const facts = ['system_confirmed', 'supports_confirmed', 'joints_confirmed', 'cut_plan_confirmed', 'project_reference', 'test_program_reference'];
  const conditional: AutomaticParameterSpec[] = [
    {id: facts[0], title: 'Совместимые изделия Hep2O и режим холодного водоснабжения', valueType: 'enum', unitId: null, kind: 'conditional', values: [pack.systemValue]},
    {id: facts[1], title: 'Два концевых опорных узла и принятая равномерная раскладка', valueType: 'enum', unitId: null, kind: 'conditional', values: [pack.supportValue]},
    {id: facts[2], title: 'Две муфты и четыре обслуживаемых трубных конца', valueType: 'enum', unitId: null, kind: 'conditional', values: [pack.jointValue]},
    {id: facts[3], title: 'Непрерывная заготовка из бухты 25 м с однократным учётом вставок', valueType: 'enum', unitId: null, kind: 'conditional', values: [pack.cutValue]},
    {id: facts[4], title: 'Ссылка на принятую карту отрезка, опор, крепления и соединений', valueType: 'text', unitId: null, kind: 'conditional'},
    {id: facts[5], title: 'Ссылка на принятую программу испытания и промывки', valueType: 'text', unitId: null, kind: 'conditional'},
    {id: 'support_span_m', title: 'Расстояние между подтверждёнными концевыми опорами', valueType: 'decimal', unitId: 'linear_m', kind: 'conditional', min: 0.001, numericPeerConstraints: {lessThanOrEqualParameter: 'pipe_route_length_m'}},
    {id: 'selected_support_max_gap_m', title: 'Выбранный максимальный шаг равномерных опор видимой трубы, не более 0,3 м', valueType: 'decimal', unitId: 'linear_m', kind: 'conditional', min: 0.001, max: 0.3},
    {id: 'reusable_installed_sleeves', title: 'Пригодные втулки, уже установленные в двух существующих трубных концах', valueType: 'integer', unitId: 'pcs', kind: 'conditional', min: 0, max: 2},
  ];
  const rows: AutomaticRowSpec[] = [];
  const add = (id: string, title: string, operation: string, category: string, unitId: string, expression: string, extra: Partial<AutomaticRowSpec> = {}) => {
    rows.push({rowId: `${prefix}:${id}`, formulaId: `${prefix}:formula:${id}`, section: operation,
      category, title, unitId, expression, procurement: false, inputParameterIds: facts, ...extra});
  };
  const info = {costTreatment: 'INFORMATIONAL_SCOPE' as const};
  // The route is measured between the entry faces of the two new connectors.
  // Only the two ends of the new pipe add 32 mm each; existing ends add no new pipe.
  const cutLength = 'pipe_route_length_m+0.064';
  const supportCount = 'ceil(support_span_m/selected_support_max_gap_m)+1';
  add('support-count', 'Клипсы HX85/15W по принятой равномерной раскладке между двумя опорами', 'supports', 'material', 'pcs', supportCount, info);
  add('actual-support-gap', 'Фактический шаг принятой равномерной раскладки — без отдельной цены', 'supports', 'material', 'linear_m', `support_span_m/((${supportCount})-1)`, info);
  add('sleeves-total', 'SmartSleeve для четырёх обслуживаемых трубных концов — включая установленное пригодное наличие', 'jointing', 'material', 'pcs', '4', info);
  add('sleeves-installed', 'Пригодные SmartSleeve в существующих концах — повторно не закупаются', 'jointing', 'material', 'pcs', 'reusable_installed_sleeves', info);

  const productByRow = new Map<string, keyof typeof pack.products>();
  // One factory owns ordering and balances for all three small components.
  // Supplier quantities are explicit project facts, never manufacturer bag sizes.
  for (const [key, consumed, operation] of [
    ['clip', supportCount, 'supports'],
    ['sleeve', '4-reusable_installed_sleeves', 'jointing'],
    ['connector', '2', 'jointing'],
  ] as const) {
    for (const [suffix, title, min] of [
      ['stock', 'Пригодное новое наличие', 0], ['reserve', 'Сохраняемый резерв', 0], ['quantum', 'Фактический шаг заказа поставщика', 1],
    ] as const) conditional.push({id: `${key}_${suffix}_pcs`, title: `${title}: ${pack.products[key].sku}, шт.`, valueType: 'integer', unitId: 'pcs', kind: 'conditional', min});
    const owner = `${prefix}:${key}-order`;
    const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId: owner, orderUnitId: 'pcs', consumed,
      stock: `${key}_stock_pcs`, reserve: `${key}_reserve_pcs`, quantum: `${key}_quantum_pcs`});
    add(`${key}-consumed`, `${pack.products[key].nameRu} — новая потребность по принятой схеме`, operation, 'material', 'pcs', consumed, {...info, purchaseBalanceOwnerRowId: owner});
    add(`${key}-order`, pack.products[key].nameRu, operation, 'material', 'pcs', `ceil(max(0,(${consumed})+${key}_reserve_pcs-${key}_stock_pcs)/${key}_quantum_pcs)*${key}_quantum_pcs`, {procurement: true, ...balance.owner});
    add(`${key}-remaining`, `${pack.products[key].sku} — пригодный остаток новых деталей`, operation, 'material', 'pcs', balance.remaining, {...info, purchaseBalanceOwnerRowId: owner});
    for (const suffix of ['consumed', 'order', 'remaining']) productByRow.set(`${key}-${suffix}`, key);
  }
  for (const [id, title, min] of [
    ['pipe_stock_coils', 'Пригодные целые бухты HXX25/15W по 25 м в наличии', 0],
    ['pipe_reserve_coils', 'Сохраняемый резерв целых бухт HXX25/15W', 0],
    ['pipe_supplier_coil_multiple', 'Фактическая кратность поставщика в бухтах HXX25/15W', 1],
  ] as const) conditional.push({id, title, valueType: 'integer', unitId: 'pcs', kind: 'conditional', min});
  const pipeOwner = `${prefix}:pipe-order`;
  const pipeBalance = effectivePurchaseBalanceExpressionsR1({ownerRowId: pipeOwner, orderUnitId: 'linear_m', consumed: cutLength,
    stock: 'pipe_stock_coils*25', reserve: 'pipe_reserve_coils*25', quantum: 'pipe_supplier_coil_multiple*25'});
  add('pipe-consumed', 'HXX25/15W — новая заготовка с двумя номинальными заходами по 32 мм', 'cutting', 'material', 'linear_m', cutLength, {...info, purchaseBalanceOwnerRowId: pipeOwner});
  add('pipe-order', pack.products.pipe.nameRu, 'cutting', 'material', 'linear_m', 'ceil(max(0,1+pipe_reserve_coils-pipe_stock_coils)/pipe_supplier_coil_multiple)*pipe_supplier_coil_multiple*25', {procurement: true, ...pipeBalance.owner});
  add('pipe-ordered-coils', 'Целые бухты HXX25/15W по 25 м в заказе — без второй цены', 'cutting', 'material', 'pcs', `${pipeBalance.effective}/25`, {...info, purchaseBalanceOwnerRowId: pipeOwner});
  add('pipe-plan-coverage', 'Контроль обеспечения непрерывной заготовки и резерва бухт', 'cutting', 'material', 'pcs', `pipe_stock_coils+${pipeBalance.effective}/25-pipe_reserve_coils-1`, {
    ...info, purchaseBalanceOwnerRowId: pipeOwner, formulaOutputBounds: {schemaVersion: 'canonical_formula_output_bounds_v1', unitId: 'pcs', minimum: 0, reasonRu: 'Нет целой бухты для принятой непрерывной заготовки или не обеспечен резерв'},
  });
  add('pipe-remaining', 'HXX25/15W — пригодный остаток трубы после новой заготовки, не отходы', 'cutting', 'material', 'linear_m', pipeBalance.remaining, {...info, purchaseBalanceOwnerRowId: pipeOwner});
  for (const suffix of ['consumed', 'order', 'ordered-coils', 'plan-coverage', 'remaining']) productByRow.set(`pipe-${suffix}`, 'pipe');
  for (const gap of pack.sourceNeeds) {
    const id = `open_qty_${gap.id.replaceAll('-', '_')}`;
    conditional.push({id, title: gap.nameRu, valueType: 'decimal', unitId: gap.unitId, kind: 'conditional', min: 0});
    add(gap.id, gap.nameRu, gap.operation, gap.category, gap.unitId, id);
  }
  const built = buildAutomaticConstructionOwnerR1({contract: pack.contract, semanticOwner: prefix, sourceId: pack.sourceId, normId: type.normId,
    sourceMetadata: {source_title: 'Wavin Hep2O: конкретные изделия и подтверждённая схема прямого видимого участка', source_document_version: pack.source.edition,
      definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256, exact_locator: pack.source.locatorRu}, applicabilityRu: pack.scopeRu,
    ordinary: [{id: 'pipe_route_length_m', title: 'Расстояние вдоль оси нового участка между входными торцами двух муфт, без заходов внутрь', valueType: 'decimal', unitId: 'linear_m', kind: 'ordinary', min: 0.001, max: 24.936}],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.excludedRu});
  const required = new Set(facts);
  const operations: Record<string, [string, number]> = {
    protection: ['Доступ и защита рабочей зоны', 5], cutting: ['Резка новой заготовки Hep2O', 10],
    supports: ['Крепление и равномерная раскладка видимых опор', 20], jointing: ['Подготовка концов, SmartSleeve и две прямые муфты', 30],
    installation: ['Монтаж участка и проверка соединений', 40], testing: ['Гидроиспытание и промывка по принятой программе', 50], completion: ['Доставка, уборка и пригодные остатки', 60],
  };
  return {...built, parameters: built.parameters.map(p => ({...p, required: p.required || required.has(p.parameter_id),
    truth_metadata: p.parameter_id.startsWith('open_qty_') ? {...p.truth_metadata, visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM',
      provenance: {consumer_input_role_v1: 'APPLICATION_TECHNICAL'}, unresolved_norm_reason: 'Часы, точный крепёж, оснастка и дополнительные количества требуют подтверждённого источника/узла.'}
      : {...p.truth_metadata, source_confirmation_required: false}})), resources: built.resources.map(resource => {
    const key = resource.row_id.slice(prefix.length + 1), gap = pack.sourceNeeds.find(g => g.id === key);
    const productKey = productByRow.get(key), product = productKey ? pack.products[productKey] : undefined;
    const operation = gap?.operation ?? (key.startsWith('pipe-') ? 'cutting' : /support|clip/.test(key) ? 'supports' : 'jointing');
    const details = gap ? [gap.reasonRu] : product ? [
      productKey === 'pipe' ? 'Применение: расстояние между входными торцами двух муфт плюс два номинальных захода новой трубы по 32 мм, включая втулки. Заходы существующих концов не увеличивают закупку новой трубы. Заготовка не более 25 м; пригодный остаток сохраняется.'
        : productKey === 'clip' ? 'Применение: подтверждённые концевые опоры и равномерные промежуточные опоры видимого прямого участка. Длина между опорами отдельно от заготовки; шаг не более 0,3 м.'
        : productKey === 'sleeve' ? 'Применение: четыре обслуживаемых конца именно трубы Hep2O. Пригодные уже установленные втулки уменьшают новую потребность; новое наличие и резерв учитываются отдельно.'
        : 'Применение: две новые прямые муфты выбранной схемы, по одному соединению на каждом конце нового участка. Штатная смазка не закупается второй раз.',
      'Наличие, резерв и кратность поставщика заданы явно. Фасовка мелких деталей из таблицы не выдумана; один владелец стоимости каждого изделия.',
    ] : ['Контроль принятой схемы. Эта строка не создаёт отдельной цены; концевой фитинг не заменяет подтверждённую опору.'];
    const {row_sha256: _old, ...content} = resource;
    const result = {...content, resource_graph: {...resource.resource_graph,
      operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: prefix, groupTitleRu: type.titleRu,
        operationId: `${prefix}:${operation}`, operationTitleRu: operations[operation][0], processOrdinal: operations[operation][1],
        completionCriterionRu: 'Приняты поставленная система, концевые опоры, карта заготовки, четыре трубных конца и программа испытаний; повторная оплата исключена.'},
      publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: resource.title_ru,
        nameRu: resource.title_ru, brandAndModelRu: product ? `Wavin Hep2O ${product.sku}` : null,
        specificationRu: gap ? null : product?.specificationRu ?? null, detailsRu: details}},
      source_metadata: {...resource.source_metadata, normativeTrace: [], official_url: pack.source.officialUrl, source_artifact_sha256: pack.source.sha256,
        exact_locator: product?.locatorRu ?? pack.source.locatorRu, sourceRole: gap ? 'UNRESOLVED_INSTALLATION_QUANTITY' : 'CONFIRMED_PROJECT_GEOMETRY_AND_EXACT_PRODUCT_SUPPLY_BALANCE',
        visibleSupportGapMaxM: 0.3, supportSpanExcludesFittingInsertions: true, preparedPipeEnds: 4, installedSleevesNotRebought: true,
        supplierPackagingNotAssumed: true, orientation: type.key, full_technical_acceptance: false}};
    return {...result, row_sha256: estimateDeterministicHash(result)};
  })};
}

export function compileHep2o15VisibleLineS2754(index: number, input: Record<string, unknown>) {
  return compileAutomaticConstructionOwnerR1({catalogId: pack.types[index].catalogId, compilerVersion: pack.contract,
    primaryMeasureParameterId: 'pipe_route_length_m', definition: hep2o15VisibleLineDefinitionS2754(index), submittedParameters: input});
}

export function hep2o15VisibleLineCompletenessMapS2754(index: number) {
  const prefix = hep2o15VisibleLinePrefixS2754(index);
  return {contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'PRODUCT_SYSTEM_TDS', generatedFromCurrentRows: false,
    evidenceSha256: pack.source.sha256, evidenceReferences: [pack.source.officialUrl, pack.source.locatorRu, pack.acceptedPhysicalSourcePack], entries: [
      ...(['pipe', 'clip', 'sleeve', 'connector'] as const).map(key => ({expectedResourceId: key, operationId: key === 'pipe' ? 'cutting' : key === 'clip' ? 'supports' : 'jointing',
        category: 'material', specification: pack.products[key].nameRu, condition: 'CONFIRMED_EXACT_TWO_CONNECTOR_VISIBLE_LINE', sourceId: pack.sourceId,
        unitId: key === 'pipe' ? 'linear_m' : 'pcs', quantityRule: key === 'sleeve' ? 'FOUR_PREPARED_PIPE_ENDS_MINUS_SERVICEABLE_INSTALLED_SLEEVES' : 'CONFIRMED_PROJECT_CUT_OR_SUPPORT_OR_JOINT_LAYOUT',
        formulaId: `${prefix}:formula:${key}-consumed`, resolution: {kind: 'ROW', rowId: `${prefix}:${key}-consumed`}})),
      ...pack.sourceNeeds.map(gap => ({expectedResourceId: gap.id, operationId: gap.operation, category: gap.category, specification: gap.nameRu,
        condition: 'OPEN_APPLICABLE_SOURCE_OR_PROJECT_SCOPE', sourceId: pack.sourceId, unitId: gap.unitId, quantityRule: 'OPEN_NO_ASSUMED_QUANTITY',
        formulaId: `${prefix}:formula:${gap.id}`, resolution: {kind: 'ROW', rowId: `${prefix}:${gap.id}`}})),
    ]};
}
