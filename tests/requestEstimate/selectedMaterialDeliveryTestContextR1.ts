import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';

/** Portable authored definition context + a genuinely compiled synthetic order.
 * Real saved principal/revision evidence is opt-in, separately pinned by its
 * local controller, and never becomes an implicit CI or Git dependency.
 */
export function selectedMaterialDeliveryTestContextR1(){
 const recorded=process.env.DELIVERY16_RECORDED_CONTEXT_PATH;
 let bytes:Buffer,contextKind:'CONTROLLED_REFERENCE'|'GUARDED_RECORDED';
 if(recorded){
  const expected=process.env.DELIVERY16_RECORDED_CONTEXT_SHA256;
  if(process.env.DELIVERY16_ALLOW_RECORDED_CONTEXT!=='1'||!expected||!/^[a-f0-9]{64}$/u.test(expected))throw new Error('EXPLICIT_PINNED_RECORDED_CONTEXT_REQUIRED');
  bytes=fs.readFileSync(recorded);
  if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('RECORDED_CONTEXT_BYTES_CHANGED');
  contextKind='GUARDED_RECORDED';
 }else{
  const compressed=fs.readFileSync(path.resolve(__dirname,'../fixtures/selectedMaterialDeliveryReferenceR1.json.gz'));
  if(createHash('sha256').update(compressed).digest('hex')!=='31ba3b3fa0713b24eb69118bd6232dda03c4c7bc58d7989707b145b756f0865e')throw new Error('CONTROLLED_REFERENCE_BYTES_CHANGED');
  bytes=gunzipSync(compressed,{maxOutputLength:32*1024*1024});contextKind='CONTROLLED_REFERENCE';
 }
 const parsed=JSON.parse(bytes.toString('utf8'));
 if(!Array.isArray(parsed.parents)||parsed.parents.length!==16||typeof parsed.normPackSha256!=='string')throw new Error('DELIVERY_REFERENCE_SCHEMA_INVALID');
 if(contextKind==='CONTROLLED_REFERENCE'&&(parsed.fixtureOnly!==true||parsed.liveDatabaseEvidence!==false||parsed.actualSavedOwnerOrProjectDataIncluded!==false))throw new Error('CONTROLLED_REFERENCE_CLASSIFICATION_INVALID');
 return {...parsed,contextKind};
}
