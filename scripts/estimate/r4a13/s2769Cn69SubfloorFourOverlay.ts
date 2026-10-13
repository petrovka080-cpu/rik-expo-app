import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {cn69SubfloorDefinitionS2769,cn69SubfloorBindingS2769 as pack,cn69SubfloorExactS2769 as exact,cn69SubfloorLegacyS2769 as legacy,cn69SubfloorPrefixS2769 as prefix} from '../../../src/lib/estimate/v4/cn69SubfloorSeriesS2769';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayS2769Cn69SubfloorFour(parent:PurchaseGroupRepresentative,locators:{manufacturer:string;krer:string}){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.definition.definition_sha256!==target.parentSha256||parent.resources.length!==59||parent.formulas.length!==59||parent.parameters.length!==1)throw Error('CN69_FOUR_EXACT_PARENT_DRIFT');
 const result=structuredClone(parent),shared=cn69SubfloorDefinitionS2769();
 const lineageFor=(d:typeof pack.oldDispositionMap[number])=>{const p=d.actualLegacyRows.find(r=>r.catalogId===catalogId);if(!p)throw Error('CN69_MISSING_LEGACY_OWNER:'+d.suffix);return p;};
 const dispositions=pack.oldDispositionMap.map(d=>{const p=lineageFor(d),row=result.resources.find(r=>r.row_id===p.rowId),formula=result.formulas.find(f=>f.formula_id===p.formulaId);
  if(!row||row.id!==p.resourceSpecId||row.cost_owner_id!==p.costOwnerId||row.unit_id!==d.legacyUnit||!formula||formula.expression_source!==d.legacyExpression)throw Error('CN69_LEGACY_DISPOSITION_DRIFT:'+d.suffix);
  row.inclusion_ast={kind:'and',operands:[row.inclusion_ast,legacy]};row.source_metadata={...row.source_metadata,forwardAlternativeDisposition:{contract:pack.contract,suffix:d.suffix,disposition:d.disposition,ruleRu:d.ruleRu,reusedOwnerRows:d.reusedOwnerRows,notRemovedFromHistoricalDefinitions:true,legacyQuantityNotAcceptedAsCn69Norm:true}};
  const{row_sha256:_sha,...body}=row;row.row_sha256=hash(body);
  return{suffix:d.suffix,legacyRowId:p.rowId,legacyCostOwnerId:p.costOwnerId,disposition:d.disposition,exactOwnerRows:d.reusedOwnerRows,ruleRu:d.ruleRu};
 });
 if(new Set(dispositions.map(d=>d.legacyRowId)).size!==59)throw Error('CN69_INCOMPLETE_OWNER_DISPOSITION');
 result.parameters=shared.parameters.map(p=>({...p}));result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
 let ordinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 const newRows=shared.resources.map(r=>{if(result.resources.some(old=>old.row_id===r.row_id))throw Error('CN69_OWNER_COLLISION');
  const related=pack.oldDispositionMap.filter(d=>d.reusedOwnerRows.includes(r.row_id)).map(d=>({...lineageFor(d),titleRu:d.titleRu,unitId:d.legacyUnit,legacyExpression:d.legacyExpression,disposition:d.disposition,ruleRu:d.ruleRu}));
  const presentation=r.resource_graph.publicResourcePresentationV1 as Record<string,unknown>|undefined;
  const extraDetails=r.source_metadata?.sourceNormQuantityAccepted===false?related.map(d=>'Сохранённое обязательство: '+d.titleRu+'. '+d.ruleRu):[];
  const{row_sha256:_sha,...body}=r,content={...body,ordinal:ordinal++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,
   resource_graph:{...r.resource_graph,...(presentation?{publicResourcePresentationV1:{...presentation,detailsRu:[...(presentation.detailsRu as string[]??[]),...extraDetails]}}:{})},
   source_metadata:{...r.source_metadata,forwardLegacyObligationLineage:related,full_technical_acceptance:false} as Record<string,unknown>};
  return{...content,row_sha256:hash(content)};
 });result.resources.push(...newRows);
 for(const r of newRows)if(r.source_metadata.sourceNormQuantityAccepted===true)result.bindings.push({row_id:r.row_id,locator_id:r.row_id.startsWith(prefix+':ct17-')?locators.krer:locators.manufacturer,applicability:{contract:pack.contract,exactBranch:exact,scopeRu:pack.scopeRu,fullTechnicalAcceptance:false}});
 result.baseline.input_values={q:100,subfloor_technology_choice:pack.legacyChoiceRu};result.baseline.input_classification={q:'VALIDATION_FIXTURE',subfloor_technology_choice:'VALIDATION_FIXTURE'};
 result.baseline.normative_source_ids={q:[],subfloor_technology_choice:[]};result.baseline.provenance={...result.baseline.provenance,cohortContract:pack.contract,historicalQValueIsFixtureOnly:true,noAutomaticTechnologySelection:true};
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.normative_source_ids[id]??=[];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 const unresolvedIds=result.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id),unresolvedRows=newRows.filter(r=>result.formulas.find(f=>f.formula_id===r.formula_id)!.input_parameter_ids.some((id:string)=>unresolvedIds.includes(id))).map(r=>r.row_id);
 if(unresolvedRows.length!==22)throw Error('CN69_UNRESOLVED_OWNER_COUNT_DRIFT');
 result.passport.capability_matrix=[{capability:'PARAMETERS',status:'GREEN'},{capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN',scope:'EXACT_CN69_DRY_READY_BASE_ONLY'},{capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolvedRows},{capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}];
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',preliminaryCompositionOnly:true,technicalScopeStatus:'NEEDS_SOURCE',unresolvedResourceRowIds:unresolvedRows,materialSourceScopeOnly:true,completeTechnicalEstimateAccepted:false,legacyPreliminarySourcesRemainUnaccepted:true,
  cn69SeriesContract:pack.contract,wholeFloorGroupComplete:false,physicalNormClosureCount:3,ownerDisposition:dispositions,activeUnresolvedDefinitions:22,newPriceOwnersDoNotInheritLegacySquareMetrePrices:true};
 return{representative:result,legacyRowIds:dispositions.map(d=>d.legacyRowId),addedRowIds:newRows.map(r=>r.row_id),addedParameterIds:result.parameters.filter(p=>p.parameter_id!=='q').map(p=>p.parameter_id),changedFormulaIds:[],newPayableOwnerRowId:prefix+':cn69-order',physicalNormOwnerRowIds:['cn69-consumed','ct17-consumed','water-consumed'].map(k=>prefix+':'+k),ownerDisposition:dispositions};
}
