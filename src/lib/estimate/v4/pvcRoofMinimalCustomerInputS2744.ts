import { PVC15_FIELD_TRANSITION_DEFINITION_S2743 } from './pvcRoofFieldTransitionCompositionS2743';
import { PVC15_BASE, PVC15_SYSTEM } from './pvcRoofMembraneFullCompositionS2743';
import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { CATALOGUE_SOURCE_SELECTION, PRELIMINARY_SOURCE_FORMULA } from '../backendPlatform/canonicalPreliminaryParameterFormulaV1';
import { compileFormulaGraph } from '../backendPlatform/formulaGraph';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const PVC15_MINIMAL_SOURCE_S2744 = Object.freeze({
  sourceId: 'technonicol-polymer-roof-design-guide-2024-preliminary-table',
  sha256: 'cb3d9ae070dea0411dcc7fd609b04d06409e5ea26470c8e5ac2e9fcc02ffd1fa',
  locator: 'Руководство по проектированию и устройству кровель из полимерных мембран, 2024: PDF102/печатная100, таблица расчётных коэффициентов. Мембрана1,15 — предварительно; крепёж4шт./м² — усреднённо, точное количество по ветровому расчёту; стеклохолст100г/м² —1,18. Ни один коэффициент не определяет периметр, труд или цену.',
});

/** Facts about the actual object; technical norms, labour/equipment, product
 * passports and source references belong to the catalogue, never this form. */
export const PVC15_CUSTOMER_FACT_IDS_S2744 = Object.freeze([
  'area_m2', 'pvc15_base', 'edge_rail_length_m', 'detail_membrane_mode',
  'detail_membrane_area_m2', 'pvc15_joint_transition_scope',
  'pvc15_transition_transition_length_m',
]);
const customer = new Set<string>(PVC15_CUSTOMER_FACT_IDS_S2744);
const verified = { kind: 'equals', parameterId: 'pvc15_system_profile', value: PVC15_SYSTEM.verified };
const formulas: Readonly<Record<string, { expression: string; when: Record<string, unknown>; explanation: string }>> = {
  pvc15_membrane_consumption_m2: { expression: 'area_m2*1.15', when: verified,
    explanation: 'Предварительно: площадь ×1,15 по таблице изготовителя. Проектная раскладка имеет приоритет.' },
  telescopic_fastener_quantity_piece: { expression: 'ceil(area_m2*4)', when: verified,
    explanation: 'Предварительно: 4 крепления на м², округление до целых штук. Для заказа и монтажа требуется схема ветровых зон и подбор крепежа по основанию.' },
  pvc15_separation_area_m2: { expression: 'area_m2*1.18',
    when: { kind: 'and', operands: [verified, { kind: 'equals', parameterId: 'pvc15_base', value: PVC15_BASE.eps }] },
    explanation: 'Предварительная потребность стеклохолста100г/м² для EPS/XPS: площадь ×1,18. Этот коэффициент не переносится на геотекстиль.' },
};
const selections: Readonly<Record<string, { inputs: string[]; rows: { inputValues: string[]; outputValue: string }[] }>> = {
  reinforced_membrane_designation: { inputs: ['pvc15_system_profile'], rows: [{ inputValues: [PVC15_SYSTEM.verified], outputValue: 'ТЕХНОНИКОЛЬ LOGICROOF V-RP, армированная кровельная ПВХ-мембрана 1,5 мм' }] },
  pvc15_separation_product: { inputs: ['pvc15_system_profile', 'pvc15_base'], rows: [
    { inputValues: [PVC15_SYSTEM.verified, PVC15_BASE.eps], outputValue: 'Стеклохолст разделительный, поверхностная плотность не менее100г/м², нахлёст не менее100мм' },
    { inputValues: [PVC15_SYSTEM.verified, PVC15_BASE.mineral], outputValue: 'Геотекстиль термообработанный, поверхностная плотность не менее100г/м², нахлёст не менее100мм' },
    { inputValues: [PVC15_SYSTEM.verified, PVC15_BASE.bitumen], outputValue: 'Геотекстиль термообработанный, поверхностная плотность не менее300г/м², нахлёст не менее100мм' },
  ] },
};

const parent = PVC15_FIELD_TRANSITION_DEFINITION_S2743;
const continuousOperations = new Set(['pvc15:labor:preparation', 'pvc15:labor:layout', 'pvc15:labor:fastening', 'pvc15:labor:welding']);
const continuousFormulaIds = new Set(parent.resources.filter(row => continuousOperations.has(row.row_id)).map(row => row.formula_id));
const replacedHourIds = new Set(['pvc15_preparation_worker_hours', 'pvc15_layout_worker_hours', 'pvc15_fastening_worker_hours', 'pvc15_welding_worker_hours']);
export const PVC15_MINIMAL_INPUT_DEFINITION_S2744: AutomaticOwnerDefinition = Object.freeze({
  ...parent,
  parameters: parent.parameters.filter(parameter => !replacedHourIds.has(parameter.parameter_id)).map((parameter, ordinal) => {
    if (parameter.truth_metadata.visibility_role === 'INTERNAL_ONLY') return { ...parameter, ordinal };
    const id = parameter.parameter_id;
    const formula = formulas[id];
    const selection = selections[id];
    const applicationValue = formula || selection || id === 'pvc15_system_profile';
    const guide = parameter.truth_metadata.guide as Record<string, unknown>;
    return { ...parameter, ordinal, truth_metadata: {
      ...parameter.truth_metadata,
      value_source_role: customer.has(id) ? parameter.truth_metadata.value_source_role
        : applicationValue ? 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE' : 'NORM_REQUIRED_BUT_PROJECT_SELECTED',
      ...(applicationValue ? { runtime_profile_classification: formula ? PRELIMINARY_SOURCE_FORMULA : CATALOGUE_SOURCE_SELECTION } : {}),
      ...(formula ? { preliminary_value_formula_v1: { version: 'canonical-preliminary-parameter-formula:v1', expression: formula.expression, when: formula.when } } : {}),
      ...(selection ? { derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1', inputParameterIds: selection.inputs, rows: selection.rows, interpolation: 'FORBIDDEN' } } : {}),
      guide: { ...guide,
        ...(formula ? { guide_kind: 'PRACTICE_REFERENCE', guide_short_ru: formula.explanation,
          source_role: 'MANUFACTURER_PRELIMINARY_ESTIMATE_TABLE', source_document: PVC15_MINIMAL_SOURCE_S2744.sourceId,
          source_locator: PVC15_MINIMAL_SOURCE_S2744.locator, source_snapshot_hash: PVC15_MINIMAL_SOURCE_S2744.sha256,
          guide_validation_policy: 'PRELIMINARY_ONLY_PROJECT_VALUE_OVERRIDES_SOURCE_ESTIMATE' } : {}),
        ...(selection ? { guide_short_ru: 'Характеристика подставлена приложением для выбранной совместимой системы. Другая система требует своего подтверждённого паспорта.' } : {}),
        ...(!customer.has(id) && !applicationValue ? { guide_short_ru: 'Техническое значение определяется каталогом, проектной раскладкой или исполнителем. Заказчик не вводит нормы, часы, характеристики и ссылки вручную.' } : {}),
      },
    } };
  }),
  formulas: parent.formulas.map(formula => {
    if (!continuousFormulaIds.has(formula.formula_id)) return formula;
    const compiled = compileFormulaGraph('area_m2');
    return { ...formula, output_unit_id: 'm2', expression_source: compiled.source, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds, ast_sha256: estimateDeterministicHash(compiled.ast) };
  }),
  resources: parent.resources.map(resource => {
    if (!continuousOperations.has(resource.row_id)) return resource;
    const result = { ...resource, unit_id: 'm2', resource_graph: { ...resource.resource_graph, normalizedUom: 'm2' },
      source_metadata: { ...resource.source_metadata, runtimeExpressionSource: 'area_m2',
        operationMeasurePolicy: 'MEASURED_CONTINUOUS_ROOF_FIELD_AREA_NOT_PERSON_HOURS',
        labourTimeNormClaimed: false }, row_sha256: '' };
    return { ...result, row_sha256: estimateDeterministicHash(result) };
  }),
  runtimeInput: Object.freeze({ ...parent.runtimeInput, pvc15_system_profile: PVC15_SYSTEM.verified }),
  runtimeClassification: Object.freeze({ ...parent.runtimeClassification, pvc15_system_profile: 'ASSUMPTION' as const }),
  runtimeSourceIds: Object.freeze({ ...parent.runtimeSourceIds, pvc15_system_profile: [PVC15_MINIMAL_SOURCE_S2744.sourceId] }),
});
