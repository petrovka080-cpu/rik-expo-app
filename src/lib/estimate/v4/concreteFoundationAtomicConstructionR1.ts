/** WORK atomic scope correction only. No writer, historic edits or hidden defaults. */
import { buildConcreteFoundationSubworkSourceR1 } from './concreteFoundationSubworkReuseR1';
import { CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 as profiles } from './concreteFoundationAtomicConstructionProfilesR1';
import { buildVibrationOperationCompletionS2733 } from './vibrationOperationCompletionS2733';
import { buildLevelingOperationCompletionS2733, LEVELING_COMPLETION_ROWS } from './levelingOperationCompletionS2733';
import { buildEmbeddedWeldingCompletionS2733 } from './embeddedWeldingCompletionS2733';
import { buildEmbeddedInstallationCompletionS2733 } from './embeddedInstallationCompletionS2733';
import { buildEmbeddedCoatingCompletionS2733 } from './embeddedCoatingCompletionS2733';
import { buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition } from './automaticConstructionOwnerR1';
import {buildExplicitProjectMaterialItemsR1 as explicitMaterials, requireExplicitMaterialOperationR1 as requiredOperationCondition, type ExplicitProjectMaterialPositionR1 as MaterialPosition} from './explicitProjectMaterialItemsR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition as Parameter, type CanonicalEstimateFormulaDefinition as Formula, type CanonicalEstimateResourceDefinition as Resource } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export { CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 } from './concreteFoundationAtomicConstructionProfilesR1';
type Json = Record<string, unknown>;
type Profile = typeof profiles[number];
type Part = Readonly<{parameters: readonly Parameter[]; formulas: readonly Formula[]; resources: readonly Resource[]}>;
const projectGuideSha = '42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50';
const equals = (parameterId: string, value: string): AutomaticInclusionCondition => ({kind:'equals',parameterId,value});
const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({kind:'and',operands});
const SIKA4012 = 'SIKA_MONOTOP_4012_2026_03';
const ruChoices:Readonly<Record<string,string>>={
 INTERNAL_VIBRATION:'Глубинное виброуплотнение свежего бетона',FRESH_PLASTIC_CONCRETE:'Свежеуложенный пластичный бетон',
 CAST_IN_EMBEDDED_ITEMS:'Закладные детали, устанавливаемые до бетонирования',SEPARATE_CONFIRMED_PHYSICAL_SCOPE:'Отдельный подтверждённый физический объём работы',
 PROJECT_DEFINED_PRODUCT_PASSPORT:'Материал по подтверждённому проектному паспорту',SIKA_MONOTOP_4012_2026_03:'Sika MonoTop-4012, применимый паспорт марта 2026 года',
 HORIZONTAL:'Горизонтальная поверхность',VERTICAL:'Вертикальная поверхность',OVERHEAD:'Потолочная поверхность',YES:'Да',NO:'Нет',
 NO_EXTRA_MATERIAL_CONFIRMED:'Отдельный материал не требуется по утверждённому методу',INCLUDED_IN_EXISTING_RATE:'Материал учтён в подтверждённой существующей ставке',
 SEPARATE_CONFIRMED_SUPPLY:'Материал поставляется и оплачивается отдельными позициями',NOT_REQUIRED_BY_APPROVED_PROJECT:'Не требуется по утверждённой ведомости',REQUIRED_BY_APPROVED_PROJECT:'Требуется по утверждённой ведомости',
 NOT_REQUIRED:'Не требуется по утверждённому методу',SEPARATE_SUPPLY:'Отдельная подтверждённая поставка',SEPARATE:'Отдельная подтверждённая оплата',
 INCLUDED_IN_EQUIPMENT_RATE:'Учтено в ставке оборудования',INCLUDED_IN_SELECTED_RATE:'Учтено в выбранной ставке',INCLUDED_IN_GUIDE_RATE:'Учтено в цене направляющих',
 INCLUDED_IN_SELECTED_POST_RATE:'Учтено в выбранной ставке сварочного поста',INCLUDED_IN_WELDING_LABOR_RATE:'Учтено в оплате сварщика',SEPARATE_EQUIPMENT_RATE:'Отдельная подтверждённая ставка оборудования',
 INCLUDED_IN_EXISTING_LABOR_RATE:'Учтено в существующей оплате труда',SEPARATE_CONFIRMED_TRIPS:'Отдельные подтверждённые рейсы',
 MANUAL_TOOLS:'Ручной инструмент по утверждённой технологии',PROJECT_SELECTED_EQUIPMENT:'Оборудование по утверждённой проектной ведомости',
};
export const foundationAtomicChoiceLabelRuR1=(value:string):string=>ruChoices[value]??value;
const coded=(value:unknown):unknown=>typeof value==='string'?(Object.entries(ruChoices).find(([,label])=>label===value)?.[0]??value):value;

function profileFor(catalogId: string): Profile {
  const profile = profiles.find(p => p.catalogId === catalogId);
  if (!profile) throw Error('FOUNDATION_ATOMIC_SCOPE_NOT_IN_EXACT34_PRESERVE_EXISTING_SIX');
  return profile;
}

/** Standalone source review only: never a persisted compiler guarantee.
 * Product-specific applicability only. Never derives kg from generic geometry,
 * promotes a source to the local PDS, or supplies brand/package defaults. */
export function reviewFoundationRepairProductR1(input: Record<string, unknown>) {
  if (coded(input.foundation_repair_product_system) !== SIKA4012) return {status:'PROJECT_PRODUCT_PASSPORT_REQUIRED' as const, quantityCalculated:false as const};
  const needIds: string[] = [];
  for (const id of ['foundation_repair_applicable_local_pds_reference','foundation_repair_surface_orientation',
    'foundation_repair_layer_thickness_mm','foundation_repair_localised_patch','foundation_repair_curing_compatibility_reference',
    'foundation_repair_water_l_per_25kg_bag']) {
    if (input[id] == null || input[id] === '') needIds.push(id);
  }
  if (needIds.length) return {status:'SELECTED_PRODUCT_FACTS_REQUIRED' as const,needIds,quantityCalculated:false as const};
  const orientation = coded(input.foundation_repair_surface_orientation);
  const local = coded(input.foundation_repair_localised_patch) === 'YES';
  const maximum = orientation === 'HORIZONTAL' ? 120 : orientation === 'VERTICAL' ? (local ? 120 : 85) : orientation === 'OVERHEAD' ? (local ? 50 : 30) : null;
  const thickness = input.foundation_repair_layer_thickness_mm;
  if (maximum == null || typeof thickness !== 'number' || !Number.isFinite(thickness) || thickness < 6 || thickness > maximum) {
    throw Error('SELECTED_SIKA4012_ORIENTATION_LAYER_THICKNESS_OUTSIDE_PINNED_PDS');
  }
  const mixingWater=input.foundation_repair_water_l_per_25kg_bag;
  if(typeof mixingWater!=='number'||!Number.isFinite(mixingWater)||mixingWater<3.75||mixingWater>3.9)throw Error('SELECTED_SIKA4012_MIXING_WATER_OUTSIDE_PINNED_PDS');
  return {status:'STANDALONE_SELECTED_PRODUCT_FACTS_WITHIN_PINNED_PDS_NOT_PERSISTED_GUARANTEE' as const,
    mixingWaterLPer25KgBagRange:[3.75,3.9] as const, persistedValidationGuaranteed:false as const,
    sourcePdfSha256:'c3159d1e355dc1a737dd83e88c86fb12b85950cc79ace1c24a61a8fdc5193cd7',
    quantityCalculated:false as const, primerUniversallyRequired:false as const, reinforcementProtectionUniversallyRequired:false as const};
}

function operation(rowId: string, profile: Profile): string {
  if (/weld/u.test(rowId)) return 'embedded-welding';
  if (/coating/u.test(rowId)) return 'embedded-coating';
  if (/inspection|testing|quality-control|surface-measure|surface-control|survey/u.test(rowId)) return 'quality-control';
  if (/delivery|mobilization|waste/u.test(rowId)) return 'logistics-and-waste';
  if (profile.operation === 'repair') {
    if (/curing/u.test(rowId)) return 'repair-curing';
    if (/removal|dust/u.test(rowId)) return 'repair-removal';
    if (/substrate|bonding|rebar-treatment/u.test(rowId)) return 'repair-substrate';
    return 'repair-material-placement';
  }
  if (profile.operation === 'anchor') return 'cast-in-embedded-installation';
  return profile.operation === 'level' ? 'fresh-concrete-leveling' : 'fresh-concrete-internal-vibration';
}

/** Each position has a full RU name, unit, actual quantity and specification.
 * No-extra-material and rate inclusion are explicit decisions, never purchases
 * inferred from the work name. All arithmetic uses accepted shared factories. */
export function buildConcreteFoundationAtomicConstructionR1(catalogId: string) {
  const profile = profileFor(catalogId), base = buildConcreteFoundationSubworkSourceR1(catalogId);
  const sourceGuideSha256 = profile.operation==='repair'?'03aa630b0d455e1938d4f3131ae47f558a55225e12881658944d2ecf9a314f31':profile.operation==='anchor'?projectGuideSha:'1b9a2d4164301e64fb781c8918e5ad9d435de8458aaab66c342c644205add1c5';
  const subworkTitles: Readonly<Record<string,string>> = profile.subworkTitlesRu;
  const parameters: Parameter[] = structuredClone(base.parameters), formulas: Formula[] = structuredClone([...base.formulas]), resources: Resource[] = structuredClone(base.resources);
  const merge = (part: Part, sharedGuide = false) => {
    for (const p of part.parameters) if (!parameters.some(old=>old.parameter_id===p.parameter_id)) parameters.push(structuredClone(p));
    const newRows = part.resources.filter(row=>!resources.some(old=>old.row_id===row.row_id));
    for (const f of part.formulas) if (newRows.some(row=>row.formula_id===f.formula_id)) {
      if (formulas.some(old=>old.formula_id===f.formula_id)) throw Error('FOUNDATION_ATOMIC_FORMULA_COLLISION');
      formulas.push(structuredClone(f));
    }
    for (const row of part.resources) {
      const existing=resources.find(old=>old.row_id===row.row_id);
      if (existing) {
        if (!sharedGuide || row.row_id!==LEVELING_COMPLETION_ROWS.guides) continue;
        existing.resource_graph={...existing.resource_graph,purchaseBalanceV1:row.resource_graph.purchaseBalanceV1,effectiveQuantityOutputV1:row.resource_graph.effectiveQuantityOutputV1};
      } else resources.push(structuredClone(row));
    }
  };
  const role = (sourceRole: string) => {
    const row=resources.find(r=>r.source_metadata?.sourceRole===sourceRole);
    if (!row) throw Error('FOUNDATION_ATOMIC_EXISTING_OWNER_REQUIRED:'+sourceRole);
    return row.row_id;
  };
  if (profile.operation==='vibrate') merge(buildVibrationOperationCompletionS2733(catalogId));
  if (profile.operation==='level') merge(buildLevelingOperationCompletionS2733(catalogId,role('APPROVED_PROJECT_EQUIPMENT_SCHEDULE')),true);
  if (profile.operation==='anchor') {
    merge(buildEmbeddedWeldingCompletionS2733(catalogId,'',projectGuideSha,role('APPROVED_WELDING_PROCEDURE_AND_LABOR_SCHEDULE')));
    merge(buildEmbeddedInstallationCompletionS2733(catalogId,'',projectGuideSha,{installation:role('APPROVED_PROJECT_FIXING_LABOR_SCHEDULE'),lifting:role('APPROVED_PROJECT_LIFTING_EQUIPMENT_SCHEDULE')}));
    merge(buildEmbeddedCoatingCompletionS2733(catalogId,'',projectGuideSha,role('APPROVED_PROJECT_COATING_TOUCHUP_LABOR_SCHEDULE')));
  }
  if (profile.operation==='repair') {
    for (const [key,title,owner,input] of [
      ['repair_removal','Контролируемое удаление повреждённого бетона','APPROVED_REPAIR_REMOVAL_LABOR_SCHEDULE','damaged_concrete_removal_worker_h'],
      ['repair_substrate','Подготовка и очистка поверхности под ремонт','APPROVED_REPAIR_SUBSTRATE_LABOR_SCHEDULE','substrate_preparation_worker_h'],
      ['repair_placement','Смешивание, укладка и обработка ремонтного материала','APPROVED_REPAIR_PLACEMENT_LABOR_SCHEDULE','repair_material_placement_worker_h'],
      ['repair_curing','Немедленный совместимый уход за отремонтированным участком','APPROVED_REPAIR_CURING_LABOR_SCHEDULE','repair_curing_worker_h'],
    ] as const) {
      const active:AutomaticInclusionCondition={kind:'greater_than',parameterId:input,value:0};
      const ownerRow=resources.find(row=>row.row_id===role(owner))!;
      const positions:readonly MaterialPosition[]=key==='repair_placement'?[...profile.materialPositions[key],
        {key:'mixing_water',titleRu:'Вода затворения выбранного сухого ремонтного состава по применимому паспорту и проектной ведомости; не для готовых материалов без добавления воды',unitId:'l'}]:profile.materialPositions[key];
      merge(explicitMaterials(catalogId,key,active,[{condition:active,ownerRowId:ownerRow.row_id,titleRu:ownerRow.title_ru}],parameters,positions,sourceGuideSha256));
    }
  }
  // The accepted builders supply operation/owner predicates. Aggregate kit
  // rows are retired scope records: only individual confirmed material rows pay.
  const retiredKitParameterIds=new Set(parameters.filter(p=>/_accessories_(?:pricing_mode|specification|set_count)$/.test(p.parameter_id)).map(p=>p.parameter_id));
  for(const kit of profile.completionMaterialGroups){
    const separateRow=resources.find(r=>r.row_id===kit.separateRowId);
    if(!separateRow)throw Error('FOUNDATION_COMPLETED_MATERIAL_OWNER_MISSING:'+kit.separateRowId);
    const includedRows=kit.includedRowIds.map(id=>{const row=resources.find(r=>r.row_id===id);if(!row)throw Error('FOUNDATION_INCLUDED_KIT_REFERENCE_MISSING:'+id);return row;});
    const active=requiredOperationCondition(separateRow.inclusion_ast as AutomaticInclusionCondition);
    const included=includedRows.map(row=>{const ownerRowId=String(row.resource_graph.includedInResourceOwnerRowId),owner=resources.find(r=>r.row_id===ownerRowId);
      if(!owner)throw Error('FOUNDATION_ITEM_CONFIRMED_OWNER_MISSING:'+ownerRowId);
      return {condition:requiredOperationCondition(row.inclusion_ast as AutomaticInclusionCondition),ownerRowId,titleRu:owner.title_ru};});
    merge(explicitMaterials(catalogId,kit.key,active,included,parameters,kit.positions,sourceGuideSha256));
    for(const row of [...includedRows,separateRow]){
      const formula=formulas.find(f=>f.formula_id===row.formula_id);for(const id of formula?.input_parameter_ids??[])retiredKitParameterIds.add(id);
      const ids=row.resource_graph.inputParameterIds;if(Array.isArray(ids))for(const id of ids)if(typeof id==='string'&&/_accessories_(?:pricing_mode|specification|set_count)$/.test(id))retiredKitParameterIds.add(id);
      row.procurement_eligible=false;row.cost_owner_id=null;row.inclusion_ast={kind:'literal',value:false};
      const {purchaseBalanceV1:_balance,effectiveQuantityOutputV1:_effective,includedInResourceOwnerRowId:_owner,...graph}=row.resource_graph;
      row.resource_graph={...graph,costOwner:'scope',costTreatment:'INFORMATIONAL_SCOPE',expandedMaterialRowOwnerScope:kit.key,retiredAggregateKitScopeOnly:true};
      row.title_ru='Прежний агрегатный состав '+kit.titleRu+': заменён отдельными материальными позициями без повторной оплаты';
    }
  }
  for(const p of parameters.filter(p=>retiredKitParameterIds.has(p.parameter_id))){
    p.required=false;const {requiredWhen:_required,forbiddenWhen:_forbidden,...constraints}=p.constraints_json??{};p.constraints_json=constraints;
    p.truth_metadata={...p.truth_metadata,visibility_role:'INTERNAL_ONLY',retiredAggregateKitParameter:true};
  }
  const referencesRetired=(value:unknown):boolean=>typeof value==='string'?retiredKitParameterIds.has(value)
    :Array.isArray(value)?value.some(referencesRetired):!!value&&typeof value==='object'&&Object.values(value).some(referencesRetired);
  for(const row of resources.filter(row=>row.resource_graph.retiredAggregateKitScopeOnly!==true)){
    const formula=formulas.find(f=>f.formula_id===row.formula_id);
    if(referencesRetired([row.inclusion_ast,row.resource_graph,formula?.input_parameter_ids??[]]))throw Error('FOUNDATION_LIVE_ROW_REFERENCES_RETIRED_AGGREGATE_SELECTOR:'+row.row_id);
  }
  for(const p of parameters.filter(p=>!retiredKitParameterIds.has(p.parameter_id)))if(referencesRetired(p.constraints_json))throw Error('FOUNDATION_LIVE_PARAMETER_REFERENCES_RETIRED_AGGREGATE_SELECTOR:'+p.parameter_id);
  // Pure control can require no separate consumable; no arbitrary purchase.
  const control=resources.find(r=>r.category==='service'&&/inspection|quality-control|surface-control|survey/u.test(r.row_id));
  if(control)control.resource_graph={...control.resource_graph,materialScopeRu:'Отдельный материал не назначается автоматически; оборудование и расходники по утверждённому плану контроля и подтверждённой ставке услуги.'};
  const commonFacts: AutomaticParameterSpec[] = profile.constructionFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'text',unitId:null,kind:'ordinary'}));
  commonFacts.push({id:'foundation_paid_owner_boundary',title:'Подтверждённая отдельная физическая граница этой atomic работы: без уже оплаченного объёма укладки или полной конструкции',valueType:'enum',unitId:null,kind:'ordinary',values:['SEPARATE_CONFIRMED_PHYSICAL_SCOPE']});
  if (profile.operation==='vibrate'||profile.operation==='level')commonFacts.push({id:'foundation_concrete_state',title:'Состояние бетона в границах этой операции',valueType:'enum',unitId:null,kind:'ordinary',values:['FRESH_PLASTIC_CONCRETE']});
  if (profile.operation==='anchor') commonFacts.push({id:'foundation_anchor_technology',title:'Технология закладных деталей, устанавливаемых до бетонирования; последующие механические и химические анкеры требуют отдельной модели',valueType:'enum',unitId:null,kind:'ordinary',values:['CAST_IN_EMBEDDED_ITEMS']});
  if (profile.operation==='repair') commonFacts.push(
    {id:'foundation_repair_product_system',title:'Подтверждённая проектом ремонтная система и применимый паспорт',valueType:'enum',unitId:null,kind:'ordinary',values:['PROJECT_DEFINED_PRODUCT_PASSPORT']},
    {id:'foundation_repair_passport_constraints_reference',title:'Отдельное подтверждение применимого паспорта, ориентации, толщины слоя, воды затворения, грунтования, защиты арматуры и совместимого ухода; эти продуктовые ограничения общий компилятор автоматически не проверяет',valueType:'text',unitId:null,kind:'ordinary'},
    {id:'foundation_repair_surface_orientation',title:'Подтверждённая ориентация ремонтируемой поверхности',valueType:'enum',unitId:null,kind:'ordinary',values:['HORIZONTAL','VERTICAL','OVERHEAD']},
    {id:'foundation_repair_localised_patch',title:'Проект подтверждает локальный участок ремонта',valueType:'enum',unitId:null,kind:'ordinary',values:['YES','NO']},
    {id:'foundation_repair_layer_thickness_mm',title:'Проектная толщина одного ремонтного слоя; применимость определяется выбранным паспортом',valueType:'decimal',unitId:'mm',kind:'ordinary',min:0.001});
  const facts=buildAutomaticConstructionOwnerR1({contract:'foundation-construction-project-facts/r1',semanticOwner:catalogId,sourceId:'project_approved_foundation_geometry_method_and_scope',normId:'project-facts-no-universal-norm',
    sourceMetadata:{source_title:'Утверждённый проект конструкции, обследование и технологическая карта',source_document_version:'project-defined-required-input',definition_hash:sourceGuideSha256,artifact_sha256:sourceGuideSha256,exact_locator:profile.geometryRequirementRu},
    applicabilityRu:profile.scopeRu,ordinary:commonFacts,profile:[],conditional:[],rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['old q=100 ASSUMPTION becomes project fact','brand/grade/diameter derived from work name']});
  merge(facts);
  // facts has no resources; add its parameters explicitly through the same merge.
  const commonIds=facts.parameters.map(p=>p.parameter_id);
  const designations: Readonly<Record<string,string>>={
    'material:concrete:slab-embedded-items':'embedded_item_designation','material:concrete:slab-embedded-items-welding-consumables':'welding_consumable_designation',
    'material:concrete:slab-embedded-items-temporary-support':'temporary_support_designation','material:concrete:slab-embedded-items-coating':'coating_touchup_designation',
    'material:concrete:slab-repair-material':'repair_material_designation','material:concrete:slab-repair-bonding-agent':'bonding_agent_designation',
    'material:concrete:slab-repair-rebar-treatment':'reinforcement_treatment_designation','material:concrete:slab-repair-curing':'curing_material_designation',
    'material:concrete:screed-guides':'screed_guide_designation'};
  const enumLabels=new Map(parameters.filter(p=>p.value_type==='enum').map(p=>[p.parameter_id,new Map(((p.constraints_json?.values as string[]|undefined)??[]).map(value=>{
    const label=foundationAtomicChoiceLabelRuR1(value);if(/^[A-Z][A-Z0-9_]+$/.test(label))throw Error('FOUNDATION_RU_CHOICE_LABEL_REQUIRED:'+value);return [value,label] as const;
  }))]));
  const rewrite=(value:unknown):unknown=>{
    if(Array.isArray(value))return value.map(rewrite);if(!value||typeof value!=='object')return value;
    const object=value as Json;const result=Object.fromEntries(Object.entries(object).map(([key,next])=>[key,rewrite(next)]));
    if(typeof object.parameterId==='string'&&typeof object.value==='string')result.value=enumLabels.get(object.parameterId)?.get(object.value)??object.value;
    return result;
  };
  for(const p of parameters){p.constraints_json=rewrite(p.constraints_json??{}) as Json;if(enumLabels.has(p.parameter_id))p.constraints_json.values=[...enumLabels.get(p.parameter_id)!.values()];}
  const finalized:Resource[]=resources.map((row,ordinal)=>{
    const op=operation(row.row_id,profile), designation=designations[row.row_id];
    const graph:Json={...row.resource_graph,inputParameterIds:[...new Set([...(Array.isArray(row.resource_graph.inputParameterIds)?row.resource_graph.inputParameterIds as string[]:[]),...commonIds])],
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:catalogId,groupTitleRu:profile.titleRu,operationId:op,operationTitleRu:subworkTitles[op]??profile.titleRu,
        completionCriterionRu:profile.scopeRu+'; материальный состав, метод, фактические величины и границы ставки подтверждены отдельно.'},
      ...(designation?{titleSpecificationParameterIds:[designation],titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — '}:{}),
      physicalScopeAndPaidOwnerV1:{requiredReferenceParameterId:'foundation_operation_price_scope_reference',pairedPlacementCatalogId:profile.pairedPlacementCatalogId,paidTwiceAllowed:false},
      ...(profile.operation==='repair'?{productSpecificPassportValidationV1:{status:'NEED_SEPARATE_CONFIRMED_PRODUCT_METHOD_VALIDATION',automaticallyEnforced:false,selectedProductBranchAvailable:false,referenceParameterId:'foundation_repair_passport_constraints_reference'}}:{})};
    const normalized={...row,ordinal,inclusion_ast:rewrite(row.inclusion_ast) as Json,resource_graph:rewrite(graph) as typeof graph,source_metadata:{...row.source_metadata,...(row.category==='material'?{automaticGenericPriceInheritanceAllowed:false}:{}),constructionProfileId:profile.catalogId,universal_consumption_claimed:false,universal_productivity_claimed:false}};
    const {row_sha256:_old,...content}=normalized;
    return {...normalized,row_sha256:estimateDeterministicHash(content)};
  });
  if (parameters.some(p=>p.default_value!=null)) throw Error('FOUNDATION_ATOMIC_HIDDEN_DEFAULT');
  if (new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length || new Set(finalized.map(r=>r.row_id)).size!==finalized.length) throw Error('FOUNDATION_ATOMIC_DUPLICATE_ID');
  const byRow=new Map(finalized.map(r=>[r.row_id,r]));
  for (const row of finalized) {
    const included=row.resource_graph.includedInResourceOwnerRowId;
    if (typeof included==='string'&&!byRow.has(included)) throw Error('FOUNDATION_ATOMIC_INCLUDED_OWNER_MISSING:'+included);
  }
  const subworks=[...new Set(finalized.map(r=>(r.resource_graph.operationCompositionV1 as Json).operationId as string))].map(operationId=>{
    const rows=finalized.filter(r=>(r.resource_graph.operationCompositionV1 as Json).operationId===operationId);
    return {operationId,titleRu:subworkTitles[operationId]??profile.titleRu,rowIds:rows.map(r=>r.row_id),
      materialRowIds:rows.filter(r=>r.category==='material').map(r=>r.row_id),
      materialBoundary:'Only selected direct material takeoff or approved counted BOM. No-extra-material/service inclusion is an explicit project-method decision; no purchase is invented.'};
  });
  return {contract:'foundation-construction-atomic-scope/r1' as const,status:'WORK_ATOMIC_SCOPE_IMPLEMENTED_NOT_ADOPTED' as const,profile,
    primaryMeasureParameterId:base.primaryMeasureParameterId,parameters,formulas,resources:finalized,subworks,
    historicalParent:profile.observedParent,adoptionAllowed:false as const,oldRowsAutomaticallyMigrated:0 as const,
    remainingGates:['SEPARATE_CONFIRMED_PRODUCT_PASSPORT_METHOD_REVIEW_NOT_ENFORCED_BY_THIS_PERSISTED_MODEL','ACTUAL_PROJECT_METHOD_GEOMETRY_BOM_AND_PRICES_AS_APPLICABLE','EXACT_SCOPE_AND_MANUAL_LINEAGE_FORWARD_WRITER','ADDRESS_COMPLEX_SCOPE_NORM_COST_REVIEW_BEFORE_ADOPTION','FINITE_TESTS_TYPECHECK_AND_NORMAL_OWNER_UI'] as const};
}

export async function compileConcreteFoundationAtomicConstructionR1(catalogId: string,input: Record<string,unknown>,rowOverrides?:Record<string,Record<string,unknown>>) {
  const model=buildConcreteFoundationAtomicConstructionR1(catalogId);
  // Identical to persisted standard compile: no wrapper-only PDS enforcement.
  return compileCanonicalEstimateCore({operation:rowOverrides&&Object.keys(rowOverrides).length>0?'recalculate':'compile',compilerVersion:'canonical-estimate-compiler.foundation-construction-atomic-r1',catalogId,
    primaryMeasureParameterId:model.primaryMeasureParameterId,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    submittedParameters:input,confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:128,hashJson:async value=>estimateDeterministicHash(value)});
}
