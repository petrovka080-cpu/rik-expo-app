import pack from '../../../../data/estimate-benchmarks/source-packs/socket-composable-surface-two-gang-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec}
  from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const socketComposableTwoGangPackR1 = pack;
export const socketComposableTwoGangRowR1 = (suffix: string) => pack.prefix + ':' + suffix;
const id = (suffix: string) => pack.parameterPrefix + suffix.replaceAll('-', '_');
const required = {kind: 'equals' as const, parameterId: pack.methodParameterId, value: pack.method};
const active = {kind: 'selected', parameterId: pack.methodParameterId, value: pack.method};
const common = [id('node_count'), id('project_reference'), id('object_fit'), id('source_readback')];
const text = (suffix: string, title: string): AutomaticParameterSpec => ({id: id(suffix), title,
  valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: required});

/** An unadmitted internal profile of the existing socket work, not a catalog,
 * compiler, installation rate or approved project. The unresolved source field
 * cannot be supplied through either public or trusted parameters in the core. */
export function socketComposableTwoGangCandidateR1(): AutomaticOwnerDefinition & {
  publicationAllowed: false; sourceAuthorityPromoted: false; fullTechnicalAcceptance: false;
} {
  const conditional: AutomaticParameterSpec[] = [
    {id: pack.methodParameterId, title: 'Профиль установки розетки', valueType: 'enum', unitId: null,
      kind: 'conditional', values: [pack.legacyMethod, pack.completeSingleMethod, pack.method]},
    {id: id('node_count'), title: 'Фактическое число двухместных розеточных узлов', valueType: 'integer',
      unitId: 'pcs', kind: 'conditional', min: 1, requiredWhen: required},
    text('project_reference', 'Ведомость узлов, основание, крепёж, подготовленный ввод и программа приёмки: документ и позиции'),
    text('object_fit', 'Фактические изделие и партия, совместимость ввода, места установки и допуск работ: документы проверки'),
    {id: id('source_readback'), title: 'Проверка первоисточника составного розеточного узла', valueType: 'text',
      unitId: null, kind: 'internal', requiredWhen: required},
    text('price_scope', 'Документы раздельных границ цен поставки, полного труда и внешней логистики'),
    {id: id('fixing'), title: 'Крепление к подготовленному основанию', valueType: 'enum', unitId: null,
      kind: 'conditional', values: pack.fixingModes, requiredWhen: required},
    text('own_equipment_schedule', 'Пригодный собственный инструмент, измерительные принадлежности и СИЗ: ведомость и документы состояния'),
    {id: id('whole_labour_h'), title: 'Фактический полный труд монтажа, подключения, проверок, обращения и уборки',
      valueType: 'decimal', unitId: 'man_hour', kind: 'conditional', min: 0.000001, requiredWhen: required},
    {id: id('qa_count'), title: 'Фактическое число проверок по принятой программе', valueType: 'integer',
      unitId: 'test', kind: 'conditional', min: 1, requiredWhen: required},
    ...(['delivery_trips', 'waste_trips'] as const).map(suffix => ({id: id(suffix),
      title: suffix === 'delivery_trips' ? 'Фактические рейсы внешней доставки' : 'Фактические рейсы внешнего вывоза отходов',
      valueType: 'integer' as const, unitId: 'trip', kind: 'conditional' as const, min: 0, requiredWhen: required})),
  ];
  const rows: AutomaticRowSpec[] = [];
  const balances: {key: string; owner: string}[] = [];
  for (const material of pack.materials) {
    const condition = material.mode === 'required' ? required : {kind: 'and' as const, operands: [required,
      material.mode === 'dowels'
        ? {kind: 'equals' as const, parameterId: id('fixing'), value: pack.fixingModes[1]!}
        : {kind: 'equals' as const, parameterId: id(material.key + '_applicability'), value: pack.neededValue}]};
    if (material.mode === 'optional') conditional.push({id: id(material.key + '_applicability'),
      title: 'Требуется ли по ППР: ' + material.titleRu, valueType: 'enum', unitId: null, kind: 'conditional',
      values: [pack.neededValue, pack.notNeededValue], requiredWhen: required});
    const quantity = material.quantityOrigin === 'one-per-node' ? id('node_count') : id(material.key + '_count');
    if (material.quantityOrigin !== 'one-per-node') conditional.push({id: quantity,
      title: material.titleRu + ': фактический итог ведомости', valueType: 'integer', unitId: 'pcs',
      kind: 'conditional', min: 1, requiredWhen: condition});
    const spec = id(material.key + '_specification');
    conditional.push({id: spec, title: 'Принятая поставочная спецификация: ' + material.titleRu,
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: condition});
    const stock = id(material.key + '_stock'), reserve = id(material.key + '_reserve'), quantum = id(material.key + '_quantum');
    for (const [parameterId, title, min] of [[stock, 'Пригодное наличие', 0], [reserve, 'Сохраняемый резерв', 0],
      [quantum, 'Подтверждённая кратность поставки', 1]] as const) conditional.push({id: parameterId,
      title: title + ': ' + material.titleRu, valueType: 'integer', unitId: 'pcs', kind: 'conditional', min, requiredWhen: condition});
    const stockFit = id(material.key + '_stock_fit');
    conditional.push({id: stockFit, title: 'Пригодность и точная комплектность имеющегося остатка: ' + material.titleRu,
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: {kind: 'and', operands: [condition,
        {kind: 'greater_than', parameterId: stock, value: 0}]}});
    const owner = socketComposableTwoGangRowR1(material.key + ':order');
    const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId: owner, orderUnitId: 'pcs',
      consumed: quantity, stock, reserve, quantum, manualQuantumViolationPolicy: 'retain-raw-and-block-quantum'});
    balances.push({key: material.key, owner});
    const facts = [...common, id('fixing'), spec, stockFit];
    const add = (suffix: string, title: string, expression: string, extra: Partial<AutomaticRowSpec> = {}) => rows.push({
      rowId: socketComposableTwoGangRowR1(material.key + ':' + suffix),
      formulaId: socketComposableTwoGangRowR1('formula:' + material.key + ':' + suffix),
      section: 'Составной двухместный розеточный узел', category: 'material', title, unitId: 'pcs', expression,
      procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', inputParameterIds: facts, inclusion: condition, ...extra});
    add('consumed', material.titleRu, quantity, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', purchaseBalanceOwnerRowId: owner});
    add('order', material.titleRu + ' к поставке', `ceil(max(0,${quantity}+${reserve}-${stock})/${quantum})*${quantum}`,
      {procurement: true, costTreatment: 'OWN_COST', ...balance.owner, inputParameterIds: [...facts, id('price_scope')]});
    add('remaining', material.titleRu + ': остаток после установки', balance.remaining, {purchaseBalanceOwnerRowId: owner});
    add('free', material.titleRu + ': свободный остаток', balance.free, {purchaseBalanceOwnerRowId: owner});
    add('shortage', material.titleRu + ': недостаёт для монтажа', balance.consumptionShortage, {purchaseBalanceOwnerRowId: owner});
    add('reserve-deficit', material.titleRu + ': непокрытый резерв', balance.reserveDeficit, {purchaseBalanceOwnerRowId: owner});
  }
  for (const tool of pack.ownEquipment) {
    const quantity = id('own_' + tool.key + '_count');
    conditional.push({id: quantity, title: 'Фактическое собственное оснащение: ' + tool.titleRu,
      valueType: 'integer', unitId: tool.unitId, kind: 'conditional', min: 1, requiredWhen: required});
    rows.push({rowId: socketComposableTwoGangRowR1('own:' + tool.key), formulaId: socketComposableTwoGangRowR1('formula:own:' + tool.key),
      section: 'Собственное оснащение', category: 'equipment', title: tool.titleRu, unitId: tool.unitId,
      expression: quantity, costTreatment: 'INFORMATIONAL_SCOPE', procurement: false,
      inputParameterIds: [...common, id('own_equipment_schedule')], inclusion: required});
  }
  const addService = (key: string, title: string, unitId: string, expression: string,
    costTreatment: AutomaticRowSpec['costTreatment'], procurement: boolean) => rows.push({
      rowId: socketComposableTwoGangRowR1(key), formulaId: socketComposableTwoGangRowR1('formula:' + key),
      section: 'Монтаж и обеспечение розеточного узла', category: key === 'whole-labour' ? 'construction_work' : 'service',
      title, unitId, expression, costTreatment, procurement, inclusion: required,
      inputParameterIds: [...common, id('own_equipment_schedule'), id('qa_count'), id('price_scope')]});
  addService('whole-labour', 'Труд монтажа, подключения, проверок, обращения и уборки', 'man_hour', id('whole_labour_h'), 'OWN_COST', false);
  addService('qa-included', 'Проверки розеточных узлов по принятой программе', 'test', id('qa_count'), 'INCLUDED_IN_RESOURCE_ROWS', false);
  addService('delivery', 'Внешняя доставка розеточных изделий и крепежа', 'trip', id('delivery_trips'), 'OWN_COST', true);
  addService('waste-removal', 'Внешний вывоз упаковки и отходов', 'trip', id('waste_trips'), 'OWN_COST', true);
  // Physical factory contents of one box, not extra procurement or an installation rate.
  for (const part of pack.factoryIncludedBoxParts) rows.push({
    rowId: socketComposableTwoGangRowR1('box:factory-' + part.key),
    formulaId: socketComposableTwoGangRowR1('formula:box:factory-' + part.key),
    section: 'Заводской состав накладной коробки', category: 'material', title: part.titleRu, unitId: 'pcs',
    expression: `${id('node_count')} * ${part.countPerBox}`, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS',
    procurement: false, inputParameterIds: common, inclusion: required});
  const built = buildAutomaticConstructionOwnerR1({contract: pack.contract, semanticOwner: pack.catalogId,
    sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: {source_title: pack.titleRu,
      source_document_version: 'F03973EN/00 + F03421EN/02; EXACT_PAIR_ADMISSION_PENDING', definition_hash: hash(pack),
      artifact_sha256: pack.sources[0]!.sha256, exact_locator: pack.sources[0]!.locator},
    applicabilityRu: pack.scopeRu, ordinary: [], profile: [], conditional, rows,
    deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.excludedRu});
  const parameters = built.parameters.map(p => {
    // Exact product evidence does not verify PPR, stock, hours or trips.
    // Keep derived quantity bindings and the unresolved application source;
    // neither inherits the builder's fixed product-verification guide.
    const {guide: oldGuide, ...baseTruth} = p.truth_metadata;
    const {verified_at: _unearned, source_snapshot_hash: _productNotProjectEvidence, ...guide} =
      oldGuide !== null && typeof oldGuide === 'object' && !Array.isArray(oldGuide) ? oldGuide as Record<string, unknown> : {};
    const truth = {...baseTruth, projectAuthenticated: false, sourceAuthorityPromoted: false};
    if (p.parameter_id === id('source_readback')) return {...p, truth_metadata: unresolvedApplicationNormTruthR1(truth, pack.sourceHoldRu)};
    if (p.truth_metadata.visibility_role === 'INTERNAL_ONLY') return {...p, truth_metadata: truth};
    return {...p, truth_metadata: {...truth, value_source_role: 'PROJECT_SPECIFIC_INPUT', source_confirmation_required: false,
      provenance: {consumer_input_role_v1: 'OBJECT_FACT'}, guide: {...guide, guide_kind: 'PROJECT_DEFINED',
        source_role: 'ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING', source_document: pack.sourceId, source_locator: p.title_ru}}};
  });
  const resources = built.resources.map(r => {
    const balance = balances.find(b => r.row_id === socketComposableTwoGangRowR1(b.key + ':consumed'));
    const qa = r.row_id === socketComposableTwoGangRowR1('qa-included');
    const factoryPart = pack.factoryIncludedBoxParts.find(part => r.row_id === socketComposableTwoGangRowR1('box:factory-' + part.key));
    const parentOwner = balance?.owner ?? (factoryPart ? socketComposableTwoGangRowR1('box:order')
      : qa ? socketComposableTwoGangRowR1('whole-labour') : null);
    const {row_sha256: _before, ...body} = r;
    const suffix = r.row_id.slice(pack.prefix.length + 1);
    const material = pack.materials.find(m => suffix.startsWith(m.key + ':'));
    const tool = pack.ownEquipment.find(t => suffix === 'own:' + t.key);
    const operations = material?.operations ?? tool?.operations ?? (suffix === 'whole-labour'
      ? pack.operations.map(o => o.id) : suffix === 'qa-included' ? ['qa-close']
        : suffix === 'delivery' ? ['delivery'] : ['cleanup']);
    const operationRefs = operations.map(key => {
      const operation = pack.operations.find(o => o.id === key);
      if (!operation) throw Error('SOCKET_COMPOSABLE_EXACT_OPERATION_REQUIRED:' + key);
      return {operationId: pack.prefix + ':' + key, operationTitleRu: operation.titleRu,
        processOrdinal: pack.operations.indexOf(operation), processRole: 'PROCESS' as const,
        completionCriterionRu: 'Объём выполнен по принятому ППР; допуск, источник и фактическая приёмка не следуют из наличия ресурса.'};
    });
    if (!operationRefs[0]) throw Error('SOCKET_COMPOSABLE_OPERATION_CONSUMER_REQUIRED');
    const formula = built.formulas.find(f => f.formula_id === r.formula_id);
    if (!formula) throw Error('SOCKET_COMPOSABLE_EXACT_FORMULA_REQUIRED');
    const next = {...body, inclusion_ast: {kind: 'and', operands: [active, r.inclusion_ast]},
      cost_owner_id: parentOwner ?? r.cost_owner_id, resource_graph: {...r.resource_graph,
        ...(parentOwner === null ? {} : {parentCostOwnerId: parentOwner, includedInResourceOwnerRowId: parentOwner}),
        operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: pack.prefix,
          groupTitleRu: pack.titleRu, ...operationRefs[0], additionalOperations: operationRefs.slice(1)},
        ...(!suffix.endsWith(':order') ? {derivedQuantityEditPolicyV1: {
          contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY', unitId: r.unit_id,
          parameterIds: formula.input_parameter_ids, reasonRu: 'Количество меняется через исходную ведомость и штатный баланс.'}} : {}),
        ...(['delivery', 'waste-removal'].includes(suffix) ? {excludeKnownZeroQuantityV1: true} : {}),
        sourceCandidateOnlyV1: {sourceAuthorityPromoted: false, projectAuthenticated: false, publicationAllowed: false},
        publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1',
          nameRu: r.title_ru, sourceTitleRu: r.title_ru, brandAndModelRu: null, specificationRu: null, detailsRu: []}},
      source_metadata: {...r.source_metadata, normativeTrace: [], sourceRole: 'UNADMITTED_SOURCE_COMPOSITION_CANDIDATE',
        primaryArtifactCandidates: pack.sources, automaticGenericPriceInheritanceAllowed: false,
        sourceAuthorityPromoted: false, projectAuthenticated: false, full_technical_acceptance: false,
        installationRateAuthored: false, literalManufacturerTerminalType: pack.internalCompatibilityCandidate.terminalType,
        ...(factoryPart ? {factoryContainedPart: {boxReference: '069672L', partKey: factoryPart.key, countPerBox: factoryPart.countPerBox,
          quantityMeaning: 'Физическая часть целой коробки; количество не задаёт использованные кабельные вводы или отдельную закупку.'}} : {})}};
    return {...next, row_sha256: hash(next)};
  });
  return {...built, parameters, resources, publicationAllowed: false, sourceAuthorityPromoted: false, fullTechnicalAcceptance: false};
}

/** Integration hook for the exact earlier single-socket candidate. Its source
 * guard/publisher remain outside this hook and must not be bypassed. */
export function appendSocketComposableTwoGangR1(parent: AutomaticOwnerDefinition): AutomaticOwnerDefinition {
  const selector = parent.parameters.find(p => p.parameter_id === pack.methodParameterId);
  const values = selector?.constraints_json?.values;
  if (parent.parameters.length !== 29 || parent.formulas.length !== 87 || parent.resources.length !== 87
    || !selector || JSON.stringify(values) !== JSON.stringify([pack.legacyMethod, pack.completeSingleMethod])) {
    throw Error('SOCKET_COMPOSABLE_EXACT_R266_SINGLE_PARENT_REQUIRED');
  }
  const added = socketComposableTwoGangCandidateR1(), oldIds = new Set(parent.parameters.map(p => p.parameter_id));
  if (added.parameters.some(p => oldIds.has(p.parameter_id) && p.parameter_id !== pack.methodParameterId)
    || added.formulas.some(f => parent.formulas.some(old => old.formula_id === f.formula_id))
    || added.resources.some(r => parent.resources.some(old => old.row_id === r.row_id))) {
    throw Error('SOCKET_COMPOSABLE_ID_COLLISION');
  }
  const parameters = parent.parameters.map(p => p.parameter_id === pack.methodParameterId
    ? {...p, constraints_json: {...p.constraints_json, values: [pack.legacyMethod, pack.completeSingleMethod, pack.method]}} : p);
  parameters.push(...added.parameters.filter(p => !oldIds.has(p.parameter_id)).map((p, i) => ({...p, ordinal: parent.parameters.length + i})));
  const retained = parent.resources.map(r => {
    const {row_sha256: _before, ...body} = r;
    const next = {...body, inclusion_ast: {kind: 'and', operands: [r.inclusion_ast, {kind: 'not', operand: active}]}};
    return {...next, row_sha256: hash(next)};
  });
  return {...parent, parameters, formulas: [...parent.formulas, ...added.formulas],
    resources: [...retained, ...added.resources.map((r, i) => {
      const {row_sha256: _before, ...body} = r;
      const next = {...body, ordinal: parent.resources.length + i};
      return {...next, row_sha256: hash(next)};
    })]};
}
