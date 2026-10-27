import source from '../../../../data/estimate-benchmarks/source-packs/concrete-curing-roller-whole-post-r108.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
  type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {concreteCuringAntisolDefinitionS2763, concreteCuringAntisolPackS2763,
  concreteCuringAntisolReadyChoicesS2763, concreteCuringAntisolInterfaceS2763} from './concreteCuringAntisolMaterialS2763';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compareFormulaGraphDecimals, isFormulaGraphExactDecimal} from '../backendPlatform/formulaGraph';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';

export const curingRollerPostSourceR108 = source;
export const curingRollerPostPrefixR108 = 'concrete-curing-roller-post:r108';
export const curingRollerPostParameterR108 = (name: string) => 'curing_roller_' + name;
export const curingRollerPostRowR108 = (name: string) => curingRollerPostPrefixR108 + ':' + name;
const parameter = curingRollerPostParameterR108, row = curingRollerPostRowR108;
const area = 'exposed_curing_surface_area_m2', count = parameter('actual_complete_cases');
const selected: AutomaticInclusionCondition = {kind: 'and', operands: [
  {kind: 'greater_than', parameterId: area, value: 0},
  {kind: 'equals', parameterId: 'approved_external_curing_method', value: 'MEMBRANE_CURING_COMPOUND'},
  {kind: 'equals', parameterId: 'antisol_material_choice', value: concreteCuringAntisolPackS2763.selectedProductRu},
  {kind: 'equals', parameterId: parameter('application_method'), value: 'ROLLER'},
]};
const technical = [count, parameter('period_provision_reference'), parameter('actual_PPR'),
  parameter('exact_case_variant'), parameter('surface_nap_fit')];
const pdsFacts = ['antisol_surface_ready', 'antisol_minimum_temperature_12h_c', 'antisol_subsequent_surface_use'];

/** A whole, bounded application-post component. The PDS material rule is reused
 * unchanged. A counted case is initial physical provision for an actual period,
 * never a consumption/lifetime rate or an automatic retail purchase. The
 * remaining method resources retain explicit unresolved rows. No labour row
 * is added: the selected parent must retain its own exact native labour owner. */
export function concreteCuringRollerWholePostDefinitionR108(): AutomaticOwnerDefinition {
  if (source.materialSource.sha256 !== concreteCuringAntisolPackS2763.source.sha256
    || source.materialSource.sha256 !== 'b2f03cae00c6edf37228a1836104b5beba33a56dbb19b559caa8cc435a8b14b3'
    || source.kitSource.sha256 !== 'a60458bb7969275543a32db7d6c06b0e0a026008e90a66fac5307f3beac27077'
    || source.components.reduce((total, component) => total + component.quantityPerOriginalCase, 0) !== 6
    || source.components.length !== 5 || source.operations.length !== 10)
    throw Error('CURING_ROLLER_WHOLE_EXACT_SOURCE_REQUIRED');
  const conditional: AutomaticParameterSpec[] = [
    {id: parameter('application_method'), title: 'Способ нанесения из подтверждённого ППР',
      valueType: 'enum', unitId: null, kind: 'conditional', values: ['ROLLER', 'OTHER_APPROVED_METHOD'],
      requiredWhen: {kind: 'equals', parameterId: 'approved_external_curing_method', value: 'MEMBRANE_CURING_COMPOUND'}},
    {id: count, title: 'Число полных исходных комплектов на фактический период по ППР',
      valueType: 'integer', unitId: 'set', kind: 'conditional', min: 1, requiredWhen: selected},
    {id: parameter('period_provision_reference'), title: 'Фактическая поставка целых комплектов на весь период с учётом имеющегося оснащения',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: selected},
    {id: parameter('actual_PPR'), title: 'ППР полного поста нанесения и обеспечения',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: selected},
    {id: parameter('exact_case_variant'), title: 'Проверенная комплектность точного исходного набора',
      valueType: 'enum', unitId: null, kind: 'conditional', values: [source.kitSource.exactVariant], requiredWhen: selected},
    {id: parameter('surface_nap_fit'), title: 'Подтверждённое соответствие валика фактуре и паспорту состава',
      valueType: 'enum', unitId: null, kind: 'conditional', values: [source.compatibility.requiredProjectConfirmation], requiredWhen: selected},
    ...source.protectedNeeds.map((need): AutomaticParameterSpec => ({id: parameter('need_' + need.key),
      title: need.titleRu, valueType: 'decimal', unitId: null, kind: 'internal', min: 0})),
  ];
  const common = [...technical, ...pdsFacts];
  const rows: AutomaticRowSpec[] = [
    {rowId: row('case-period-provision'), formulaId: row('formula:case-period-provision'),
      section: source.titleRu, title: 'Обеспечение полным комплектом валика на фактический период',
      category: 'equipment', unitId: 'set', expression: count, inclusion: selected,
      costTreatment: 'OWN_COST', procurement: true, inputParameterIds: common},
    ...source.components.map((component): AutomaticRowSpec => ({rowId: row('stock:' + component.key),
      formulaId: row('formula:stock:' + component.key), section: source.titleRu,
      title: component.publicNameRu, category: 'equipment', unitId: component.unitId,
      expression: count + '*' + component.quantityPerOriginalCase,
      inclusion: selected, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', procurement: false, inputParameterIds: common})),
    ...source.protectedNeeds.map((need): AutomaticRowSpec => ({rowId: row('need:' + need.key),
      formulaId: row('formula:need:' + need.key), section: source.titleRu, title: need.titleRu,
      category: need.category, unitId: '', expression: parameter('need_' + need.key),
      inclusion: selected, costTreatment: 'INFORMATIONAL_SCOPE', procurement: false})),
  ];
  const material = concreteCuringAntisolDefinitionS2763();
  const post = buildAutomaticConstructionOwnerR1({contract: source.contract, semanticOwner: curingRollerPostPrefixR108,
    sourceId: source.sourceId, normId: 'EXACT_CASE_STOCK_AND_PDS_ROLLER_METHOD_NOT_PRODUCTIVITY',
    sourceMetadata: {source_title: source.titleRu, source_document_version: source.materialSource.edition,
      artifact_sha256: source.materialSource.sha256, definition_hash: source.materialSource.sha256,
      exact_locator: 'PDS page2 manual mixing, roller1/4–1/2inch, soap/water cleaning; exact six-piece case capture'},
    applicabilityRu: source.scopeRu,
    ordinary: [
      {id: area, title: 'Обрабатываемая площадь бетона', valueType: 'decimal', unitId: 'm2', kind: 'ordinary', min: 0.001},
      {id: 'approved_external_curing_method', title: 'Способ ухода за бетоном', valueType: 'enum', unitId: null,
        kind: 'ordinary', values: ['WATER_CURING', 'WET_COVERING', 'IMPERVIOUS_SHEET', 'MEMBRANE_CURING_COMPOUND']},
      {id: 'antisol_material_choice', title: 'Выбранный материал для ухода', valueType: 'enum', unitId: null,
        kind: 'ordinary', values: [concreteCuringAntisolPackS2763.selectedProductRu, concreteCuringAntisolPackS2763.legacyProductRu]},
      {id: 'antisol_surface_ready', title: 'Готовность поверхности', valueType: 'enum', unitId: null,
        kind: 'ordinary', values: concreteCuringAntisolReadyChoicesS2763},
      {id: 'antisol_minimum_temperature_12h_c', title: 'Минимальная температура', valueType: 'decimal', unitId: 'degC', kind: 'ordinary'},
      {id: 'antisol_subsequent_surface_use', title: 'Последующее использование поверхности', valueType: 'enum', unitId: null,
        kind: 'ordinary', values: [concreteCuringAntisolInterfaceS2763]},
    ],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: source.exclusionsRu});
  const existingParameters = new Set(material.parameters.map(p => p.parameter_id));
  const materialRows = new Set(material.resources.map(r => r.row_id));
  const materialFormulas = new Set(material.formulas.map(f => f.formula_id));
  if (post.resources.some(r => materialRows.has(r.row_id)) || post.formulas.some(f => materialFormulas.has(f.formula_id)))
    throw Error('CURING_ROLLER_DUPLICATE_OWNER_OR_FORMULA');
  const newParameters = post.parameters.filter(p => !existingParameters.has(p.parameter_id)).map(p => {
    const need = source.protectedNeeds.find(need => p.parameter_id === parameter('need_' + need.key));
    return need ? {...p, truth_metadata: unresolvedApplicationNormTruthR1(p.truth_metadata, need.missingFactRu)}
      : {...p, truth_metadata: {...p.truth_metadata, visibility_role: 'INTERNAL_ONLY',
        value_source_role: 'ENGINEERING_DESIGN', source_confirmation_required: false,
        provenance: {consumer_input_role_v1: 'APPLICATION_TECHNICAL', source_readback_only_v1: true,
          consumer_question_allowed: false, actualProjectReadbackRequired: true}}};
  });
  const operation = (item: (typeof source.operations)[number]) => ({operationId: row('operation:' + item.key),
    operationTitleRu: item.titleRu, processOrdinal: source.operations.findIndex(value => value.key === item.key) + 1,
    completionCriterionRu: item.completionRu});
  const resources = post.resources.map((resource, index) => {
    const key = resource.row_id.slice(curingRollerPostPrefixR108.length + 1);
    const component = source.components.find(component => key === 'stock:' + component.key);
    const need = source.protectedNeeds.find(need => key === 'need:' + need.key);
    const operations = need ? source.operations.filter(operation => operation.key === need.operation)
      : component ? source.operations.filter(operation => component.operationKeys.includes(operation.key)) : source.operations;
    if (!operations.length) throw Error('CURING_ROLLER_REAL_OPERATION_REQUIRED:' + key);
    const first = operations[0]!;
    const {row_sha256: _prior, ...body} = resource;
    const updated = {...body, ordinal: material.resources.length + index,
      source_metadata: {...resource.source_metadata, sourceRole: need ? 'UNRESOLVED_APPLICATION_NORM'
        : component ? 'LITERAL_INITIAL_COMPLETE_CASE_STOCK' : 'PROJECT_CONFIRMED_COMPLETE_CASE_PERIOD_PROVISION',
        ...(component ? {source_artifact_sha256: source.kitSource.sha256} : {}),
        ...(need ? {normative_source_ids: [], sourceNormQuantityAccepted: false, missingFact: need.missingFactRu} : {}),
        initialStockIsNotConsumption: true, caseQuantityIsNotLabourOrLifetime: true,
        brushApplicationNotAdmitted: component?.key === 'trim-brush', full_technical_acceptance: false},
      resource_graph: {...resource.resource_graph,
        ...(component ? {includedInResourceOwnerRowId: row('case-period-provision')} : {}),
        operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: curingRollerPostPrefixR108,
          groupTitleRu: source.titleRu, ...operation(first), additionalOperations: operations.slice(1).map(operation)}}};
    return {...updated, row_sha256: estimateDeterministicHash(updated)};
  });
  const materialOperations = source.operations.filter(item => ['material_takeoff', 'mixing_and_transfer', 'roller_application'].includes(item.key));
  if (materialOperations.length !== 3) throw Error('CURING_ROLLER_MATERIAL_CONSUMING_OPERATIONS_REQUIRED');
  const materialPublicNames: Readonly<Record<string, string>> = {
    'concrete-curing-antisol250w-us:consumed': 'Состав для ухода за свежим бетоном',
    'material:concrete:membrane-curing-compound:antisol250w-us': 'Состав для ухода за свежим бетоном, канистра 19 л',
    'concrete-curing-antisol250w-us:packages': 'Канистры состава для ухода за бетоном, 19 л',
    'concrete-curing-antisol250w-us:remaining': 'Остаток состава после ухода за бетоном',
    'concrete-curing-antisol250w-us:free': 'Свободный остаток состава для ухода за бетоном',
    'concrete-curing-antisol250w-us:shortage': 'Непокрытая потребность в составе для ухода за бетоном',
    'concrete-curing-antisol250w-us:reserve-deficit': 'Непокрытый запас состава для ухода за бетоном',
  };
  const materialResources = material.resources.map(resource => {
    const presentation = parseCanonicalPublicResourcePresentationV1(resource.resource_graph.publicResourcePresentationV1);
    const nameRu = materialPublicNames[resource.row_id];
    if (!presentation || !nameRu) throw Error('CURING_ROLLER_EXACT_MATERIAL_PRESENTATION_REQUIRED');
    const {row_sha256: _old, ...body} = resource;
    const updated = {...body, resource_graph: {...resource.resource_graph,
      publicResourcePresentationV1: {...presentation, nameRu},
      operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: curingRollerPostPrefixR108,
        groupTitleRu: source.titleRu, ...operation(materialOperations[0]!), additionalOperations: materialOperations.slice(1).map(operation)}}};
    return {...updated, row_sha256: estimateDeterministicHash(updated)};
  });
  return {...material, parameters: [...material.parameters, ...newParameters.map((p, index) => ({...p, ordinal: material.parameters.length + index}))],
    formulas: [...material.formulas, ...post.formulas], resources: [...materialResources, ...resources]};
}

/** The existing selected AST keeps an unopened historical calculation exact.
 * Ordinary equality inside the chosen method still preserves missing facts.
 * This adds no default and does not resolve any old whole-care need. */
export function appendConcreteCuringRollerWholePostR108(parent: AutomaticOwnerDefinition): AutomaticOwnerDefinition {
  const child = concreteCuringRollerWholePostDefinitionR108();
  const when: AutomaticInclusionCondition = {kind: 'equals', parameterId: 'antisol_material_choice',
    value: concreteCuringAntisolPackS2763.selectedProductRu};
  const next = appendOptionalAutomaticOwnerR1({parent, child, when});
  const selectedScope = {...when, kind: 'selected'};
  const selectGate = (gate: unknown) => {
    if (!gate || typeof gate !== 'object' || Array.isArray(gate) || !('operands' in gate)
      || !Array.isArray(gate.operands) || gate.operands.length !== 2
      || estimateDeterministicHash(gate.operands[0]) !== estimateDeterministicHash(when))
      throw Error('CURING_ROLLER_EXACT_OPTIONAL_COMPOSITION_GATE_REQUIRED');
    return {...gate, operands: [selectedScope, gate.operands[1]]};
  };
  return {...next,
    parameters: next.parameters.map((p, index) => index < parent.parameters.length ? p : ({...p,
      constraints_json: {...p.constraints_json, ...(p.truth_metadata.visibility_role !== 'INTERNAL_ONLY'
        && p.truth_metadata.visibility_role !== 'USER_DERIVED_READONLY' && p.constraints_json?.requiredWhen ? {
        requiredWhen: selectGate(p.constraints_json.requiredWhen),
      } : {})}})),
    resources: next.resources.map((r, index) => {
      if (index < parent.resources.length) return r;
      const {row_sha256: _old, ...body} = r;
      const value = {...body, inclusion_ast: selectGate(r.inclusion_ast)};
      return {...value, row_sha256: estimateDeterministicHash(value)};
    })};
}

export type ConcreteCuringRollerPeriodReadbackR108 = Readonly<{
  documentSha256: string; projectReference: string; periodProvisionReference: string;
  exactCaseVariant: string; textureAndProductFit: string; existingInventoryAccountedFor: true;
  provisionMode: 'EXTERNAL_COMPLETE_CASE_PERIOD_SERVICE'; measuredSurfaceAreaM2: string;
  completeCasesForActualPeriod: string; materialArtifactSha256: string; kitArtifactSha256: string;
}>;

/** An internal pre-core adapter, not an approved-project resolver. The worker
 * must obtain these facts from a trusted, revision-bound document readback;
 * a caller's raw input or this type alone is never evidence of approval. */
export function concreteCuringRollerConfirmedPeriodFactsR108(
  submitted: Readonly<Record<string, unknown>>, readback?: ConcreteCuringRollerPeriodReadbackR108,
): Readonly<Record<string, unknown>> {
  if (Object.keys(submitted).some(id => id.startsWith('curing_roller_')))
    throw Error('CURING_ROLLER_RAW_TECHNICAL_FACT_FORBIDDEN');
  if (!readback) return {};
  const expected = ['documentSha256', 'projectReference', 'periodProvisionReference', 'exactCaseVariant',
    'textureAndProductFit', 'existingInventoryAccountedFor', 'provisionMode', 'measuredSurfaceAreaM2',
    'completeCasesForActualPeriod', 'materialArtifactSha256', 'kitArtifactSha256'];
  if (Object.keys(readback).length !== expected.length || expected.some(key => !Object.hasOwn(readback, key))
    || !/^[a-f0-9]{64}$/.test(readback.documentSha256)
    || !readback.projectReference.trim() || !readback.periodProvisionReference.trim()
    || readback.exactCaseVariant !== source.kitSource.exactVariant
    || readback.textureAndProductFit !== source.compatibility.requiredProjectConfirmation
    || readback.existingInventoryAccountedFor !== true
    || readback.provisionMode !== 'EXTERNAL_COMPLETE_CASE_PERIOD_SERVICE'
    || readback.materialArtifactSha256 !== source.materialSource.sha256
    || readback.kitArtifactSha256 !== source.kitSource.sha256)
    throw Error('CURING_ROLLER_EXACT_PERIOD_SOURCE_REQUIRED');
  if (!isFormulaGraphExactDecimal(readback.measuredSurfaceAreaM2)
    || !isFormulaGraphExactDecimal(String(submitted[area]))
    || compareFormulaGraphDecimals(readback.measuredSurfaceAreaM2, String(submitted[area])) !== 0
    || compareFormulaGraphDecimals(readback.measuredSurfaceAreaM2, '0') <= 0
    || !/^[1-9][0-9]*$/.test(readback.completeCasesForActualPeriod)
    || submitted.approved_external_curing_method !== 'MEMBRANE_CURING_COMPOUND'
    || submitted.antisol_material_choice !== concreteCuringAntisolPackS2763.selectedProductRu)
    throw Error('CURING_ROLLER_SAME_POSITIVE_SURFACE_AND_ACTUAL_COUNT_REQUIRED');
  return {[parameter('application_method')]: 'ROLLER', [count]: readback.completeCasesForActualPeriod,
    [parameter('actual_PPR')]: readback.projectReference,
    [parameter('period_provision_reference')]: readback.periodProvisionReference,
    [parameter('exact_case_variant')]: readback.exactCaseVariant,
    [parameter('surface_nap_fit')]: readback.textureAndProductFit};
}

export function compileConcreteCuringRollerWholePostR108(input: Readonly<{
  definition: AutomaticOwnerDefinition; catalogId: string; primaryMeasureParameterId: string;
  submittedParameters: Readonly<Record<string, unknown>>;
  confirmedLegacyParameters?: Readonly<Record<string, unknown>>;
  periodReadback?: ConcreteCuringRollerPeriodReadbackR108;
  rowOverrides?: CanonicalEstimateCompileCoreInput['rowOverrides']; onCoreEntry?: () => void;
}>) {
  const confirmed = concreteCuringRollerConfirmedPeriodFactsR108(input.submittedParameters, input.periodReadback);
  if (Object.keys(input.confirmedLegacyParameters ?? {}).some(id => id.startsWith('curing_roller_')))
    throw Error('CURING_ROLLER_LEGACY_CANNOT_AUTHOR_NEW_PERIOD');
  input.onCoreEntry?.();
  return compileCanonicalEstimateCore({operation: 'recalculate', compilerVersion: source.contract,
    catalogId: input.catalogId, primaryMeasureParameterId: input.primaryMeasureParameterId,
    parameterDefinitions: [...input.definition.parameters], formulaDefinitions: [...input.definition.formulas],
    resourceDefinitions: [...input.definition.resources], submittedParameters: input.submittedParameters,
    confirmedParameters: {...input.confirmedLegacyParameters, ...confirmed}, rowOverrides: input.rowOverrides ?? {},
    priceItems: [], currencyCode: 'KGS', maximumResourceRows: input.definition.resources.length, hashJson: estimateDeterministicHash});
}
