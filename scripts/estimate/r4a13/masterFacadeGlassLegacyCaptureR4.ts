// Finite exact-original legacy assumption proof for ONE already existing glass
// owner. No DB/network/publisher, source rewriting or caller-defined ancestry.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
type J=Record<string,any>;
type Same=(a:unknown,b:unknown)=>boolean;
const file='data/estimate-benchmarks/fixtures/facade-glass-original-parents-r3.json',fileSha='38d9fccbf92673c03d9a388d93f6d637cf5191ddb654a4a4f31d3ead20977023';
const catalog='canonical-work:expanded:curtain_wall_system',definition='8320a929-c3b1-5252-8236-be2573568399',baseline='7492137e-6ade-51f4-a586-925d58846c3e';
const template='curtain_wall_system_preliminary_boq_expanded_complex_v1';
const sections=['definition','baseline','parameters','formulas','resources','bindings','normativeSources','normativeLocators']as const;
function registeredOriginal():J{
 const raw=readFileSync(resolve(process.cwd(),file));
 if(raw.length>2*1024*1024||createHash('sha256').update(raw).digest('hex')!==fileSha)throw Error('MASTER_GLASS_R4_LEGACY_REGISTRATION_FILE_PREIMAGE_DRIFT');
 const r=JSON.parse(raw.toString('utf8'))as J;
 if(r.status!=='PASS_FULL_IMMUTABLE_READONLY_CAPTURE_NOT_TECHNICAL_ADMISSION'||r.databaseWrites!==0||r.readOnlyTransaction!==true||r.transactionRolledBack!==true||r.captures.length!==3)throw Error('MASTER_GLASS_R4_LEGACY_ROOT_READONLY_CAPTURE_REQUIRED');
 const c=(r.captures as J[]).find(c=>c.definition.catalog_id===catalog);
 if(!c||c.definition.id!==definition||c.baseline.id!==baseline||c.definition.definition_version!==5||c.definition.definition_sha256!=='8a93d851e5d2207d5135e7a39ebf3d0aef7960a21ee14510b7fee734011f7b78'||[c.parameters.length,c.formulas.length,c.resources.length].join('/')!=='5/45/45'||c.bindings.length||c.normativeSources.length||c.normativeLocators.length)throw Error('MASTER_GLASS_R4_LEGACY_EXACT_SINGLE_OWNER_REQUIRED');
 return c;
}
/** Called only by the existing retained binder with its private stable equality.
 * All current5/45/45 data and all3logical assumption-source declarations must
 * match the byte-pinned original. This does not admit new material quantities.
 * The normal actual-DB/locked preflight remains mandatory and unchanged. */
export function isMasterFacadeGlassRegisteredLegacyR4(capture:J,legacy:unknown,same:Same):boolean{
 if(capture?.definition?.id!==definition||capture.definition.catalog_id!==catalog)return false;
 const c=registeredOriginal(),l=legacy as J;
 if(!l||typeof l!=='object'||Array.isArray(l)||!same(Object.keys(l).sort(),['contract','parameterSources','templateId'].sort())||l.contract!=='master-retained-legacy-template-assumptions/r1'||l.templateId!==template)return false;
 if(!sections.every(k=>same(capture[k],c[k])))return false;
 if(!same(l.parameterSources,c.baseline.normative_source_ids)||!same(Object.keys(l.parameterSources).sort(),['floors','glazing_area_m2','source_prompt']))return false;
 for(const id of ['floors','glazing_area_m2','source_prompt']){
  const p=c.parameters.find((p:J)=>p.parameter_id===id),b=p?.truth_metadata?.provenance?.approvedTemplateBinding;
  if(c.baseline.input_classification[id]!=='ASSUMPTION'||p?.truth_metadata?.visibility_role!=='USER_INPUT'||p.truth_metadata.value_source_role!=='VISIBLE_BASELINE_ASSUMPTION'||b?.catalogId!==catalog||b.baselineId!==baseline||b.parameterId!==id||b.inputClassification!=='ASSUMPTION'||!same(b.value,c.baseline.input_values[id])||!same(b.normativeSourceIds,['r555-source:'+template]))return false;
 }
 // The original currentmetadata83db... and inherited approved-inputtreecbce...
 // differ legitimately. source_prompt has45context consumers and0quantity
 // formulas. Preserve both exact captured objects; do not rewrite provenance
 // to make the generic older single-edge predicate appear to pass.
 return true;
}
