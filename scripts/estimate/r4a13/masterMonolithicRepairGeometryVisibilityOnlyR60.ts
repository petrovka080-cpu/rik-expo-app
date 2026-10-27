import {createHash} from 'node:crypto';
import {canonicalDefinitionPublicationStableValueR1 as stable} from
  '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';

type Json=Record<string,any>;
type Capture=Readonly<{definition:Json;baseline:Json;parameters:readonly Json[];
  formulas:readonly Json[];resources:readonly Json[]}>;
export type MasterMonolithicRepairGeometryVisibilityOnlyR60=Readonly<{
  contract:'master-monolithic-repair-geometry-visibility-only/r60';
  capturedContentPassport:Json;capturedContentPassportSha256:string;
  changes:Readonly<Record<string,Readonly<{capturedTruthMetadata:Json;
    capturedTruthMetadataSha256:string;afterTruthMetadataSha256:string}>>>;
  changesSha256:string;
}>;
const encoded=(v:unknown)=>JSON.stringify(stable(v));
const hash=(v:unknown)=>createHash('sha256').update(encoded(v)).digest('hex');
const same=(a:unknown,b:unknown)=>encoded(a)===encoded(b);
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const omit=(v:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k)));
const exactKeys=(v:Json,keys:readonly string[])=>same(Object.keys(v).sort(),[...keys].sort());
type Context=Readonly<{catalogId:string;stopCode:string;capture:Capture;captureSha256:string}>;
function requireThat(value:unknown,c:Context,code:string):asserts value{
  if(!value)throw Error('STOP_'+c.stopCode+'_RETAIN_REPAIR_VISIBILITY_'+code);
}
const anchors:Readonly<Record<string,Readonly<{definitionId:string;baselineId:string;captureSha256:string;
  methodId:string;choice:string;geometryIds:readonly string[]}>>>=Object.freeze({
  'canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard':{
    definitionId:'f6dc5e31-677c-559b-ba47-94fbba4393e0',baselineId:'18d2665e-407f-5508-8143-8c13cda7eabf',
    captureSha256:'f4ca092edba9c8c6b0bf98b8b632739e0061b80c059ce83b84bdda555e11201a',
    methodId:'mono_slab_repair_r55_method',choice:'GB_HAND_LAYER_5_80MM_SOUND_ROUGH_NO_EXPOSED_REBAR_NO_PRIMER',
    geometryIds:['mono_repair_r3_patch_count','mono_repair_r3_length_m','mono_repair_r3_width_m','mono_repair_r3_depth_m']},
  'canonical-work:master:monolithic_reinforced_concrete_wall_standard':{
    definitionId:'06577b67-09a3-5e79-8614-c7feb4aceda8',baselineId:'d6910c35-5a28-5e1b-a1a9-85e785231e5e',
    captureSha256:'1eb15ef357e1d7870032e11b117361a0f6b222e15bc998830812802b912cff25',
    methodId:'mono_wall_strength_r57_method',choice:'ONE_IDENTIFIED_FLAT_MEMBER_TYPE_II_24_48_DRY_WALL_GB_HAND_REPAIR',
    geometryIds:['mono_repair_r3_patch_count','mono_repair_r3_length_m','mono_repair_r3_width_m','mono_repair_r3_depth_m','mono_strength_direct_r2_area_m2']},
});
function anchor(c:Context){
  const a=anchors[c.catalogId];
  requireThat(a&&c.capture.definition.catalog_id===c.catalogId&&c.capture.definition.id===a.definitionId
    &&c.capture.baseline.id===a.baselineId&&c.captureSha256===a.captureSha256,c,'EXACT_CURRENT_PARENT');
  return a;
}
/** Independent validation of a presentation-only change. This never evaluates
 * quantities or resource inclusion, and never changes authority or defaults. */
function correctedTruth(c:Context,old:Json):Json{
  const a=anchor(c);let changed=0;
  const visit=(v:unknown):Json=>{
    requireThat(object(v),c,'VISIBILITY_AST');
    if(v.kind==='equals'&&v.parameterId===a.methodId){
      requireThat(exactKeys(v,['kind','parameterId','value'])&&v.value===a.choice,c,'EXACT_METHOD_GATE');
      changed++;return{...v,kind:'selected'};
    }
    if(v.kind==='and'||v.kind==='or'){
      requireThat(Array.isArray(v.operands),c,'LOGICAL_OPERANDS');
      return{...v,operands:v.operands.map(visit)};
    }
    if(v.kind==='not')return{...v,operand:visit(v.operand)};
    return v;
  };
  requireThat(old.truth_metadata?.visibility_role==='USER_INPUT',c,'GEOMETRY_REMAINS_USER_INPUT');
  const visible_when=visit(old.truth_metadata.visible_when);
  requireThat(changed===1,c,'ONE_METHOD_GATE_PER_GEOMETRY');
  return{...old.truth_metadata,visible_when};
}
export function assertMasterMonolithicRepairGeometryVisibilityDeclarationR60(c:Context,
  mode:MasterMonolithicRepairGeometryVisibilityOnlyR60):void{
  const a=anchor(c);
  requireThat(object(mode)&&exactKeys(mode,['contract','capturedContentPassport','capturedContentPassportSha256','changes','changesSha256'])
    &&mode.contract==='master-monolithic-repair-geometry-visibility-only/r60',c,'DECLARATION');
  const method=c.capture.parameters.find(p=>p.parameter_id===a.methodId);
  requireThat(method?.truth_metadata?.visibility_role==='INTERNAL_ONLY'
    &&method.truth_metadata.value_source_role==='PROJECT_DOCUMENTATION'
    &&same(method.constraints_json?.values,[a.choice]),c,'EXACT_INTERNAL_METHOD');
  requireThat(object(mode.capturedContentPassport)&&hash(mode.capturedContentPassport)===mode.capturedContentPassportSha256
    &&mode.capturedContentPassport.definition_version_id===c.capture.definition.id
    &&mode.capturedContentPassport.catalog_id===c.catalogId,c,'PASSPORT_ANCHOR');
  requireThat(object(mode.changes)&&exactKeys(mode.changes,a.geometryIds)
    &&hash(mode.changes)===mode.changesSha256,c,'EXACT_GEOMETRY_CHANGE_SET');
  for(const id of a.geometryIds){
    const old=c.capture.parameters.find(p=>p.parameter_id===id),change=mode.changes[id];
    requireThat(old&&object(change)&&exactKeys(change,['capturedTruthMetadata','capturedTruthMetadataSha256','afterTruthMetadataSha256'])
      &&same(change.capturedTruthMetadata,old.truth_metadata)&&hash(old.truth_metadata)===change.capturedTruthMetadataSha256
      &&hash(correctedTruth(c,old))===change.afterTruthMetadataSha256
      &&change.afterTruthMetadataSha256!==change.capturedTruthMetadataSha256,c,'EXACT_TRUTH_CHANGE');
  }
}
export function masterMonolithicRepairGeometryVisibilityCompactR60(mode:MasterMonolithicRepairGeometryVisibilityOnlyR60):Json{
  return{contract:mode.contract,changesSha256:mode.changesSha256,parameterIds:Object.keys(mode.changes).sort()};
}
export function assertMasterMonolithicRepairGeometryVisibilityComputationR60(c:Context,
  mode:MasterMonolithicRepairGeometryVisibilityOnlyR60,next:Readonly<{parameters:readonly Json[];
    formulas:readonly Json[];resources:readonly Json[]}>,phase:'REPRESENTATIVE'|'PLAN'):void{
  assertMasterMonolithicRepairGeometryVisibilityDeclarationR60(c,mode);
  for(const [kind,idKey]of [['parameters','parameter_id'],['formulas','formula_id'],['resources','row_id']]as const){
    requireThat(Array.isArray(next[kind])&&next[kind].length===c.capture[kind].length
      &&new Set(next[kind].map(r=>r[idKey])).size===c.capture[kind].length,c,'NO_ADDED_OR_REMOVED_'+kind.toUpperCase());
    for(const old of c.capture[kind]){
      const actual=next[kind].find(row=>row[idKey]===old[idKey]);
      requireThat(actual,c,'MISSING_'+kind.toUpperCase());
      const expected=kind==='parameters'&&Object.hasOwn(mode.changes,old.parameter_id)
        ?{...old,truth_metadata:correctedTruth(c,old)}:old;
      const ignored=phase==='REPRESENTATIVE'?[]:['definition_version_id','created_at',
        ...(kind==='parameters'?['approved_template_baseline_id']:[]),...(kind==='resources'?['id','row_sha256']:[])];
      requireThat(same(omit(actual,ignored),omit(expected,ignored)),c,kind.toUpperCase()+'_SEMANTICS_DRIFT');
    }
  }
}
export function assertMasterMonolithicRepairGeometryVisibilityPlanR60(c:Context,
  mode:MasterMonolithicRepairGeometryVisibilityOnlyR60,plan:Readonly<{baseline:Json;definition:Json;passport?:Json}>):void{
  const baselineKeys=['input_values','input_classification','uom_by_parameter','formula_consumer_ids',
    'resource_consumer_row_ids','normative_source_ids','guide_provenance_ru','proposal_source_refs','contract_version'];
  requireThat(baselineKeys.every(k=>same(plan.baseline[k],c.capture.baseline[k])),c,'BASELINE_SEMANTICS_DRIFT');
  requireThat(same(plan.definition.passport,c.capture.definition.passport)
    &&same(plan.definition.applicability,c.capture.definition.applicability),c,'DEFINITION_SCOPE_DRIFT');
  const ignored=['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at'];
  requireThat(plan.passport&&same(omit(plan.passport,ignored),omit(mode.capturedContentPassport,ignored)),c,'CONTENT_SCOPE_AND_READINESS_DRIFT');
}
