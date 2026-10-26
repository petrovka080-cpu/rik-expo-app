import assert from 'node:assert/strict';
import one from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-native00402-r24.json';
import two from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-two-aprons-native00403-r24.json';
import physical from '../../../data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-existing-owner-map00402-r24.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from '../../../src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as digest} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1';
import independent from '../../../data/estimate-benchmarks/source-packs/roof-wall0040203-independent-whole-map-r24.json';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from './catalogFirstEstimateMinimumInputAudit.shared';
import type {PrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import type {MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Json=Record<string,unknown>;
const object=(x:unknown):x is Json=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export const roofParapet004TechnicalContractR294='roof-existing-technical-parapet-whole00402-03/r294';
export const roofParapet004TechnicalIdsR294={method:'roof_parapet004_public_method_r294',length:'roof_parapet004_length_m_r294',height:'roof_parapet004_height_mm_r294',
 legacy:'Прежний состав герметизации парапета',one:one.systemYesRu,two:two.systemYesRu};
const ids=roofParapet004TechnicalIdsR294;
const eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
const anyNew={kind:'or',operands:[eq(ids.method,ids.one),eq(ids.method,ids.two)]};
const hash=(v:unknown)=>digest(stable(v));
type Row=AutomaticOwnerDefinition['resources'][number];
const rehash=(row:Row):Row=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};

/** Existing technical-room consumer only. Shared quantities are logical
 * requirements from the sealed whole map, never assertions of DB stock. */
export function buildRoofParapet004TechnicalWholeR294(input:Readonly<{
 capture:MasterRetainedParentCaptureR1;native:AutomaticOwnerDefinition;sourceKey:string;
}>){const c=input.capture,base=input.native;
 assert.equal(c.definition.catalog_id,'canonical-work:base:roofing_interior_parapet_seal_technical_room');
 assert.equal(c.definition.id,'f1b74df3-b99f-5ebb-a9e7-68fcfb51ab36');assert.equal(c.definition.definition_version,3);
 assert.equal(c.definition.definition_sha256,'c88a114dc3d8825441fad6a16a1e6e7e6d0cf8f8a6bca99e939d011e90720b78');
 assert.deepEqual([base.parameters.length,base.formulas.length,base.resources.length],[1,59,59]);
 assert(input.sourceKey.trim(),'ROOT_SELECTED_NEW004_SOURCE_KEY_REQUIRED_NO_DEFAULT');
 assert.equal(one.measurementUnitId,'linear_m');assert.equal(two.measurementUnitId,'linear_m');
 const first=one.sources[0],second=two.sources[0];assert(first&&second&&first.sha256===physical.artifactSha256&&second.sha256===first.sha256);
 const controller=buildAutomaticConstructionOwnerR1({contract:roofParapet004TechnicalContractR294,semanticOwner:'roof-parapet004:technical',sourceId:input.sourceKey,normId:'004_CONTROLLER_NOT_NORM',
  sourceMetadata:{artifact_sha256:first.sha256,source_title:first.titleRu,exact_locator:first.locators},applicabilityRu:'Только прежний технический профиль парапета; собственный обмер узла004.',
  ordinary:[{id:ids.method,title:'Способ герметизации примыкания',valueType:'enum',unitId:null,kind:'ordinary',values:[ids.legacy,ids.one,ids.two]},
   {id:ids.length,title:'Измеренная длина примыкания',valueType:'decimal',unitId:'linear_m',kind:'ordinary',min:0},
   {id:ids.height,title:'Измеренная высота примыкания',valueType:'decimal',unitId:'mm',kind:'ordinary',min:0}],profile:[],conditional:[],rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:one.remainingScopeRu});
 const routes:Readonly<Record<string,readonly string[]>>=physical.nativeOperationKeys;
 function native(p:typeof one|typeof two){const pack:SourcePinnedRoofNormPackR1={...p,systemParameterId:ids.method,measurementParameterId:ids.length,measurementUnitId:'linear_m',
   sources:p.sources.map(s=>({...s,id:input.sourceKey})),rates:p.rates.map(r=>{assert(r.costTreatment==='OWN_COST'||r.costTreatment==='INFORMATIONAL_SCOPE');
    return{...r,costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST':'INFORMATIONAL_SCOPE'};})};
  const d=sourcePinnedRoofNormOwnerR1(pack);
  const parameters=d.parameters.filter(x=>x.parameter_id!==ids.method&&x.parameter_id!==ids.length).map(x=>({...x,required:false,default_value:null,
   truth_metadata:{...x.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
    provenance:{...(object(x.truth_metadata.provenance)?x.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'}}}));
  const resources=d.resources.map(r=>{const rate=p.rates.find(x=>r.row_id===p.prefix+':'+x.role);assert(rate);
   const operationKeys=routes[rate.role];assert(operationKeys?.length);
   const operations=operationKeys.map(key=>{const o=physical.operations.find(x=>x.key===key);assert(o);return{operationId:p.prefix+':operation:'+key,
    operationTitleRu:o.titleRu,processOrdinal:o.ordinal,completionCriterionRu:p.completionCriterionRu};});
   const graph={...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'roof-parapet004:technical',groupTitleRu:'Примыкание к парапету',
    ...operations[0],...(operations.length>1?{additionalOperations:operations.slice(1)}:{})}};
   return rehash({...r,procurement_eligible:false,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'greater_than',parameterId:ids.height,value:600}]},resource_graph:graph});});
  return{...d,parameters,resources};}
 const a=native(one),b=native(two),methods=[one,two];
 const postRequirements=[...physical.physicalOwners,...physical.newPhysicalOwners];assert.equal(postRequirements.length,22);
 assert.equal(new Set(postRequirements.map(x=>x.rowId)).size,22);
 // Reuse the exact22 logical requirement IDs, including the prior common006
 // powder/sheet IDs. No UUID, kit1 or machine_hour->piece producer is created.
 const post=buildAutomaticConstructionOwnerR1({contract:roofParapet004TechnicalContractR294,semanticOwner:'roof-parapet004:technical:post',sourceId:input.sourceKey,normId:'UNRESOLVED_PHYSICAL_POST_NOT_INSTALLATION_NORM',
  sourceMetadata:{artifact_sha256:first.sha256,source_title:first.titleRu,exact_locator:first.locators},applicabilityRu:'Неизвестное физическое обеспечение общего поста00402/03.',
  ordinary:postRequirements.map((p,i)=>({id:'roof_parapet004_post_need_'+String(i+1).padStart(2,'0')+'_r294',title:p.rowId==='roof:flat003006:r24:need:sheet-cut-bending-kit'?'Инструмент резки и гибки фартуков из листовой стали':p.titleRu,valueType:'decimal',unitId:p.unitId,kind:'ordinary' as const,min:0})),profile:[],conditional:[],
  rows:postRequirements.map((p,i)=>{const treatment='costTreatment'in p?p.costTreatment:undefined;
   assert(treatment===undefined||treatment==='OWN_COST'||treatment==='INFORMATIONAL_SCOPE','EXACT_POST_SOURCE_COST_TREATMENT');return{rowId:p.rowId,section:'Обеспечение и контроль примыкания',category:p.category,title:p.rowId==='roof:flat003006:r24:need:sheet-cut-bending-kit'?'Инструмент резки и гибки фартуков из листовой стали':p.titleRu,unitId:p.unitId,formulaId:p.formulaId,
   expression:'roof_parapet004_post_need_'+String(i+1).padStart(2,'0')+'_r294',procurement:false,...(treatment===undefined?{}:{costTreatment:treatment})};}),
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Количество и наличие поста не нормированы; нужны действительные отдельные сведения склада/оснащения/ППР.']});
 const postParameters=post.parameters.map(p=>({...p,required:false,default_value:null,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Нет подтверждённого producer количества отдельного обеспечения; не вводить kit1/машиночасы как штуки.')}));
 const postRows=post.resources.map(r=>{const p=postRequirements.find(x=>x.rowId===r.row_id);assert(p);
  const operations=methods.flatMap(n=>p.operationKeys.map(key=>{const o=physical.operations.find(x=>x.key===key);assert(o);return{operationId:n.prefix+':operation:'+key,operationTitleRu:o.titleRu,
   processOrdinal:o.ordinal,completionCriterionRu:n.completionCriterionRu,whenResourcePresent:n.rates.map(x=>n.prefix+':'+x.role)};}));assert(operations.length);
  return rehash({...r,inclusion_ast:anyNew,source_metadata:{...r.source_metadata,logicalRequirementOnly:true,actualPhysicalStockOwner:null,sourceNormQuantityAccepted:false,full_technical_acceptance:false},
   resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'roof-parapet004:technical',groupTitleRu:'Примыкание к парапету',
    ...operations[0],additionalOperations:operations.slice(1)}}});});
 const currentRows=base.resources.map(r=>rehash({...r,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'not',operand:anyNew}]}}));
 const parameters=[...base.parameters,...controller.parameters,...a.parameters,...b.parameters,...postParameters].map((p,ordinal)=>{
  if(base.parameters.some(x=>x.parameter_id===p.parameter_id))return p;
  const truth=p.parameter_id===ids.length||p.parameter_id===ids.height?{...p.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'USER_MEASURED',
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'OBJECT_FACT'}}:p.truth_metadata;
  const geometry=p.parameter_id===ids.length||p.parameter_id===ids.height;
  const constraints={...p.constraints_json,...(geometry?{requiredWhen:anyNew}:{}),...(p.parameter_id===ids.method?{forbiddenWhen:{kind:'and',operands:[anyNew,{kind:'less_than_or_equal',parameterId:ids.height,value:600}]}}:{})};
  return{...p,ordinal,required:p.parameter_id===ids.method,default_value:null,constraints_json:constraints,truth_metadata:truth};});
 const formulas=[...base.formulas,...a.formulas,...b.formulas,...post.formulas],resources=[...currentRows,...a.resources,...b.resources,...postRows];
 assert.equal(parameters.length,new Set(parameters.map(p=>p.parameter_id)).size);assert.equal(resources.length,111);
 const allIds=new Set(parameters.map(p=>p.parameter_id));
 for(const row of resources){resolveInclusionGraph(row.inclusion_ast,{});assert(canonicalConditionParameterIds(row.inclusion_ast).every(id=>allIds.has(id)));}
 const primary:PrimaryMeasureSelectionV1={contract:'canonical-primary-measure-selection/v1',selectorParameterId:ids.method,selections:[
  {selectorValue:ids.legacy,primaryMeasureParameterId:'q',unitId:'m2'},...methods.map(p=>({selectorValue:p.systemYesRu,primaryMeasureParameterId:ids.length,unitId:'linear_m'}))]};
 const sourceRows=[...a.resources,...b.resources];
 // Independent requirements come from the already sealed source map/native
 // column roster, never from newly generated rows or a successful result.
 const nativeExpected=independent.entries.filter(e=>e.expectedResourceId.startsWith('wall0040203:one:native:')||e.expectedResourceId.startsWith('wall0040203:two:native:'));
 assert.equal(nativeExpected.length,30);
 const mapEntries=[...nativeExpected.map(e=>({...e,sourceId:input.sourceKey})),...postRequirements.map(p=>{
  const requiredOperationIds=methods.flatMap(n=>p.operationKeys.map(key=>n.prefix+':operation:'+key));assert(requiredOperationIds.length);
  return{expectedResourceId:'parapet004:logical-post:'+p.rowId,operationId:requiredOperationIds[0]!,requiredOperationIds,
   sourceId:'SOURCE_DECLARED_LOGICAL_REQUIREMENT_NOT_ACTUAL_STOCK',category:p.category,unitId:p.unitId,specification:p.titleRu,
   condition:'ONE_UNRESOLVED_POST_FOR00402_OR00403_NOT006_WORK',quantityRule:'NULL_NO_STOCK_OR_RENTAL_QUANTITY_PRODUCER_NO_DEFAULT',
   formulaId:p.formulaId,resolution:{kind:'ROW',rowId:p.rowId}};})];
 const template:unknown=c.definition.source_metadata.templateId,qSources:unknown=c.baseline.normative_source_ids.q;
 assert(typeof template==='string'&&template.trim()&&Array.isArray(qSources)&&qSources.every((x:unknown)=>typeof x==='string'));
 const declaration={contract:'master-retained-legacy-template-assumptions/r1' as const,templateId:template,parameterSources:{q:qSources}};
 return{contract:roofParapet004TechnicalContractR294,capture:c,parameters,formulas,resources,sourceRows,sourceRowIds:sourceRows.map(r=>r.row_id),postRequirements,postRowIds:postRows.map(r=>r.row_id),
  primary,legacyDeclaration:declaration,applicability:{...c.definition.applicability,primaryMeasureSelectionV1:primary,parapet004WholeV1:{oldqRemainsM2Assumption:true,
   legacyMethodMustBeExplicitForNewSuccessor:true,missingMethod:'CLARIFICATION_REQUIRED_NOT_IMPLICIT_LEGACY',heightBoundary:'strictly_gt600mm;600belongsoutside00402_03',sourceAndObjectAdmission:false}},
  independentCompletenessMap:{contract:CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:physical.artifactSha256,operationResourceBindingRequired:true,entries:mapEntries,
   evidenceReferences:['data/estimate-benchmarks/source-packs/roof-wall0040203-independent-whole-map-r24.json',...methods.flatMap(p=>p.sources.map(s=>s.locators))],fullTechnicalAcceptance:false},
  unknownPhysicalRows:postRows.length,sourceColumns:[one.normId,two.normId],unchangedOldFormulaCount:59,legacyDependentFormulaCount:57,FULL:false};
}
