import pack from '../../../../data/estimate-benchmarks/source-packs/road-marking-continuous100-pf133-quantity-r1.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

type Json = Record<string, unknown>;
export const roadMarking01601QuantityPackR1 = pack;
export const roadMarking01601PrimaryR1 = 'actual_continuous_marking_length_km';
export const roadMarking01601PrefixR1 = 'road-marking:krer27-09-016-01';
export const roadMarking01601LineTypeR1 = 'CONTINUOUS';
export const roadMarking01601PaintSystemR1 = 'PF133_DARK_GREY_LITERAL';
export const roadMarking01601FactIdsR1 = ['marking_line_width_mm', 'marking_line_type', 'marking_paint_system',
  'actual_marking_layout_reference', 'marking_paint_product_reference', 'marking_method_statement_reference'] as const;
const primary = roadMarking01601PrimaryR1, prefix = roadMarking01601PrefixR1;
const positive = { kind: 'greater_than', parameterId: primary, value: 0 } as const;
const needParameter = (id: string) => 'road_marking01601_application_need_' + id.replaceAll('-', '_');
export const roadMarking01601NeedRowIdsR1 = pack.openNeeds.map(need => prefix + ':need:' + need.id);
export const roadMarking01601NeedParameterIdsR1 = pack.openNeeds.map(need => needParameter(need.id));
const sourceMetadata = { source_title: pack.source.titleRu, source_document_version: pack.source.edition,
  definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256, exact_locator: pack.source.locatorRu };
const ordinary = [{ id: primary, title: 'Фактическая длина окрашиваемой сплошной линии 100 мм',
  valueType: 'decimal', unitId: 'km', kind: 'ordinary', min: 0 }] as const;

/** Catalogue-null physical consumption only. Reuses the one owner/formula/compiler implementation. */
export function roadMarking01601QuantityDefinitionR1(): AutomaticOwnerDefinition & {
  catalogId: null; publicationAllowed: false; fullTechnicalAcceptance: false;
} {
  const facts: AutomaticParameterSpec[] = [
    { id: roadMarking01601FactIdsR1[0], title: 'Фактическая ширина линии; эта колонка только 100 мм',
      valueType: 'decimal', unitId: 'mm', kind: 'conditional', min: 100, max: 100, requiredWhen: positive },
    { id: roadMarking01601FactIdsR1[1], title: 'Проектный тип линии; эта колонка только для сплошной',
      valueType: 'enum', unitId: null, kind: 'conditional', values: [roadMarking01601LineTypeR1], requiredWhen: positive },
    { id: roadMarking01601FactIdsR1[2], title: 'Буквальная система исходной нормы: ПФ-133 тёмно-серая',
      valueType: 'enum', unitId: null, kind: 'conditional', values: [roadMarking01601PaintSystemR1], requiredWhen: positive },
    { id: roadMarking01601FactIdsR1[3], title: 'Подтверждённая ведомость с фактической длиной окрашиваемой линии',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
    { id: roadMarking01601FactIdsR1[4], title: 'Проектная спецификация буквальной ПФ-133 тёмно-серой',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
    { id: roadMarking01601FactIdsR1[5], title: 'Проектный метод нанесения на подтверждённое покрытие',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
  ];
  const sourceRows: AutomaticRowSpec[] = pack.rows.map(row => ({
    rowId: prefix + ':' + row.suffix, formulaId: prefix + ':formula:' + row.suffix,
    section: pack.titleRu, category: row.category, title: row.titleRu, unitId: row.unitId,
    expression: primary + '*' + row.ratePerLineKm, procurement: false,
    costTreatment: row.suffix === 'whole-marking-labor' ? 'OWN_COST' : 'INFORMATIONAL_SCOPE',
    inputParameterIds: [...roadMarking01601FactIdsR1],
  }));
  const common = { contract: pack.contract, semanticOwner: prefix, sourceId: pack.sourceKeyProposal,
    normId: pack.normId, sourceMetadata, ordinary, profile: [], deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.excludedRu } as const;
  const base = buildAutomaticConstructionOwnerR1({ ...common, conditional: facts, rows: sourceRows,
    applicabilityRu: 'Только отдельно измеренная фактическая длина сплошной линии 100 мм в км, колонка 27-09-016-01, буквальная ПФ-133 тёмно-серая. '
      + 'Проектные ссылки не доказывают текущую применимость редакции, продукта или цены.' });
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
    truth_metadata: roadMarking01601FactIdsR1.some(id => id === parameter.parameter_id) ? {
      ...parameter.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT',
      guide: { ...(parameter.truth_metadata.guide as Json), source_role: 'PROJECT_DOCUMENTATION',
        source_document: 'ACTUAL_MARKING_SCHEDULE_LITERAL_PRODUCT_SPECIFICATION_AND_METHOD_REQUIRED',
        source_locator: 'Факты объекта; не норма расхода, не сертификат применимости и не значение по умолчанию.' },
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
        reasonRu: 'Расход определяется фактической длиной линии в км по 27-09-016-01; ручная строка не заменяет норму.' } },
      source_metadata: { ...resource.source_metadata,
        sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
        normativeTrace: [{ sourceId: pack.sourceKeyProposal, normId: pack.normId,
          sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
          exact_locator: pack.source.locatorRu, source_artifact_sha256: pack.source.sha256 }],
        resource_code: row.resourceCode, printed_resource_name_ru: row.printedNameRu,
        source_artifact_sha256: pack.source.sha256, catalogue_identity_pending: true, normative_binding_pending: true,
        machine_price_admission: false, purchase_order_admission: false, full_technical_acceptance: false,
        material_quantity_role: row.category === 'material' ? 'SOURCE_CONSUMPTION_INFORMATION_ONLY' : null,
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
export function roadMarking01601ScenarioFactsR1(lengthKm = '1'): Record<string, unknown> {
  return { [primary]: lengthKm, marking_line_width_mm: '100', marking_line_type: roadMarking01601LineTypeR1,
    marking_paint_system: roadMarking01601PaintSystemR1,
    actual_marking_layout_reference: 'TEST_ONLY: measured continuous100mm line length; not an approved real project',
    marking_paint_product_reference: 'TEST_ONLY: literal PF133 dark-gray specification; no product certification',
    marking_method_statement_reference: 'TEST_ONLY: compatible pavement/method reference; no normative applicability admission' };
}

/** Test/scenario adapter into the EXISTING pure compiler. Diagnostic label is not a catalog ID proposal. */
export async function compileRoadMarking01601QuantityScenarioR1(submittedParameters: Record<string, unknown>,
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {},
  priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = []) {
  const definition = roadMarking01601QuantityDefinitionR1();
  const compiled = await compileCanonicalEstimateCore({ operation: 'recalculate',
    catalogId: 'TEST_ONLY_NO_CATALOG_ID_ROAD_MARKING01601', compilerVersion: pack.contract,
    primaryMeasureParameterId: primary, parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, rowOverrides, priceItems, currencyCode: 'KGS',
    maximumResourceRows: definition.resources.length, hashJson: async value => estimateDeterministicHash(value) });
  return { catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, compiled } as const;
}

/** Documented source/full-cycle obligations; not inferred from the emitted definition. */
export function roadMarking01601IndependentCompletenessMapR1() {
  const entry = (id: string, category: string, unitId: string | null, quantityRule: string, specification: string, need = false) => ({
    expectedResourceId: pack.normId + ':' + id, operationId: 'continuous100mm-pf133-darkgray-road-marking',
    category, unitId, quantityRule, specification, condition: 'Отдельно измеренная сплошная линия 100 мм; буквальная ПФ-133 тёмно-серая',
    // Completeness evidence reference only; needs have no normative binding/source array.
    sourceId: pack.sourceKeyProposal, formulaId: prefix + ':formula:' + (need ? 'need:' : '') + id,
    resolution: { kind: 'ROW', rowId: prefix + ':' + (need ? 'need:' : '') + id } });
  return { contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'NORMATIVE_OPERATION_MAP',
    generatedFromCurrentRows: false, evidenceSha256: pack.source.sha256,
    evidenceReferences: [pack.source.officialUrl, pack.source.locatorRu], entries: [
      ...pack.rows.map(row => entry(row.suffix, row.category, row.unitId, 'EXACT_OFFICIAL_RATE_PER_ONE_ACTUAL_LINE_KM',
        (row.resourceCode ?? 'CODE_UNCONFIRMED_OR_NOT_PRINTED') + ':' + row.ratePerLineKm + ':' + row.printedNameRu)),
      ...pack.openNeeds.map(need => entry(need.id, need.category, null, 'SOURCE_REQUIRED_NOT_QUANTIFIED', need.missingFact, true)),
    ] };
}
