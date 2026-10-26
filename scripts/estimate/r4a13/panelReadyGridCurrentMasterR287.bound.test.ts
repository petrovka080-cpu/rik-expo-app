import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
import {preparePanelReadyGridCurrentMasterR287,type PanelReadyGridCurrentContextR287} from './preparePanelReadyGridCurrentMasterR287';
import {verifyPanelReadyGridLegacyIdentitiesR287} from './verifyPanelReadyGridWholePostR287';
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function pin(value:unknown){assert(record(value));assert(typeof value.path==='string');assert(typeof value.sha256==='string');return{path:value.path,sha256:value.sha256};}
test('same technical room panel current v5 ordinary Config finite13 preserves Master30 Master32 and one labour owner',async()=>{
  const contextPath=process.env.PANEL_R287_BOUND_CONTEXT_PATH,output=process.env.PANEL_R287_ACTUAL_OUTPUT;
  assert(typeof contextPath==='string'&&isAbsolute(contextPath),'ACTUAL_BOUND_CONTEXT_REQUIRED_NO_SYNTHETIC_PARENT');
  assert(typeof output==='string'&&isAbsolute(output),'ROOT_GOVERNED_RAW_OUTPUT_REQUIRED');mkdirSync(output,{recursive:true});
  const write=(name:string,value:unknown)=>{assert.match(name,/^[a-z0-9-]+$/u);writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n','utf8');};
  const raw:unknown=JSON.parse(readFileSync(contextPath,'utf8'));assert(record(raw));assert(typeof raw.sourceRoot==='string');
  const counts={actualCoreBegin:0,actualCoreCompleted:0,RESULT:0,REJECT:0,verifyCoreCalls:0};let returned:unknown;
  const context:PanelReadyGridCurrentContextR287={sourceRoot:raw.sourceRoot,currentFullParent:pin(raw.currentFullParent),
    onCoreCall:(ordinal,id)=>{counts.actualCoreBegin++;assert.equal(ordinal,counts.actualCoreBegin);write('actual-core-entry-counter',{...counts,lastEntry:id});},
    onOutcome:(name,value)=>{write(name,value);if(name.startsWith('actual-core-')){assert(record(value));if(value.kind==='RESULT')counts.RESULT++;else{assert.equal(value.kind,'REJECT');counts.REJECT++;}
      counts.actualCoreCompleted++;write('actual-core-entry-counter',counts);}}};
  try{const config=preparePanelReadyGridCurrentMasterR287(context);write('ordinary-config-constructed-before-core',{
      shape:[config.parameterDefinitions.length,config.formulaDefinitions.length,config.resourceDefinitions.length],catalogId:config.catalogId,expectedParentShape:config.expectedParentShape,
      sourcePaths:config.sourcePaths,actualCoreBegin:counts.actualCoreBegin,full:false,ready:false,sourceRegistryPreimage:'UNKNOWN_NEW_KEY_NOT_READ'});
    const stem='electrical_interior_lighting_install_technical_room_',blocked=stem+'materials_41';
    const oracleResources=config.resourceDefinitions.map(row=>{assert(typeof row.row_id==='string'&&record(row.inclusion_ast),'EXPLICIT_CONFIG_LEGACY_ORACLE_RESOURCE_SHAPE');return{row_id:row.row_id,inclusion_ast:row.inclusion_ast};});
    const legacy=oracleResources.filter(row=>row.row_id.startsWith(stem));
    const expected=legacy.filter(row=>row.row_id!==blocked).map(row=>({row_id:row.row_id}));assert.equal(expected.length,62);
    verifyPanelReadyGridLegacyIdentitiesR287(oracleResources,expected,[]);
    const negativeCases:string[]=[];const rejected=(id:string,invoke:()=>void)=>{assert.throws(invoke,{name:'AssertionError'});negativeCases.push(id);};
    rejected('missing-active-id',()=>verifyPanelReadyGridLegacyIdentitiesR287(oracleResources,expected.slice(1),[]));
    rejected('extra-result-id',()=>verifyPanelReadyGridLegacyIdentitiesR287(oracleResources,[...expected,{row_id:'TEST_ONLY_EXTRA_LEGACY_ID'}],[]));
    rejected('disabled-row-returned',()=>verifyPanelReadyGridLegacyIdentitiesR287(oracleResources,[...expected,{row_id:blocked}],[]));
    rejected('duplicate-active-id',()=>verifyPanelReadyGridLegacyIdentitiesR287(oracleResources,[...expected,expected[0]!],[]));
    rejected('disabled-definition-enabled',()=>verifyPanelReadyGridLegacyIdentitiesR287(oracleResources.map(row=>row.row_id===blocked?{...row,inclusion_ast:{kind:'literal',value:true}}:row),expected,[]));
    rejected('extra-legacy-definition',()=>verifyPanelReadyGridLegacyIdentitiesR287([...oracleResources,{...legacy[0]!,row_id:stem+'TEST_ONLY_EXTRA_DEFINITION'}],expected,[]));
    rejected('unknown-legacy-applicability',()=>verifyPanelReadyGridLegacyIdentitiesR287(oracleResources.map(row=>row.row_id===expected[0]!.row_id?{...row,inclusion_ast:{kind:'equals',parameterId:'TEST_ONLY_MISSING_CONDITION',value:'required'}}:row),expected,[]));
    write('legacy-oracle-pure-negatives',{status:'PASS_NATIVE_LEGACY_ORACLE_PURE_POSITIVE_AND_SEVEN_NEGATIVES',legacyDefinitionCount:63,activeLegacyCount:62,
      disabledRowId:blocked,positiveCases:1,negativeCases,actualCoreBegin:counts.actualCoreBegin,verifyCoreCalls:counts.verifyCoreCalls,sourceApproval:false,FULL:false});
    counts.verifyCoreCalls++;returned=await config.verifyCore();write('finite-return-before-assert',returned);assert(record(returned));
    assert.equal(returned.entries,13);assert.equal(returned.actualCoreCalls,13);assert.equal(returned.results,9);assert.equal(returned.rejects,4);assert.equal(returned.full,false);assert.equal(returned.ready,false);assert.equal(returned.newPublicCatalogs,0);
    assert.deepEqual(counts,{actualCoreBegin:13,actualCoreCompleted:13,RESULT:9,REJECT:4,verifyCoreCalls:1});
  }finally{write('final-actual-counters',{...counts,returned:returned??null,full:false,sourceAuthority:false,projectAuthentication:false,SQL:0,publisher:0});}
},120000);
