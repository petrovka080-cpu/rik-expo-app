import pack from '../../../../data/estimate-benchmarks/source-packs/steel-water-dn15-partial-labour-only-krer16-002-01-r2.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json = Record<string, unknown>;
export const steelWaterDn15PackR1 = pack;
export const steelWaterDn15PrimaryR1 = 'installed_galvanized_dn15_project_length_m';
export const steelWaterDn15PrefixR1 = 'steel-water:krer16-02-002-01:source-only';
const primary = steelWaterDn15PrimaryR1, prefix = steelWaterDn15PrefixR1;
const positive = {kind: 'greater_than', parameterId: primary, value: 0} as const;
const rowId = (id: string) => prefix + ':' + id;
const needParameter = (id: string) => 'steel_dn15_application_need_' + id.replaceAll('-', '_');
export const steelWaterDn15FactIdsR1 = [...pack.scopeFacts, ...pack.projectFactsRequired, ...pack.projectNumericFacts].map(f => f.id);
export const steelWaterDn15NeedRowIdsR1 = pack.openNeeds.map(n => rowId('open:' + n.id));
export const steelWaterDn15NeedParameterIdsR1 = pack.openNeeds.map(n => needParameter(n.id));
const locator = 'КРЕР16-2015, PDF стр.19–21, колонка16-02-002-01,100м; техническая часть PDF стр.3–8, §1.1/1.3–1.6 и §2.1/2.3/2.4.';
const factTitles: Record<string, string> = {
  material_scope: 'Оцинкованная стальная водогазопроводная труба DN15', system_scope: 'Внутреннее водоснабжение здания с рабочим давлением не выше1,6МПа',
  diameter_basis: 'Номинальный условный проход DN15, не наружный диаметр', measurement_basis: 'Измеренная проектная длина с фасонными частями, арматурой и П-образными компенсаторами',
  route_excludes_building_inlet: 'Участок внутренней разводки без ввода водопровода в здание', route_excludes_complex_accounted_lengths: 'Исключены длины, уже учтённые комплексами узлов учёта и оборудования',
  supply_method: 'Подтверждены укрупнённые транспортабельные оцинкованные узлы с гильзами', node_valve_inventory_scope: 'Проектная принадлежность арматуры узлам: ручной маховик либо документированное отсутствие арматуры',
  height_scope: 'Работы не выше3м от пола или сплошного настила', through_holes: 'Сквозные отверстия готовы; новое сверление конструкций не включено',
  payment_boundary: 'Единый труд монтажа, установки креплений и промывки, без повторного гидроиспытания',
  route_measurement_reference: 'Проектная ведомость измеренной длины и исключённых участков', node_supply_identity_reference: 'Проект и спецификация физических узлов с гильзами, не котировка голой трубы',
  node_valve_inventory_reference: 'Проектная ведомость типа, DN, управления, числа и принадлежности установленной арматуры либо подтверждение её отсутствия',
  support_installation_boundary_reference: 'Проектная граница включённой установки креплений и отдельного изготовления опор',
  project_conditions_reference: 'Подтверждение давления, высоты, настила и готовности сквозных отверстий', safe_execution_and_flush_program_reference: 'ППР безопасных газовых работ и программа включённой промывки',
  project_length_m: 'Проектная длина этого же выбранного участка водопровода', nominal_bore_mm: 'Номинальный условный проход по проекту, DN15',
  working_pressure_mpa: 'Положительное рабочее давление водопровода, не выше1,6МПа', working_height_m: 'Высота работ от пола или сплошного настила, не выше3м',
};

/** Source-only quantity consumer. No registered identity, order owner or price admission. */
export function steelWaterDn15InstallationDefinitionR1(): AutomaticOwnerDefinition & {
  catalogId: null; workKey: null; groupId: null; identityAdmitted: false; publicationAllowed: false; fullTechnicalAcceptance: false;
} {
  if (pack.normId !== '16-02-002-01' || pack.catalogId !== null || pack.catalogBinding !== null || pack.publicationAllowed
    || pack.source.sha256 !== '4fb2b609cf72486f9ef5f110cd606f6632fba3302cd3d52015f41dac24cbd17b'
    || pack.physicalSourceRows.length !== 16 || pack.operationsIncludedInWholeLabour.length !== 3 || pack.openNeeds.length !== 8
    || pack.physicalSourceRows.filter(r => r.costTreatment === 'OWN_COST').map(r => r.id).join() !== 'whole-worker'
    || pack.physicalSourceRows.some(r => r.procurementEligible || r.includedInProcurement)) throw Error('STEEL_DN15_EXACT_SOURCE_ONLY_CONTRACT_REQUIRED');
  const facts: AutomaticParameterSpec[] = [
    ...pack.scopeFacts.map(f => ({id: f.id, title: factTitles[f.id]!, valueType: 'enum' as const, unitId: null,
      kind: 'conditional' as const, values: [...f.allowedValues], requiredWhen: positive})),
    ...pack.projectFactsRequired.map(f => ({id: f.id, title: factTitles[f.id]!, valueType: 'text' as const, unitId: null,
      kind: 'conditional' as const, requiredWhen: positive})),
    {id: 'project_length_m', title: factTitles.project_length_m!, valueType: 'decimal', unitId: 'm', kind: 'conditional', min: 0,
      numericPeerConstraints: {equalToParameter: primary}, requiredWhen: positive},
    {id: 'nominal_bore_mm', title: factTitles.nominal_bore_mm!, valueType: 'decimal', unitId: 'mm', kind: 'conditional', min: 15, max: 15, requiredWhen: positive},
    {id: 'working_pressure_mpa', title: factTitles.working_pressure_mpa!, valueType: 'decimal', unitId: 'MPa', kind: 'conditional', min: 0, max: 1.6, requiredWhen: positive},
    {id: 'working_height_m', title: factTitles.working_height_m!, valueType: 'decimal', unitId: 'm', kind: 'conditional', min: 0, max: 3, requiredWhen: positive},
  ];
  const ordinary: AutomaticParameterSpec[] = [{id: primary, title: 'Фактическая проектная длина выбранного внутреннего оцинкованного водопровода DN15',
    valueType: 'decimal', unitId: 'm', kind: 'ordinary', min: 0, numericPeerConstraints: {equalToParameter: 'project_length_m'}}];
  const common = {contract: pack.contract, semanticOwner: prefix, operationCompositionGroupId:prefix,sourceId: pack.sourceId, normId: pack.normId,
    sourceMetadata: {source_title: pack.titleRu, source_document_version: pack.source.edition,
      definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256, exact_locator: locator},
    ordinary, profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.noAutomaticClaims} as const;
  const sourceRows: AutomaticRowSpec[] = pack.physicalSourceRows.map(r => ({rowId: rowId(r.id), formulaId: rowId('formula:' + r.id),
    section: pack.titleRu, category: r.category, title: r.titleRu, unitId: r.sourceUnit, expression: primary + '*' + r.ratePer100M + '/100',
    inputParameterIds: [...steelWaterDn15FactIdsR1], procurement: false, costTreatment: r.costTreatment as AutomaticRowSpec['costTreatment']}));
  const includedRows: AutomaticRowSpec[] = pack.operationsIncludedInWholeLabour.map(o => ({rowId: rowId(o.id), formulaId: rowId('formula:' + o.id),
    section: 'Включённые операции единого монтажа', category: 'work', title: o.titleRu, unitId: 'm', expression: primary,
    inputParameterIds: [...steelWaterDn15FactIdsR1], procurement: false, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'}));
  const base = buildAutomaticConstructionOwnerR1({...common, conditional: facts, rows: [...sourceRows, ...includedRows],
    applicabilityRu: 'Только внутренний водопровод здания из укрупнённых оцинкованных узлов с гильзами, условный проход15мм, давление≤1,6МПа, высота≤3м, готовые сквозные отверстия; проектная длина по§2.1 с исключениями§2.3. Совместимость и физическая принадлежность арматуры подтверждаются до расчёта. Коммерческая BOM не считается установленной.'});
  const needs = buildAutomaticConstructionOwnerR1({...common, ordinary: ordinary.map(({numericPeerConstraints: _peer, ...spec}) => spec), semanticOwner: prefix + ':unresolved-fullcycle',
    conditional: pack.openNeeds.map(n => ({id: needParameter(n.id), title: n.titleRu, valueType: 'decimal', unitId: null, kind: 'conditional', min: 0})),
    rows: pack.openNeeds.map(n => ({rowId: rowId('open:' + n.id), formulaId: rowId('formula:open:' + n.id), section: 'Открытые потребности полного цикла',
      category: 'service', title: n.titleRu, unitId: '', expression: needParameter(n.id), procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', inclusion: positive})),
    applicabilityRu: 'Количество, единица и отдельная оплата этих восьми потребностей не установлены. П в проектной строке арматуры не является числом. Ручные0/1, цена, склад и кратность не закрывают источник.'});
  const parameters = [...base.parameters.map(p => ({...p,
    constraints_json: {...p.constraints_json, ...(['project_length_m', 'working_pressure_mpa'].includes(p.parameter_id) ? {exclusiveMin: 0} : {})},
    truth_metadata: steelWaterDn15FactIdsR1.includes(p.parameter_id) ? {...p.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT',
      guide: {...p.truth_metadata.guide as Json, source_role: 'PROJECT_DOCUMENTATION', source_document: 'PHYSICAL_ASSEMBLED_NODE_SLEEVES_VALVE_INVENTORY_AND_PROJECT_SCOPE_REQUIRED',
        source_locator: 'Подтверждение фактов конкретного объекта; не автоматически проверенная проектная документация, норма, коммерческая BOM или значение по умолчанию.'}} : p.truth_metadata,
  })), ...needs.parameters.filter(p => p.parameter_id !== primary).map(p => ({...p,
    truth_metadata: {...unresolvedApplicationNormTruthR1(p.truth_metadata, 'Исходная величина, единица, применимость и непересекающаяся цена требуют отдельного доказательства; пользовательские0/1 и77 не заменяют источник.'),
      guide: {...p.truth_metadata.guide as Json, source_document: 'APPLICATION_SOURCE_AND_SEPARATE_COMMERCIAL_PAYMENT_SCOPE_REQUIRED'}}}))]
    .map((p, ordinal) => ({...p, ordinal}));
  const physical = base.resources.map((r, index) => {
    const source = pack.physicalSourceRows[index], operation = pack.operationsIncludedInWholeLabour[index - pack.physicalSourceRows.length];
    const included = operation !== undefined, {row_sha256: _old, ...body} = r;
    const changed = {...body, ...(included ? {cost_owner_id: rowId('whole-worker')} : {}),
      resource_graph: {...r.resource_graph,
        ...(included ? {parentCostOwnerId: rowId('whole-worker'), includedInResourceOwnerRowId: rowId('whole-worker')} : {}),
        derivedQuantityEditPolicyV1: {contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY', unitId: r.unit_id,
          // Edit authority binds the actual formula AST; physical gate facts
          // remain separate resource inputParameterIds, never fake operands.
          parameterIds: [primary], reasonRu: 'Исходный расход и включённые операции определяются подтверждённой проектной длиной и физическими фактами; ручная строка не заменяет норму.'},
        publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: r.title_ru, nameRu: r.title_ru,
          brandAndModelRu: null, specificationRu: null, detailsRu: [included ? 'Оплата уже включена в единый труд37,07ч/100м.' : source!.id === 'whole-worker' ? 'Единый труд37,07ч/100м, без повторной оплаты трёх включённых операций и машиниста.' : 'Справочный исходный расход; цена не допускает оплату или закупку.',
            'Физический узел с гильзами и установленной арматурой должен быть подтверждён. Коммерческая комплектация и цена остаются открытой потребностью.',
            'При неизвестном факте условное расчётное количество остаётся только в предварительной потребности. Его применимость к объекту не подтверждена; оплата и закупка заблокированы.']}},
      source_metadata: {...r.source_metadata, ...((included || source?.id !== 'whole-worker') ? {automaticGenericPriceInheritanceAllowed:false} : {}), sourceRole: included ? 'INCLUDED_OFFICIAL_OPERATION_SCOPE' : 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
        normativeTrace: [{sourceId: pack.sourceId, normId: pack.normId, exact_locator: locator, source_artifact_sha256: pack.source.sha256,
          sourceRole: included ? 'INCLUDED_OFFICIAL_OPERATION_SCOPE' : 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED'}],
        normativeResourceCode: source?.resourceCode ?? null, exact_column: pack.normId, source_artifact_sha256: pack.source.sha256,
        sourceQuantityDenominatorM: 100, sourceQuantityAccepted: !included, sourceBindingCandidateOnly: !included,
        sourceQuantityAcceptanceScope: 'VERIFIED_REFERENCE_RATE_NOT_OBJECT_APPLICABILITY',
        missingFactWithholdsSourceQuantitiesMeaning: 'NO_COMPILED_ROWS_PAYMENT_OR_PROCUREMENT_CONDITIONAL_NEED_QUANTITY_MAY_REMAIN',
        conditionalNeedQuantityIsUnappliedReferenceOnly: true,
        catalogue_identity_pending: true, normative_binding_pending: true, full_technical_acceptance: false,
        machinePriceOwnerAdmitted: false, codeSpecificOperatorRole: null, codeSpecificOperationScope: null, purchase_order_admission: false,
        ...(source?.category === 'material' ? {materialPaymentAdmitted: false, commercialBomUnresolved: true} : {}),
        ...(included ? {includedOperationId: operation.id, includedInWholeLabourOwnerRowId: rowId('whole-worker')} : {})}};
    return {...changed, row_sha256: estimateDeterministicHash(changed)};
  });
  const unresolved = needs.resources.map((r, index) => {
    const n = pack.openNeeds[index]!, {row_sha256: _old, ...body} = r;
    const changed = {...body, ordinal: physical.length + index,
      source_metadata: {...r.source_metadata, automaticGenericPriceInheritanceAllowed:false, sourceRole: 'UNRESOLVED_APPLICATION_NORM', normativeTrace: [], normative_source_ids: [],
        quantityUnitUnconfirmed: true, missingFact: n.sourceOrFact, nextTask: n.task, resolutionOwner: n.evidenceOwner,
        acceptanceEvidence: n.acceptance, extraPaymentNotAssumed: true, full_technical_acceptance: false,
        ...(n.id === 'node-bom-and-valves' ? {projectValvePQuantity: null, projectValvePRateIsNotNumeric: true, physicalIdentityGateSeparate: true} : {})},
      resource_graph: {...r.resource_graph, publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: n.titleRu, nameRu: n.titleRu,
        brandAndModelRu: null, specificationRu: null, detailsRu: [n.sourceOrFact, n.task, 'Владелец: ' + n.evidenceOwner, n.acceptance]}}};
    return {...changed, row_sha256: estimateDeterministicHash(changed)};
  });
  return {...base, catalogId: null, workKey: null, groupId: null, identityAdmitted: false, publicationAllowed: false, fullTechnicalAcceptance: false, parameters,
    formulas: [...base.formulas, ...needs.formulas], resources: [...physical, ...unresolved]};
}

/** TEST_ONLY scenario facts, never defaults, real project approval or supplier evidence. */
export function steelWaterDn15ScenarioFactsR1(length = '100'): Record<string, unknown> {
  return {[primary]: length, ...Object.fromEntries(pack.scopeFacts.map(f => [f.id, f.allowedValues[0]])),
    ...Object.fromEntries(pack.projectFactsRequired.map(f => [f.id, 'TEST_ONLY: ' + factTitles[f.id]])),
    project_length_m: length, nominal_bore_mm: '15', working_pressure_mpa: '1.6', working_height_m: '3'};
}
export async function compileSteelWaterDn15QuantityScenarioR1(submittedParameters: Record<string, unknown>,
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}, priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = []) {
  const d = steelWaterDn15InstallationDefinitionR1();
  const compiled = await compileCanonicalEstimateCore({operation: 'recalculate', catalogId: 'TEST_ONLY_STEEL_DN15_SOURCE_QUANTITY_NO_CATALOG_BINDING',
    compilerVersion: pack.contract, primaryMeasureParameterId: primary, parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources],
    submittedParameters, confirmedParameters: {}, rowOverrides, priceItems, currencyCode: 'KGS', maximumResourceRows: d.resources.length,
    hashJson: async value => estimateDeterministicHash(value)});
  return {catalogId: null, workKey: null, groupId: null, identityAdmitted: false, publicationAllowed: false, fullTechnicalAcceptance: false, compiled} as const;
}

/** Expected source/full-cycle map from frozen R2, not inferred from emitted rows. */
export function steelWaterDn15IndependentCompletenessMapR1() {
  const entry = (id: string, category: string, unitId: string | null, quantityRule: string, specification: string, open = false) => ({
    expectedResourceId: pack.normId + ':' + id, operationId: 'internal-galvanized-node-installation-dn15', category, unitId, quantityRule,
    specification, condition: 'Подтверждённая узловая внутренняя разводка DN15 с гильзами и физической границей арматуры,≤1,6МПа,≤3м.',
    sourceId: pack.sourceId, formulaId: rowId('formula:' + (open ? 'open:' : '') + id), resolution: {kind: 'ROW', rowId: rowId((open ? 'open:' : '') + id)}});
  return {contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'NORMATIVE_OPERATION_MAP', generatedFromCurrentRows: false,
    evidenceSha256: pack.source.sha256, evidenceReferences: [pack.source.officialUrl, locator], entries: [
      ...pack.physicalSourceRows.map(r => entry(r.id, r.category, r.sourceUnit, 'EXACT_RATE_PER_100_PROJECT_METRES_SOURCE_UNIT_ONLY', (r.resourceCode ?? 'AGGREGATE_NO_RESOURCE_CODE') + ':' + r.ratePer100M)),
      ...pack.operationsIncludedInWholeLabour.map(o => entry(o.id, 'work', 'm', 'INCLUDED_IN_ONE_WHOLE_LABOUR_OWNER', o.titleRu)),
      ...pack.openNeeds.map(n => entry(n.id, 'service', null, 'SOURCE_REQUIRED_NOT_QUANTIFIED', n.sourceOrFact, true))]};
}
