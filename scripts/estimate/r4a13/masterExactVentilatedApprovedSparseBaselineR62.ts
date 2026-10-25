/** One already published sparse successor, never a generic baseline repair.
 * The caller has recomputed the full capture hash before reaching this check.
 * No values, classifications, source arrays, consumers or history are edited. */
type Json=Record<string,unknown>;
type Capture=Readonly<{definition:Json;baseline:Json;parameters:readonly Json[];
 formulas:readonly Json[];resources:readonly Json[];bindings:readonly Json[]}>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const equalKeys=(v:Json,keys:readonly string[])=>JSON.stringify(Object.keys(v).sort())===JSON.stringify([...keys].sort());
export const EXACT_VENTILATED_SPARSE_CAPTURE_R62='6d1a877bda3d3bf190b42618933a32c98a23976c64c26c943b562050214b1866';
export function masterExactVentilatedApprovedSparseBaselineR62(c:Capture,capturedSha256:string):boolean{
 if(capturedSha256!==EXACT_VENTILATED_SPARSE_CAPTURE_R62
  ||c.definition.id!=='301c5e16-0784-51ea-a6a0-cb6f889c464d'
  ||c.definition.catalog_id!=='canonical-work:expanded:ventilated_facade'
  ||c.definition.definition_version!==6
  ||c.definition.definition_sha256!=='80779fb8df0eea0ecd2fadb6b50454dabc89807a2c9ff73fb0e204bf8a09d572'
  ||c.baseline.id!=='c38ed3f7-db9f-5924-9a97-08529dc969b8'
  ||c.baseline.definition_version_id!==c.definition.id
  ||c.parameters.length!==52||c.formulas.length!==76||c.resources.length!==76||c.bindings.length!==4)return false;
 const b=c.baseline,m=c.definition.source_metadata;
 if(!object(m)||!object(m.retainedParentBindingSuccessorV1)
  ||m.retainedParentBindingSuccessorV1.parentDefinitionId!=='68a5f104-e991-581d-b326-656e30eb5647'
  ||m.retainedParentBindingSuccessorV1.parentBaselineId!=='c2ee7a48-313e-53b3-b66f-40ff5d9fa8bd'
  ||m.retainedParentBindingSuccessorV1.capturedParentSha256!=='0b43c473bea98e2afc06fa8ba13932b22144c4679af8dd480e17cfa226d38e6b'
  ||!object(b.input_values)||!object(b.input_classification)||!object(b.normative_source_ids))return false;
 const parameterIds=c.parameters.map(p=>p.parameter_id);
 if(!parameterIds.every((id):id is string=>typeof id==='string'))return false;
 const values=b.input_values,classification=b.input_classification,sourceIds=b.normative_source_ids;
 if(!equalKeys(values,['facade_area_m2','floors','source_prompt','ventilated_cladding_exact_source_profile'])
  ||!equalKeys(classification,parameterIds)
  ||!equalKeys(sourceIds,parameterIds.filter(id=>!['drawings_or_specification','project_location'].includes(id))))return false;
 const sourceKeys=Object.keys(sourceIds);
 if(!sourceKeys.every(id=>Array.isArray(sourceIds[id])
  &&sourceIds[id].every((v:unknown)=>typeof v==='string')))return false;
 for(const id of ['facade_area_m2','floors','source_prompt']){
  if(classification[id]!=='ASSUMPTION'
   ||JSON.stringify(sourceIds[id])!==JSON.stringify(['r555-source:ventilated_facade_preliminary_boq_expanded_complex_v1']))return false;
 }
 for(const id of ['drawings_or_specification','project_location']){
  const p=c.parameters.find(p=>p.parameter_id===id);
  if(!p||p.value_type!=='text'||p.unit_id!==null||p.required!==false||p.default_value!==null
   ||!object(p.truth_metadata)||!Array.isArray(p.truth_metadata.formula_consumers)||p.truth_metadata.formula_consumers.length!==0
   ||!Array.isArray(p.truth_metadata.resource_branch_consumers)||p.truth_metadata.resource_branch_consumers.length!==45
   ||c.formulas.some(f=>Array.isArray(f.input_parameter_ids)&&f.input_parameter_ids.includes(id)))return false;
 }
 // The 45 declared historical resource consumers stay real and untouched.
 // Full-capture equality, original approval evidence, source FK checks and
 // existing normal/locked live comparisons remain mandatory in the caller.
 return true;
}
