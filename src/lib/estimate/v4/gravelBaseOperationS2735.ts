import {
  compileAutomaticConstructionOwnerR1,
  type AutomaticOwnerDefinition,
} from './automaticConstructionOwnerR1';
import { GRANULAR_BACKFILL_DEFINITION_S2735 as placing } from './granularBackfillOperationS2735';
import { SINGLE_PIPE_TRENCH_DEFINITION_S2735 as trench } from './singlePipeTrenchConstructorS2735';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const GRAVEL_BASE_VARIANTS_S2735 = ['standard', 'high_load', 'technical_room', 'wet_zone'] as const;
export const GRAVEL_BASE_CATALOG_IDS_S2735 = GRAVEL_BASE_VARIANTS_S2735.map(variant =>
  'canonical-work:base:earthworks_interior_gravel_base_prepare_' + variant);
export const GRAVEL_BASE_SOURCE_ID_S2735 = 'project_gravel_base_actual_layer_volume_s27_35';
export const GRAVEL_BASE_NORM_ID_S2735 = 'project:gravel-base:actual-layer-and-supply:s27-35.v1';
export const GRAVEL_BASE_CONTRACT_S2735 = 'gravel-base-operation:s27-35.v1';
export const GRAVEL_BASE_SOURCE_METADATA_S2735 = {
  source_title: 'Измеренный объём щебёночного основания; готовые операции поставки, укладки, уплотнения и применимого геотекстиля',
  source_authority: 'Фактический проект и поставщик; марка, фракция, конструкция слоя и уплотнение требуют подтверждения',
  source_document_version: GRAVEL_BASE_CONTRACT_S2735,
  definition_hash: 'aab511fc5dcf0e5e5b5fcdd16f0ece163f4113e836d09ee66def95213ae08cc5',
  artifact_sha256: 'aab511fc5dcf0e5e5b5fcdd16f0ece163f4113e836d09ee66def95213ae08cc5',
  exact_locator: 'source-packs/gravel-base-operation-s27-35.json: измеренный объём слоя; готовые AST с явными связями экземпляра; геотекстиль только по фактической раскладке и проектной применимости',
  source_kind: 'ACTUAL_LAYER_VOLUME_AND_PROJECT_SUPPLIER_FACTS_REQUIRED',
  use_restriction: 'Только отдельно измеренное щебёночное основание по проекту. Вариант не назначает фракцию, прочность, толщину захватки, уплотнение и нормы труда. Разработка, труба, постель, песчаная и дренажная конструкции не включены.',
};

// Reuse the accepted operations by binding their identifiers. Arithmetic and
// the purchase-balance contract remain in the original operation modules.
const geotextile = trench.resources.find(row => row.row_id === 'material:trench:geotextile');
if (!geotextile) throw new Error('GRAVEL_BASE_READY_GEOTEXTILE_MISSING');
const geotextileFormula = trench.formulas.find(formula => formula.formula_id === geotextile.formula_id);
if (!geotextileFormula) throw new Error('GRAVEL_BASE_READY_GEOTEXTILE_FORMULA_MISSING');
const geotextileGraph = geotextile.resource_graph as Record<string, unknown>;
const geotextileParameterIds = new Set(geotextileFormula.input_parameter_ids);
function collectParameterReferences(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(collectParameterReferences); return; }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'parameterId' && typeof child === 'string') geotextileParameterIds.add(child);
    else collectParameterReferences(child);
  }
}
for (const key of ['inputParameterIds', 'titleSpecificationParameterIds']) {
  for (const id of geotextileGraph[key] as string[] ?? []) geotextileParameterIds.add(id);
}
collectParameterReferences(geotextile.inclusion_ast);
collectParameterReferences(geotextileGraph.purchaseBalanceV1);
collectParameterReferences(geotextileGraph.effectiveQuantityOutputV1);
const sourceParameters = [...placing.parameters, ...trench.parameters.filter(parameter => geotextileParameterIds.has(parameter.parameter_id))];
const sourceResources = [...placing.resources, geotextile];
const sourceFormulas = [...placing.formulas, geotextileFormula];

export const GRAVEL_BASE_BINDINGS_S2735 = Object.freeze({
  parameters: Object.freeze(Object.fromEntries(sourceParameters.map(parameter => [parameter.parameter_id,
    parameter.parameter_id === 'volume_m3' ? 'volume_m3' : 'gb_' + parameter.parameter_id]))),
  rows: Object.freeze(Object.fromEntries(sourceResources.map(row => [row.row_id, 'gravel-base:' + row.row_id]))),
  formulas: Object.freeze(Object.fromEntries(sourceFormulas.map(formula => [formula.formula_id, 'gravel_base_' + formula.formula_id]))),
});
const bindings = new Map<string, string>(Object.entries({
  ...GRAVEL_BASE_BINDINGS_S2735.parameters,
  ...GRAVEL_BASE_BINDINGS_S2735.rows,
  ...GRAVEL_BASE_BINDINGS_S2735.formulas,
}));
function bindValue<T>(value: T): T {
  if (typeof value === 'string') return (bindings.get(value) ?? value) as T;
  if (Array.isArray(value)) return value.map(bindValue) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, bindValue(child)])) as T;
  }
  return value;
}
function bindExpression(value: string): string {
  return value.replace(/[A-Za-z_][A-Za-z0-9_]*/gu, id => bindings.get(id) ?? id);
}
const titles: Record<string, string> = {
  volume_m3: 'Измеренный объём щебёночного основания в конструкции; не рыхлый объём заказа',
  backfill_loose_per_installed_m3: 'Фактический рыхлый объём поставки на 1 м³ щебёночного основания в конструкции',
  pbb_backfill_material: 'Щебень: марка, фракция, прочность/морозостойкость и применимая проектная спецификация',
  pbb_assembly_designation: 'Проектная конструкция основания, подготовленность нижнего слоя, толщина захваток и способ укладки; применимый геотекстиль включён в фактический труд',
  pbb_compaction_coefficient: 'Требуемое уплотнение щебёночного основания по проекту и принятому методу контроля',
  backfill_waste_scope_reference: 'Отдельно оплачиваемый вывоз упаковки/отходов этого основания; вывоз грунта другой операции исключён',
  geotextile_mode: 'Геотекстиль основания: проектная применимость не подтверждена, требуется либо не требуется',
  backfill_stock: 'Пригодное наличие щебня выбранной спецификации для этого основания',
  backfill_reserve: 'Сохраняемый резерв щебня выбранной спецификации для этого основания',
  backfill_quantum: 'Кратность поставки щебня выбранной спецификации',
  effective_resource_quantity_material_trench_upper_backfill: 'Принятое количество заказа щебня этого основания',
};
const parameters = sourceParameters.map((source, ordinal) => {
  const parameter = bindValue(source);
  return {
    ...parameter, ordinal, title_ru: titles[source.parameter_id] ?? parameter.title_ru,
    truth_metadata: {
      ...parameter.truth_metadata, contract: GRAVEL_BASE_CONTRACT_S2735,
      semantic_parameter_key: 'gravel-base:' + parameter.parameter_id,
      guide: {
        ...(parameter.truth_metadata.guide as Record<string, unknown>),
        source_document: GRAVEL_BASE_SOURCE_ID_S2735,
        source_locator: GRAVEL_BASE_SOURCE_METADATA_S2735.exact_locator,
        source_snapshot_hash: GRAVEL_BASE_SOURCE_METADATA_S2735.artifact_sha256,
        applicability: GRAVEL_BASE_SOURCE_METADATA_S2735.use_restriction,
      },
    },
  };
});
const formulas = sourceFormulas.map(source => {
  if (typeof source.expression_source !== 'string') throw new Error('GRAVEL_BASE_READY_EXPRESSION_MISSING:' + source.formula_id);
  return { ...bindValue(source), expression_source: bindExpression(source.expression_source), ast_sha256: estimateDeterministicHash(bindValue(source.ast)) };
});
const rowTitles: Record<string, string> = {
  'scope:backfill:installed': 'Щебёночное основание: измеренный объём в конструкции; отдельной оплаты по м³ нет',
  'scope:backfill:loose-consumption': 'Рыхлый щебень по фактическому коэффициенту поставки; не отдельная закупка',
  'material:trench:upper-backfill': 'Щебень основания по проектной спецификации: потребление, заказ и остаток',
  'material:trench:geotextile': 'Геотекстиль основания: тип и раскладка с фактическими нахлёстами',
  'rc09:equipment:pbb-excavator': 'Экскаватор подачи/распределения щебня; часы только этого основания',
  'rc09:logistics:pbb-removal': 'Вывоз упаковки/отходов только этого основания',
  'rc09:pbb_compaction_tests': 'Контроль уплотнения щебёночного основания',
  'rc09:pbb_asbuilt_documents': 'Исполнительная документация щебёночного основания',
};
const resources = sourceResources.map((source, ordinal) => {
  const row = bindValue(source);
  const operationId = source.row_id === geotextile.row_id ? 'geotextile' : row.category === 'material' ? 'supply'
    : row.category === 'labor' ? 'placing-compaction' : row.category === 'equipment' ? 'equipment' : 'scope-logistics';
  const output = {
    ...row, id: 'gravel-base-' + source.id, ordinal, title_ru: rowTitles[source.row_id] ?? row.title_ru,
    section: source.row_id === geotextile.row_id ? 'Применимый разделительный слой' : row.section,
    resource_graph: {
      ...row.resource_graph, semanticOwnerId: 'gravel-base:' + row.row_id,
      scopeContextParameterIds: ['volume_m3', 'gb_pbb_assembly_designation', 'gb_pbb_compaction_coefficient'],
      operationCompositionV1: {
        contractVersion: 'canonical-operation-resource/v1', groupId: 'gravel-base',
        groupTitleRu: 'Щебёночное основание: поставка, укладка и уплотнение', operationId,
        operationTitleRu: operationId === 'geotextile' ? 'Применимый геотекстиль' : operationId === 'supply' ? 'Материалы и оснащение'
          : operationId === 'placing-compaction' ? 'Укладка и уплотнение' : operationId === 'equipment' ? 'Фактические механизмы' : 'Объём, контроль и логистика',
        completionCriterionRu: 'Подтвердить спецификацию щебня, конструкцию слоя, уплотнение, геотекстиль и фактические оплачиваемые ресурсы',
      },
    },
    source_metadata: {
      ...row.source_metadata,
      reusedOperation: {
        contract: source.row_id === geotextile.row_id ? 'single-pipe-trench-constructor:s27-35.v1' : 'granular-backfill-operation:s27-35.v1',
        sourceCommit: source.row_id === geotextile.row_id ? '829f9e534774706f9f6f24c319a303e597006702' : 'bf5a841e2',
        sourceRowId: source.row_id, operationInstanceId: 'gravel-base',
        identifierBindingContract: 'gravel-base-explicit-instance-bindings/s27-35.v1',
      },
      normativeTrace: [{ sourceId: GRAVEL_BASE_SOURCE_ID_S2735, normId: GRAVEL_BASE_NORM_ID_S2735,
        source_title: GRAVEL_BASE_SOURCE_METADATA_S2735.source_title, exact_locator: GRAVEL_BASE_SOURCE_METADATA_S2735.exact_locator,
        source_definition_hash: GRAVEL_BASE_SOURCE_METADATA_S2735.definition_hash }],
      projectApprovalClaimed: false, universal_productivity_claimed: false,
    },
  };
  return { ...output, row_sha256: estimateDeterministicHash({ ...output, row_sha256: '' }) };
});
const originalRuntime = { ...placing.runtimeInput, ...Object.fromEntries(Object.entries(trench.runtimeInput).filter(([id]) => geotextileParameterIds.has(id))) };
const runtimeInput = Object.fromEntries(Object.entries(originalRuntime).map(([id, value]) => [bindings.get(id) ?? id, value]));
export const GRAVEL_BASE_DEFINITION_S2735: AutomaticOwnerDefinition = Object.freeze({
  parameters, formulas, resources, runtimeInput,
  runtimeClassification: Object.fromEntries(Object.keys(runtimeInput).map(id => [id, 'ASSUMPTION' as const])),
  runtimeSourceIds: Object.fromEntries(Object.keys(runtimeInput).map(id => [id, [GRAVEL_BASE_SOURCE_ID_S2735]])),
  ordinaryParameterIds: ['volume_m3'],
});
for (const [kind, key] of [['parameters', 'parameter_id'], ['formulas', 'formula_id'], ['resources', 'row_id']] as const) {
  const values = GRAVEL_BASE_DEFINITION_S2735[kind].map(value => (value as unknown as Record<string, unknown>)[key]);
  if (new Set(values).size !== values.length) throw new Error('GRAVEL_BASE_ID_COLLISION:' + kind);
}
export function compileGravelBaseOperationS2735(submittedParameters: Record<string, unknown>, catalogId = GRAVEL_BASE_CATALOG_IDS_S2735[0]) {
  if (!GRAVEL_BASE_CATALOG_IDS_S2735.includes(catalogId)) throw new Error('GRAVEL_BASE_CATALOG_UNSUPPORTED');
  return compileAutomaticConstructionOwnerR1({ compilerVersion: GRAVEL_BASE_CONTRACT_S2735, catalogId,
    primaryMeasureParameterId: 'volume_m3', definition: GRAVEL_BASE_DEFINITION_S2735, submittedParameters });
}
