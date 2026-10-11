import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticRowSpec} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {metalRoofSimpleKrer12PackS2763 as pack,metalRoofSimpleKrer12DefinitionS2763,metalRoofSimpleSelectedGuardS2763,metalRoofSimpleLegacyGuardS2763,metalRoofSimplePrefixS2763 as prefix,metalRoofProtectedResidualTruthS2763} from '../../../src/lib/estimate/v4/metalRoofSimpleKrer12S2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2763_METAL_ROOF_SIMPLE_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(r=>r.rowId)]));

export function overlayS2763MetalRoofSimpleKrer12(parent:PurchaseGroupRepresentative,locators:{roof:string;guidance:string}){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.resources.length!==59)throw Error('METAL_ROOF_EXACT_PARENT_DRIFT');
 for(const old of target.preservedOwners){const row=parent.resources.find(r=>r.row_id===old.rowId);if(!row||row.id!==old.resourceSpecId||row.cost_owner_id!==old.costOwnerId||row.unit_id!==old.unitId||row.formula_id!==old.formulaId)throw Error('METAL_ROOF_OWNER_DRIFT:'+old.rowId);}
 const result=structuredClone(parent),addedRowIds:string[]=[],addedParameterIds:string[]=[],dispositions:Record<string,unknown>[]=[];
 const selected=metalRoofSimpleSelectedGuardS2763;
 // Selection and applicability are different. Missing norm confirmations must
 // never revive the legacy q-based quantities inside the selected alternative.
 for(const row of result.resources){row.inclusion_ast=row.inclusion_ast?{kind:'and',operands:[row.inclusion_ast,metalRoofSimpleLegacyGuardS2763]}:metalRoofSimpleLegacyGuardS2763;
  row.source_metadata={...row.source_metadata,metalRoofLegacyAlternative:{contract:pack.contract,selectedExactBranch:selected,explicitLegacyBranch:metalRoofSimpleLegacyGuardS2763,legacyIdentityAndFormulaPreserved:true}};
  const{row_sha256:_sha,...body}=row;row.row_sha256=hash(body);}
 const shared=metalRoofSimpleKrer12DefinitionS2763();
 let po=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1,ro=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 for(const p of shared.parameters){if(p.parameter_id==='q'){
   const original=result.parameters.find(x=>x.parameter_id==='q');if(!original)throw Error('METAL_ROOF_Q_MISSING');
   const{approvedTemplateBinding:_template,...provenance}=original.truth_metadata.provenance??{};
   Object.assign(original,p,{ordinal:original.ordinal,truth_metadata:{...p.truth_metadata,provenance:{...provenance,...p.truth_metadata.provenance as object,historicalTemplateValueNotMeasurement:true}}});
   delete result.baseline.input_values.q;delete result.baseline.input_classification.q;
  }else{if(result.parameters.some(x=>x.parameter_id===p.parameter_id))throw Error('METAL_ROOF_PARAMETER_COLLISION');result.parameters.push({...p,ordinal:po++});addedParameterIds.push(p.parameter_id);}}
 const addShared=(definition:typeof shared,technicalResidual=false)=>{
  result.formulas.push(...definition.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
  for(const resource of definition.resources){if(result.resources.some(r=>r.row_id===resource.row_id))throw Error('METAL_ROOF_RESOURCE_COLLISION');const{row_sha256:_sha,...body}=resource;
   const final={...body,ordinal:ro++,row_type:resource.category,semantic_owner:catalogId+':'+resource.row_id,cost_owner_id:catalogId+':'+resource.cost_owner_id,
    source_metadata:{...resource.source_metadata,...(technicalResidual?{sourceNormQuantityAccepted:false,sourceRole:'UNRESOLVED_METAL_ROOF_SCOPE_REMAINDER',full_technical_acceptance:false,numericQuantityNotAdmitted:true}:{})}};
   result.resources.push({...final,row_sha256:hash(final)});addedRowIds.push(final.row_id);
   result.bindings.push({row_id:final.row_id,locator_id:locators.roof,applicability:{contract:pack.contract,normId:'12-01-023-01',selectedBranch:selected,numericQuantityAdmitted:!technicalResidual&&!final.row_id.endsWith(':included_machine_operators'),completeTechnicalEstimateAccepted:false}});
  }
 };
 addShared(shared);
 const residualSpecs:AutomaticRowSpec[]=[],residualParameters:{id:string;title:string;valueType:'decimal';unitId:string;kind:'conditional';min:number}[]=[];
 for(const old of parent.resources){const suffix=old.row_id.slice(target.rowIdPrefix.length),disposition=pack.legacyDisposition[suffix as keyof typeof pack.legacyDisposition];
  if(!disposition)throw Error('METAL_ROOF_DISPOSITION_MISSING:'+suffix);
  const entry={oldRowId:old.row_id,oldResourceSpecId:old.id,oldCostOwnerId:old.cost_owner_id,oldUnitId:old.unit_id,oldFormulaId:old.formula_id,...disposition};
  if(disposition.disposition==='REPLACED_BY_EXACT_NORM'){dispositions.push({...entry,residualRowId:null});continue;}
  const parameterId='metal_roof_open_'+suffix,rowId=prefix+':remaining:'+suffix;
  const title=disposition.disposition==='NO_AUTOMATIC_ADDITIONAL_WASTE'?'Дополнительный проектный запас сверх табличного расхода — необходимость и количество требуют проверки':
   disposition.disposition==='READY_SUPPORT_SCOPE_EXCLUDED_WITH_BOUNDARY'?'Конструкции и труд вне готовых принятых прогонов — '+old.title_ru:
   disposition.disposition==='PREREQUISITE_NOT_NEW_QUANTITY'?'Дополнительная проверка основания вне уже принятых прогонов — '+old.title_ru:
   'Вне подтверждённого состава: '+old.title_ru;
  residualParameters.push({id:parameterId,title,valueType:'decimal',unitId:old.unit_id,kind:'conditional',min:0});
  residualSpecs.push({rowId,formulaId:prefix+':formula:remaining:'+suffix,title,unitId:old.unit_id,category:old.row_type,
   section:'Непокрытые и проектные подработы кровли',expression:parameterId,inclusion:selected,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'});
  dispositions.push({...entry,residualRowId:rowId,residualParameterId:parameterId});
 }
 const cutId='metal_roof_open_cutting';
 residualParameters.push({id:cutId,title:'Раскрой металлочерепицы — отдельный состав, единица и количество требуют подтверждения',valueType:'decimal',unitId:'man_hour',kind:'conditional',min:0});
 residualSpecs.push({rowId:prefix+':remaining:cutting',formulaId:prefix+':formula:remaining:cutting',title:'Раскрой металлочерепицы — отдельный состав, единица и количество требуют подтверждения',unitId:'man_hour',category:'labor',section:'Раскрой металлочерепицы',expression:cutId,inclusion:selected,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'});
 const scopePendingId='metal_roof_open_scope_pending';
 residualParameters.push({id:scopePendingId,title:'Выбор и проверка нормативного состава кровли ещё не завершены',valueType:'decimal',unitId:'set',kind:'conditional',min:0});
 residualSpecs.push({rowId:prefix+':remaining:scope_pending',formulaId:prefix+':formula:remaining:scope_pending',title:'Выбор и проверка нормативного состава кровли ещё не завершены',unitId:'set',category:'service',section:'Проверка выбранного состава кровли',expression:scopePendingId,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'});
 const source=pack.sources.find(s=>s.kind==='roof')!,guidance=pack.sources.find(s=>s.kind==='guidance')!;
 const residual=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix+':remaining',sourceId:source.id,normId:pack.contract+':roof',
  sourceMetadata:{source_title:source.titleRu,source_document_version:source.printedEdition,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locators},applicabilityRu:pack.scopeRu,
  ordinary:[],profile:[],conditional:residualParameters,rows:residualSpecs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remainingScopeRu});
 const scopePendingReason='Система ещё не проверена либо явно выбран прежний общий состав. Нормы прежнего состава не подтверждаются автоматически. Выберите подтверждённую систему и проверьте условия; неизвестный выбор не включает прежние количества и цены.';
 const guardedResidual={...residual,parameters:residual.parameters.map(p=>{const disposition=dispositions.find(d=>d.residualParameterId===p.parameter_id);const reason=p.parameter_id===scopePendingId?scopePendingReason:String(disposition?.reasonRu??pack.remainingScopeRu[0]);
  const truth=metalRoofProtectedResidualTruthS2763(p.truth_metadata,reason);
  return{...p,default_value:null,truth_metadata:{...truth,guide:{...truth.guide as object,
   guide_short_ru:reason+' Количество и единицу проверяет приложение по источнику; ручной ввод нормы здесь не требуется.',
   verified_at:source.reviewedAt,source_id:source.id,source_title:source.titleRu,source_document_version:source.printedEdition,
   source_sha256:source.sha256,source_artifact_sha256:source.sha256,source_snapshot_hash:source.sha256,definition_hash:source.sha256,artifact_sha256:source.sha256,
   source_locator:source.locators,exact_locator:source.locators,supporting_sources:[{source_id:guidance.id,source_title:guidance.titleRu,source_sha256:guidance.sha256,source_locator:guidance.locators,verified_at:guidance.reviewedAt}]}}};}),
  resources:residual.resources.map(r=>{const disposition=dispositions.find(d=>d.residualRowId===r.row_id),scopePending=r.row_id.endsWith(':scope_pending');const reason=scopePending?scopePendingReason:String(disposition?.reasonRu??pack.remainingScopeRu[0]);
   return{...r,...(scopePending?{inclusion_ast:{kind:'not',operand:selected}}:{}),source_metadata:{...r.source_metadata,normativeTrace:[],sourceNormQuantityAccepted:false,originalObligationLineage:disposition??(scopePending?{legacyQuantityNormsUnaccepted:true}:{sourceClause:'КРЕР12 §1.9',quantityAndUnitNeedPrimaryCuttingSource:true})},
    resource_graph:{...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,detailsRu:[reason,'Количество, применимость, единица и самостоятельная цена не подтверждены. Это не дополнительная автоматическая оплата.']}}};})};
 for(const p of guardedResidual.parameters){result.parameters.push({...p,ordinal:po++});addedParameterIds.push(p.parameter_id);}
 addShared(guardedResidual,true);
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  result.baseline.normative_source_ids[id]=[pack.contract+':roof'];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 const unresolvedResourceRowIds=guardedResidual.resources.map(r=>r.row_id);
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',preliminaryCompositionOnly:true,technicalScopeStatus:'NEEDS_SOURCE',unresolvedResourceRowIds,
  legacyQuantityNormsUnaccepted:true,priceState:'PARTIAL_NEEDS_PRICE',completeTechnicalEstimateAccepted:false,activationAllowed:false,productionEligible:false,
  workerNormConsumers:1,machineNormConsumers:4,materialNormConsumers:4,newPhysicalNormConsumers:9,operatorInformationalConsumers:1,wholeRoofGroupComplete:false,legacyOwnerDisposition:dispositions};
 if(!result.passport.capability_matrix.some((entry:Record<string,unknown>)=>entry.capability==='FULL_APPLICABLE_SCOPE'))result.passport.capability_matrix.push({capability:'FULL_APPLICABLE_SCOPE'});
 result.passport.capability_matrix=result.passport.capability_matrix.map((entry:Record<string,unknown>)=>entry.capability==='FULL_APPLICABLE_SCOPE'
  ?{...entry,status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds}:entry.capability==='PRICE_AND_PROCUREMENT'
  ?{...entry,status:'PARTIAL_NEEDS_PRICE',procurementOwnerAccepted:false}:entry);
 result.passport.included_scope_ru=[pack.scopeRu,'Раскрой, проектные дополнительные элементы и непокрытые остатки не подтверждены этим нормативным составом.'];
 result.passport.physical_result_ru='Условный нормативный состав укладки и крепления металлочерепицы по готовым принятым прогонам. Полная смета, закупка и остальные подработы не завершены.';
 result.definition.passport={...result.definition.passport,rowCount:result.resources.length,metalRoofSimpleContract:pack.contract,fullTechnicalEstimateAccepted:false,
  legacyAlternativePassport:parent.definition.passport,legacyAlternativeBaselineNormativeSourceIds:parent.baseline.normative_source_ids,
  sourcePack:{contract:pack.contract,sourceQuality:'PARTIAL_CONDITIONAL_KRER_METAL_ROOF_NORMS',sourceIds:pack.sources.map(s=>s.id),legacySourcePack:parent.definition.passport.sourcePack},
  physicalResultRu:result.passport.physical_result_ru,
  workDescription:{...result.definition.passport.workDescription,scopeSummary:pack.scopeRu+' Полный технический состав пока не завершён.'}};
 result.definition.applicability={...result.definition.applicability,legacyAlternativeApplicability:parent.definition.applicability,
  physicalResultRu:result.passport.physical_result_ru,includedScopeRu:result.passport.included_scope_ru,excludedScopeRu:pack.remainingScopeRu,metalRoofNormSelectedBranch:selected,metalRoofNormScopeRu:pack.scopeRu};
 return{representative:result,ownerDisposition:dispositions,legacyRowIds:parent.resources.map(r=>r.row_id),addedRowIds,addedParameterIds,newPhysicalNormClosureCount:9,newWorkerNormClosureCount:1,newMachineNormClosureCount:4,newMaterialNormClosureCount:4};
}
