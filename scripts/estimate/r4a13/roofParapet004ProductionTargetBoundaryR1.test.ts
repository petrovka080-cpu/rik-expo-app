import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {assertRoofParapet004ProductionTargetBoundaryR1,assertRoofParapet004PublisherSourceProjectionR1,
 type RoofParapet004PublisherSourceProjectionR1 as Projection,type RoofParapet004TargetBoundaryR1 as Boundary} from './prepareRoofParapet004TechnicalProductionTargetR1';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
type Input=Boundary&Readonly<{publisherSourcePaths:readonly string[];publisherSourceProjection:Projection}>;
function context(v:unknown):v is Input{
 if(!object(v)||!Array.isArray(v.artifactPins)||!object(v.currentPointerPin)||!object(v.masterBinding))return false;
 const master=v.masterBinding;
 if(!Array.isArray(v.publisherSourcePaths)||!v.publisherSourcePaths.every(p=>typeof p==='string'&&path.isAbsolute(p))||!object(v.publisherSourceProjection))return false;
 const projection=v.publisherSourceProjection;
 if(typeof projection.canonicalRoot!=='string'||typeof projection.runtimeEvidenceRoot!=='string'||!Array.isArray(projection.files))return false;
 const pin=(x:unknown)=>object(x)&&typeof x.path==='string'&&path.isAbsolute(x.path)&&typeof x.sha256==='string'&&/^[a-f0-9]{64}$/u.test(x.sha256);
 return projection.files.every(r=>object(r)&&pin(r.original)&&pin(r.projected))&&v.artifactPins.every(pin)&&pin(v.currentPointerPin)&&typeof v.currentReleasePath==='string'&&typeof v.parentReleaseId==='string'&&typeof v.parentSearchReleaseId==='string'
  &&master.contract==='root-reviewed-operational-master/r1'&&['historicalMasterPin','operationalMasterPin','precededReviewDecisionMasterPin'].every(k=>pin(master[k]));
}
it('uses actual rollback capture pins and rejects changed file, pointer tuple and operational master without SQL or core',()=>{
 const file=process.env.PARAPET004_TARGET_BOUNDARY_INPUT_R1,expected=process.env.PARAPET004_TARGET_BOUNDARY_INPUT_SHA_R1;
 assert(file&&expected&&path.isAbsolute(file),'REAL_ROOT_BOUNDARY_CONTEXT_REQUIRED');const b=fs.readFileSync(file);assert(b.length<=4*1024*1024);assert.equal(sha(b),expected);
 const input:unknown=JSON.parse(b.toString('utf8'));assert(context(input),'REAL_BOUNDARY_SHAPE');
 const root=process.env.PARAPET004_TARGET_BOUNDARY_TEST_OUTPUT_R1;assert(root&&path.isAbsolute(root)&&!fs.existsSync(root),'FRESH_TEST_OUTPUT_REQUIRED');fs.mkdirSync(root,{recursive:true});
 assertRoofParapet004ProductionTargetBoundaryR1(input);
 const projection=input.publisherSourceProjection,sources=input.publisherSourcePaths;
 const mapped=assertRoofParapet004PublisherSourceProjectionR1(sources,projection);
 assert(mapped.length>0);const first=projection.files[0];assert(first,'ACTUAL_EXTERNAL_PROJECTION_CASE_REQUIRED');
 assert.throws(()=>assertRoofParapet004PublisherSourceProjectionR1(sources,{...projection,files:projection.files.slice(1)}),/EVERY_EXTERNAL_INPUT_REQUIRES_PROJECTION/u);
 assert.throws(()=>assertRoofParapet004PublisherSourceProjectionR1(sources,{...projection,files:[{...first,projected:{...first.projected,sha256:'0'.repeat(64)}},...projection.files.slice(1)]}),/SOURCE_PROJECTION_SHA_BINDING/u);
 assert.throws(()=>assertRoofParapet004PublisherSourceProjectionR1(sources,{...projection,files:[{...first,projected:first.original},...projection.files.slice(1)]}),/PROJECTED_INPUT_OUTSIDE_RUNTIME_EVIDENCE/u);
 assert.throws(()=>assertRoofParapet004PublisherSourceProjectionR1(sources,{...projection,canonicalRoot:path.dirname(projection.canonicalRoot)}),/EXACT_CANONICAL_PUBLISHER_ROOT_REQUIRED/u);
 assert.throws(()=>assertRoofParapet004PublisherSourceProjectionR1(sources,{...projection,runtimeEvidenceRoot:path.dirname(projection.canonicalRoot)}),/CANONICAL_RUNTIME_EVIDENCE_ROOT_REQUIRED/u);
 assert(path.relative(projection.runtimeEvidenceRoot,root)!==''&&!path.relative(projection.runtimeEvidenceRoot,root).startsWith('..')&&!path.isAbsolute(path.relative(projection.runtimeEvidenceRoot,root)),'ROOT_OWNED_TEST_OUTPUT_INSIDE_RUNTIME_EVIDENCE');
 const changedCopy=path.join(root,'TEST_ONLY_CHANGED_EXISTING_COPY.bin');fs.writeFileSync(changedCopy,Buffer.from('TEST_ONLY_CHANGED_FOR_REJECTION'),{flag:'wx'});
 assert.throws(()=>assertRoofParapet004PublisherSourceProjectionR1(sources,{...projection,files:[{...first,projected:{path:changedCopy,sha256:first.original.sha256}},...projection.files.slice(1)]}),/PIN_DRIFT/u);

 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1({...input,artifactPins:input.artifactPins.map((p,i)=>i? p:{...p,sha256:'0'.repeat(64)})}),/PIN_DRIFT/u);
 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1({...input,masterBinding:{...input.masterBinding,operationalMasterPin:input.masterBinding.precededReviewDecisionMasterPin}}),/OPERATIONAL_MASTER219_SHA_REQUIRED/u);
 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1({...input,masterBinding:{...input.masterBinding,historicalMasterPin:input.masterBinding.operationalMasterPin}}),/HISTORICAL_MASTER216_PIN_REQUIRED/u);
 const raw:unknown=JSON.parse(fs.readFileSync(input.currentPointerPin.path,'utf8'));assert(object(raw));
 const changedPointer=(name:string,value:Record<string,unknown>)=>{const p=path.join(root,name+'.json'),bytes=Buffer.from(JSON.stringify(value));fs.writeFileSync(p,bytes,{flag:'wx'});
  return{...input,currentReleasePath:p,currentPointerPin:{path:p,sha256:sha(bytes)}};};
 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1(changedPointer('wrong-release',{...raw,definitionReleaseId:'TEST_ONLY_CHANGED_FOR_REJECTION'})),/CURRENT_POINTER_RELEASE_TUPLE_DRIFT/u);
 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1(changedPointer('wrong-search',{...raw,searchReleaseId:'TEST_ONLY_CHANGED_FOR_REJECTION'})),/CURRENT_POINTER_SEARCH_TUPLE_DRIFT/u);
 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1(changedPointer('not-local',{...raw,productionAccessed:true})),/CURRENT_POINTER_NOT_LOCAL/u);
 assert.throws(()=>assertRoofParapet004ProductionTargetBoundaryR1({...input,currentReleasePath:path.join(root,'different-pointer.json')}),/CURRENT_POINTER_PATH_DRIFT/u);
 fs.writeFileSync(path.join(root,'ACTUAL_BOUNDARY_TEST_OUTCOME_R1.json'),JSON.stringify({status:'PASS_REAL_PIN_BOUNDARY_ONE_POSITIVE_THIRTEEN_NEGATIVES',
  actualRollbackInput:file,actualPositive:1,actualRejects:13,SQL:0,core:0,publication:0,FULL:false},null,2)+'\n',{flag:'wx'});
});
