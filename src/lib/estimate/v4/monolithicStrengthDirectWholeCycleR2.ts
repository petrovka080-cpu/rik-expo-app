import pack from '../../../../data/estimate-benchmarks/source-packs/monolithic-strength-direct-whole-cycle-r2.json';
import {
  buildAutomaticConstructionOwnerR1,
  unresolvedApplicationNormTruthR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
  type AutomaticOwnerDefinition,
} from './automaticConstructionOwnerR1';
import { estimateDeterministicHash as hash } from '../estimateDeterministicHash';
import { effectiveResourceQuantityParameterId } from './effectivePurchaseBalanceR1';

// Unpublished source fragment. This uses the existing owner/formula compiler.
// The device BOM and a site-count lower bound do not close strength control.
export const strengthDirectPackR2 = pack;
export const strengthDirectPrefixR2 = 'monolithic-strength-direct:r2';
export const strengthDirectParameterR2 = (key: string): string => 'mono_strength_direct_r2_' + key;
export const strengthDirectRowR2 = (key: string): string => strengthDirectPrefixR2 + ':' + key;

const p = strengthDirectParameterR2;
const r = strengthDirectRowR2;
const selectedKind = (value: string) => ({ kind: 'equals' as const, parameterId: p('member_kind'), value });
const parameter = (key: string, title: string, unitId: string | null,
  extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => {
  const spec: AutomaticParameterSpec = { id: p(key), title, unitId, valueType: 'decimal', kind: 'conditional', ...extra };
  return (spec.valueType === 'decimal' || spec.valueType === 'integer') && spec.min == null
    ? { ...spec, min: 0 } : spec;
};

/** One actual individual member; no group area divided by20, no volume-to-map
 * conversion and no invented test locations or structural acceptance result. */
export function buildMonolithicStrengthDirectWholeCycleR2(): AutomaticOwnerDefinition {
  const usingDrill = { kind: 'greater_than' as const, parameterId: p('drill_post_count'), value: 0 };
  const usingDevice = { kind: 'greater_than' as const, parameterId: p('device_count'), value: 0 };
  const usingHardware = { kind: 'or' as const, operands: [usingDevice, usingDrill] };
  const conditional: AutomaticParameterSpec[] = [
    parameter('member_kind', 'Вид контролируемой конструкции', null, {
      valueType: 'enum', values: ['FLAT', 'HORIZONTAL_LINEAR', 'VERTICAL_LINEAR'],
    }),
    parameter('member_ref', 'Контролируемая конструкция и ревизия программы контроля', null, {
      valueType: 'text', requiredWhen: { kind: 'greater_than', parameterId: p('member_count'), value: 0 },
    }),
    parameter('area_m2', 'Площадь отдельной контролируемой плоской конструкции', 'm2', {
      min: 0.000001, requiredWhen: selectedKind('FLAT'),
    }),
    parameter('length_m', 'Длина отдельной контролируемой горизонтальной конструкции', 'meter', {
      min: 0.000001, requiredWhen: selectedKind('HORIZONTAL_LINEAR'),
    }),
    parameter('device_count', 'Фактическое число одновременно используемых испытательных приборов', 'piece', {
      valueType: 'integer', min: 1,
    }),
    parameter('deployment_ref', 'Ведомость фактически развёрнутого испытательного оснащения', null, { valueType: 'text', requiredWhen: usingDevice }),
    parameter('provider_ref', 'Исполнитель, прибор и действующая поверка', null, { valueType: 'text', requiredWhen: usingDevice }),
    // These are actual inspected member/material facts. They never choose the
    // reinforcement, member thickness or test locations for the project.
    parameter('thickness_mm', 'Фактическая толщина конструкции в месте испытания, мм', null, { min: 96, requiredWhen: usingHardware }),
    parameter('aggregate_mm', 'Максимальная крупность заполнителя по паспорту бетона, мм', null, { min: 0.000001, max: 48, requiredWhen: usingHardware }),
    parameter('spacing_mm', 'Минимальное расстояние между фактическими точками, мм', null, { min: 240, requiredWhen: usingHardware }),
    parameter('edge_mm', 'Минимальное расстояние фактической точки от края, мм', null, { min: 150, requiredWhen: usingHardware }),
    parameter('rebar_clear_mm', 'Свободное расстояние от центра отверстия до арматуры, мм', null, { min: 70, requiredWhen: usingHardware }),
    parameter('drill_post_count', 'Фактическое число развёрнутых сверлильных постов', 'piece', { valueType: 'integer', min: 1 }),
    parameter('drill_deployment_ref', 'Ведомость развёрнутого сверлильного оснащения и допуска рабочего места', null, { valueType: 'text', requiredWhen: usingDrill }),
    parameter('drill_face', 'Фактическая поверхность выбранного способа сверления', null, { valueType: 'enum', values: ['VERTICAL_WALL'], requiredWhen: usingDrill }),
    parameter('drill_condition', 'Фактические условия выбранного способа сверления', null, { valueType: 'enum', values: ['DRY'], requiredWhen: usingDrill }),
    parameter('drill_access', 'Доступ для выбранного сверлильного поста', null, { valueType: 'enum', values: ['STABLE_GROUND'], requiredWhen: usingDrill }),
    parameter('drill_voltage_v', 'Напряжение выбранного исполнения оборудования, В', null, { valueType: 'integer', min: 230, max: 230, requiredWhen: usingDrill }),
    parameter('drill_holder', 'Хвостовик выбранного бура и патрон привода', null, { valueType: 'enum', values: ['SDS_PLUS'], requiredWhen: usingDrill }),
    parameter('drill_diameter_mm', 'Фактический диаметр отверстия под классический анкер, мм', null, { min: 25, max: 25, requiredWhen: usingDrill }),
    parameter('drill_depth_mm', 'Фактическая глубина несквозного отверстия, мм', null, {
      min: 75, max: 400, numericPeerConstraints: { lessThanParameter: p('thickness_mm') }, requiredWhen: usingDrill,
    }),
    parameter('drill_dust_class', 'Класс выбранной полной системы сухого пылеудаления', null, { valueType: 'enum', values: ['H'], requiredWhen: usingDrill }),
    parameter('drill_flow_m3h', 'Проверенный поток воздуха выбранного шланга 35 мм, м³/ч', null, { min: 57.9, requiredWhen: usingDrill }),
    parameter('drill_dust_system_ref', 'Документированный состав и проверка совместимой системы пылеудаления', null, { valueType: 'text', requiredWhen: usingDrill }),
    parameter('drill_dust_bag_system', 'Принятая программа начального пылесборного поста', null, {
      valueType: 'enum', values: [pack.drillingInitialDryDustKit.bagSystem], requiredWhen: usingDrill,
    }),
  ];
  const wholeFacts = ['member_ref', 'thickness_mm', 'aggregate_mm', 'spacing_mm', 'edge_mm', 'rebar_clear_mm'].map(p);
  const drillingFacts = ['drill_deployment_ref', 'drill_face', 'drill_condition', 'drill_access',
    'drill_voltage_v', 'drill_holder', 'drill_diameter_mm', 'drill_depth_mm',
    'drill_dust_class', 'drill_flow_m3h', 'drill_dust_system_ref'].map(p);
  const rows: AutomaticRowSpec[] = [
    { rowId: r('sites-flat'), formulaId: r('formula:sites-flat'), section: 'Контроль прочности бетона',
      category: 'control', title: 'Контролируемые участки плоской конструкции', unitId: 'piece',
      expression: `${p('member_count')}*max(20,ceil(${p('area_m2')}/20))`, inclusion: selectedKind('FLAT'),
      inputParameterIds: [p('member_ref')], costTreatment: 'INFORMATIONAL_SCOPE', procurement: false },
    { rowId: r('sites-horizontal'), formulaId: r('formula:sites-horizontal'), section: 'Контроль прочности бетона',
      category: 'control', title: 'Контролируемые участки горизонтальной конструкции', unitId: 'piece',
      expression: `${p('member_count')}*max(6,ceil(${p('length_m')}/4))`, inclusion: selectedKind('HORIZONTAL_LINEAR'),
      inputParameterIds: [p('member_ref')], costTreatment: 'INFORMATIONAL_SCOPE', procurement: false },
    { rowId: r('sites-vertical'), formulaId: r('formula:sites-vertical'), section: 'Контроль прочности бетона',
      category: 'control', title: 'Контролируемые участки вертикальной конструкции', unitId: 'piece',
      expression: `${p('member_count')}*6`, inclusion: selectedKind('VERTICAL_LINEAR'), inputParameterIds: [p('member_ref')],
      costTreatment: 'INFORMATIONAL_SCOPE', procurement: false },
  ];
  const category = (value: string): string => value === 'LABOUR' ? 'work'
    : value === 'MATERIALS' || value === 'CONSUMABLES' ? 'material'
      : value === 'LOGISTICS' || value === 'SERVICE' ? 'service' : 'equipment';
  for (const operation of pack.operations) {
    for (const role of operation.resources) {
      const knownKit = role.authority === 'SOURCE_KIT_BOM';
      const knownDrilling = role.authority === 'EXACT_SELECTED_DRILLING_ASSEMBLY';
      const known = knownKit || knownDrilling;
      if (!known) conditional.push(parameter('application_' + role.key.replace(/-/gu, '_'),
        'Не завершено приложение: ' + role.titleRu, role.unitId, { kind: 'internal' }));
      rows.push({ rowId: r(role.key), formulaId: r('formula:' + role.key), section: operation.titleRu,
        category: category(role.category), title: role.titleRu, unitId: role.unitId,
        expression: knownKit ? `${role.countPerExactDeviceKit}*${p('device_count')}`
          : knownDrilling ? `${role.countPerExactDrillingPost}*${p('drill_post_count')}`
            : p('application_' + role.key.replace(/-/gu, '_')),
        inputParameterIds: knownKit ? [...wholeFacts, p('deployment_ref'), p('provider_ref')]
          : knownDrilling ? [...wholeFacts, ...drillingFacts] : wholeFacts,
        costTreatment: 'INFORMATIONAL_SCOPE', procurement: false,
      });
    }
  }
  const dustKit = pack.drillingInitialDryDustKit;
  const dustOperation = pack.operations.find(operation => operation.id === dustKit.operationId);
  if (!dustOperation) throw new Error('STRENGTH_DIRECT_DUST_PREPARATION_OPERATION_REQUIRED');
  const dustFacts = [...wholeFacts, ...drillingFacts, p('drill_post_count'), p('drill_dust_bag_system')];
  for (const component of dustKit.components) rows.push({
    rowId: r(component.key), formulaId: r('formula:' + component.key), section: dustOperation.titleRu,
    category: 'equipment', title: component.titleRu, unitId: component.unitId,
    expression: `${component.countPerDeployedPost}*${p('drill_post_count')}`,
    inclusion: usingDrill, inputParameterIds: dustFacts, costTreatment: 'INFORMATIONAL_SCOPE', procurement: false,
    effectiveQuantityOutput: { parameterId: effectiveResourceQuantityParameterId(r(component.key)), unitId: component.unitId },
  });
  const dustDeviation = dustKit.components.map(component => {
    const effective = effectiveResourceQuantityParameterId(r(component.key));
    const expected = `${component.countPerDeployedPost}*${p('drill_post_count')}`;
    return `max(0,${effective}-(${expected}))+max(0,(${expected})-${effective})`;
  }).join('+');
  rows.push({ rowId: r('dust-initial-kit-check'), formulaId: r('formula:dust-initial-kit-check'),
    section: dustOperation.titleRu, category: 'control', title: 'Сверка начального пылесборного оснащения',
    unitId: 'piece', expression: dustDeviation, inclusion: usingDrill, inputParameterIds: dustFacts,
    costTreatment: 'INFORMATIONAL_SCOPE', procurement: false });
  const owner = buildAutomaticConstructionOwnerR1({
    contract: pack.contract, semanticOwner: strengthDirectPrefixR2, sourceId: pack.sourceId,
    normId: '18105-2018:8.2.5-8.2.7+22690-2015:TYPE-II-24-48',
    sourceMetadata: { source_title: 'Контроль прочности отдельной монолитной конструкции',
      source_document_version: '18105-2018/2019+IUS2021+2024;22690-2015/2019+IUS2022;exact maker manual',
      definition_hash: hash(pack), exact_locator: '18105 8.1/8.2;22690 table2/appendixA/В;manufacturer6/15',
      artifact_sha256: pack.sourceArtifacts[1].sha256 },
    applicabilityRu: 'Исходный состав для одной отдельной конструкции, схемы В и прямого метода с классическим анкером 24×48 мм. Допуск целого метода ещё не завершён.',
    ordinary: [{ id: p('member_count'), title: 'Число отдельных конструкций в этом исходном фрагменте',
      valueType: 'integer', unitId: 'piece', kind: 'ordinary', min: 1, max: 1 }],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: pack.notTransferred,
  });
  const roles = new Map(pack.operations.flatMap(operation => operation.resources.map(role =>
    [r(role.key), { role, operation }] as const)));
  const parameters = owner.parameters.map(definition => definition.parameter_id.startsWith(p('application_'))
    ? { ...definition, truth_metadata: unresolvedApplicationNormTruthR1(definition.truth_metadata,
      'Приложение ещё не подтвердило весь совместимый способ и норму этой операции. Пользователь не вводит отсутствующую норму.') }
    : definition.parameter_id === p('drill_dust_bag_system')
      ? { ...definition, truth_metadata: { ...definition.truth_metadata, visibility_role: 'INTERNAL_ONLY',
        value_source_role: 'PROJECT_DOCUMENTATION', provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } }
      : definition);
  const resources = owner.resources.map(resource => {
    const component = dustKit.components.find(item => r(item.key) === resource.row_id);
    const dustCheck = resource.row_id === r('dust-initial-kit-check');
    if (component || dustCheck) {
      const evidence = dustKit.sourceEvidence[component?.key === 'dust-hood' ? 2
        : component?.key === 'dust-extractor' ? 1 : 0];
      const updated = { ...resource, resource_graph: { ...resource.resource_graph,
        ...(dustCheck ? { scopeRequirementV1: {
          contractVersion: 'canonical-scope-requirement/v1', kind: 'OBJECT_SCOPE',
          groupId: strengthDirectPrefixR2 + ':dry-dust-initial', groupTitleRu: 'Начальная система пылесбора',
          titleRu: 'Полное начальное оснащение выбранной системы сухого пылесбора',
          reasonRu: 'Сверяется начальный состав по фактическим постам. Замена мешков, защита, очистка, отходы, труд и полный способ ещё не подтверждены.',
          exactScopeWhen: { kind: 'and', operands: [usingDrill,
            { kind: 'not', operand: { kind: 'formula_greater_than', expression: dustDeviation, unitId: 'piece', value: 0 } }] },
          coveringRowIds: dustKit.components.map(item => r(item.key)), originalRowIds: [],
          objectFactParameterId: p('drill_dust_system_ref'), objectFactMode: 'PROJECT_APPLICABILITY_ONLY',
          unknownObjectValues: [], requiredFactParameterIds: dustFacts, sourceEvidence: dustKit.sourceEvidence,
        } } : {}),
        operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
          groupId: strengthDirectPrefixR2, groupTitleRu: 'Контроль прочности бетона',
          operationId: r('operation:' + dustOperation.id), operationTitleRu: dustOperation.titleRu,
          completionCriterionRu: dustOperation.completedResultRu,
          processOrdinal: pack.operations.indexOf(dustOperation), processRole: 'PROCESS' } },
        source_metadata: { ...resource.source_metadata,
          sourceRole: 'EXACT_SELECTED_DRY_H_INITIAL_ASSEMBLY_INFORMATIONAL_ONLY',
          sourceEvidence: dustKit.sourceEvidence, exactInternalIdentity: component?.internalIdentity ?? null,
          source_artifact_sha256: evidence.sha256,
          normativeTrace: [{ sourceId: pack.sourceId + ':dry-h-initial', source_id: pack.sourceId + ':dry-h-initial',
            normId: component?.internalIdentity ?? 'INITIAL_ASSEMBLY_BALANCE_CHECK',
            norm_id: component?.internalIdentity ?? 'INITIAL_ASSEMBLY_BALANCE_CHECK',
            normVersion: 'Exact06019C3600 delivery24Oct2026; H manual03Jul2025; GDE68 linked manual',
            exact_locator: evidence.locator, source_definition_hash: hash(dustKit),
            sourceRole: 'MANUFACTURER_INITIAL_PHYSICAL_ASSEMBLY_NOT_STRUCTURAL_TEST_NORM' }],
          quantityScope: 'INITIAL_DEPLOYED_ASSEMBLY_NOT_BAG_REPLACEMENT_OR_WHOLE_DUST_CONTROL',
          noNewPaidOwner: true, noNewProcurementOwner: true, full_technical_acceptance: false, newFullTechnologies: 0 },
        row_sha256: '' };
      return { ...updated, row_sha256: hash(updated) };
    }
    const binding = roles.get(resource.row_id);
    if (!binding) return resource;
    const { role, operation } = binding;
    const updated = { ...resource, resource_graph: { ...resource.resource_graph,
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
        groupId: strengthDirectPrefixR2, groupTitleRu: 'Контроль прочности бетона',
        operationId: strengthDirectPrefixR2 + ':operation:' + operation.id,
        operationTitleRu: operation.titleRu, completionCriterionRu: operation.completedResultRu,
        processOrdinal: pack.operations.indexOf(operation), processRole: 'PROCESS' } },
      source_metadata: { ...resource.source_metadata,
        sourceRole: role.authority === 'SOURCE_KIT_BOM' ? 'EXACT_EQUIPMENT_BOM_INFORMATIONAL_ONLY'
          : role.authority === 'EXACT_SELECTED_DRILLING_ASSEMBLY' ? 'EXACT_SELECTED_DRILLING_ASSEMBLY_INFORMATIONAL_ONLY'
            : 'UNRESOLVED_APPLICATION_NORM',
        sourceLocator: role.locator, physicalCategory: role.category,
        noNewPaidOwner: true, noNewProcurementOwner: true,
        full_technical_acceptance: false, newFullTechnologies: 0 }, row_sha256: '' };
    return { ...updated, row_sha256: hash(updated) };
  });
  return Object.freeze({ ...owner, parameters: Object.freeze(parameters), resources: Object.freeze(resources) });
}
