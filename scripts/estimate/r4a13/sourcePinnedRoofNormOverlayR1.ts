import {createHash}from'node:crypto';
import {stringifyCanonicalEstimateJson}from'../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers}from'../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticRowSpec}from'../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {sourcePinnedRoofNormOwnerR1,sourcePinnedRoofNormGuardsR1,type SourcePinnedRoofNormPackR1}from'../../../src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1';
import type{PurchaseGroupRepresentative}from'./s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export type SourcePinnedRoofNormTargetR1={catalogId:string;predecessorDefinitionId:string;predecessorVersion:number;rowIdPrefix:string;
 preservedOwners:{rowId:string;resourceSpecId:string;costOwnerId:string;unitId:string;formulaId:string}[]};
export type SourcePinnedRoofNormSeriesR1=SourcePinnedRoofNormPackR1&{targets:SourcePinnedRoofNormTargetR1[];
 legacyDisposition:Record<string,{disposition:string;reasonRu:string;residualTitleRu?:string;includedNormRoles?:string[]}>};

/** Forward-only source branch over exact parents. Identity preservation and
 * complete legacy obligation mapping are checked independently of prices. */
export function overlaySourcePinnedRoofNormR1(parent:PurchaseGroupRepresentative,pack:SourcePinnedRoofNormSeriesR1,locators:{roof:string;guidance:string}){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId),source=pack.sources.find(s=>s.kind==='roof')!;
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.resources.length!==target.preservedOwners.length)throw Error('ROOF_NORM_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const r=parent.resources.find(r=>r.row_id===old.rowId);if(!r||r.id!==old.resourceSpecId||r.cost_owner_id!==old.costOwnerId||r.unit_id!==old.unitId||r.formula_id!==old.formulaId)throw Error('ROOF_NORM_OWNER_DRIFT:'+old.rowId);}
 const result=structuredClone(parent),guards=sourcePinnedRoofNormGuardsR1(pack),shared=sourcePinnedRoofNormOwnerR1(pack),addedRowIds:string[]=[],addedParameterIds:string[]=[],dispositions:Record<string,unknown>[]=[];
 for(const row of result.resources){row.inclusion_ast=row.inclusion_ast?{kind:'and',operands:[row.inclusion_ast,guards.legacy]}:guards.legacy;
  row.source_metadata={...row.source_metadata,sourcePinnedRoofLegacyAlternative:{contract:pack.contract,selectedExactBranch:guards.selected,explicitLegacyBranch:guards.legacy,legacyIdentityAndFormulaPreserved:true}};
  const{row_sha256:_sha,...body}=row;row.row_sha256=hash(body);}
 let po=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1,ro=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 for(const p of shared.parameters){if(p.parameter_id==='q'){
   const original=result.parameters.find(x=>x.parameter_id==='q');if(!original)throw Error('ROOF_NORM_Q_MISSING');
   // Replace authority metadata as well as the displayed default. Historical
   // approvedTemplateBinding and baseline values belong only to the parent.
   Object.assign(original,p,{ordinal:original.ordinal});
  }else{if(result.parameters.some(x=>x.parameter_id===p.parameter_id))throw Error('ROOF_NORM_PARAMETER_COLLISION');result.parameters.push({...p,ordinal:po++});addedParameterIds.push(p.parameter_id);}}
 const add=(definition:typeof shared,unresolved=false)=>{result.formulas.push(...definition.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
  for(const r of definition.resources){if(result.resources.some(x=>x.row_id===r.row_id))throw Error('ROOF_NORM_RESOURCE_COLLISION');const{row_sha256:_sha,...body}=r;
   const final={...body,ordinal:ro++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,cost_owner_id:catalogId+':'+r.cost_owner_id,
    source_metadata:{...r.source_metadata,...(unresolved?{sourceNormQuantityAccepted:false,sourceRole:'UNRESOLVED_ROOF_SCOPE_REMAINDER',full_technical_acceptance:false,numericQuantityNotAdmitted:true}:{})}};
   result.resources.push({...final,row_sha256:hash(final)});addedRowIds.push(final.row_id);
   result.bindings.push({row_id:final.row_id,locator_id:locators.roof,applicability:{contract:pack.contract,normId:pack.normId,selectedBranch:guards.selected,numericQuantityAdmitted:!unresolved&&final.source_metadata.sourceNormQuantityAccepted===true,completeTechnicalEstimateAccepted:false}});
  }};
 add(shared);
 const residualSpecs:AutomaticRowSpec[]=[],residualParameters:{id:string;title:string;valueType:'decimal';unitId:string;kind:'conditional';min:number}[]=[];
 for(const old of parent.resources){const suffix=old.row_id.slice(target.rowIdPrefix.length),d=pack.legacyDisposition[suffix];if(!d)throw Error('ROOF_NORM_DISPOSITION_MISSING:'+suffix);
  const entry={oldRowId:old.row_id,oldResourceSpecId:old.id,oldCostOwnerId:old.cost_owner_id,oldUnitId:old.unit_id,oldFormulaId:old.formula_id,...d};
  if(d.disposition==='REPLACED_BY_EXACT_NORM'){dispositions.push({...entry,residualRowId:null});continue;}
  const id=pack.prefix+':remaining:'+suffix,parameterId='roof_open_'+suffix,title=d.residualTitleRu??('Требует проверки в проекте — '+old.title_ru);
  residualParameters.push({id:parameterId,title,valueType:'decimal',unitId:old.unit_id,kind:'conditional',min:0});
  residualSpecs.push({rowId:id,formulaId:pack.prefix+':formula:remaining:'+suffix,title,unitId:old.unit_id,category:old.row_type,section:'Непокрытые и проектные подработы кровли',expression:parameterId,inclusion:guards.selected,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'});
  dispositions.push({...entry,residualRowId:id,residualParameterId:parameterId});
 }
 const scopeId='roof_open_scope_pending',scopeRowId=pack.prefix+':remaining:scope_pending',scopeReason='Выбор и проверка нормативного состава кровли ещё не завершены. Неизвестная система не включает прежние количества. Прежний общий состав сохраняется только при явном выборе и требует проверки норм.';
 residualParameters.push({id:scopeId,title:'Выбор и проверка состава кровли ещё не завершены',valueType:'decimal',unitId:'set',kind:'conditional',min:0});
 residualSpecs.push({rowId:scopeRowId,formulaId:pack.prefix+':formula:remaining:scope_pending',title:'Выбор и проверка состава кровли ещё не завершены',unitId:'set',category:'service',section:'Проверка выбранного состава',expression:scopeId,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'});
 const residual=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix+':remaining',sourceId:source.id,normId:pack.contract+':roof',
  sourceMetadata:{source_title:source.titleRu,source_document_version:source.printedEdition,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locators},applicabilityRu:pack.scopeRu,
  ordinary:[],profile:[],conditional:residualParameters,rows:residualSpecs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remainingScopeRu});
 const guarded={...residual,parameters:residual.parameters.map(p=>{const d=dispositions.find(d=>d.residualParameterId===p.parameter_id),reason=p.parameter_id===scopeId?scopeReason:String(d!.reasonRu),truth=unresolvedApplicationNormTruthR1(p.truth_metadata,reason);
  return{...p,default_value:null,truth_metadata:{...truth,guide:{...truth.guide as object,guide_short_ru:reason+' Применимость, единицу и количество проверяет приложение по источнику; вводить норму вручную не требуется.',
   verified_at:source.reviewedAt,source_id:source.id,source_title:source.titleRu,source_document_version:source.printedEdition,source_sha256:source.sha256,source_snapshot_hash:source.sha256,source_artifact_sha256:source.sha256,definition_hash:source.sha256,artifact_sha256:source.sha256,source_locator:source.locators,exact_locator:source.locators,
   supporting_sources:pack.sources.filter(s=>s.kind!=='roof').map(s=>({source_id:s.id,source_title:s.titleRu,source_sha256:s.sha256,source_locator:s.locators,verified_at:s.reviewedAt}))}}};}),
  resources:residual.resources.map(r=>{const d=dispositions.find(d=>d.residualRowId===r.row_id),pending=r.row_id===scopeRowId,reason=pending?scopeReason:String(d!.reasonRu);
   return{...r,...(pending?{inclusion_ast:{kind:'not',operand:guards.selected}}:{}),source_metadata:{...r.source_metadata,normativeTrace:[],originalObligationLineage:d??{legacyQuantityNormsUnaccepted:true}},
    resource_graph:{...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,detailsRu:[reason,'Неустановленная потребность не является дополнительной автоматической оплатой.']}}};})};
 for(const p of guarded.parameters){result.parameters.push({...p,ordinal:po++});addedParameterIds.push(p.parameter_id);}add(guarded,true);
 result.baseline.input_values={[pack.systemParameterId]:pack.unknownChoiceRu};result.baseline.input_classification={[pack.systemParameterId]:'VALIDATION_FIXTURE'};
 const consumers=buildMasterParameterCalculationConsumers(result);for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.normative_source_ids[id]=[pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 const unresolvedResourceRowIds=guarded.resources.map(r=>r.row_id),paid=pack.rates.filter(r=>r.costTreatment==='OWN_COST');
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',preliminaryCompositionOnly:true,technicalScopeStatus:'NEEDS_SOURCE',unresolvedResourceRowIds,legacyQuantityNormsUnaccepted:true,priceState:'PARTIAL_NEEDS_PRICE',completeTechnicalEstimateAccepted:false,activationAllowed:false,productionEligible:false,
  newPhysicalNormConsumers:paid.length,workerNormConsumers:paid.filter(r=>r.category==='labor').length,machineNormConsumers:paid.filter(r=>r.category==='equipment').length,materialNormConsumers:paid.filter(r=>r.category==='material').length,wholeRoofGroupComplete:false,legacyOwnerDisposition:dispositions,legacyAlternativeCapabilityMatrix:parent.passport.capability_matrix};
 result.passport.capability_matrix=[{capability:'PARAMETERS',status:'GREEN'},{capability:'FORMULAS',status:'GREEN',scope:'CONDITIONAL_KRER_ROOF_NORMS'},
  {capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds},{capability:'PRICE_AND_PROCUREMENT',status:'PARTIAL_NEEDS_PRICE',procurementOwnerAccepted:false}];
 result.passport.included_scope_ru=[pack.scopeRu,'Остальные подработы и закупка ещё не подтверждены этим нормативным составом.'];result.passport.excluded_scope_ru=pack.remainingScopeRu;
 result.passport.physical_result_ru=pack.scopeRu+' Полная смета и остальные подработы не завершены.';
 result.definition.passport={...result.definition.passport,rowCount:result.resources.length,sourcePinnedRoofContract:pack.contract,fullTechnicalEstimateAccepted:false,legacyAlternativePassport:parent.definition.passport,legacyAlternativeBaselineNormativeSourceIds:parent.baseline.normative_source_ids,
  sourcePack:{contract:pack.contract,sourceQuality:'PARTIAL_CONDITIONAL_KRER_ROOF_NORMS',sourceIds:pack.sources.map(s=>s.id),legacySourcePack:parent.definition.passport.sourcePack},physicalResultRu:result.passport.physical_result_ru,workDescription:{...result.definition.passport.workDescription,scopeSummary:result.passport.physical_result_ru}};
 result.definition.applicability={...result.definition.applicability,legacyAlternativeApplicability:parent.definition.applicability,physicalResultRu:result.passport.physical_result_ru,includedScopeRu:result.passport.included_scope_ru,excludedScopeRu:pack.remainingScopeRu,sourcePinnedRoofSelectedBranch:guards.selected};
 return{representative:result,ownerDisposition:dispositions,legacyRowIds:parent.resources.map(r=>r.row_id),addedRowIds,addedParameterIds,newPhysicalNormClosureCount:paid.length,newWorkerNormClosureCount:paid.filter(r=>r.category==='labor').length,newMachineNormClosureCount:paid.filter(r=>r.category==='equipment').length,newMaterialNormClosureCount:paid.filter(r=>r.category==='material').length};
}
