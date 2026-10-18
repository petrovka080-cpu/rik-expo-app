import pack from '../../../../data/estimate-benchmarks/source-packs/manual-sloped-trench-g1-krer01-057-01-quantity-r1.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

type Json = Record<string, unknown>;
export const manualTrench05701QuantityPackR1 = pack;
export const manualTrench05701PrimaryR1 = 'actual_manual_trench_bank_volume_m3';
export const manualTrench05701PrefixR1 = 'manual-trench:krer01-02-057-01';
export const manualTrench05701FactIdsR1 = ['manual_trench_maximum_depth_m', 'manual_trench_soil_group',
  'manual_trench_soil_state', 'manual_trench_support_scope', 'manual_trench_layer_scope',
  'manual_trench_bank_volume_reference', 'manual_trench_design_soil_reference', 'manual_trench_payment_boundary_reference'] as const;
const primary = manualTrench05701PrimaryR1, prefix = manualTrench05701PrefixR1;
const positive = { kind: 'greater_than', parameterId: primary, value: 0 } as const;
const needParameter = (id: string) => 'manual_trench05701_application_need_' + id.replaceAll('-', '_');
export const manualTrench05701NeedRowIdsR1 = pack.openNeeds.map(need => prefix + ':need:' + need.id);
export const manualTrench05701NeedParameterIdsR1 = pack.openNeeds.map(need => needParameter(need.id));
const sourceMetadata = { source_title: pack.source.titleRu, source_document_version: pack.source.edition,
  definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256, exact_locator: pack.source.locatorRu };
const ordinary = [{ id: primary, title: 'Проектный объём грунта в естественном состоянии с учётом откосов',
  valueType: 'decimal', unitId: 'm3', kind: 'ordinary', min: 0 }] as const;

/** Catalogue-null physical consumption only. Reuses the one owner/formula/compiler implementation. */
export function manualTrench05701QuantityDefinitionR1(): AutomaticOwnerDefinition & {
  catalogId: null; publicationAllowed: false; fullTechnicalAcceptance: false;
} {
  const facts: AutomaticParameterSpec[] = [
    { id: manualTrench05701FactIdsR1[0], title: 'Полная проектная глубина траншеи, не больше 2 м', valueType: 'decimal', unitId: 'm', kind: 'conditional', min: 0.000001, max: 2, requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[1], title: 'Группа грунта 1 по подтверждённому геотехническому заключению', valueType: 'enum', unitId: null, kind: 'conditional', values: ['GROUP_1_CONFIRMED'], requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[2], title: 'Сухой немёрзлый грунт в естественном залегании, не разрыхлённый ранее', valueType: 'enum', unitId: null, kind: 'conditional', values: ['DRY_NATURAL_UNFROZEN_NOT_PRELOOSENED'], requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[3], title: 'Траншея без креплений с подтверждёнными проектными откосами', valueType: 'enum', unitId: null, kind: 'conditional', values: ['NO_SUPPORT_WITH_DESIGNED_SLOPES'], requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[4], title: 'Одна группа грунта по всей глубине, без послойного смешения', valueType: 'enum', unitId: null, kind: 'conditional', values: ['SINGLE_GROUP_FULL_DEPTH'], requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[5], title: 'Подтверждённая проектная ведомость объёма грунта в естественном состоянии', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[6], title: 'Проект траншеи и геотехническое заключение с условиями применения', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
    { id: manualTrench05701FactIdsR1[7], title: 'Граница оплаты целой ручной разработки с тремя включёнными операциями', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
  ];
  const sourceRows: AutomaticRowSpec[] = pack.rows.map(row => ({
    rowId: prefix + ':' + row.suffix, formulaId: prefix + ':formula:' + row.suffix,
    section: pack.titleRu, category: row.category, title: row.titleRu, unitId: row.unitId,
    expression: primary + '*' + row.ratePer100BankM3 + '/100', procurement: false,
    costTreatment: row.suffix === 'whole-manual-excavation-labor' ? 'OWN_COST' : 'INFORMATIONAL_SCOPE',
    inputParameterIds: [...manualTrench05701FactIdsR1],
  }));
  const common = { contract: pack.contract, semanticOwner: prefix, sourceId: pack.sourceKeyProposal,
    normId: pack.normId, sourceMetadata, ordinary, profile: [], deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.excludedRu } as const;
  const base = buildAutomaticConstructionOwnerR1({ ...common, conditional: facts, rows: sourceRows,
    applicabilityRu: pack.scopeRu + ' Проектные ссылки не доказывают текущую нормативную применимость, устойчивость откосов или цену.' });
  const needs = buildAutomaticConstructionOwnerR1({ ...common,
    semanticOwner: prefix + ':unresolved-fullcycle',
    conditional: pack.openNeeds.map(need => ({ id: needParameter(need.id), title: need.titleRu,
      valueType: 'decimal', unitId: null, kind: 'conditional', min: 0 })),
    rows: pack.openNeeds.map(need => ({ rowId: prefix + ':need:' + need.id,
      formulaId: prefix + ':formula:need:' + need.id, section: pack.titleRu, category: need.category,
      title: need.titleRu, unitId: '', expression: needParameter(need.id),
      procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', inclusion: positive })),
    applicabilityRu: 'Незакрытые части полного цикла: применимость, единица, количество и отдельная оплата не установлены. Введённые вручную 0 или 1 не заменяют источник.' });
  const parameters = [...base.parameters.map(parameter => ({ ...parameter,
    truth_metadata: manualTrench05701FactIdsR1.some(id => id === parameter.parameter_id) ? {
      ...parameter.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT',
      guide: { ...(parameter.truth_metadata.guide as Json), source_role: 'PROJECT_DOCUMENTATION',
        source_document: 'ACTUAL_BANK_VOLUME_GEOTECHNICAL_REPORT_SLOPE_DESIGN_AND_PAYMENT_BOUNDARY_REQUIRED',
        source_locator: 'Факты объекта; не автоматически проверенное проектное решение, не коэффициент и не значение по умолчанию.' },
    } : parameter.truth_metadata,
  })), ...needs.parameters.filter(parameter => parameter.parameter_id !== primary).map(parameter => ({ ...parameter,
    truth_metadata: { ...unresolvedApplicationNormTruthR1(parameter.truth_metadata,
      'Исходная применимость, величина, единица или отдельная граница оплаты не установлены. Требуется конкретное подтверждение; введённые вручную 0 или 1 и цена не закрывают потребность.'),
      guide: { ...(parameter.truth_metadata.guide as Json), source_document: 'APPLICATION_SOURCE_AND_PROJECT_SCOPE_REQUIRED',
        source_locator: 'Отдельная открытая потребность; исходная таблица не устанавливает её количество.' },
    },
  }))].map((parameter, ordinal) => ({ ...parameter, ordinal }));
  const physical = base.resources.map((resource, index) => {
    const row = pack.rows[index]!, formula = base.formulas.find(candidate => candidate.formula_id === resource.formula_id)!;
    const { row_sha256: _old, ...body } = resource;
    const changed = { ...body, resource_graph: { ...resource.resource_graph,
      derivedQuantityEditPolicyV1: { contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
        unitId: resource.unit_id, parameterIds: [...formula.input_parameter_ids],
        reasonRu: 'Труд определяется проектным объёмом грунта в естественном состоянии по 01-02-057-01; ручная строка не заменяет норму.' } },
      source_metadata: { ...resource.source_metadata,
        sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
        normativeTrace: [{ sourceId: pack.sourceKeyProposal, normId: pack.normId,
          sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
          exact_locator: pack.source.locatorRu, source_artifact_sha256: pack.source.sha256 }],
        resource_code: row.resourceCode, printed_resource_name_ru: row.printedNameRu,
        source_artifact_sha256: pack.source.sha256, catalogue_identity_pending: true, normative_binding_pending: true,
        machine_price_admission: false, purchase_order_admission: false, full_technical_acceptance: false,
        included_operations: pack.includedOperations.map(operation => ({ operationId: operation.id, printedRu: operation.printedRu, paymentOwnerRowId: resource.row_id })),
      } };
    return { ...changed, row_sha256: estimateDeterministicHash(changed) };
  });
  const unresolved = needs.resources.map((resource, index) => {
    const need = pack.openNeeds[index]!, { row_sha256: _old, ...body } = resource;
    const changed = { ...body, ordinal: physical.length + index,
      source_metadata: { ...resource.source_metadata, sourceRole: 'UNRESOLVED_APPLICATION_NORM', normativeTrace: [],
        normative_source_ids: [], quantityUnitUnconfirmed: true, missingFact: need.missingFact,
        nextTask: need.nextTask, resolutionOwner: need.owner, full_technical_acceptance: false },
      resource_graph: { ...resource.resource_graph, publicResourcePresentationV1: {
        contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: need.titleRu, nameRu: need.titleRu,
        brandAndModelRu: null, specificationRu: null, detailsRu: ['Количество, единица и отдельная оплата не установлены.', need.missingFact, need.nextTask],
      } } };
    return { ...changed, row_sha256: estimateDeterministicHash(changed) };
  });
  return { ...base, catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false,
    parameters, formulas: [...base.formulas, ...needs.formulas], resources: [...physical, ...unresolved] };
}

/** Explicit TEST_ONLY facts; these strings are not actual project approvals or product source evidence. */
export function manualTrench05701ScenarioFactsR1(volumeM3 = '100'): Record<string, unknown> {
  return { [primary]: volumeM3, manual_trench_maximum_depth_m: '1.5', manual_trench_soil_group: 'GROUP_1_CONFIRMED',
    manual_trench_soil_state: 'DRY_NATURAL_UNFROZEN_NOT_PRELOOSENED', manual_trench_support_scope: 'NO_SUPPORT_WITH_DESIGNED_SLOPES',
    manual_trench_layer_scope: 'SINGLE_GROUP_FULL_DEPTH', manual_trench_bank_volume_reference: 'TEST_ONLY: project bank volume including designed slopes; not an actual project',
    manual_trench_design_soil_reference: 'TEST_ONLY: homogeneous dry group1 and approved design slopes; not an actual engineering approval',
    manual_trench_payment_boundary_reference: 'TEST_ONLY: whole labour includes digging, bottom/wall cleaning and throw-back; no separate payment' };
}

/** Test/scenario adapter into the EXISTING pure compiler. Diagnostic label is not a catalog ID proposal. */
export async function compileManualTrench05701QuantityScenarioR1(submittedParameters: Record<string, unknown>,
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {},
  priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = []) {
  const definition = manualTrench05701QuantityDefinitionR1();
  const compiled = await compileCanonicalEstimateCore({ operation: 'recalculate',
    catalogId: 'TEST_ONLY_NO_CATALOG_ID_MANUAL_TRENCH05701', compilerVersion: pack.contract,
    primaryMeasureParameterId: primary, parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, rowOverrides, priceItems, currencyCode: 'KGS',
    maximumResourceRows: definition.resources.length, hashJson: async value => estimateDeterministicHash(value) });
  return { catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, compiled } as const;
}

/** Documented source/full-cycle obligations; not inferred from the emitted definition. */
export function manualTrench05701IndependentCompletenessMapR1() {
  const entry = (id: string, category: string, unitId: string | null, quantityRule: string, specification: string, need = false) => ({
    expectedResourceId: pack.normId + ':' + id, operationId: 'manual-sloped-trench-depth2m-group1',
    category, unitId, quantityRule, specification, condition: pack.scopeRu,
    // Completeness evidence reference only; needs have no normative binding/source array.
    sourceId: pack.sourceKeyProposal, formulaId: prefix + ':formula:' + (need ? 'need:' : '') + id,
    resolution: { kind: 'ROW', rowId: prefix + ':' + (need ? 'need:' : '') + id } });
  return { contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'NORMATIVE_OPERATION_MAP',
    generatedFromCurrentRows: false, evidenceSha256: pack.source.sha256,
    evidenceReferences: [pack.source.officialUrl, pack.source.locatorRu], entries: [
      ...pack.rows.map(row => entry(row.suffix, row.category, row.unitId, 'EXACT_OFFICIAL_RATE_PER_100_PROJECT_BANK_M3',
        (row.resourceCode ?? 'CODE_UNCONFIRMED_OR_NOT_PRINTED') + ':' + row.ratePer100BankM3 + ':' + row.printedNameRu)),
      ...pack.openNeeds.map(need => entry(need.id, need.category, null, 'SOURCE_REQUIRED_NOT_QUANTIFIED', need.missingFact, true)),
    ] };
}
