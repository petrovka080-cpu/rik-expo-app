import {assertSocketRecordedWindowOutcomeR1153 as assertRecordedWindow} from './prepareSocketCompleteSurfaceCurrentMasterR266';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {prepareSocketCompleteSurfaceCurrentMasterR266 as config,
  compileSocketExistingOwnerCurrentMasterR2 as compile,type SocketCurrentMasterContextR266}
  from './prepareSocketCompleteSurfaceCurrentMasterR266';
import {socketCompleteSurfacePackR266 as single} from './ownedDomain/socketCompleteSurfaceWholeR266';
import {socketComposableTwoGangPackR1 as socket,socketComposableTwoGangRowR1 as socketRow}
  from '../../../src/lib/estimate/v4/socketComposableSurfaceTwoGangR1';
import {electricalVerificationOwnedPostPackR1 as instruments,electricalVerificationOwnedPostRowR1 as instrumentRow}
  from '../../../src/lib/estimate/v4/electricalVerificationOwnedPostR1';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';



function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function pin(value:unknown){assert(record(value));assert(typeof value.path==='string'&&typeof value.sha256==='string');
  return{path:value.path,sha256:value.sha256};}
function actualContext():SocketCurrentMasterContextR266{
  const path=process.env.SOCKET_R266_BOUND_CONTEXT_PATH;
  assert(typeof path==='string'&&isAbsolute(path),'ACTUAL_BOUND_CONTEXT_REQUIRED_NO_SYNTHETIC_PARENT_OR_REGISTRY');
  const raw:unknown=JSON.parse(readFileSync(path,'utf8'));assert(record(raw));assert(typeof raw.sourceRoot==='string');
  return{sourceRoot:raw.sourceRoot,currentFullParent:pin(raw.currentFullParent),actualScopedSourceRead:pin(raw.actualScopedSourceRead)};
}
const id=(suffix:string)=>socket.parameterPrefix+suffix.replaceAll('-','_');
const source=id('source_readback');
// Sparse transport fixtures are neither approved project facts nor server
// source context. The old q100 must never become the new two-node quantity.
const socketInput=():Record<string,unknown>=>({q:'100',[socket.methodParameterId]:socket.method,[id('node_count')]:'2'});
const ownedInput=():Record<string,unknown>=>({...socketInput(),[instruments.methodId]:instruments.method,
  [instruments.countId]:'1',[instruments.scheduleId]:'TEST_ONLY unapproved owned inventory',[instruments.fitId]:instruments.fit});
const candidate=(context:SocketCurrentMasterContextR266,input:Record<string,unknown>)=>
  config({...context,sourceCandidateR2:{enabled:true,submittedParameters:input}});

function savedArtifactNeeds(result:Awaited<ReturnType<typeof compile>>,rowOverrides:unknown={}){
  const checksum=hash(result.revisionProjection),payload=buildCanonicalRevisionCommitPayload({
    rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,
    compilerVersion:'gox.electrical.existing-owner-source-candidates/r2',parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},
    effectiveUserParameters:result.parameters,parentRevisionId:null,identityContract:{fixture:'TEST_ONLY_NOT_SAVED'},
    derivedParameters:result.derivedParameters,preliminaryNeeds:result.preliminaryNeeds,
    purchaseSupplyIndexV1:result.purchaseSupplyIndexV1,compositionSelectionV1:result.compositionSelectionV1});
  return canonicalArtifactPreliminaryNeeds({id:'TEST_ONLY_SOURCE_HELD',release_id:'TEST_ONLY_NOT_SAVED',catalog_id:socket.catalogId,
    checksum_sha256:checksum,row_count:result.rows.length,amendment_contract:{...payload,rowOverrides:structuredClone(rowOverrides??{})}});
}

describe('actual existing socket ordinary Config opt-in source-candidate caller; author runtime UNRUN',()=>{
  let context:SocketCurrentMasterContextR266;
  beforeAll(()=>{context=actualContext();});
  it('preserves exact ordinary Config data for absent and explicit legacy selectors',()=>{
    const old=config(context);
    for(const input of[{q:'100'},{q:'100',[single.methodParameterId]:single.legacyMethod}]){
      const next=candidate(context,input);
      expect(next.parameterDefinitions).toEqual(old.parameterDefinitions);
      expect(next.formulaDefinitions).toEqual(old.formulaDefinitions);
      expect(next.resourceDefinitions).toEqual(old.resourceDefinitions);
      expect(next.sourcePaths).toEqual(old.sourcePaths);
      expect(next.binding).toEqual(old.binding);
      expect(next.applicability).toEqual(old.applicability);
      expect(next.acceptanceInput).toEqual(old.acceptanceInput);
      expect(next.verifyTargetPrecondition?.toString()).toBe(old.verifyTargetPrecondition?.toString());
    }
  });
  it('activates the two selected source leaves only on the actual submitted composable selection after the real parent guard',()=>{
    const input=socketInput(),before=JSON.stringify(input),old=config(context),next=candidate(context,input);
    expect(JSON.stringify(input)).toBe(before);
    expect(next.resourceDefinitions).toHaveLength(158);
    expect(next.formulaDefinitions).toHaveLength(158);
    expect(next.acceptanceInput).toEqual(input);
    expect(next.resourceDefinitions.slice(0,87).map(r=>{
      const{inclusion_ast:_inclusion,row_sha256:_hash,...body}=r;return body;
    })).toEqual(old.resourceDefinitions.map(r=>{
      const{inclusion_ast:_inclusion,row_sha256:_hash,...body}=r;return body;
    }));
    expect(next.binding).toEqual(old.binding);
    expect(next.applicability.sourceOnlyElectricalR2V1).toMatchObject({sourceAuthorityPromoted:false,
      projectAuthenticated:false,fullTechnicalAcceptance:false,oldSingleNormativeBindingsExtendedToR2:false});
    expect(next.passport.independentCompletenessMap?.entries).toHaveLength(158);
    for(const source of socket.sources)expect(next.sourcePaths).toContain(source.logicalPath);
    for(const source of instruments.sources)expect(next.sourcePaths).toContain(source.path);
    expect(new Set(next.sourcePaths).size).toBe(next.sourcePaths.length);
    for(const part of socket.factoryIncludedBoxParts){
      const resource=next.resourceDefinitions.find(r=>r.row_id===socketRow('box:factory-'+part.key));
      expect(resource).toMatchObject({cost_owner_id:socketRow('box:order'),procurement_eligible:false,
        resource_graph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:socketRow('box:order'),
          includedInResourceOwnerRowId:socketRow('box:order')}});
    }
    expect(next.verifyTargetPrecondition?.toString()).toBe(old.verifyTargetPrecondition?.toString());
  });
  it('rejects a new-profile request without explicit source-candidate opt-in',async()=>{
    await expect(compile(socketInput(),context)).rejects.toThrow('SOCKET_R2_EXPLICIT_SOURCE_CANDIDATE_OPT_IN_REQUIRED');
  });
  it('rejects an orphan instrument activation on the legacy socket profile',async()=>{
    await expect(compile({q:'100',[instruments.methodId]:instruments.method},context,{enableSourceCandidateR2:true}))
      .rejects.toThrow('SOCKET_R2_INSTRUMENT_REQUIRES_EXACT_COMPOSABLE_PROFILE');
  });
  it('uses the actual two-node input in the real core while keeping source and project needs unaccepted',async()=>{
    const result=await compile(socketInput(),context,{enableSourceCandidateR2:true});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.find(n=>n.row_id===socketRow('mechanism:consumed'))?.quantity).toBe('2');
    expect(result.preliminaryNeeds.find(n=>n.row_id===socketRow('box:consumed'))?.quantity).toBe('2');
    for(const[key,quantity]of[['support-plate','2'],['frame','2'],['membrane-entry','8']]as const)
      expect(result.preliminaryNeeds.find(n=>n.row_id===socketRow('box:factory-'+key))?.quantity).toBe(quantity);
    expect(result.preliminaryNeeds.filter(n=>n.row_id.startsWith(socket.prefix+':'))
      .every(n=>n.missing_parameter_ids.includes(source)&&!Object.hasOwn(n,'amount'))).toBe(true);
    const artifacts=savedArtifactNeeds(result);expect(artifacts).toHaveLength(result.preliminaryNeeds.length);
    expect(artifacts.every(n=>n.included_in_estimate===false&&n.included_in_procurement===false&&n.procurement_eligible===false&&n.amount===null)).toBe(true);
    expect(result.preliminaryNeeds.some(n=>n.row_id.startsWith(instruments.prefix+':'))).toBe(false);
  });
  it('uses the actual whole inventory choice without purchasing it or creating a second payment owner',async()=>{
    const result=await compile(ownedInput(),context,{enableSourceCandidateR2:true});
    expect(result.rows.map(r=>r.row_id)).toEqual(instruments.parts.map(p=>instrumentRow(p.key)));
    expect(result.rows.reduce((sum,r)=>sum+Number(r.quantity),0)).toBe(28);
    expect(result.rows.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
    expect(result.preliminaryNeeds.filter(n=>n.row_id.startsWith(instruments.prefix+':need:'))).toHaveLength(3);
    expect(result.preliminaryNeeds.find(n=>n.row_id===socketRow('mechanism:consumed'))?.missing_parameter_ids).toContain(source);
    const d=candidate(context,ownedInput());
    for(const rowId of instruments.coveredCandidateRowIds){
      const row=d.resourceDefinitions.find(r=>r.row_id===rowId);assert(row);
      expect(resolveInclusionGraph(row.inclusion_ast,ownedInput()).value).toBe(false);
    }
    expect(result.totals.amount).toBe('0');
  });
  it('does not suppress the three broad instrument needs before the exact inventory choice',()=>{
    const d=candidate(context,socketInput());
    for(const rowId of instruments.coveredCandidateRowIds){
      const row=d.resourceDefinitions.find(r=>r.row_id===rowId);assert(row);
      expect(JSON.stringify(row.inclusion_ast)).toContain(instruments.methodId);
      expect(resolveInclusionGraph(row.inclusion_ast,ownedInput()).value).toBe(false);
    }
    for(const row of d.resourceDefinitions.filter(r=>r.row_id.startsWith(instruments.prefix+':')))
      expect(resolveInclusionGraph(row.inclusion_ast,socketInput()).value).toBe(false);
  });
  it('rejects a consumer attempt to promote the protected source field',async()=>{
    await expect(compile({...socketInput(),[source]:'verified'},context,{enableSourceCandidateR2:true}))
      .rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });
  it('runs the actual ordinary Config verifyCore with both independent maps and keeps its admission held',async()=>{
    const singleWhole=await config(context).verifyCore();
    expect(singleWhole).toMatchObject({status:'SCOPED_TEST_ONLY_SOCKET_PROJECT_WHOLE_FINITE',entries:13,actualCoreCalls:13,completedCoreCalls:13,results:9,rejects:4,ready:false,full:false});
    const result=await candidate(context,socketInput()).verifyCore();
    expect(result).toMatchObject({status:'ACTUAL_R2_SOURCE_CANDIDATE_CORE_RESULT_NOT_ADMISSION',
      sourceAuthorityPromoted:false,projectAuthenticated:false,full:false,ready:false});
    expect(result.result.rows).toEqual([]);
    expect(result.result.preliminaryNeeds.find((n:{row_id:string})=>n.row_id===socketRow('mechanism:consumed'))?.quantity).toBe('2');
  });
  it('keeps manual quantity and price changes inside the same held material order owner',async()=>{
    const rowOverrides={[socketRow('mechanism:order')]:{quantity:'2',unitPrice:'77',includedInEstimate:true,includedInProcurement:true,
      provenance:{kind:'manual',reason:'TEST_ONLY caller must not promote source authority'}}};
    const result=await compile(socketInput(),context,{enableSourceCandidateR2:true,rowOverrides});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.find(n=>n.row_id===socketRow('mechanism:order'))?.missing_parameter_ids).toContain(source);
    const raw=result.preliminaryNeeds.find(n=>n.row_id===socketRow('mechanism:order'));assert(raw);
    expect(raw).toMatchObject({quantity:'2',unit_price:'77',procurement_eligible:true});
    const saved=savedArtifactNeeds(result,rowOverrides).filter(n=>n.row_id===raw.row_id);expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({quantity:'2',unit_price:'77',amount:null,included_in_estimate:false,included_in_procurement:false,procurement_eligible:false});
  });
});
test('recorded window outcome preserves exact success and failure without granting native or source authority',()=>{
  const outcomes:Record<string,unknown>[]=[
    {status:'NOT_ACCEPTED',testsPassed:false,launcherExit:1,error:'DB_JEST_FAILED'},
    {status:'EXPECTED_OUTCOME_AND_CLEAN_CLOSURE',testsPassed:true,launcherExit:0,error:null},
  ];
  const changes:Record<string,unknown[]>={
    status:[undefined,null,'UNKNOWN','NOT_ACCEPTED','EXPECTED_OUTCOME_AND_CLEAN_CLOSURE'],
    testsPassed:[undefined,null,0,1,'true',false,true],
    launcherExit:[undefined,null,false,true,-1,2,'0',0,1],
    error:[undefined,null,'DB_JEST_FAILED','OTHER_ERROR',false],
  };
  for(const outcome of outcomes){
    expect(()=>assertRecordedWindow(outcome)).not.toThrow();
    for(const[field,values]of Object.entries(changes)){
      for(const value of values){
        if(Object.is(value,outcome[field]))continue;
        expect(()=>assertRecordedWindow({...outcome,[field]:value})).toThrow('A9_EXACT_RECORDED_WINDOW_OUTCOME_REQUIRED');
      }
      const missing={...outcome};delete missing[field];
      expect(()=>assertRecordedWindow(missing)).toThrow('A9_EXACT_RECORDED_WINDOW_OUTCOME_REQUIRED');
    }
  }
});
