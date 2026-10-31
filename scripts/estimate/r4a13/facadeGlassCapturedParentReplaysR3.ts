import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
type J=Record<string,any>;
export type FacadeGlassExistingOwnerKeyR3='curtain_wall_system'|'high_rise_glazing'|'stained_glass_facade';
const fixture='data/estimate-benchmarks/fixtures/facade-glass-original-parents-r3.json';
const fileSha='38d9fccbf92673c03d9a388d93f6d637cf5191ddb654a4a4f31d3ead20977023';
const exact={curtain_wall_system:['8320a929-c3b1-5252-8236-be2573568399','8a93d851e5d2207d5135e7a39ebf3d0aef7960a21ee14510b7fee734011f7b78','7492137e-6ade-51f4-a586-925d58846c3e'],high_rise_glazing:['1cbaaaa2-f481-564b-9e18-1a8d9bde6581','b3e17032ba09e456b8d3a0bb9dace546037ff5d9bb848607465bf0e1de3fc68a','05687287-670d-58b5-a039-fcbcf79ad9dc'],stained_glass_facade:['6ec5acd7-3b49-5b59-b87d-c5c5aa12aad3','98d6411782e42d8dd996ed2812eaf0cb8214c374c1a76fc7b790d7ff51b3e93a','6f73693c-78c1-5b74-ab1f-ff0896916ab9']} as const;
/** Read the byte-pinned complete ORIGINAL ROOT capture, never a successor
 * output, discovery result or source-author database connection. */
function originals():J{
 const raw=readFileSync(resolve(process.cwd(),fixture));
 if(raw.length>2*1024*1024||createHash('sha256').update(raw).digest('hex')!==fileSha)throw Error('FACADE_GLASS_ORIGINAL_CAPTURE_BYTE_PREIMAGE_DRIFT');
 const d=JSON.parse(raw.toString('utf8'))as J;
 if(d.status!=='PASS_FULL_IMMUTABLE_READONLY_CAPTURE_NOT_TECHNICAL_ADMISSION'||d.databaseWrites!==0||d.readOnlyTransaction!==true||d.transactionRolledBack!==true||d.captures.length!==3)throw Error('FACADE_GLASS_ORIGINAL_ROOT_CAPTURE_REQUIRED');
 return d;
}
export function facadeGlassOriginalParentR3(key:FacadeGlassExistingOwnerKeyR3):J{
 const d=originals(),c=(d.captures as J[]).find(c=>c.definition.catalog_id==='canonical-work:expanded:'+key),pin=exact[key];
 if(!c||!pin||c.definition.id!==pin[0]||c.definition.definition_sha256!==pin[1]||c.baseline.id!==pin[2]||c.definition.definition_version!==5||[c.parameters.length,c.formulas.length,c.resources.length].join('/')!=='5/45/45'||c.bindings.length||c.normativeSources.length||c.normativeLocators.length)throw Error('FACADE_GLASS_EXACT_ORIGINAL_5_45_45_REQUIRED');
 return structuredClone(c);
}
/** Existing normal compiler only. This ORIGINAL legacy replay deliberately
 * keeps old visible assumptions and all45 historical rows unchanged. Their
 * successful calculation is NOT proof of an exact manufacturer method/FULL. */
export function compileFacadeGlassOriginalParentR3(key:FacadeGlassExistingOwnerKeyR3,options:{actualInputPatch?:J;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}){
 const c=facadeGlassOriginalParentR3(key);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'gox-facade-glass-original-parent-replay-r3',catalogId:c.definition.catalog_id,primaryMeasureParameterId:'glazing_area_m2',parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:c.resources,submittedParameters:{...structuredClone(c.baseline.input_values),...options.actualInputPatch},confirmedParameters:{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:c.resources.length,hashJson:hash});
}
/** Inputs for the existing owner-session/harness. No endpoint client, writer,
 * login, mutation, publication or acceptance loop exists in this module. The
 * integrator adds an explicit legacy selector patch separately once reviewed;
 * originalInput remains raw and is never edited to manufacture agreement. */
export function facadeGlassOriginalReplayCasesR3(){return(Object.keys(exact)as FacadeGlassExistingOwnerKeyR3[]).map(key=>{
 const c=facadeGlassOriginalParentR3(key);
 return{caseId:'glass-existing-parent-'+key,catalogId:c.definition.catalog_id,originalDefinitionId:c.definition.id,originalDefinitionSha256:c.definition.definition_sha256,originalBaselineId:c.baseline.id,originalInput:structuredClone(c.baseline.input_values),captureFileSha256:fileSha,independentComplementModel:'EXACT_ORIGINAL_CAPTURE_BEFORE_OVERLAY',expectedOriginalModelShape:[5,45,45]as const,sourceNormCompatibilityNotAssumed:true,newFULL:0,actualExecution:'UNRUN'};
});}
