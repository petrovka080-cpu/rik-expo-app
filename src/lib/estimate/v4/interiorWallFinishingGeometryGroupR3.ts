import pack from '../../../../data/estimate-benchmarks/source-packs/interior-wall-finishing-geometry-group-r3.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

type Json = Record<string, unknown>;
export const interiorWallFinishingGeometryPackR3 = pack;
export const interiorWallFinishingGeometryParameterR3 = (key: string) => pack.namespace + key;
export const interiorWallFinishingGeometryRowR3 = (key: string) => pack.namespace + 'work:' + key;

/** A finite selected VGT finish over an honestly named prepared substrate.
 * The old KRER material column stays separate from current product demands.
 * ROOT owns source admission, integration and publication. */
export function interiorWallFinishingGeometryGroupDefinitionR3(): AutomaticOwnerDefinition {
 const c = pack, p = interiorWallFinishingGeometryParameterR3, r = interiorWallFinishingGeometryRowR3;
 const a = p(c.areaId), whole = r('whole-work'), positive = {kind: 'greater_than' as const, parameterId: a, value: 0};
 const toolProfile = c.handToolProfile;
 const toolUses = toolProfile.uses;
 const applicationProfile = c.manualApplicationProfile;
 const vesselProfile = c.manualApplicationVesselProfile;
 const crew = c.manualFinishingCrewProfile, sanding = crew.sandingSupply;
 if (crew.workMode !== 'ONE_SERIAL_MANUAL_WORKING_POSITION' || crew.simultaneousPositions !== 1
  || crew.simultaneousWorkers !== 1 || crew.parallelWorkOrMultipleBrigadesAdmitted || crew.manufacturerCrewNormClaimed
  || new Set(crew.components.map(component => component.resourceKey)).size !== crew.components.length
  || crew.components.some(component => component.countPerPosition !== 1)
  || sanding.sheetAreaM2 !== '0.0644' || sanding.chargeAreaM2 !== '0.0322'
  || sanding.chargesPerSheet !== 2 || sanding.minimumUsableCharges !== 1 || sanding.cutKerfM2 !== '0'
  || sanding.holderKey !== 'tool-sanding-holder' || sanding.grossNormPer100M2 !== '0.84')
  throw Error('WALL_READY_R3_COMPLETE_SERIAL_MANUAL_CREW_PROFILE_REQUIRED');
 const vesselDemand = Math.max(...vesselProfile.uses.map(use => use.simultaneousPositions * use.toolsPerPosition));
 if (vesselProfile.workMode !== 'ONE_SERIAL_MANUAL_WORKING_POSITION' || vesselProfile.simultaneousPositions !== 1
  || vesselProfile.parallelWorkOrMultipleBrigadesAdmitted || vesselProfile.manufacturerCrewNormClaimed || vesselDemand !== 1
  || vesselProfile.completeItemSpecification.pailSku !== '8619' || vesselProfile.completeItemSpecification.lidSku !== '8659'
  || vesselProfile.completeItemSpecification.declaredUserPaintCapacityUSQuart !== '1'
  || vesselProfile.completeItemSpecification.selectedBrushNominalWidthMm > Number(vesselProfile.completeItemSpecification.publishedCompatibleRollerWidthMm)
  || vesselProfile.uses.map(use => use.operationId).join(',') !== 'preputty-prime,prime,two-coat-paint,ordinary-completion'
  || vesselProfile.components.length !== 2 || vesselProfile.components.some(component => component.countPerPosition !== 1))
  throw Error('WALL_READY_R3_SINGLE_SERIAL_PELICAN_VESSEL_PROFILE_REQUIRED');
 const applicationDemand = Math.max(...applicationProfile.uses.map(use => use.simultaneousPositions * use.toolsPerPosition));
 if (applicationProfile.workMode !== 'ONE_SERIAL_MANUAL_WORKING_POSITION' || applicationProfile.simultaneousPositions !== 1
  || applicationProfile.parallelWorkOrMultipleBrigadesAdmitted || applicationProfile.manufacturerCrewNormClaimed
  || applicationProfile.model !== 'ЗУБР МАСТЕР АКВА4-01013-100' || applicationProfile.completeItemSpecification.nominalWorkingWidthMm !== 100
  || applicationProfile.uses.map(use => use.operationId).join(',') !== 'preputty-prime,prime,two-coat-paint,ordinary-completion'
  || applicationProfile.uses[2].sequentialApplications !== 2 || applicationDemand !== 1)
  throw Error('WALL_READY_R3_SINGLE_SERIAL_WATERBORNE_BRUSH_PROFILE_REQUIRED');
 // The selected profile has one serial working position. Active demand is
 // peak concurrency, not the sum of stage references or a purchase/wear rate.
 const simultaneousToolDemand = Math.max(...toolUses.map(use => use.simultaneousPositions * use.toolsPerPosition));
 if (toolProfile.workMode !== 'ONE_SERIAL_MANUAL_WORKING_POSITION' || toolProfile.simultaneousPositions !== 1
  || toolProfile.parallelWorkOrMultipleBrigadesAdmitted || toolProfile.manufacturerCrewNormClaimed
  || toolProfile.model !== 'STAYER HERCULES10041-12' || toolProfile.completeItemSpecification.bladeWidthMm !== 120
  || toolUses.length !== 2 || toolUses[0].operationId !== 'full-putty' || toolUses[1].operationId !== 'ordinary-completion'
  || toolUses[0].processOrdinal >= toolUses[1].processOrdinal || simultaneousToolDemand !== 1)
  throw Error('WALL_READY_R3_SINGLE_SERIAL_SPATULA_PROFILE_REQUIRED');
 if (c.normId !== '15-04-007-01' || c.measurementM2 !== 100 || c.materials.length !== 6
  || c.labour.workersPer100M2 !== '43.56' || c.sources[0].sha256 !== '58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc'
  || !c.supplyDecision.automaticProcurementReady || c.fullTechnicalAcceptance || c.selectedScopeQuantitiesComplete
  || c.materials.find(m => m.id === 'paint')?.perM2 !== '0.36' || c.materials.find(m => m.id === 'paint')?.package !== '1.5')
  throw Error('WALL_READY_R3_EXACT_SOURCE_AND_CURRENT_MANUFACTURER_SUPPLY_REQUIRED');
 const rows: AutomaticRowSpec[] = [];
 const binding = new Map<string, {operationIds: readonly string[]; materialId?: string; included?: boolean; scope?: boolean; needId?: string; tool?: boolean; applicator?: boolean; vessel?: string; crewKey?: string; paperSupply?: boolean}>();
 const add = (key: string, title: string, category: string, unitId: string, expression: string,
  b: {operationIds: readonly string[]; materialId?: string; included?: boolean; scope?: boolean; needId?: string; tool?: boolean; applicator?: boolean; vessel?: string; crewKey?: string; paperSupply?: boolean}, extra: Partial<AutomaticRowSpec> = {}) => {
  rows.push({rowId: r(key), formulaId: r('formula:' + key), title, category, section: c.titleRu, unitId, expression,
   procurement: false, inclusion: positive, costTreatment: 'INFORMATIONAL_SCOPE', ...extra});
  binding.set(r(key), b);
 };
 const allOperations = c.operations.map(o => o.id);
 const mainOperations = allOperations.filter(id => id !== 'preputty-prime');
 add('whole-work', 'Улучшенная отделка готовыми составами: единый владелец труда и обычного обеспечения', 'work', 'm2', a,
  {operationIds: allOperations}, {costTreatment: 'OWN_COST'});
 add(toolProfile.resourceKey, 'Шпатель STAYER HERCULES10041-12,120мм: один действующий предмет на последовательный пост',
  'equipment', toolProfile.quantityUnitId, String(simultaneousToolDemand),
  {operationIds: toolUses.map(use => use.operationId), included: true, tool: true}, {
   costTreatment: 'INCLUDED_IN_RESOURCE_ROWS',
   // Reuse the existing physical balance on this included asset row. The
   // integer quantum is one functional item, not a supplier pack or purchase.
   // No separately credited stock offsets the one active item to be provided.
   purchaseBalance: {unitId: toolProfile.quantityUnitId, consumedExpression: String(simultaneousToolDemand),
    stockExpression: '0', reserveExpression: '0', orderQuantumExpression: '1'},
  });
 add(applicationProfile.resourceKey, 'Кисть ЗУБР МАСТЕР АКВА4-01013-100,100мм: один последовательный ручной пост',
  'equipment', applicationProfile.quantityUnitId, String(applicationDemand),
  {operationIds: applicationProfile.uses.map(use => use.operationId), included: true, tool: true, applicator: true}, {
   costTreatment: 'INCLUDED_IN_RESOURCE_ROWS',
   purchaseBalance: {unitId: applicationProfile.quantityUnitId, consumedExpression: String(applicationDemand),
    stockExpression: '0', reserveExpression: '0', orderQuantumExpression: '1'},
  });
 for (const component of vesselProfile.components) add(component.resourceKey, component.titleRu,
  'equipment', vesselProfile.quantityUnitId, String(vesselDemand * component.countPerPosition),
  {operationIds: vesselProfile.uses.map(use => use.operationId), included: true, tool: true, vessel: component.role}, {
   costTreatment: 'INCLUDED_IN_RESOURCE_ROWS',
   purchaseBalance: {unitId: vesselProfile.quantityUnitId, consumedExpression: String(vesselDemand * component.countPerPosition),
    stockExpression: '0', reserveExpression: '0', orderQuantumExpression: '1'},
  });
 // The crew is a selected serial organisation. Component identities and
 // operation bindings remain separate; a kit is never an unknown set=1.
 for (const component of crew.components) add(component.resourceKey, component.titleRu, 'equipment', component.quantityUnitId,
  String(crew.simultaneousPositions * component.countPerPosition),
  {operationIds: component.operationIds, included: true, tool: true, crewKey: component.resourceKey}, {
   costTreatment: 'INCLUDED_IN_RESOURCE_ROWS',
   purchaseBalance: {unitId: component.quantityUnitId, consumedExpression: String(crew.simultaneousPositions * component.countPerPosition),
    stockExpression: '0', reserveExpression: '0', orderQuantumExpression: '1'},
  });
 // KRER m2 refers to supplied abrasive, including clamping margins. It is
 // not the smaller contact footprint. One sheet yields two usable charges.
 // Preserve the exact norm row below; this row provides whole physical sheets
 // for its aggregate demand and at least one functional charge for any work.
 const paperSheets = `ceil(max(1,ceil(${a}*0.0084/0.0322))/2)`;
 add(sanding.providedKey, 'Шлифовальная бумага БАЗ KT10CW P60,230×280мм', 'material', 'item', paperSheets,
  {operationIds: ['full-sand', 'primer-sand'], included: true, paperSupply: true}, {
   costTreatment: 'INCLUDED_IN_RESOURCE_ROWS',
   purchaseBalance: {unitId: 'item', consumedExpression: paperSheets,
    stockExpression: '0', reserveExpression: '0', orderQuantumExpression: '1'},
  });
 for (const m of c.materials) {
  const consumed = `${a}*${m.perM2}`, owner = r(m.id + '-order');
  const b = {operationIds: m.operationIds, materialId: m.id};
  if (!m.package) {
   add(m.id + '-consumed', m.titleRu + ': обеспечение в единой работе', 'material', m.unitId, consumed,
    {...b, included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
   continue;
  }
  const stock = `${p('stock_' + m.id.replaceAll('-', '_') + '_packages')}*${m.package}`;
  const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId: owner, orderUnitId: m.unitId, consumed,
   stock, reserve: '0', quantum: m.package});
  add(m.id + '-consumed', m.titleRu + ': полный плановый расход', 'material', m.unitId, consumed, b, {purchaseBalanceOwnerRowId: owner});
  add(m.id + '-order', m.titleRu + ': заказ целыми упаковками после выделенного остатка', 'material', m.unitId,
   `ceil(max(0,(${consumed})-(${stock}))/${m.package})*${m.package}`, b, {...balance.owner, costTreatment: 'OWN_COST', procurement: true});
  add(m.id + '-packages', m.titleRu + ': упаковки в заказе', 'material', 'item', balance.packages, b, {purchaseBalanceOwnerRowId: owner});
  add(m.id + '-stock-credit', m.titleRu + ': выделенное пригодное наличие', 'material', m.unitId, stock, b, {purchaseBalanceOwnerRowId: owner});
  add(m.id + '-remaining', m.titleRu + ': превышение принятой заявки над расходом', 'material', m.unitId, balance.remaining, b,
   {purchaseBalanceOwnerRowId: owner});
  add(m.id + '-shortage', m.titleRu + ': дефицит принятой заявки', 'material', m.unitId, balance.consumptionShortage, b,
   {purchaseBalanceOwnerRowId: owner});
 }
 add('workers', 'Рабочие-строители, средний разряд3,2: цельная норма, без деления часов', 'labor', 'man_hour', `${a}/100*${c.labour.workersPer100M2}`,
  {operationIds: mainOperations, included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 add('workers-preputty', 'Первичное однократное глубокое грунтование: рабочие разряда4,0, отдельная исходная норма6,55ч/100м²', 'labor', 'man_hour',
  `${a}/100*${c.labour.preputtyWorkersPer100M2}`, {operationIds: ['preputty-prime'], included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 add('workers-total', 'Всего труда: исходная отделка и необходимое первичное грунтование', 'labor', 'man_hour', `${a}/100*${c.labour.totalWorkersPer100M2}`,
  {operationIds: allOperations, included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 add('operators', 'Машинисты обоих нормативных процессов: уже учтены эксплуатацией, без второй оплаты', 'labor', 'man_hour', `${a}/100*${c.labour.totalOperatorsPer100M2}`,
  {operationIds: allOperations, included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 for (const [key, title, unit, rate, ops] of [
  ['rags-contribution-preputty', 'Вклад первичного грунтования в общую ветошь', 'kg', '.1', ['preputty-prime']],
  ['rags-contribution-finish', 'Вклад отделки в общую ветошь', 'kg', '.3', mainOperations],
  ['truck-contribution-preputty', 'Вклад первичного грунтования в общие часы автомобиля', 'machine_hour', '.01', ['preputty-prime']],
  ['truck-contribution-finish', 'Вклад отделки в общие часы автомобиля', 'machine_hour', '.15', mainOperations],
 ] as const) add(key, title, unit === 'kg' ? 'material' : 'equipment', unit, `${a}/100*${rate}`,
  {operationIds: ops, included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 for (const m of c.machines) add(m.id, m.titleRu, 'equipment', m.unitId, `${a}/100*${m.per100M2}`,
  {operationIds: m.id === 'lift-preputty' ? ['preputty-prime'] : m.id === 'truck' ? allOperations : mainOperations, included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 for (const op of c.operations) add('process-' + op.id, op.titleRu, 'work', 'm2', a,
  {operationIds: [op.id], included: true}, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 const scopes = [
  ['ordinary-access', 'Обычный инвентарь, СИЗ и доступ при высоте помещения до3,5м', 'preparation'],
  ['ordinary-accompanying', 'Мелкие сопутствующие операции и обычная уборка рабочего места в исходной норме', 'ordinary-completion'],
 ] as const;
 for (const [key, title] of scopes) add(key, title, 'service', '', p(key.replaceAll('-', '_')),
  {operationIds: allOperations, scope: true, included: true});
 for (const need of c.openSourceNeeds) add('open-' + need.id, need.titleRu,
  need.id === 'washing-water' ? 'material' : need.id === 'handling-profile' ? 'service' : 'equipment',
  need.unitId, p('need_' + need.id.replaceAll('-', '_')), {operationIds: need.operationIds, needId: need.id});
 const source = c.sources[0];
 const built = buildAutomaticConstructionOwnerR1({contract: c.contract, semanticOwner: 'existing-ready-wall-finishing-geometry-group-r3',
  sourceId: source.id, normId: c.normId, operationCompositionGroupId: c.namespace,
  sourceMetadata: {source_title: source.title, source_document_version: source.edition, definition_hash: source.sha256,
   artifact_sha256: source.sha256, exact_locator: source.locatorRu}, applicabilityRu: c.physicalScopeRu,
  ordinary: [{id: a, title: 'Чистая площадь принятых плоских оштукатуренных стен без проёмов и откосов, м²',
   kind: 'ordinary', valueType: 'decimal', unitId: 'm2', min: 0, max: 1e9}], profile: [],
  conditional: [
   ...scopes.map(([key, title]) => ({id: p(key.replaceAll('-', '_')), title, kind: 'internal' as const, valueType: 'decimal' as const, unitId: null})),
   ...c.materials.filter(m => !!m.package).map(m => ({id: p('stock_' + m.id.replaceAll('-', '_') + '_packages'),
    title: 'Выделенные пригодные целые упаковки: ' + m.titleRu + ' (необязательно)',
    kind: 'conditional' as const, valueType: 'integer' as const, unitId: 'item', min: 0})),
   ...c.openSourceNeeds.map(need => ({id: p('need_' + need.id.replaceAll('-', '_')), title: need.titleRu,
    kind: 'internal' as const, valueType: 'decimal' as const, unitId: need.unitId, min: 0})),
  ], rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [c.normativeSupplyScopeRu, ...c.excludedRu]});
 const stockParameters = new Set(c.materials.filter(m => !!m.package).map(m => p('stock_' + m.id.replaceAll('-', '_') + '_packages')));
 const physicalKeys = new Set(['workers', 'workers-preputty', 'operators', sanding.providedKey, ...c.machines.map(m => m.id),
  ...c.materials.filter(m => !m.package).map(m => m.id + '-consumed')]);
 const parameters = built.parameters.map(param => {
  const need = c.openSourceNeeds.find(need => param.parameter_id === p('need_' + need.id.replaceAll('-', '_')));
  return {...param, required: param.parameter_id === a,
  truth_metadata: need ? unresolvedApplicationNormTruthR1({...param.truth_metadata, source_confirmation_required: false}, need.reasonRu)
   : {...param.truth_metadata, source_confirmation_required: false,
    ...(param.parameter_id === a ? {value_source_role: 'USER_INPUT', provenance: {consumer_input_role_v1: 'OBJECT_FACT'}} : {}),
    ...(stockParameters.has(param.parameter_id) ? {visibility_role: 'USER_INPUT', value_source_role: 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',
     provenance: {consumer_input_role_v1: 'OBJECT_FACT'}, runtime_profile_classification: 'PRELIMINARY_SOURCE_FORMULA', runtime_profile_value: true,
     preliminary_compilation_allowed: true, preliminary_value_formula_v1: {version: 'canonical-preliminary-parameter-formula:v1',
      expression: '0', when: {kind: 'literal', value: true}}} : {}),
    guide: {...param.truth_metadata.guide as Json, verified_at: c.verifiedAt,
     ...(stockParameters.has(param.parameter_id) ? {guide_kind: 'MEASUREMENT_RULE', source_role: 'OPTIONAL_ASSIGNED_PROJECT_STOCK',
      guide_short_ru: 'Необязательные выделенные пригодные целые упаковки ровно этого продукта/фасовки. При пропуске кредит закупки0, а не утверждение об отсутствии материалов. Расход, машины и труд не уменьшаются.'} : {})},
    formula_consumers: built.formulas.filter(f => f.input_parameter_ids.includes(param.parameter_id)).map(f => f.formula_id)}};
 });
 const operation = (key: string) => {
  const op = c.operations.find(o => o.id === key)!;
  return {operationId: r('operation:' + op.id), operationTitleRu: op.titleRu, processOrdinal: op.ordinal,
   processRole: 'PROCESS' as const, completionCriterionRu: op.criterionRu};
 };
 // Source titles and restrictions remain immutable provenance. Only the
 // public descriptor receives concise customer-facing resource names.
 const publicNames: Readonly<Record<string, string>> = {
  'whole-work': 'Работы по отделке стен',
  'workers': 'Рабочие-строители, разряд3,2',
  'workers-preputty': 'Рабочие грунтования, разряд4,0',
  'operators': 'Машинисты',
  'tool-putty-spatula': 'Шпатель STAYER10041-12,120мм',
  'tool-waterborne-brush': 'Кисть ЗУБР4-01013-100,100мм',
  'tool-application-pail': 'Ёмкость Wooster Pelican8619',
  'tool-application-pail-lid': 'Крышка Wooster Pelican8659',
  'open-stirring-tool': 'Средство перемешивания шпаклёвки',
  'open-washing-water': 'Вода для промывки инструмента',
  'open-access': 'Средства доступа к стенам',
  'open-ppe': 'Средства индивидуальной защиты',
  'open-handling-profile': 'Средства подачи материалов',
 };
 const resources = built.resources.map(row => {
  const b = binding.get(row.row_id)!, key = row.row_id.slice((c.namespace + 'work:').length);
  const material = c.materials.find(m => m.id === b.materialId), isWhole = row.row_id === whole;
  const need = c.openSourceNeeds.find(need => need.id === b.needId);
  const crewComponent = crew.components.find(component => component.resourceKey === b.crewKey);
  const selectedTool = crewComponent ?? (b.vessel ? vesselProfile : b.applicator ? applicationProfile : toolProfile);
  const methodSourceIndices = crewComponent ? crewComponent.methodSourceIndices : b.vessel ? vesselProfile.methodSourceIndices : b.applicator ? applicationProfile.methodSourceIndices : [toolProfile.methodSourceIndex];
  const supplementalIndices = crewComponent ? crewComponent.supplementarySourceIndices : b.vessel ? vesselProfile.supplementarySourceIndices : b.applicator ? applicationProfile.supplementarySourceIndices : [];
  const evidence = need ? c.sources[need.sourceIndex] : b.paperSupply ? c.sources[sanding.sourceIndex] : b.tool ? c.sources[selectedTool.sourceIndex] : material ? c.sources[material.sourceIndex]
   : b.scope ? c.sources[5] : key === 'operators' ? c.sources[1] : source;
  const {row_sha256: _old, ...body} = row;
  const changed = {...body,
   ...(b.included ? {cost_owner_id: whole} : {}),
   resource_graph: {...row.resource_graph,
    ...(b.included ? {parentCostOwnerId: whole, includedInResourceOwnerRowId: whole} : {}),
    operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: c.namespace, groupTitleRu: c.titleRu,
     ...operation(b.operationIds[0]), ...(b.operationIds.length > 1 ? {additionalOperations: b.operationIds.slice(1).map(operation)} : {}),
     ...(isWhole ? {processRole: 'COST_SUMMARY', processOrdinal: 0} : {})},
    ...(b.scope ? {scopeRequirementV1: {contractVersion: 'canonical-scope-requirement/v1', kind: 'INCLUDED', groupId: c.namespace,
     groupTitleRu: c.titleRu, titleRu: row.title_ru, reasonRu: c.wholeWorkScopeRu, exactScopeWhen: positive, coveringRowIds: [whole],
     originalRowIds: [], costExclusionBreaksScopeV1: true, sourceEvidence: [{sha256: evidence.sha256, locator: evidence.locatorRu}]}} : {}),
    ...(!need && !b.tool && !b.scope && !key.endsWith('-order') ? {derivedQuantityEditPolicyV1: {contractVersion: 'canonical-derived-quantity-edit-policy/v1',
     mode: 'PARAMETERS_ONLY', unitId: row.unit_id, parameterIds: built.formulas.find(f => f.formula_id === row.formula_id)!.input_parameter_ids,
     reasonRu: 'Измените исходную площадь. Нормативная потребность не заменяется ручным коэффициентом или ценой.'}} : {}),
    publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: row.title_ru, nameRu: publicNames[key] ?? (material && (key.endsWith('-order') || !material.package) ? material.titleRu : row.title_ru),
     brandAndModelRu: material?.package ? material.titleRu : null,
     specificationRu: crewComponent ? crewComponent.specificationRu : b.paperSupply ? 'KT10CW ALOX STANDART P60; лист230×280мм; два заряда115×280мм для ручного держателя.' : b.vessel ? (b.vessel === 'PAIL' ? 'Pelican8619; пользовательская ёмкость1USquart, ручка, магнитный держатель, рабочая область роликадо4½дюймов; доливы по мере расхода.' : 'Отдельная совместимая крышкаPelican8659 для8619, сохранение влажного остатка на паузах; не включена в артикул сосуда.') : b.applicator ? 'Номинальная ширина100мм; искусственная щетина, никелированный стальной бандаж, цельная пластиковая рукоять; воднодисперсионные/акриловыеЛКМ.' : b.tool ? 'Нержавеющее полотно120мм, цельная рукоятьТПР+ПП; ручное нанесение и выравнивание.' : null,
     detailsRu: [...c.publicPhysicalScopeDetailsRu, evidence.locatorRu,
      ...(need ? [need.reasonRu] : b.tool ? [selectedTool.quantityDerivation] : material ? [c.supplyDecision.reasonRu] : c.wholeWorkScopeRu.trim().split(/(?<=[.!?])\s+/u)),
      ...(b.tool ? [selectedTool.renewalAndAvailabilityBoundary, ...selectedTool.geometryAndCapacityChecks] : []),
      ...(material && material.operationIds.length > 1 ? ['Один общий расход всех использующих этапов; не делится произвольно и не повторяется на каждый этап.'] : [])],
     ...(need || b.tool || physicalKeys.has(key) ? {} : b.scope || key.startsWith('process-') ? {rowKind: 'PROCESS_NOTE'} : !isWhole && !key.endsWith('-order') ? {rowKind: 'CALCULATION_DETAIL'} : {})}},
   source_metadata: {...row.source_metadata, sourceRole: need ? 'UNRESOLVED_APPLICATION_PHYSICAL_RESOURCE_PROFILE'
    : b.paperSupply ? 'WHOLE_KRER_GROSS_MATERIAL_DEMAND_WITH_MINIMUM_FUNCTIONAL_CHARGE_AND_WHOLE_SHEET_PROVISION'
    : b.tool ? 'CAUSAL_SELECTED_SERIAL_STATION_ASSET_DEMAND_WITH_PRIMARY_ITEM_SPECIFICATION'
    : material?.package ? 'CURRENT_MANUFACTURER_UPPER_PLANNING_QUANTITY_AND_REAL_PACKAGE'
    : material ? 'EXACT_KRER_INCLUDED_CONSUMABLE_QUANTITY' : 'EXACT_KRER_WHOLE_NORM_AND_DOCUMENTED_INCLUDED_SCOPE',
    normativeTrace: b.tool ? [
     {sourceId: evidence.id, normId: crewComponent ? 'SELECTED_GENERIC_SERIAL_CREW_COMPONENT_NOT_MANUFACTURER_CREW_NORM' : b.vessel ? 'WOOSTER_PELICAN8619_8659_ITEM_SPECIFICATION_ONLY' : b.applicator ? 'ZUBR4-01013-100_ITEM_SPECIFICATION_ONLY' : 'STAYER10041-12_ITEM_SPECIFICATION_ONLY', sourceDocument: evidence.title,
      sourceLocator: evidence.locatorRu, sourceSnapshotHash: evidence.sha256},
     ...methodSourceIndices.map(index => ({sourceId: c.sources[index].id,
      normId: crewComponent ? 'READY_VGT_FINISHING_METHOD_AND_CREW_COMPONENT_CLASS_ONLY' : b.vessel || b.applicator ? 'VGT_READY_WATER_DISPERSION_BRUSH_METHOD' : 'VGT_READY_PUTTY_MANUAL_SPATULA_METHOD',
      sourceDocument: c.sources[index].title, sourceLocator: c.sources[index].locatorRu, sourceSnapshotHash: c.sources[index].sha256})),
     ...supplementalIndices.map(index => ({sourceId: c.sources[index].id,
      normId: crewComponent ? 'SELECTED_GENERIC_SERIAL_CREW_COMPONENT_NOT_MANUFACTURER_CREW_NORM' : b.vessel ? 'WOOSTER_C202105R_2026_PELICAN_SPECIFICATION' : 'ZUBR16-0183_BRUSH100MM_SPECIFICATION', sourceDocument: c.sources[index].title,
      sourceLocator: c.sources[index].locatorRu, sourceSnapshotHash: c.sources[index].sha256})),
    ] : [{sourceId: evidence.id, normId: key === 'workers-preputty' || key === 'lift-preputty'
      || key.endsWith('-contribution-preputty') ? c.labour.preputtyNormId : c.normId, sourceDocument: evidence.title,
     sourceLocator: evidence.locatorRu, sourceSnapshotHash: evidence.sha256}],
    source_title: evidence.title, source_document_version: evidence.edition, artifact_sha256: evidence.sha256,
    official_url: evidence.url, exact_locator: evidence.locatorRu,
    sourceResourceCode: material?.package ? null : material?.resourceCode ?? c.machines.find(m => m.id === key)?.resourceCode ?? null,
    legacyNormResourceReferenceCode: material?.package ? material.resourceCode : null,
    ordinaryObjectFactBudget: 1, selectedScopeQuantitiesComplete: false, normativeResourceQuantitiesComplete: true,
    mainProductProcurementComplete: true, physicalResourceCoverageComplete: false,
    ...(need ? {prospectiveCostOwnerRowId: whole, unresolvedPhysicalResourceReasonRu: need.reasonRu} : {}),
    ...(b.tool ? {selectedOrganisationalProfile: selectedTool, quantityRole: 'PEAK_CONCURRENT_FUNCTIONAL_ITEMS_NOT_PURCHASE_OR_WEAR',
     requiredSimultaneousFunctionalCount: crewComponent ? crew.simultaneousPositions * crewComponent.countPerPosition : b.vessel ? vesselDemand : b.applicator ? applicationDemand : simultaneousToolDemand,
     manufacturerCrewNormClaimed: false, plannedAssetDemandKnown: true, actualSiteInventoryConfirmed: false} : {}),
    ...(b.paperSupply ? {selectedSandingSupplyProfile: sanding, grossDemandUnitId: 'm2', manufacturerWearRateClaimed: false,
     exactNormConsumptionRowId: r('abrasive-consumed'), commonSupplyForBothSandingOperations: true, noSeparateStockCredit: true} : {}),
    retailProcurementComplete: false, engineeringAcceptance: false, automaticGenericPriceInheritanceAllowed: false,
    labourDoublePaymentForbidden: true, sourceReadyMaterialsOnly: true, sourceWaterResidualInferenceForbidden: true}};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 });
 return {...built, parameters, resources};
}

export function interiorWallFinishingGeometryGroupMapR3() {
 const r = interiorWallFinishingGeometryRowR3;
 const definition = interiorWallFinishingGeometryGroupDefinitionR3();
 return {contract: pack.contract, titleRu: pack.titleRu, selectedExistingCatalogId: pack.selectedExistingCatalogId,
  physicalScopeRu: pack.physicalScopeRu, predecessorPreserved: pack.predecessorSubjectContract,
  normativeResourceQuantitiesComplete: true, selectedScopeQuantitiesComplete: false, fullTechnicalAcceptance: false,
  mainProductProcurementComplete: true, retailProcurementComplete: false, mandatoryCustomerTechnicalQuestions: 0,
  operations: pack.operations.map(op => ({...op, processRowId: r('process-' + op.id),
   sharedLabourAndEquipmentOwnerRowId: r('whole-work'),
   materialQuantityOwnerRowIds: op.materialIds.map(id => r(id + (pack.materials.find(m => m.id === id)?.package ? '-order' : '-consumed'))),
   contributionRule: 'EXACT_SOURCE_AGGREGATE_NOT_AN_ARBITRARY_PER_STAGE_SPLIT',
   resourceCoverage: definition.resources.filter(row => canonicalEstimateOperationReferences(row.resource_graph?.operationCompositionV1)
    .some(ref => ref.operationId === r('operation:' + op.id))).map(row => ({rowId: row.row_id, titleRu: row.title_ru,
     category: row.category, unitId: row.unit_id, costTreatment: row.resource_graph?.costTreatment, costOwnerRowId: row.cost_owner_id ?? row.row_id,
     procurement: row.procurement_eligible, sharedAcrossOperations: canonicalEstimateOperationReferences(row.resource_graph?.operationCompositionV1).length > 1}))})),
  remainingApplicationSourceNeeds: pack.openSourceNeeds,
  selectedHandToolProfile: pack.handToolProfile,
  selectedManualApplicationProfile: pack.manualApplicationProfile,
  selectedManualApplicationVesselProfile: pack.manualApplicationVesselProfile,
  selectedManualFinishingCrewProfile: pack.manualFinishingCrewProfile,
  noNewCatalogAppend: true, noPublisher: true, published: false};
}

/** Expected source composition is independent of generated resources. The
 * existing publisher validator owns reference/binding validation. */
export function interiorWallFinishingIndependentCompletenessMapR3() {
 const r = interiorWallFinishingGeometryRowR3;
 const entry = (key: string, operationIds: readonly string[], included = false) => ({
  expectedResourceId: key, operationId: r('operation:' + operationIds[0]),
  requiredOperationIds: operationIds.map(id => r('operation:' + id)),
  condition: 'SELECTED_READY_VGT_FLAT_SOUND_LEVEL_INTERIOR_PLASTER_SOURCE_SCOPE', sourceId: pack.contract,
  quantityRule: key.startsWith('open-') ? 'APPLICATION_SOURCE_PROFILE_REQUIRED_NO_ASSUMED_QUANTITY'
   : [pack.handToolProfile.resourceKey, pack.manualApplicationProfile.resourceKey, ...pack.manualApplicationVesselProfile.components.map(component => component.resourceKey),
    ...pack.manualFinishingCrewProfile.components.map(component => component.resourceKey), pack.manualFinishingCrewProfile.sandingSupply.providedKey].includes(key) ? 'SELECTED_ONE_SERIAL_POSITION_PEAK_CONCURRENCY_WITH_PRIMARY_ITEM_SPECIFICATION_AND_PERSONAL_BALANCE'
   : 'CURRENT_MANUFACTURER_DEMAND_OR_EXACT_WHOLE_KRER_NORM',
  formulaId: r('formula:' + key), resolution: included
   ? {kind: 'INCLUDED_COMPONENT_ROW', rowId: r(key), parentRowId: r('whole-work')}
   : {kind: 'ROW', rowId: r(key)},
 });
 return {contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'PRODUCT_SYSTEM_TDS',
  generatedFromCurrentRows: false, operationResourceBindingRequired: true,
  evidenceSha256: pack.sources[0].sha256, evidenceReferences: pack.sources.map(s => s.url),
  selectedScopeQuantitiesComplete: false, physicalResourceCoverageComplete: false, fullTechnicalAcceptance: false,
  entries: [
   ...pack.independentExpectedBindings.map(e => entry(e.key, e.operationIds, e.includedComponent)),
   ...pack.independentExpectedProcessIds.map(id => entry('process-' + id, [id], true)),
   ...pack.notApplicableCategories.map(e => ({operationId: 'selected-source-scope', expectedResourceId: e.category,
    condition: 'EXPLICIT_SELECTED_TECHNOLOGY_BOUNDARY', sourceId: pack.contract,
    resolution: {kind: 'NOT_APPLICABLE', reasonRu: e.reason}})),
  ]};
}
