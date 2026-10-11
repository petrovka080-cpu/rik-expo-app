import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ct54ReadyFacadeDefinitionS2763,ct54ReadyFacadePackS2763 as pack,ct54ReadyFacadeExactS2763 as exact,ct54ReadyFacadeLegacyS2763 as legacy,ct54ReadyFacadePrefixS2763 as prefix} from '../../../src/lib/estimate/v4/ct54ReadyFacadeSeriesS2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2763_CT54_FACADE_SIX_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,pack.oldDispositionMap.flatMap(d=>d.actualLegacyRows.filter(r=>r.catalogId===t.catalogId).map(r=>r.rowId))]));
export function overlayS2763Ct54FacadeSix(parent:PurchaseGroupRepresentative,locators:{manufacturer:string;krer:string}){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.resources.length!==59||parent.formulas.length!==59||parent.parameters.length!==1)throw Error('CT54_SIX_EXACT_PARENT_DRIFT');
 const result=structuredClone(parent),shared=ct54ReadyFacadeDefinitionS2763();
 const dispositions=pack.oldDispositionMap.map(d=>{
  const lineage=d.actualLegacyRows.find(r=>r.catalogId===catalogId)!,row=result.resources.find(r=>r.row_id===lineage.rowId),formula=result.formulas.find(f=>f.formula_id===lineage.formulaId);
  if(!row||row.id!==lineage.resourceSpecId||row.cost_owner_id!==lineage.costOwnerId||row.unit_id!==d.legacyUnit||!formula||formula.expression_source!==d.legacyExpression)throw Error('CT54_SIX_LEGACY_DISPOSITION_DRIFT:'+d.suffix);
  row.inclusion_ast={kind:'and',operands:[row.inclusion_ast,legacy]};
  row.source_metadata={...row.source_metadata,forwardAlternativeDisposition:{contract:pack.contract,suffix:d.suffix,disposition:d.disposition,ruleRu:d.ruleRu,reusedOwnerRows:d.reusedOwnerRows,notRemovedFromHistoricalDefinitions:true,legacyQuantityNotAcceptedAsCt54Norm:true}};
  const{row_sha256:_sha,...body}=row;row.row_sha256=hash(body);
  return {suffix:d.suffix,legacyRowId:row.row_id,legacyCostOwnerId:row.cost_owner_id,disposition:d.disposition,exactOwnerRows:d.reusedOwnerRows,
   ...(pack.inheritedNeeds.some(g=>g.suffix===d.suffix)?{unresolvedOwnerRowId:prefix+':inherited-'+d.suffix}:{}),ruleRu:d.ruleRu};
 });
 if(new Set(dispositions.map(d=>d.legacyRowId)).size!==59)throw Error('CT54_SIX_INCOMPLETE_OWNER_DISPOSITION');
 // q is a new measured contract. Historical template100 survives as a fixture,
 // with no active approvedTemplateBinding or runtime assumption in this schema.
 result.parameters=shared.parameters.map(p=>({...p}));
 const q=result.parameters.find(p=>p.parameter_id==='q')!;
 if(q.default_value!==null||q.truth_metadata.value_source_role!=='USER_MEASURED'||q.truth_metadata.provenance?.approvedTemplateBinding)throw Error('CT54_SIX_Q_RUNTIME_DEFAULT_FORBIDDEN');
 result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
 let rowOrdinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 const newRows=shared.resources.map(r=>{
  if(result.resources.some(old=>old.row_id===r.row_id))throw Error('CT54_SIX_OWNER_COLLISION');
  const inherited=pack.inheritedNeeds.find(g=>r.row_id===prefix+':inherited-'+g.suffix),lineage=inherited?.legacyOwners.find(o=>o.catalogId===catalogId);
  const related=pack.oldDispositionMap.filter(d=>d.reusedOwnerRows.includes(r.row_id)).map(d=>({titleRu:d.titleRu,unitId:d.legacyUnit,legacyExpression:d.legacyExpression,disposition:d.disposition,ruleRu:d.ruleRu,...d.actualLegacyRows.find(o=>o.catalogId===catalogId)!}));
  const publicPresentation=r.resource_graph.publicResourcePresentationV1 as Record<string,unknown>|undefined;
  const residualDetails=r.source_metadata.sourceNormQuantityAccepted===false?related.map(d=>'Осталось подтвердить: '+d.titleRu+'. Требуются состав, обоснованное количество и граница оплаты этой подработы; исходное шаблонное количество не перенесено.'):[];
  const {row_sha256:_sha,...body}=r,final={...body,ordinal:rowOrdinal++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,
   resource_graph:{...r.resource_graph,...(publicPresentation?{publicResourcePresentationV1:{...publicPresentation,detailsRu:[...(publicPresentation.detailsRu as string[]??[]),...residualDetails]}}:{})},
   ...(inherited?{category:parent.resources.find(old=>old.row_id===lineage!.rowId)!.category,row_type:parent.resources.find(old=>old.row_id===lineage!.rowId)!.row_type}:{}),
   source_metadata:{...r.source_metadata,forwardLegacyObligationLineage:related,...(lineage?{inheritedOwnerLineage:lineage,originalUnitId:inherited!.unitId,originalFormulaNotApplied:inherited!.legacyExpression}:{}),full_technical_acceptance:false} as Record<string,unknown>};
  return {...final,row_sha256:hash(final)};
 });
 result.resources.push(...newRows);
 for(const r of newRows)if(r.source_metadata.sourceNormQuantityAccepted===true)result.bindings.push({row_id:r.row_id,locator_id:r.source_metadata.sourceRole==='OFFICIAL_WHOLE_OPERATION_NORM'?locators.krer:locators.manufacturer,
  applicability:{contract:pack.contract,exactBranch:exact,scopeRu:pack.scopeRu,grossAreaIsNotNetArea:true,fullTechnicalAcceptance:false}});
 result.baseline.input_values={q:100,facade_technology_choice:pack.legacyChoiceRu};
 result.baseline.input_classification={q:'VALIDATION_FIXTURE',facade_technology_choice:'VALIDATION_FIXTURE'};
 result.baseline.normative_source_ids={q:[pack.contract+':manufacturer'],facade_norm_area_m2:[pack.contract+':krer'],facade_technology_choice:[]};
 result.baseline.provenance={...result.baseline.provenance,cohortContract:pack.contract,historicalQValueIsFixtureOnly:true,noAutomaticTechnologySelection:true};
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;
  p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:`${catalogId}:${id}`,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
  result.baseline.normative_source_ids[id]??=[];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 const unresolvedIds=result.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id);
 const unresolvedRows=newRows.filter(r=>result.formulas.find(f=>f.formula_id===r.formula_id)!.input_parameter_ids.some((id:string)=>unresolvedIds.includes(id))).map(r=>r.row_id);
 if(unresolvedRows.length!==21)throw Error('CT54_SIX_UNRESOLVED_OWNER_COUNT_DRIFT');
 result.passport.capability_matrix=[{capability:'PARAMETERS',status:'GREEN'},{capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN',scope:'EXACT_READY_CT54_COHORT_ONLY'},
  {capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolvedRows},{capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}];
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',preliminaryCompositionOnly:true,technicalScopeStatus:'NEEDS_SOURCE',unresolvedResourceRowIds:unresolvedRows,materialSourceScopeOnly:true,completeTechnicalEstimateAccepted:false,legacyPreliminarySourcesRemainUnaccepted:true,
  facadeSeriesContract:pack.contract,wholeFacadeGroupComplete:false,physicalNormClosureCount:3,paintConsumptionWasAlreadyPresent:true,ownerDisposition:dispositions,
  activeUnresolvedDefinitionsWithOneTool:20,newPriceOwnersDoNotInheritLegacySquareMetrePrices:true};
 return{representative:result,legacyRowIds:dispositions.map(d=>d.legacyRowId),addedRowIds:newRows.map(r=>r.row_id),addedParameterIds:result.parameters.filter(p=>p.parameter_id!=='q').map(p=>p.parameter_id),
  changedFormulaIds:[],newPayableOwnerRowId:prefix+':labor',physicalNormOwnerRowIds:['labor','winch','truck'].map(id=>prefix+':'+id),ownerDisposition:dispositions};
}
