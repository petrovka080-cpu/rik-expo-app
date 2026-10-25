import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
import {prepareSocketCompleteSurfaceCurrentMasterR266,type SocketCurrentMasterContextR266} from './prepareSocketCompleteSurfaceCurrentMasterR266';
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function pin(value:unknown){assert(record(value));assert(typeof value.path==='string');assert(typeof value.sha256==='string');return{path:value.path,sha256:value.sha256};}

test('socket complete surface current ordinary Config finite13 retains legacy63 and sole paid procurement owners',async()=>{
  const contextPath=process.env.SOCKET_R266_BOUND_CONTEXT_PATH,output=process.env.SOCKET_R266_ACTUAL_OUTPUT;
  assert(typeof contextPath==='string'&&isAbsolute(contextPath),'ACTUAL_BOUND_CONTEXT_REQUIRED_NO_SYNTHETIC_PARENT_OR_REGISTRY');
  assert(typeof output==='string'&&isAbsolute(output),'ROOT_GOVERNED_RAW_OUTPUT_REQUIRED');mkdirSync(output,{recursive:true});
  const write=(name:string,value:unknown)=>{assert.match(name,/^[a-z0-9-]+$/u);writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n','utf8');};
  const raw:unknown=JSON.parse(readFileSync(contextPath,'utf8'));assert(record(raw));assert(typeof raw.sourceRoot==='string');
  const counts={actualCoreBegin:0,actualCoreCompleted:0,RESULT:0,REJECT:0,verifyCoreCalls:0};let returned:unknown;
  const context:SocketCurrentMasterContextR266={sourceRoot:raw.sourceRoot,currentFullParent:pin(raw.currentFullParent),actualScopedSourceRead:pin(raw.actualScopedSourceRead),
    onCoreCall:(ordinal,id)=>{counts.actualCoreBegin++;assert.equal(ordinal,counts.actualCoreBegin);write('actual-core-entry-counter',{...counts,lastEntry:id});},
    onOutcome:(name,value)=>{write(name,value);if(name.startsWith('actual-core-')){assert(record(value));
      if(value.kind==='RESULT')counts.RESULT++;else{assert.equal(value.kind,'REJECT');counts.REJECT++;}counts.actualCoreCompleted++;write('actual-core-entry-counter',counts);}}};
  try{const config=prepareSocketCompleteSurfaceCurrentMasterR266(context);
    write('ordinary-config-constructed-before-core',{shape:[config.parameterDefinitions.length,config.formulaDefinitions.length,config.resourceDefinitions.length],
      catalogId:config.catalogId,expectedParentShape:config.expectedParentShape,sourcePaths:config.sourcePaths,actualCoreBegin:counts.actualCoreBegin,full:false,ready:false});
    counts.verifyCoreCalls++;returned=await config.verifyCore();write('finite-return-before-assert',returned);
    assert(record(returned));assert.equal(returned.entries,13);assert.equal(returned.actualCoreCalls,13);assert.equal(returned.results,9);assert.equal(returned.rejects,4);
    assert.equal(returned.full,false);assert.equal(returned.ready,false);assert.equal(returned.newPublicCatalogs,0);
    assert.deepEqual(counts,{actualCoreBegin:13,actualCoreCompleted:13,RESULT:9,REJECT:4,verifyCoreCalls:1});
  }finally{write('final-actual-counters',{...counts,returned:returned??null,full:false,sourceAuthority:false,projectAuthentication:false,SQL:0,publisher:0});}
},120000);
