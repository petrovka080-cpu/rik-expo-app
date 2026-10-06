import pack from '../../../../data/estimate-benchmarks/source-packs/pvc-roof-concrete-1_2mm-krer12-s27-36.json';
import { buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS, PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS, PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES } from './pvcRoofMembraneInstallationR1';
import { PVC_ROOF_FIELD_DISPLAY_NAME_RU } from '../backendPlatform/russianTechnologyTitleR542';

export const PVC_ROOF_CONCRETE_CONTRACT_S2736 = pack.contract;
export const PVC_ROOF_CONCRETE_WORK_KEY_S2736 = 'roof_pvc_1_2mm_concrete_ready_insulation_krer12';
export const PVC_ROOF_CONCRETE_CATALOG_S2736 = 'canonical-work:master:' + PVC_ROOF_CONCRETE_WORK_KEY_S2736;
export const PVC_ROOF_CONCRETE_SOURCE_ID_S2736 = 'kg_krer12_01_028_02_pvc_concrete_s2736';
export const PVC_ROOF_CONCRETE_NORM_ID_S2736 = 'KRER12-01-028-02';
export const PVC_ROOF_CONCRETE_SOURCE_PACK_SHA256_S2736 = 'c0e35c82ec7f5f533fcdb3598022c37b8a6d3562205d73bb58f40f5f4898f8f6';
export const PVC_ROOF_CONCRETE_SOURCE_METADATA_S2736 = {
  source_title: 'КРЕР12-01-028-02:поле ПВХ1.2мм, выбранные LOGICROOF и совместимый очиститель отдельно',
  source_authority: pack.krer.authority, source_document_version: PVC_ROOF_CONCRETE_CONTRACT_S2736,
  definition_hash: PVC_ROOF_CONCRETE_SOURCE_PACK_SHA256_S2736, artifact_sha256: pack.krer.sha256,
  official_url: pack.krer.url, exact_locator: pack.krer.locator,
  use_restriction: pack.scope + '. Нормативный ресурсный бюджет, не окончательная раскладка рулонов/ветровое крепление и не инженерное утверждение. Выбранная замена материалов на LOGICROOF и современный очиститель требует согласования применимости труда/машин; поставленную версию подтвердить. Растворитель646 не включён в закупку.',
};
const eq = (parameterId: string, value: string) => ({ kind: 'equals' as const, parameterId, value });
const profile = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
  defaultValue: string | number, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: 'profile', defaultValue, ...extra });
const facts = ['concrete_and_ready_insulation_confirmed', 'wind_and_fixing_specification_matches_budget_confirmed',
  'delivered_membrane_and_cleaner_version_confirmed', 'norm_material_replacement_applicability_confirmed'];
const confirmed = eq('roof_applicability_mode', 'CONFIRMED_PROJECT_FACTS');
const parameters: AutomaticParameterSpec[] = [
  { id: 'area_m2', title: 'Чистая площадь поля кровли; примыкания и соседние слои считаются отдельно', kind: 'ordinary', valueType: 'decimal', unitId: 'm2', min: 0.001 },
  profile('roof_applicability_mode', 'Предварительный нормативный бюджет либо подтверждённая применимость выбранной системы', 'enum', null, 'PRELIMINARY_PROFILE', { values: ['PRELIMINARY_PROFILE', 'CONFIRMED_PROJECT_FACTS'] }),
  profile('roof_height_m', 'Предварительно высота 15 м; выше 15 м добавляется 0,5% труда за каждый метр по КРЕР', 'decimal', 'm', 15, { min: 0, max: 1000 }),
  profile('field_roll_m2', 'Площадь рулона ПВХ-мембраны LOGICROOF V-RP, 1,2 мм: 52,5 м² при размере 2,1×25 м; подтвердить поставку', 'decimal', 'm2', 52.5, { min: 52.5, max: 52.5 }),
  profile('detail_pack_m2', 'Площадь упаковки мембраны V-SR, 1,5 мм: предварительно 20 м², два рулона 1×10 м; при продаже по рулону выбрать 10 м²', 'enum', 'm2', '20', { values: ['10', '20'] }),
  profile('dornit_quantum_m2', 'Предварительно поставка геотекстиля Дорнит, 300 г/м², с кратностью 1 м²; фактическую ширину и рулон уточнить', 'decimal', 'm2', 1, { min: 0.000001 }),
  profile('fastener_quantum_piece', 'Предварительная кратность поставки каждого вида крепежа 1 шт.; заменить упаковкой поставщика', 'integer', 'piece', 1, { min: 1 }),
  profile('roof_crew_tool_sets', 'Предварительно одно звено; ручная оснастка раскрыта и включена в труд подрядчика, не новый заказ', 'integer', 'set', 1, { min: 1 }),
  profile('separate_weld_tests', 'Дополнительные отдельно оплачиваемые испытания по проекту выбраны явно; рутинный контроль не превращается в дополнительную услугу', 'enum', null, 'NOT_REQUIRED', { values: ['NOT_REQUIRED', 'REQUIRED'] }),
  { id: 'cleaned_surface_m2', title: 'Обмеренная площадь подготовки/очистки сварных зон и загрязнений; не вся площадь кровли автоматически', kind: 'conditional', valueType: 'decimal', unitId: 'm2', min: 0 },
  { id: 'cleaner_density_kg_l', title: 'Плотность выбранного очистителя по паспорту или поставке, кг/л; нужна для канистры 3 л', kind: 'conditional', valueType: 'decimal', unitId: 'kg_per_l', min: 0.000001 },
  ...facts.map((id): AutomaticParameterSpec => ({ id, title: {
    concrete_and_ready_insulation_confirmed: 'Бетонное несущее основание и готовый совместимый утеплитель приняты; нет прямого контакта с битумом/EPS/XPS',
    wind_and_fixing_specification_matches_budget_confirmed: 'Проектная ветровая схема, длины крепежа и фактическая раскладка соответствуют выбранному нормативному бюджету; иначе требуется другой расчёт',
    delivered_membrane_and_cleaner_version_confirmed: 'Поставлены выбранные V-RP1.2/V-SR1.5 и совместимый очиститель; региональная версия и упаковка проверены',
    norm_material_replacement_applicability_confirmed: 'Применимость труда/машин КРЕР при замене нормативной мембраны и646 на выбранную современную систему согласована',
  }[id]!, kind: 'conditional', valueType: 'enum', unitId: null, values: ['YES'], requiredWhen: confirmed })),
];
const rows: AutomaticRowSpec[] = [];
const includedOwners = new Map<string, string>();
const physicalPieceBudgets = new Map<string, string>();
const scale = `(area_m2/${pack.krer.denominatorM2})`;
const height = `(1+max(0,roof_height_m-${pack.krer.heightRule.baseHeightM})*${pack.krer.heightRule.workerIncrementPerExtraM})`;
function add(row: Omit<AutomaticRowSpec, 'formulaId'>) { rows.push({ ...row, formulaId: 'pvc_roof_' + row.rowId.replace(/[^a-z0-9_]/g, '_') + '_v1' }); }
add({ rowId: 'pvc-roof:scope:area', section: 'Граница этапа', category: 'service', title: PVC_ROOF_FIELD_DISPLAY_NAME_RU + ' по готовому совместимому утеплителю на бетонном несущем основании, со сваркой горячим воздухом; примыкания и соседние слои отдельно', unitId: 'm2', expression: 'area_m2', costTreatment: 'INFORMATIONAL_SCOPE' });
// The original normative solvent remains a non-payable source comparison.
// It is never issued as an approved LOGICROOF purchasing instruction.
add({ rowId: 'pvc-roof:scope:original646', section: 'Исходная норма и согласование замены', category: 'service', title: 'Растворитель 646 из исходной КРЕР: только сравнение состава; для LOGICROOF не назначен и не закупается', unitId: 'kg', expression: `${scale}*${pack.krer.materials.originalSolvent646_kg}`, costTreatment: 'INFORMATIONAL_SCOPE' });
const materials = [
  ['field', 'Мембрана кровельная ПВХ, армированная, 1,2 мм — LOGICROOF V-RP, ТЛ 2.01/03.2026; нормативная площадь требует проверки раскладки', 'm2', pack.krer.materials.reinforcedPvc1_2_m2, 'field_roll_m2'],
  ['detail', 'Мембрана ПВХ неармированная, 1,5 мм — LOGICROOF V-SR, ТЛ 2.33/03.2026; местное усиление Т-стыков, примыкания отдельно', 'm2', pack.krer.materials.unreinforcedPvc1_5_m2, 'detail_pack_m2'],
  ['dornit', 'Геотекстиль нетканый Дорнит, 300 г/м², для разделительного слоя; совместимость основания проверить', 'm2', pack.krer.materials.dornit300_m2, 'dornit_quantum_m2'],
  ['screw', 'Винт самонарезающий остроконечный, 4,8×70 мм; нормативный бюджет требует проверки ветровой схемы', 'piece', pack.krer.materials.screw4_8x70_piece, 'fastener_quantum_piece'],
  ['roof-dowel', 'Дюбель полипропиленовый кровельный, 50×15×150 мм; отдельно от винта, применимость длины проверить', 'piece', pack.krer.materials.polypropyleneRoofDowel50x15x150_piece, 'fastener_quantum_piece'],
  ['anchor', 'Дюбель распорный полиэтиленовый, 6×40 мм; исходная норма 0,4 десятка, то есть 4 шт. на 100 м²', 'piece', pack.krer.materials.polyethyleneAnchor6x40_piece, 'fastener_quantum_piece'],
] as const;
function supply(key: string, title: string, unit: string, rawConsumed: string, quantum: string) {
  // A normative budget may be fractional; a physical screw/dowel cannot be.
  // Apply this conversion before stock/reserve, then round the order once to its pack.
  const consumed = unit === 'piece' ? `ceil(${rawConsumed})` : rawConsumed;
  const balanceValueType = unit === 'piece' ? 'integer' : 'decimal';
  const stock = 'roof_' + key.replaceAll('-', '_') + '_stock', reserve = 'roof_' + key.replaceAll('-', '_') + '_reserve';
  parameters.push(profile(stock, title + ': предварительно 0 пригодного наличия', balanceValueType, unit, 0, { min: 0 }),
    profile(reserve, title + ': предварительно 0 сохраняемого резерва', balanceValueType, unit, 0, { min: 0 }));
  const rowId = 'pvc-roof:material:' + key;
  if (unit === 'piece') physicalPieceBudgets.set(rowId, rawConsumed);
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: rowId, orderUnitId: unit, consumed, stock, reserve, quantum });
  add({ rowId, section: 'Материалы выбранного поля', category: 'material', title, unitId: unit,
    expression: `ceil(max(0,(${consumed})+${reserve}-${stock})/(${quantum}))*(${quantum})`, procurement: true, ...balance.owner });
}
for (const [key, title, unit, rate, quantum] of materials) supply(key, title, unit, `${scale}*${rate}`, quantum);
supply('cleaner', 'Очиститель для ПВХ-мембран ТЕХНОНИКОЛЬ: 250 г/м² обмеренной обработки; канистра 3 л, перевод по подтверждённой плотности', 'kg', `cleaned_surface_m2*${pack.products.cleaner.rateKgPerCleanedM2}`, `${pack.products.cleaner.packL}*cleaner_density_kg_l`);
add({ rowId: 'pvc-roof:labor:workers', section: 'Разделительный слой, укладка, крепление, очистка и сварка', category: 'construction_work', title: 'Рабочие-строители, разряд 3,3: 5,33 чел.-ч на 100 м²; выбранная замена материала требует согласования', unitId: 'man_hour', expression: `${scale}*${pack.krer.workerManH}*${height}` });
add({ rowId: 'pvc-roof:scope:operators', section: 'Включено в эксплуатацию машин', category: 'construction_work', title: 'Машинисты: 0,03 чел.-ч на 100 м² исходной нормы; входят в машины и отдельно не оплачиваются', unitId: 'man_hour', expression: `${scale}*${pack.krer.includedMachineOperatorManH}`, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS' });
const machines = [
  ['tower8t', 'Кран башенный, 8 т, другие виды строительства'], ['truckCrane10t', 'Кран автомобильный, 10 т, другие виды строительства'],
  ['screwdriver', 'Шуруповёрт'], ['variant4_6kw', 'Автомат сварки горячим воздухом Leister Variant V, 4,6 кВт'],
  ['hammer', 'Перфоратор электрический'], ['triac1_6kw', 'Электрофен TRIAC, 1,6 кВт'], ['lorry5t', 'Автомобиль бортовой до 5 т'],
] as const;
for (const [key, title] of machines) add({ rowId: 'pvc-roof:machine:' + key, section: 'Машины и механизированная оснастка по КРЕР', category: 'equipment', title, unitId: 'machine_hour', expression: `${scale}*${pack.krer.machineH[key]}` });
for (const [key, title] of [
  ['knife', 'Монтажный нож раскроя мембраны'], ['scissors', 'Ножницы раскроя мембраны'],
  ['hand-roller', 'Ручной силиконовый прикаточный ролик сварки'], ['probe', 'Щуп проверки сплошности сварного шва'],
  ['tape', 'Рулетка разметки'], ['white-cloth', 'Белая безворсовая ткань подготовки сварных зон'],
  ['gloves', 'Рабочие перчатки по выбранному плану защиты'], ['goggles', 'Защитные очки по выбранному плану защиты'],
] as const) {
  const rowId = 'pvc-roof:tool:' + key; includedOwners.set(rowId, 'pvc-roof:labor:workers');
  add({ rowId, section: 'Раскрытая ручная оснастка подрядчика', category: 'material', title: title + '; предварительно 1 на звено, входит в труд, не дополнительная покупка', unitId: 'piece', expression: 'roof_crew_tool_sets', costTreatment: 'INCLUDED_IN_RESOURCE_ROWS' });
}
const built = buildAutomaticConstructionOwnerR1({ contract: PVC_ROOF_CONCRETE_CONTRACT_S2736, semanticOwner: PVC_ROOF_CONCRETE_WORK_KEY_S2736,
  sourceId: PVC_ROOF_CONCRETE_SOURCE_ID_S2736, normId: PVC_ROOF_CONCRETE_NORM_ID_S2736, sourceMetadata: PVC_ROOF_CONCRETE_SOURCE_METADATA_S2736,
  applicabilityRu: PVC_ROOF_CONCRETE_SOURCE_METADATA_S2736.use_restriction, ordinary: parameters.filter(p => p.kind === 'ordinary'),
  profile: parameters.filter(p => p.kind === 'profile'), conditional: parameters.filter(p => p.kind === 'conditional'), rows,
  deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.exclusions });
const qaRow = PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES.find(r => r.row_id === 'rc09:pvc_membrane_weld_probe_test');
const qaFormula = qaRow && PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS.find(f => f.formula_id === qaRow.formula_id);
const qaParameters = PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS.filter(p => p.parameter_id === 'weld_probe_control_designation' || p.parameter_id === 'weld_probe_control_count_test');
if (!qaRow || !qaFormula || qaParameters.length !== 2) throw Error('PVC_ROOF_READY_PROJECT_TEST_OPERATION_MISSING');
function stage(id: string) {
  if (id === 'pvc-roof:labor:workers' || id === 'pvc-roof:scope:operators') {
    return { id: 'complex-labor', title: 'Труд всего комплекса и включённые машинисты', ordinal: 8, role: 'COST_SUMMARY' as const };
  }
  if (id.includes(':scope:')) return { id: 'boundary', title: 'Граница выбранной работы', ordinal: 9, role: 'REFERENCE_ONLY' as const };
  const step = id.startsWith('rc09:') ? 'project-tests'
    : /:material:dornit$/.test(id) ? 'separation'
    : /:material:(screw|roof-dowel|anchor)$|:machine:(screwdriver|hammer)$/.test(id) ? 'fastening'
    : /:material:cleaner$|:tool:white-cloth$/.test(id) ? 'cleaning'
    : /:material:detail$|:machine:(variant4_6kw|triac1_6kw)$|:tool:hand-roller$/.test(id) ? 'welding'
    : /:tool:probe$/.test(id) ? 'control'
    : /:material:field$|:tool:(knife|scissors)$/.test(id) ? 'laying'
    : 'preparation';
  const steps = {
    preparation: { title: 'Проверка готового основания, разметка и подача материалов', ordinal: 0 },
    separation: { title: 'Укладка совместимого разделительного геотекстиля', ordinal: 1 },
    laying: { title: 'Раскрой и укладка полотен ПВХ-мембраны', ordinal: 2 },
    fastening: { title: 'Механическое крепление мембраны к основанию', ordinal: 3 },
    cleaning: { title: 'Подготовка и очистка сварных зон по фактической площади обработки', ordinal: 4 },
    welding: { title: 'Сварка горячим воздухом, прикатка швов и усиление Т-стыков', ordinal: 5 },
    control: { title: 'Проверка сплошности сварных швов щупом и завершение участка', ordinal: 6 },
    'project-tests': { title: 'Дополнительные испытания, отдельно назначенные проектом', ordinal: 7 },
  };
  return { id: step, ...steps[step], role: 'PROCESS' as const };
}
export const PVC_ROOF_CONCRETE_DEFINITION_S2736 = Object.freeze({ ...built,
  parameters: [...built.parameters, ...qaParameters.map(p => ({ ...p, required: false, constraints_json: {
    ...p.constraints_json, requiredWhen: eq('separate_weld_tests', 'REQUIRED'), forbiddenWhen: eq('separate_weld_tests', 'NOT_REQUIRED'),
  } }))].map((p, ordinal) => ({ ...p, ordinal })),
  formulas: [...built.formulas, qaFormula],
  resources: [...built.resources, { ...qaRow, inclusion_ast: eq('separate_weld_tests', 'REQUIRED') }].map((row, ordinal) => {
    const process = stage(row.row_id);
    const resource = { ...row, ordinal, resource_graph: { ...row.resource_graph,
      ...(physicalPieceBudgets.has(row.row_id) ? { physicalPieceBudget: {
        rawNormativeBudgetExpression: physicalPieceBudgets.get(row.row_id),
        physicalNeedConversion: 'CEIL_TO_WHOLE_PIECE_BEFORE_STOCK_AND_PACK_ROUNDING',
      } } : {}),
      ...(includedOwners.has(row.row_id) ? { includedInResourceOwnerRowId: includedOwners.get(row.row_id) } : {}),
      ...(row.row_id.startsWith('rc09:') ? {} : { inputParameterIds: [
        ...(row.resource_graph.inputParameterIds as string[] ?? []), 'roof_applicability_mode', ...facts,
      ] }),
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: 'pvc-roof-field-krer12', groupTitleRu: PVC_ROOF_FIELD_DISPLAY_NAME_RU + ' по готовому основанию',
        operationId: process.id, operationTitleRu: process.title, processOrdinal: process.ordinal, processRole: process.role,
        completionCriterionRu: 'Подтвердить совместимость основания, ветровое крепление, раскладку, замену материалов, поставку и качество швов; соседние слои/примыкания отдельно' },
    }, source_metadata: { ...row.source_metadata, engineeringApprovalClaimed: false,
      materialReplacementApprovalRequired: true,
      ...(row.row_id.startsWith('pvc-roof:tool:') ? { sourceRole: 'VISIBLE_CONTRACTOR_TOOLING_PLAN_NOT_KRER_CONSUMPTION' } : {}),
      ...(row.row_id === 'pvc-roof:material:cleaner' ? { sourceRole: 'MANUFACTURER_CLEANED_SURFACE_RATE_AND_EXPLICIT_DENSITY_NOT_SOLVENT646', manufacturerSource: pack.products.cleaner } : {}),
      ...(row.row_id === 'pvc-roof:material:field' ? { selectedManufacturerProduct: pack.products.field } : {}),
      ...(row.row_id === 'pvc-roof:material:detail' ? { selectedManufacturerProduct: pack.products.detail } : {}),
      ...(row.row_id.startsWith('rc09:') ? { reusedOperation: { module: 'pvcRoofMembraneInstallationR1', originalRowId: qaRow.row_id, originalFormulaId: qaFormula.formula_id, arithmeticPreserved: true } } : {}),
    } };
    return { ...resource, row_sha256: estimateDeterministicHash({ ...resource, row_sha256: '' }) };
  }),
});
export function compilePvcRoofConcreteKrer12S2736(submittedParameters: Record<string, unknown>) {
  return compileAutomaticConstructionOwnerR1({ compilerVersion: PVC_ROOF_CONCRETE_CONTRACT_S2736, catalogId: PVC_ROOF_CONCRETE_CATALOG_S2736,
    primaryMeasureParameterId: 'area_m2', definition: PVC_ROOF_CONCRETE_DEFINITION_S2736, submittedParameters });
}
