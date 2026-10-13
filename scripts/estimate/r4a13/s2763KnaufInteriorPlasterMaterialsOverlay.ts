import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {knaufInteriorPlasterPackS2763 as pack,knaufInteriorPlasterMaterialDefinitionS2763,
  knaufInteriorPlasterPrefixS2763 as prefix,knaufInteriorPlasterLegacyS2763 as legacy,
  knaufInteriorPlasterChoiceIdS2763 as choiceId} from '../../../src/lib/estimate/v4/knaufInteriorPlasterMaterialsS2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
import technicalBinding from '../../../data/estimate-benchmarks/source-packs/knauf-technical-two-bindings-s27-69.json';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');

// A forward whole-technology branch must account for every old obligation.
// These groups retain missing quantities and specifications; q*1/ceil(q/100)
// never become a confirmed rate of the selected gypsum technology.
const gaps=[
  ['mixing-container','Ёмкость для затворения Ротбанд, 50–125 л — фактическая ёмкость и обеспечение требуют проверки','pcs','equipment',[]],
  ['mixing-tool','Миксер строительный, мощность не менее800 Вт — фактический инструмент и обеспечение требуют проверки','pcs','equipment',[]],
  ['water','Вода для затворения, требуемого увлажнения и очистки — суммарный расход ещё не подтверждён','l','material',[]],
  ['respirator','Респиратор для защиты дыхания при работе с сухой смесью — исполнение и потребность требуют проверки','pcs','equipment',[]],
  ['eye-protection','Защита глаз при работе с сухой смесью — исполнение и обеспечение требуют проверки','pcs','equipment',[]],
  ['gloves','Защитные перчатки для работы со смесью — исполнение и потребность требуют проверки','pair','material',[]],
  ['main-labour','Ручное оштукатуривание Ротбанд: затворение, нанесение, выравнивание, подрезка, затирка и заглаживание — часы труда ещё не подтверждены','person_hour','labor',[]],
  ['primer-labour','Нанесение Бетогрунда на ещё непрогрунтованном бетоне — самостоятельная граница и часы труда ещё не подтверждены','person_hour','labor',[]],
  ['mesh','Сетка штукатурная для требуемого армирования — исполнение и область ещё не определены','m2','material',['materials_03']],
  ['protection','Укрывная плёнка для смежных поверхностей — область защиты и материал требуют подтверждения','m2','material',['materials_04','materials_38','consumables_44']],
  ['corner','Углозащитный штукатурный профиль — исполнение и длина по требуемым внешним углам','m','material',['materials_05','components_08']],
  ['abrasive','Абразив для действительно необходимой дополнительной обработки — вид и потребность не подтверждены','pcs','material',['materials_06']],
  ['losses','Дополнительная потребность сухой смеси сверх приблизительного расхода — потери не приняты','kg','material',['materials_37','waste_30']],
  ['marking','Материал разметки штукатурного участка — исполнение и расход ещё не определены','m','material',['materials_39']],
  ['beacons','Штукатурный маячковый профиль по выбранному слою10мм — необходимость и длина по проекту','m','material',['components_07']],
  ['interfaces','Материалы требуемых примыканий, вставок и закладных — конкретный состав не подтверждён','pcs','material',['components_09','components_40','components_41','components_42']],
  ['hand-tool','Ручной инструмент штукатурки: сокол или кельма, h-правило, трапециевидное правило, шпатель и тёрка — исполнение и обеспечение требуют проверки','pcs','equipment',['components_10','equipment_25']],
  ['primer-tool','Инструмент нанесения Бетогрунда: коротковорсовый или поролоновый валик либо кисть — выбор и обеспечение требуют проверки','pcs','equipment',['consumables_11','consumables_12','consumables_13']],
  ['tool-consumables','Расходники для фактически выбранного штукатурного инструмента — состав и количество требуют подтверждения','pcs','material',['consumables_43']],
  ['preparation','Подготовка бетона: осмотр, очистка, обеспыливание, требуемый ремонт и разметка — объём труда не подтверждён','person_hour','labor',['preparation_14','preparation_15','preparation_16','preparation_17','labor_18','labor_48']],
  ['site-preparation','Подготовка рабочей зоны, обмер и требуемая организация работ — отдельная необходимость и объём не подтверждены','person_hour','labor',['preparation_45','preparation_46','preparation_47']],
  ['acceptance','Контроль готовности и сдача штукатурного участка — отдельная граница труда или услуги не подтверждена','person_hour','labor',['labor_49','labor_50','quality_control_32','quality_control_33','quality_control_34','quality_control_59']],
  ['equipment','Измерение и подготовка участка: уровень, пылесос и действительно требуемая малая механизация — исполнение и обеспечение не подтверждены','machine_hour','equipment',['equipment_26','equipment_27','equipment_51','equipment_52']],
  ['logistics','Доставка и подача материалов, разгрузка и обратная тара — самостоятельные услуги и объёмы не подтверждены','machine_hour','service',['logistics_28','logistics_29','logistics_53','logistics_54']],
  ['cleanup','Уборка штукатурного участка, сортировка и передача отходов и тары — отдельная граница не подтверждена','person_hour','labor',['waste_31','waste_55','waste_56']],
  ['commercial','Сметные и исполнительные документы, проверка комплектности и применимые коммерческие условия — не автоматически оплачиваемый комплект','pcs','service',['quality_control_57','quality_control_58','overhead_35','tax_36']],
] as const;
const mainOperationSuffixes=new Set(['labor_20','labor_21','labor_22','labor_23','labor_24']);
const pendingCondition=(id:string,exact:{kind:'equals';parameterId:string;value:string})=>id==='primer-labour'||id==='primer-tool'
  ?{kind:'and' as const,operands:[exact,{kind:'equals' as const,parameterId:'betogrund_primer_state',value:pack.primerNeededRu}]}:exact;
export const S2763_KNAUF_INTERIOR_PLASTER_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(x=>x.rowId)]));

export function overlayS2763KnaufInteriorPlasterMaterials(parent:PurchaseGroupRepresentative,locators:{betogrund:string;rotband:string;mp75:string}){
  const catalogId=String(parent.definition.catalog_id),technicalTarget=technicalBinding.targets.find(t=>t.catalogId===catalogId),target=pack.targets.find(t=>t.catalogId===catalogId)??technicalTarget;
  if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion
    ||parent.resources.length!==target.parentResourceCount)throw Error('KNAUF_MATERIAL_EXACT_PARENT_DRIFT');
  for(const old of target.preservedOwners){const row=parent.resources.find(x=>x.row_id===old.rowId);
    if(!row||row.id!==old.resourceSpecId||row.cost_owner_id!==old.costOwnerId||row.unit_id!==old.unitId||row.formula_id!==old.formulaId)throw Error('KNAUF_MATERIAL_PARENT_OWNER_DRIFT:'+old.rowId);}
  if(technicalTarget&&parent.definition.definition_sha256!==technicalTarget.parentSha256)throw Error('KNAUF_TECHNICAL_TWO_PARENT_SHA_DRIFT');
  const result=structuredClone(parent),shared=knaufInteriorPlasterMaterialDefinitionS2763(target.primerOnly);
  const exact={kind:'equals' as const,parameterId:choiceId,value:target.primerOnly?pack.mechanizedChoiceRu:pack.manualChoiceRu};
  const dispositions:Record<string,unknown>[]=[];
  const replace=(row:PurchaseGroupRepresentative['resources'][number],ownerRowIds:string[],reasonRu:string)=>{
    row.inclusion_ast={kind:'and',operands:[row.inclusion_ast,legacy]};
    row.source_metadata={...row.source_metadata,forwardAlternativeDisposition:{contract:pack.contract,ownerRowIds,reasonRu,legacyQuantityNotAcceptedAsGypsumNorm:true}};
    const {row_sha256:_sha,...body}=row;row.row_sha256=hash(body);
    dispositions.push({legacyRowId:row.row_id,legacyCostOwnerId:row.cost_owner_id,legacyUnitId:row.unit_id,legacyFormulaId:row.formula_id,ownerRowIds,reasonRu});
  };
  if(target.primerOnly){
    const old=result.resources.find(x=>x.row_id===target.legacyPrimerOwnerRowId)!;
    replace(old,[prefix+':betogrund-consumed',prefix+':betogrund-5kg-order',prefix+':betogrund-15kg-order'],'Изолированные SKU Бетогрунда; прежняя общая грунтовка и её цена остаются только в исходной проектной ветви.');
    for(const p of result.parameters)if(['concrete_contact_primer_designation','concrete_contact_primer_mass_kg'].includes(p.parameter_id)){
      p.required=false;p.constraints_json={...p.constraints_json,requiredWhen:legacy};
      p.truth_metadata={...p.truth_metadata,required_when:legacy,visible_when:legacy};
    }
    if(result.resources.filter(r=>r.row_id!==old.row_id).length!==7)throw Error('KNAUF_STANDARD_OTHER_SEVEN_DRIFT');
  }else{
    if(parent.resources.length!==59||parent.parameters.length!==1||parent.formulas.length!==59)throw Error('KNAUF_MANUAL_LEGACY_SHAPE_DRIFT');
    for(const row of result.resources){const suffix=row.row_id.slice(String(parent.definition.catalog_id).split(':').at(-1)!.length+1);
      const gap=gaps.find(g=>(g[4] as readonly string[]).includes(suffix));
      const owners=suffix==='materials_01'?[prefix+':rotband-consumed',prefix+':rotband-30kg-order']:
        suffix==='materials_02'?[prefix+':betogrund-consumed',prefix+':betogrund-5kg-order',prefix+':betogrund-15kg-order']:
        suffix==='labor_19'?[prefix+':betogrund-application-area',prefix+':open-primer-labour']:
        mainOperationSuffixes.has(suffix)?[prefix+':rotband-application-area',prefix+':open-main-labour']:
        gap?[prefix+':open-'+gap[0]]:[];
      if(!owners.length)throw Error('KNAUF_LEGACY_OBLIGATION_UNMAPPED:'+suffix);
      replace(row,owners,gap?'Сохраняется открытая потребность; исходная шаблонная единица не является подтверждённым количеством.':'Альтернатива конкретной технологии. Никакая прежняя цена, количество или название автоматически не перенесены.');
    }
    if(dispositions.length!==59)throw Error('KNAUF_MANUAL_OWNER_DISPOSITION_INCOMPLETE');
    result.parameters=[];
  }
  let nextParameterOrdinal=Math.max(-1,...result.parameters.map(p=>Number(p.ordinal)))+1;
  for(const p of shared.parameters){if(result.parameters.some(x=>x.parameter_id===p.parameter_id))throw Error('KNAUF_PARAMETER_COLLISION:'+p.parameter_id);result.parameters.push({...p,ordinal:nextParameterOrdinal++});}
  result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
  const newResources:PurchaseGroupRepresentative['resources']=[...shared.resources];
  if(!target.primerOnly){
    const pending=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sources[1].id,normId:pack.contract+':unresolved-full-composition',
      sourceMetadata:{source_title:pack.sources[1].titleRu,source_document_version:pack.sources[1].printedEdition,artifact_sha256:pack.sources[1].sha256,definition_hash:pack.sources[1].sha256,exact_locator:'Непринятые количественные и проектные остатки; нормы из старого шаблона не перенесены'},
      applicabilityRu:pack.scopeRu,ordinary:[],profile:[],conditional:gaps.map(g=>({id:'knauf_open_'+g[0].replaceAll('-','_'),title:g[1],valueType:'decimal' as const,unitId:g[2],kind:'conditional' as const,min:0,requiredWhen:pendingCondition(g[0],exact)})),
      rows:gaps.map(g=>({rowId:prefix+':open-'+g[0],formulaId:prefix+':formula:open-'+g[0],title:g[1],unitId:g[2],category:g[3],section:'Оставшиеся подготовка, инструмент и завершение',expression:'knauf_open_'+g[0].replaceAll('-','_'),
        inclusion:pendingCondition(g[0],exact),
        costTreatment:g[3]==='equipment'?'INFORMATIONAL_SCOPE' as const:'OWN_COST' as const,procurement:false})),deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
    for(const p of pending.parameters){const source=p.parameter_id.startsWith('knauf_open_primer_')?pack.sources[0]:pack.sources[1];
      result.parameters.push({...p,ordinal:nextParameterOrdinal++,truth_metadata:{...unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Состав, область исполнения, характеристики или подтверждённое количество этой подработы отсутствуют. Шаблонq*1/ceil(q/100) не является нормой; инструмент не покупается на каждую единицу площади.'),
      guide:{...p.truth_metadata.guide as object,guide_short_ru:'Приложение ещё не подтвердило исполнение и количество этой подработы. Количество из прежнего шаблона не принято; средство общего пользования не покупается на каждую единицу площади.',
        source_role:'UNRESOLVED_APPLICATION_NORM',source_document:source.id,source_snapshot_hash:source.sha256,
        source_locator:p.parameter_id.startsWith('knauf_open_primer_')?'Бетогрунд, p1–2: технология; количественный остаток не принят':'Ротбанд, p2–4: технология, инструмент и защита; количественный остаток не принят',verified_at:source.reviewedAt}}});
    }
    result.formulas.push(...pending.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
    newResources.push(...pending.resources.map(r=>({...r,source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'UNRESOLVED_APPLICATION_NORM',sourceNormQuantityAccepted:false,full_technical_acceptance:false}})));
  }
  let nextRowOrdinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
  for(const r of newResources){if(result.resources.some(x=>x.row_id===r.row_id))throw Error('KNAUF_RESOURCE_COLLISION');
    const related=dispositions.filter(d=>(d.ownerRowIds as string[]).includes(r.row_id));const {row_sha256:_sha,...body}=r;
    const final={...body,ordinal:nextRowOrdinal++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,
      cost_owner_id:r.category==='material'?r.cost_owner_id:catalogId+':'+r.cost_owner_id,
      source_metadata:{...r.source_metadata,forwardLegacyObligationLineage:related,full_technical_acceptance:false}};
    result.resources.push({...final,row_sha256:hash(final)});
    if(r.source_metadata.sourceNormQuantityAccepted===true)result.bindings.push({row_id:r.row_id,locator_id:r.row_id.includes('rotband')?locators.rotband:locators.betogrund,
      applicability:{contract:pack.contract,selectedBranch:exact,approximatePlanningOnly:true,completeTechnicalEstimateAccepted:false}});
  }
  result.baseline.input_values=target.primerOnly?{...result.baseline.input_values,[choiceId]:pack.legacyChoiceRu}:{q:100,[choiceId]:pack.legacyChoiceRu};
  result.baseline.input_classification=target.primerOnly?{...result.baseline.input_classification,[choiceId]:'VALIDATION_FIXTURE'}:{q:'VALIDATION_FIXTURE',[choiceId]:'VALIDATION_FIXTURE'};
  result.baseline.normative_source_ids=target.primerOnly?{...parent.baseline.normative_source_ids,betogrund_actual_area_m2:[pack.contract+':betogrund']}
    :{q:[pack.contract+':rotband'],betogrund_actual_area_m2:[pack.contract+':betogrund']};
  if(technicalTarget){
    for(const p of result.parameters){const value=(technicalBinding.planningDefaults as Record<string,unknown>)[p.parameter_id];
      if(value!==undefined){p.default_value=null;p.truth_metadata={...p.truth_metadata,provenance:{...p.truth_metadata.provenance,
        consumer_input_role_v1:p.parameter_id===choiceId?'OBJECT_FACT':'ADVANCED_OPTION',
        initial_planning_default_v1:{value,reasonRu:technicalBinding.planningDefaultsReasonRu,objectAbsenceAsserted:false}}};}}
    result.definition.source_metadata={...result.definition.source_metadata,technicalMaterialBindingContract:technicalBinding.contract};
    result.definition.passport={...result.definition.passport,initialPlanningDefaultsV1:{values:technicalBinding.planningDefaults,
      reasonRu:technicalBinding.planningDefaultsReasonRu,objectAbsenceAsserted:false}};
  }
  const consumers=buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
    result.baseline.normative_source_ids[id]??=[];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  const unresolvedIds=new Set(result.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id));
  const unresolvedRows=result.resources.filter(r=>result.formulas.find(f=>f.formula_id===r.formula_id)?.input_parameter_ids.some((id:string)=>unresolvedIds.has(id))
    ||Array.isArray(r.source_metadata.requiredParameterIds)&&(r.source_metadata.requiredParameterIds as string[]).some(id=>unresolvedIds.has(id))).map(r=>r.row_id);
  result.passport.capability_matrix=[{capability:'PARAMETERS',status:'GREEN'},{capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN',scope:'CONDITIONAL_MANUFACTURER_MATERIAL_ONLY'},
    {capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolvedRows},{capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}];
  result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',activationAllowed:false,productionEligible:false,
    preliminaryCompositionOnly:true,technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,
    unresolvedResourceRowIds:unresolvedRows,
    physicalMaterialNormClosureCount:target.primerOnly?1:2,labourHourNormClosureCount:0,wholePlasterGroupComplete:false,sourceRateApproximate:true,legacyQuantityNormsUnaccepted:true,ownerDisposition:dispositions};
  const branchScope={contract:pack.contract,legacyChoiceRu:pack.legacyChoiceRu,selectedChoiceRu:target.primerOnly?pack.mechanizedChoiceRu:pack.manualChoiceRu,
    sourceScopeRu:pack.scopeRu,acceptedMaterialRates:target.primerOnly?['Бетогрунд около0,25кг/м²']:['Ротбанд около8,5кг/м², ровно10мм без потерь','Бетогрунд около0,25кг/м²'],
    completeTechnicalEstimateAccepted:false,quantityScope:'PARTIAL',sourceIds:target.primerOnly?[pack.sources[0].id,pack.sources[2].id]:[pack.sources[0].id,pack.sources[1].id]};
  const scopeSummary='Выбранная технология КНАУФ: подтверждены только указанные приблизительные расходы материалов. Подготовка, инструмент, труд и завершение сохраняют незакрытые потребности; полная техническая смета и точная закупка без условий поставки не подтверждены.';
  result.definition.passport={...result.definition.passport,rowCount:result.resources.length,
    legacyAlternativeBaselineNormativeSourceIds:parent.baseline.normative_source_ids,
    legacyAlternativePassport:parent.definition.passport,sourcePack:{contract:pack.contract,sourceQuality:'PARTIAL_MANUFACTURER_MATERIAL_ONLY',sourceIds:branchScope.sourceIds,legacySourcePack:parent.definition.passport?.sourcePack},
    workDescription:{...result.definition.passport.workDescription,scopeSummary},branchScope};
  result.definition.applicability={...result.definition.applicability,legacyAlternativeApplicability:parent.definition.applicability,
    includedScopeRu:[scopeSummary,pack.scopeRu],excludedScopeRu:pack.exclusionsRu,branchScope};
  result.passport.included_scope_ru=[scopeSummary,pack.scopeRu];result.passport.excluded_scope_ru=pack.exclusionsRu;
  return{representative:result,ownerDisposition:dispositions,legacyRowIds:dispositions.map(x=>String(x.legacyRowId)),addedRowIds:newResources.map(r=>r.row_id),
    addedParameterIds:result.parameters.filter(p=>!parent.parameters.some(old=>old.parameter_id===p.parameter_id)).map(p=>p.parameter_id),newMaterialNormClosureCount:target.primerOnly?1:2};
}

/** Bind editable planning settings to the new accepted baseline, never to a
 * historical parent or a validation area. The schema digest excludes its own
 * provenance binding to avoid a circular hash. Publisher preflight remains required. */
export function bindKnaufTechnicalPlanningDefaultsS2769(r:PurchaseGroupRepresentative,context:{definitionId:string;baselineId:string;releaseId:string;evidenceSha256:string}){
  if(!technicalBinding.targets.some(t=>t.catalogId===r.definition.catalog_id))throw Error('KNAUF_TECHNICAL_DEFAULT_SCOPE_DRIFT');
  const defaults=technicalBinding.planningDefaults as Record<string,unknown>;
  r.baseline.input_values={};r.baseline.input_classification={};
  for(const p of r.parameters)if(Object.hasOwn(defaults,p.parameter_id)){
    p.default_value=defaults[p.parameter_id];p.approved_template_baseline_id=context.baselineId;
    r.baseline.input_values[p.parameter_id]=p.default_value;r.baseline.input_classification[p.parameter_id]='ASSUMPTION';
    p.truth_metadata={...p.truth_metadata,value_source_role:'VISIBLE_BASELINE_ASSUMPTION',hidden_default_forbidden:false,
      baseline_assumption_id:context.baselineId+':'+p.parameter_id};
  }
  const schemaSha256=knaufTechnicalParameterSchemaSha256S2769(r.parameters);
  r.baseline.parameter_schema_sha256=schemaSha256;
  for(const p of r.parameters)if(Object.hasOwn(defaults,p.parameter_id)){
    const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,provenance:{...p.truth_metadata.provenance,
      baselineOwner:'approved-template-baseline:r54',sourceCatalogId:r.definition.catalog_id,sourceReleaseId:context.releaseId,
      sourceDefinitionVersionId:r.definition.id,sourceParameterSchemaId:schemaSha256,approvedTemplateBaselineId:context.baselineId,
      acceptanceEvidenceSha256:context.evidenceSha256,
      approvedTemplateBinding:{baselineId:context.baselineId,catalogId:r.definition.catalog_id,parameterId:id,value:p.default_value,
        inputClassification:'ASSUMPTION',definitionVersionId:r.definition.id,targetDefinitionVersionId:context.definitionId,parameterSchemaSha256:schemaSha256,
        formulaConsumerIds:r.baseline.formula_consumer_ids[id],resourceConsumerRowIds:r.baseline.resource_consumer_row_ids[id],
        normativeSourceIds:r.baseline.normative_source_ids[id]??[],acceptanceEvidenceSha256:context.evidenceSha256}}};
  }
}
export function knaufTechnicalParameterSchemaSha256S2769(parameters:PurchaseGroupRepresentative['parameters']){
  return hash(parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,required:p.required,
    constraints:p.constraints_json,defaultValue:p.default_value,valueSourceRole:p.truth_metadata.value_source_role,
    formulaConsumers:p.truth_metadata.formula_consumers,resourceConsumers:p.truth_metadata.resource_branch_consumers})));
}
