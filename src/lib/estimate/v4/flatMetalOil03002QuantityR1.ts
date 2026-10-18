import pack from '../../../../data/estimate-benchmarks/source-packs/flat-metal-oil-two-coats-krer15-030-02-quantity-r1.json';
import { buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

type Json = Record<string, unknown>;
export const flatMetalOil03002QuantityPackR1 = pack;
export const flatMetalOil03002PrimaryR1 = 'actual_flat_metal_oil_painted_area_m2';
export const flatMetalOil03002PrefixR1 = 'flat-metal-oil:krer15-04-030-02';
export const flatMetalOil03002FactIdsR1 = ['flat_metal_surface_class', 'oil_paint_interior_scope', 'oil_paint_product_and_two_coats', 'oil_paint_included_preparation_boundary', 'oil_paint_room_height_m', 'oil_paint_area_reference', 'oil_paint_project_scope_reference', 'oil_paint_payment_boundary_reference'] as const;
const primary = flatMetalOil03002PrimaryR1, prefix = flatMetalOil03002PrefixR1;
const positive = { kind: 'greater_than', parameterId: primary, value: 0 } as const;
const needParameter = (id: string) => 'flat_metal_oil03002_application_need_' + id.replaceAll('-', '_');
export const flatMetalOil03002NeedRowIdsR1 = pack.openNeeds.map(need => prefix + ':need:' + need.id);
export const flatMetalOil03002NeedParameterIdsR1 = pack.openNeeds.map(need => needParameter(need.id));
const sourceMetadata = { source_title: pack.source.titleRu, source_document_version: pack.source.edition,
  definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256, exact_locator: pack.source.locatorRu };
const ordinary = [{ id: primary, title: 'Фактическая проектная площадь окрашиваемой плоской металлической поверхности',
  valueType: 'decimal', unitId: 'm2', kind: 'ordinary', min: 0 }] as const;

/** Catalogue-null physical consumption only. Reuses the one owner/formula/compiler implementation. */
export function flatMetalOil03002QuantityDefinitionR1(): AutomaticOwnerDefinition & {
  catalogId: null; publicationAllowed: false; fullTechnicalAcceptance: false;
} {
  const facts: AutomaticParameterSpec[] = [
    { id: flatMetalOil03002FactIdsR1[0], title: 'Большая плоская металлическая поверхность по проекту, не стальная конструкция, кровля, труба или решётка', valueType: 'enum', unitId: null, kind: 'conditional', values: ['LARGE_FLAT_NONSTRUCTURAL_METAL_NOT_ROOF_PIPE_GRILLE'], requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[1], title: 'Внутренняя область применения выбранного готового материала', valueType: 'enum', unitId: null, kind: 'conditional', values: ['INTERIOR_ONLY'], requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[2], title: 'Готовая внутренняя МА-25 указанного светлого цвета, два слоя', valueType: 'enum', unitId: null, kind: 'conditional', values: ['READY_MA25_INTERNAL_PINK_BEIGE_LIGHT_BEIGE_LIGHT_GREY_TWO_COATS'], requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[3], title: 'Очистка, проолифка и два слоя включены; отдельная антикоррозионная обработка не назначена', valueType: 'enum', unitId: null, kind: 'conditional', values: ['CLEAN_OLIFA_FIRST_SECOND_NO_EXTRA_CORROSION'], requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[4], title: 'Высота помещения не больше 3,5 м, без автоматического допуска особого доступа', valueType: 'decimal', unitId: 'm', kind: 'conditional', min: 0.000001, max: 3.5, requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[5], title: 'Проектная ведомость фактической окрашиваемой площади без пересчёта из длины труб', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[6], title: 'Проектная классификация металла и совместимости нормы 15-04-030-02', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
    { id: flatMetalOil03002FactIdsR1[7], title: 'Граница оплаты одной целой операции без повторной подготовки и второго слоя', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positive },
  ];
  const sourceRows: AutomaticRowSpec[] = pack.rows.map(row => ({
    rowId: prefix + ':' + row.suffix, formulaId: prefix + ':formula:' + row.suffix,
    section: pack.titleRu, category: row.category, title: row.titleRu, unitId: row.unitId,
    expression: primary + '*' + row.ratePer100M2 + '/100', procurement: false,
    costTreatment: row.costTreatment as AutomaticRowSpec['costTreatment'],
    inputParameterIds: [...flatMetalOil03002FactIdsR1],
  }));
  const common = { contract: pack.contract, semanticOwner: prefix, sourceId: pack.sourceKeyProposal,
    normId: pack.normId, sourceMetadata, ordinary, profile: [], deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.excludedRu } as const;
  const base = buildAutomaticConstructionOwnerR1({ ...common, conditional: facts, rows: sourceRows,
    applicabilityRu: pack.scopeRu + ' Проектные ссылки не доказывают нормативную применимость, совместимость покрытия, условия высыхания или цену.' });
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
    truth_metadata: flatMetalOil03002FactIdsR1.some(id => id === parameter.parameter_id) ? {
      ...parameter.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT',
      guide: { ...(parameter.truth_metadata.guide as Json), source_role: 'PROJECT_DOCUMENTATION',
        source_document: 'ACTUAL_PAINTED_AREA_METAL_CLASSIFICATION_AND_WHOLE_OPERATION_BOUNDARY_REQUIRED',
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
        reasonRu: 'Количество определяется фактической площадью по 15-04-030-02, включающей два слоя; ручная строка не заменяет норму.' } },
      source_metadata: { ...resource.source_metadata,
        sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
        normativeTrace: [{ sourceId: pack.sourceKeyProposal, normId: pack.normId,
          sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
          exact_locator: pack.source.locatorRu, source_artifact_sha256: pack.source.sha256 }],
        resource_code: row.resourceCode, printed_resource_name_ru: row.printedNameRu,
        source_artifact_sha256: pack.source.sha256, catalogue_identity_pending: true, normative_binding_pending: true,
        machine_price_admission: false, purchase_order_admission: false, full_technical_acceptance: false,
        included_operations: row.suffix === 'whole-oil-painting-labor' ? pack.includedOperations.map(operation => ({ operationId: operation.id, printedRu: operation.printedRu, paymentOwnerRowId: prefix + ':whole-oil-painting-labor' })) : [],
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
export function flatMetalOil03002ScenarioFactsR1(areaM2 = '100'): Record<string, unknown> {
  return { [primary]: areaM2, flat_metal_surface_class: 'LARGE_FLAT_NONSTRUCTURAL_METAL_NOT_ROOF_PIPE_GRILLE', oil_paint_interior_scope: 'INTERIOR_ONLY',
    oil_paint_product_and_two_coats: 'READY_MA25_INTERNAL_PINK_BEIGE_LIGHT_BEIGE_LIGHT_GREY_TWO_COATS',
    oil_paint_included_preparation_boundary: 'CLEAN_OLIFA_FIRST_SECOND_NO_EXTRA_CORROSION', oil_paint_room_height_m: '3',
    oil_paint_area_reference: 'TEST_ONLY: measured large flat metal painted area, not an actual project',
    oil_paint_project_scope_reference: 'TEST_ONLY: project-classified large nonstructural interior flat metal, exact MA25 light colour and two coats, not an actual approval',
    oil_paint_payment_boundary_reference: 'TEST_ONLY: whole labour includes cleaning, natural oil priming and both coats; no additional operator' };
}

/** Test/scenario adapter into the EXISTING pure compiler. Diagnostic label is not a catalog ID proposal. */
export async function compileFlatMetalOil03002QuantityScenarioR1(submittedParameters: Record<string, unknown>,
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {},
  priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = []) {
  const definition = flatMetalOil03002QuantityDefinitionR1();
  const compiled = await compileCanonicalEstimateCore({ operation: 'recalculate',
    catalogId: 'TEST_ONLY_NO_CATALOG_ID_FLAT_METAL_OIL03002', compilerVersion: pack.contract,
    primaryMeasureParameterId: primary, parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, rowOverrides, priceItems, currencyCode: 'KGS',
    maximumResourceRows: definition.resources.length, hashJson: async value => estimateDeterministicHash(value) });
  return { catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, compiled } as const;
}

/** Documented source/full-cycle obligations; not inferred from the emitted definition. */
export function flatMetalOil03002IndependentCompletenessMapR1() {
  const entry = (id: string, category: string, unitId: string | null, quantityRule: string, specification: string, need = false) => ({
    expectedResourceId: pack.normId + ':' + id, operationId: 'flat-metal-oil-two-coats-actual-area',
    category, unitId, quantityRule, specification, condition: pack.scopeRu,
    // Completeness evidence reference only; needs have no normative binding/source array.
    sourceId: pack.sourceKeyProposal, formulaId: prefix + ':formula:' + (need ? 'need:' : '') + id,
    resolution: { kind: 'ROW', rowId: prefix + ':' + (need ? 'need:' : '') + id } });
  return { contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'NORMATIVE_OPERATION_MAP',
    generatedFromCurrentRows: false, evidenceSha256: pack.source.sha256,
    evidenceReferences: [pack.source.officialUrl, pack.source.locatorRu], entries: [
      ...pack.rows.map(row => entry(row.suffix, row.category, row.unitId, 'EXACT_OFFICIAL_RATE_PER_100_PROJECT_PAINTED_M2',
        (row.resourceCode ?? 'CODE_UNCONFIRMED_OR_NOT_PRINTED') + ':' + row.ratePer100M2 + ':' + row.printedNameRu)),
      ...pack.openNeeds.map(need => entry(need.id, need.category, null, 'SOURCE_REQUIRED_NOT_QUANTIFIED', need.missingFact, true)),
    ] };
}
