import pack from '../../../../data/estimate-benchmarks/source-packs/ceramic-floor-m150-exact-format-branches-r1.json';
import {ceramicFloorM150TechnologyProfileR2,ceramicFloorM150ResourceGroupPackR2 as group} from './ceramicFloorCementMortarResourceGroupR2';
import {ceramicFloorM150WholeProvisionDefinitionR3,ceramicFloorM150WholeProvisionCompletenessR3} from './ceramicFloorCementMortarWholeProvisionR3';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const ceramicFloorM150ExactFormatBranchesPackR1=pack;
export type CeramicFloorM150ExactFormatR1='ceramic100x100'|'ceramic150x150';
const selector='ceramic_m150_r2_technology_profile',prefix='ceramic-floor:cement-mortar:krer11-01-027-03';
/** Replace the explicit application-profile value only; never substitute a
 * numeric norm, derive perimeter, split whole labour or duplicate a paid owner. */
function selectedProfile<T>(value:T,selected:string):T{
 if(value===ceramicFloorM150TechnologyProfileR2)return selected as T;
 if(Array.isArray(value))return value.map(v=>selectedProfile(v,selected)) as T;
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,selectedProfile(v,selected)])) as T;
 return value;
}
export function ceramicFloorM150ExactFormatDefinitionR1(format:CeramicFloorM150ExactFormatR1):AutomaticOwnerDefinition{
 const f=pack.formats.find(f=>f.id===format);if(!f||f.reuseClassification!=='REUSE_EXACT')throw Error('CERAMIC_M150_EXACT_FORMAT_REQUIRED');
 const base=ceramicFloorM150WholeProvisionDefinitionR3(),profile=ceramicFloorM150TechnologyProfileR2.replace('100/150 мм',f.tileEdgeMm+' × '+f.tileEdgeMm+' мм'),
  d=selectedProfile(base,profile);
 if(d.parameters.length!==30||d.formulas.length!==84||d.resources.length!==84||d.runtimeInput[selector]!==profile)throw Error('CERAMIC_M150_EXACT_WHOLE_GROUP_REUSE_REQUIRED');
 return{...d,resources:d.resources.map(r=>{
  const tile=r.row_id===prefix+':ceramic-tile-consumed'||r.row_id===prefix+':ceramic-tile-order',graph={...r.resource_graph},view=graph.publicResourcePresentationV1;
  if(tile&&view&&typeof view==='object')graph.publicResourcePresentationV1={...view,specificationRu:f.specificationRu,detailsRu:[]};
  const {row_sha256:_old,...body}=r,content={...body,resource_graph:graph,source_metadata:{...r.source_metadata,
   exactFormatScopeR1:{contract:pack.contract,formatId:f.id,tileEdgeMm:f.tileEdgeMm,sourceColumn:pack.sourceColumn,reuseClassification:'REUSE_EXACT',newNumericalNorm:false},
   wholeResourceGroupReused:true,full_technical_acceptance:false}};
  return{...content,row_sha256:estimateDeterministicHash(content)};
 })};
}
export function ceramicFloorM150ExactFormatCompletenessR1(format:CeramicFloorM150ExactFormatR1){
 const f=pack.formats.find(f=>f.id===format);if(!f)throw Error('CERAMIC_M150_EXACT_FORMAT_REQUIRED');
 return{...ceramicFloorM150WholeProvisionCompletenessR3(),exactFormatScopeR1:{formatId:f.id,tileEdgeMm:f.tileEdgeMm,reuseClassification:'REUSE_EXACT',primaryEvidence:pack.primaryEvidence},wholeResourceGroupReused:true};
}
export function compileCeramicFloorM150ExactFormatR1(format:CeramicFloorM150ExactFormatR1,submittedParameters:Record<string,unknown>){
 return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract+':'+format,primaryMeasureParameterId:group.primaryParameterId,definition:ceramicFloorM150ExactFormatDefinitionR1(format),submittedParameters});
}
