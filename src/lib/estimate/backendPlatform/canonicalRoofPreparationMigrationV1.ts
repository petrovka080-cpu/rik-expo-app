import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {compileFormulaGraph} from './formulaGraph';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1} from './canonicalRoofPlannedPreparationV1';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';

type Json=Record<string,unknown>;
export type RoofPreparationMigrationModelV1={resources:readonly Json[];formulas:readonly Json[];parameters:readonly Json[]};
export type RoofPreparationDefinitionIdentityV1={id:string;catalogId:string;sha256:string};
export type RoofPreparationMigrationProofV1={
 contractVersion:'canonical-roof-preparation-migration-proof/v1';
 fromDefinitionId:string;toDefinitionId:string;catalogId:string;
 fromDefinitionSha256:string;toDefinitionSha256:string;
 fromSemanticSha256:string;toSemanticSha256:string;
 sourceSha256:string;preservedRowIds:string[];
};
export function readRoofPreparationMigrationProofV1(value:unknown):RoofPreparationMigrationProofV1|null {
 const p=record(value),uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
 return p.contractVersion==='canonical-roof-preparation-migration-proof/v1'&&catalogs.has(String(p.catalogId))
  &&uuid.test(String(p.fromDefinitionId))&&uuid.test(String(p.toDefinitionId))&&p.fromDefinitionId!==p.toDefinitionId
  &&['fromDefinitionSha256','toDefinitionSha256','fromSemanticSha256','toSemanticSha256'].every(k=>/^[0-9a-f]{64}$/u.test(String(p[k])))
  &&p.sourceSha256===sourceSha&&Array.isArray(p.preservedRowIds)&&p.preservedRowIds.length===128
  &&p.preservedRowIds.every(id=>typeof id==='string')&&new Set(p.preservedRowIds).size===128?p as RoofPreparationMigrationProofV1:null;
}
const record=(v:unknown):Json=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const same=(a:unknown,b:unknown)=>canonicalEstimateStableJson(a)===canonicalEstimateStableJson(b);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const oldCondition='Основание принято и огрунтовано; высота до 15 м; обычные условия нового строительства';
const conditionId='roof_torch_conditions',fieldPrefix='roof:torch-two:krer12-002-09',primerPrefix='roof:prime-ready-emulsion:krer12-016-02';
const sourceSha='114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8';
const catalogs=new Set(['technical_room','wet_zone'].map(s=>'canonical-work:base:roofing_interior_flat_roof_install_'+s));
export function extendRoofPlannedPreparationConditionV1(ast:unknown):unknown {
 const replace=(value:unknown):unknown=>Array.isArray(value)?value.map(replace):value&&typeof value==='object'
  ? Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='value'&&record(value).parameterId===conditionId&&child===oldCondition?ROOF_PLANNED_PRIMER_CONDITIONS_V1:replace(child)])):value;
 const planned=replace(ast);return same(ast,planned)?ast:{kind:'or',operands:[ast,planned]};
}
const pick=(value:Json,keys:readonly string[])=>Object.fromEntries(keys.map(key=>[key,value[key]??null]));
/** Definition identity and these complete semantic inputs are bound by the
 * governed publisher; storage IDs/ordinal shifts are not physical semantics. */
export function roofPreparationMigrationSemanticHashV1(model:RoofPreparationMigrationModelV1):string {
 return hash({
  resources:model.resources.map(r=>pick(r,['row_id','formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','inclusion_ast','resource_graph','source_metadata'])).sort((a,b)=>String(a.row_id).localeCompare(String(b.row_id),'en')),
  formulas:model.formulas.map(f=>pick(f,['formula_id','ast','input_parameter_ids','output_unit_id'])).sort((a,b)=>String(a.formula_id).localeCompare(String(b.formula_id),'en')),
  parameters:model.parameters.map(p=>({...pick(p,['parameter_id','value_type','unit_id','required','default_value','constraints_json']),
   authority:pick(record(p.truth_metadata),['semantic_parameter_key','visibility_role','value_source_role','source_confirmation_required','effective_resource_quantity_v1'])})).sort((a,b)=>String(record(a).parameter_id).localeCompare(String(record(b).parameter_id),'en')),
 });
}
export function buildRoofPreparationMigrationProofV1(input:{
 fromDefinition:RoofPreparationDefinitionIdentityV1;toDefinition:RoofPreparationDefinitionIdentityV1;
 from:RoofPreparationMigrationModelV1;to:RoofPreparationMigrationModelV1;
}):RoofPreparationMigrationProofV1 {
 return {contractVersion:'canonical-roof-preparation-migration-proof/v1',fromDefinitionId:input.fromDefinition.id,toDefinitionId:input.toDefinition.id,
  catalogId:input.toDefinition.catalogId,fromDefinitionSha256:input.fromDefinition.sha256,toDefinitionSha256:input.toDefinition.sha256,
  fromSemanticSha256:roofPreparationMigrationSemanticHashV1(input.from),toSemanticSha256:roofPreparationMigrationSemanticHashV1(input.to),
  sourceSha256:sourceSha,preservedRowIds:input.from.resources.map(r=>String(r.row_id)).sort()};
}
/** A failed proof gives no exception to the existing strict migration guard. */
export function admitRoofPreparationMigrationProofV1(input:{
 proof:unknown;fromDefinition:RoofPreparationDefinitionIdentityV1;toDefinition:RoofPreparationDefinitionIdentityV1;
 from:RoofPreparationMigrationModelV1;to:RoofPreparationMigrationModelV1;
}):{proof:RoofPreparationMigrationProofV1;normalizedTo:RoofPreparationMigrationModelV1;semanticPrimerRowId:string;primerOperationKey:string}|null {
 const p=record(input.proof),from=input.from,to=input.to;
 const sha=/^[0-9a-f]{64}$/u,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
 if(!uuid.test(String(p.fromDefinitionId))||!uuid.test(String(p.toDefinitionId))||p.fromDefinitionId===p.toDefinitionId
  ||['fromDefinitionSha256','toDefinitionSha256','fromSemanticSha256','toSemanticSha256','sourceSha256'].some(key=>!sha.test(String(p[key])))
  ||p.contractVersion!=='canonical-roof-preparation-migration-proof/v1'||!catalogs.has(String(p.catalogId))
  ||p.catalogId!==input.fromDefinition.catalogId||p.catalogId!==input.toDefinition.catalogId
  ||p.fromDefinitionId!==input.fromDefinition.id||p.toDefinitionId!==input.toDefinition.id
  ||p.fromDefinitionSha256!==input.fromDefinition.sha256||p.toDefinitionSha256!==input.toDefinition.sha256
  ||p.sourceSha256!==sourceSha||p.fromSemanticSha256!==roofPreparationMigrationSemanticHashV1(from)
  ||p.toSemanticSha256!==roofPreparationMigrationSemanticHashV1(to)
  ||!same(p.preservedRowIds,from.resources.map(r=>String(r.row_id)).sort())
  ||from.resources.length!==128||to.resources.length!==131||from.parameters.length!==to.parameters.length
  ||new Set(to.resources.map(r=>r.row_id)).size!==131)return null;
 const oldRows=new Map(from.resources.map(r=>[String(r.row_id),r])),newRows=new Map(to.resources.map(r=>[String(r.row_id),r]));
 const oldFormulas=new Map(from.formulas.map(f=>[String(f.formula_id),f])),newFormulas=new Map(to.formulas.map(f=>[String(f.formula_id),f]));
 if([...oldFormulas].some(([id,f])=>!same(pick(f,['ast','input_parameter_ids','output_unit_id']),pick(newFormulas.get(id)??{},['ast','input_parameter_ids','output_unit_id']))))return null;
 const oldParameters=new Map(from.parameters.map(v=>[String(v.parameter_id),v]));
 for(const next of to.parameters) {
  const before=oldParameters.get(String(next.parameter_id));if(!before)return null;
  const oldConstraint=record(before.constraints_json),newConstraint=record(next.constraints_json);
  const expectedConstraint=next.parameter_id===conditionId&&Array.isArray(oldConstraint.values)
   ? {...oldConstraint,values:[...oldConstraint.values,ROOF_PLANNED_PRIMER_CONDITIONS_V1]}:oldConstraint;
  if(!same(newConstraint,expectedConstraint)||!same(pick(before,['value_type','unit_id','required','default_value']),pick(next,['value_type','unit_id','required','default_value']))
   ||!same(pick(record(before.truth_metadata),['semantic_parameter_key','visibility_role','value_source_role','source_confirmation_required']),
     pick(record(next.truth_metadata),['semantic_parameter_key','visibility_role','value_source_role','source_confirmation_required'])))return null;
 }
 const semanticPrimerRowId=fieldPrefix+':source-gap:primer',newPrimerIds=['workers','flatbed_truck','ready_bitumen_emulsion'].map(role=>primerPrefix+':'+role);
 for(const [id,before]of oldRows) {
  const next=newRows.get(id);if(!next)return null;
  if(!same(pick(before,['formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','source_metadata']),
    pick(next,['formula_id','unit_id','category','row_type','semantic_owner','cost_owner_id','procurement_eligible','source_metadata']))
   ||!same(next.inclusion_ast,extendRoofPlannedPreparationConditionV1(before.inclusion_ast)))return null;
  const oldGraph=record(before.resource_graph),newGraph=record(next.resource_graph),oldScope=record(oldGraph.scopeRequirementV1),newScope=record(newGraph.scopeRequirementV1);
  if(!same({...oldGraph,scopeRequirementV1:null},{...newGraph,scopeRequirementV1:null}))return null;
  if(oldGraph.scopeRequirementV1!=null) {
   const expected={...oldScope,exactScopeWhen:extendRoofPlannedPreparationConditionV1(oldScope.exactScopeWhen),
    ...(oldScope.satisfiedWhen!=null&&oldScope.groupId!=='primer'?{satisfiedWhen:extendRoofPlannedPreparationConditionV1(oldScope.satisfiedWhen)}:{})};
   if(id===semanticPrimerRowId) {
    if(oldScope.kind!=='PROJECT_SCOPE'||newScope.kind!=='INCLUDED'||!same(newScope.coveringRowIds,newPrimerIds)
     ||!same({...newScope,kind:null,coveringRowIds:null,reasonRu:null,sourceEvidence:null},{...expected,kind:null,coveringRowIds:null,reasonRu:null,sourceEvidence:null})
     ||!Array.isArray(newScope.sourceEvidence)||!Array.isArray(oldScope.sourceEvidence)
     ||newScope.sourceEvidence.length!==oldScope.sourceEvidence.length+1
     ||!same(newScope.sourceEvidence.slice(0,-1),oldScope.sourceEvidence)
     ||record(newScope.sourceEvidence.at(-1)).sha256!==sourceSha||!String(record(newScope.sourceEvidence.at(-1)).locator).includes('016-02'))return null;
   } else if(!same(newScope,expected))return null;
  } else if(newGraph.scopeRequirementV1!=null)return null;
 }
 const rates=[['workers','man_hour','2.80','000-1003-2','2.80','1'],['flatbed_truck','machine_hour','0.04','40-0001','0.04','1'],['ready_bitumen_emulsion','kg','45','01-0206-0021','0.045','1000']] as const;
 const ownerIds=new Set<unknown>();
 const priorOwnerIds=new Set(from.resources.map(r=>r.cost_owner_id));
 const plannedInclusion={kind:'and',operands:[
  {kind:'equals',parameterId:'roof_torch_system',value:'Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя'},
  {kind:'equals',parameterId:conditionId,value:ROOF_PLANNED_PRIMER_CONDITIONS_V1},
  {kind:'equals',parameterId:'roof_torch_area_scope',value:'Площадь покрытия по проектному обмеру, отдельные узлы не прибавлены'}]};
 for(const [role,unit,rate,code,sourceRate,conversion]of rates) {
  const r=newRows.get(primerPrefix+':'+role),g=record(r?.resource_graph),s=record(r?.source_metadata),f=newFormulas.get(String(r?.formula_id));
  if(!r||r.unit_id!==unit||g.costTreatment!=='OWN_COST'||s.sourceNormQuantityAccepted!==true
   ||String(s.normativeRatePer100M2)!==rate||s.normativeResourceCode!==code||s.sourceNormRatePer100M2!==sourceRate
   ||s.exactUnitConversionFactor!==conversion||!same(r.inclusion_ast,plannedInclusion)
   ||!same(f?.ast,compileFormulaGraph('q/100*'+rate).ast)
   ||f?.output_unit_id!==unit||!same(f?.input_parameter_ids,['q'])
   ||!Array.isArray(s.normativeTrace)||!s.normativeTrace.some(e=>record(e).sourceSnapshotHash===sourceSha&&String(record(e).sourceLocator).includes('016-02'))
   ||record(g.operationCompositionV1).groupId!==primerPrefix||record(g.operationCompositionV1).operationId!==primerPrefix+':installation'
   ||r.cost_owner_id==null||ownerIds.has(r.cost_owner_id)||priorOwnerIds.has(r.cost_owner_id))return null;
  const policy=record(g.derivedQuantityEditPolicyV1);
  if(r.row_type!==r.category||r.procurement_eligible!==false||policy.mode!=='PARAMETERS_ONLY'
   ||policy.unitId!==unit||!same(policy.parameterIds,['q'])||s.full_technical_acceptance!==false
   ||s.sourceHistoricalPrintedPriceNotAdmitted!==true||s.physicalNormNotActualRentalOrPurchase!==true
   ||g.operationQuantityContributionsV1!=null||g.scopeRequirementV1!=null)return null;
  ownerIds.add(r.cost_owner_id);
 }
 if(to.resources.some(r=>!oldRows.has(String(r.row_id))&&!newPrimerIds.includes(String(r.row_id)))
  ||to.formulas.length!==from.formulas.length+3)return null;
 return {proof:p as RoofPreparationMigrationProofV1,normalizedTo:{...to,parameters:from.parameters,
  resources:to.resources.map(r=>oldRows.has(String(r.row_id))?oldRows.get(String(r.row_id))!:r)},
  semanticPrimerRowId,primerOperationKey:JSON.stringify([primerPrefix,primerPrefix+':installation'])};
}

/** A previous explicit exclusion of the informational primer stage must also
 * exclude its newly source-bound paid resources. Other exclusions are retained;
 * an explicit restoration removes the old row and therefore restores the stage. */
export function migrateRoofPreparationSelectionV1(input:{selection:unknown;admitted:NonNullable<ReturnType<typeof admitRoofPreparationMigrationProofV1>>}) {
 const selection=parseCanonicalCompositionSelectionV1(input.selection);
 if(!selection||!selection.excludedRowIds.includes(input.admitted.semanticPrimerRowId))return selection;
 return parseCanonicalCompositionSelectionV1({...selection,excludedOperationKeys:[...new Set([
  ...selection.excludedOperationKeys,input.admitted.primerOperationKey,
 ])]});
}
/** Restore either public representation of the transferred exclusion atomically.
 * The immutable migration receipt binds the pair to this exact definition. */
export function roofPreparationRestoreTargetsV1(input:{proof:unknown;definitionId:unknown;catalogId:unknown;rowIds:readonly string[];operationKeys:readonly string[]}) {
 const proof=readRoofPreparationMigrationProofV1(input.proof),rowId=fieldPrefix+':source-gap:primer',operationKey=JSON.stringify([primerPrefix,primerPrefix+':installation']);
 if(!proof||proof.toDefinitionId!==input.definitionId||proof.catalogId!==input.catalogId
  ||(!input.rowIds.includes(rowId)&&!input.operationKeys.includes(operationKey)))return {rowIds:[...input.rowIds],operationKeys:[...input.operationKeys]};
 return {rowIds:[...new Set([...input.rowIds,rowId])],operationKeys:[...new Set([...input.operationKeys,operationKey])]};
}
