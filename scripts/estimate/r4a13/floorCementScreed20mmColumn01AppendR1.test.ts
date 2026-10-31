import{createHash}from'node:crypto';
import{mkdtempSync,writeFileSync,readFileSync,unlinkSync,rmdirSync}from'node:fs';
import{resolve,join}from'node:path';
import{tmpdir}from'node:os';
import{assertScreed01101CurrentBaseR1 as check,prepareFloorCementScreed20mmColumn01AppendR1 as prepare,
 prepareScreed01101RegistryCaptureInputR1,screed01101ParentPairR1 as pair,screed01101AppendIdentityR1 as identity,type Screed01101GovernedEvidenceR1}from'./prepareFloorCementScreed20mmColumn01AppendR1';
import{floorCementScreed20mmPackR1 as pack}from'../../../src/lib/estimate/v4/floorCementScreed20mmKrer11Column01R1';
// Gate fixtures only: never current-read evidence or ROOT review.
const fixture=()=>{const review={status:'VERIFIED_CURRENT_BOUNDED_THREE_BODY_SEMANTIC_COMPARISON_NOT_SAME_STANDALONE_01101',
 comparisons:[1,2,3].map(n=>({catalogId:'TEST_ONLY_'+n,definitionId:'TEST_DEFINITION_'+n,definitionHash:String(n).repeat(64)}))};
 const base:Record<string,any>={parent:{id:pair.definitionReleaseId,status:'prepared',activated_at:null},parentSearch:{id:pair.searchReleaseId,definition_release_id:pair.definitionReleaseId,status:'draft',activated_at:null},
  counts:{activeCompileJobs:0},session:{db:'rik_r4_runtime_b5_v2',host:'127.0.0.1',port:55432,readOnly:'on',isolation:'repeatable read'},
  collisionCounts:{definitions:0,exactLocators:0,groups:0,identities:0,membership:0,ordinal:0,search:0,sourceKeys:0},
  proposed:{catalog_id:identity.catalogId,work_key:identity.workKey,source_identity:identity.sourceIdentity,group_id:identity.groupId,
   source_key:pack.sourceId,locator_key:identity.locatorKey,norm_id:pack.normId,artifact_sha256:pack.source.sha256}};
 return{review,base,read:{status:'PASS_READ_ONLY_CURRENT_CEMENT_SCREED_INTAKE_R83',databaseWrites:false,completeReadSet:true,error:null,allTransactionsRolledBack:true,allConnectionsClosed:true,
  publicationAdmitted:false,rows:[{kind:'base',key:'base',payload:base},...review.comparisons.map(r=>({kind:'comparison',key:r.catalogId,payload:{unchanged:true,actual_definition_id:r.definitionId,actual_definition_hash:r.definitionHash}}))]},
 guard:{status:'PASS_BOUNDED_READ_ONLY_CURRENT_CEMENT_SCREED_INTAKE_R83',error:null,noOwnedProcessStillRunning:true,cleanupErrors:[],remainingOwnedProcesses:[]}};};
it('accepts only a fresh read-only current parent and preserved three adjacent anchors',()=>{const f=fixture();expect(check(f.read,f.guard,f.review)).toBe(f.base);});
it('blocks append if an exact current source key is already registered',()=>{const f=fixture();f.base.collisionCounts.sourceKeys=1;expect(()=>check(f.read,f.guard,f.review)).toThrow('SCREED01101_CURRENT_COLLISION_REQUIRES_OTHER_ROUTE');});
it('rejects an older serving parent rather than transplanting prior semantic proof',()=>{const f=fixture();f.base.parent.id='f36fa786-6634-518c-853d-b9ae54ab3ccf';expect(()=>check(f.read,f.guard,f.review)).toThrow();});
it('rejects changed adjacent body hashes even though old semantic review was distinct',()=>{const f=fixture();f.read.rows[1]!.payload.actual_definition_hash='0'.repeat(64);expect(()=>check(f.read,f.guard,f.review)).toThrow();});
it('rejects a read-write database snapshot',()=>{const f=fixture();f.base.session.readOnly='off';expect(()=>check(f.read,f.guard,f.review)).toThrow();});
const proposalTest=(wrongHash:boolean)=>{const directory=mkdtempSync(join(tmpdir(),'screed01101-governed-test-')),file=join(directory,'root-proposal.json'),bytes=JSON.stringify({status:'PROPOSAL_NOT_ROOT_REVIEWED'});
 try{writeFileSync(file,bytes,{flag:'wx'});const rootDecision={path:file,sha256:wrongHash?'0'.repeat(64):createHash('sha256').update(bytes).digest('hex')};
  expect(()=>prepare({rootDecision}as Screed01101GovernedEvidenceR1)).toThrow(wrongHash?'SCREED01101_EVIDENCE_CHANGED':'SCREED01101_ROOT_REVIEW_REQUIRED');
 }finally{unlinkSync(file);rmdirSync(directory);}};
it('a B-authored proposal cannot construct a publishable config or ROOT approval',()=>proposalTest(false));
it('an expected ROOT pin mismatch fails before any other file or database access',()=>proposalTest(true));
// Replay the exact recorded R83 A-read packet; this unit is not fresh current-registry proof.
it('builds only a narrow ordinary registry-read input from the exact historical R83 read before ROOT review',()=>{
 const directory=resolve(__dirname,'../../../data/estimate-benchmarks/fixtures/floor-screed20mm-r1/governed'),pin=(name:string,sha256:string)=>({path:join(directory,name),sha256});
 const input=prepareScreed01101RegistryCaptureInputR1({currentIntake:pin('currentIntake-d3dcd6bd061cb693.json','d3dcd6bd061cb6935c769d6a6fd3964a7da93e30d972b388ec701fbe79ea35ae'),
  currentReadGuard:pin('currentReadGuard-0c4ab5605eb24119.json','0c4ab5605eb241197cadbadb9d929d8ed87be308f2ef3931b7aa2d32965b779d'),semanticReview:pin('semanticReview-84fad0f80c9b9c92.json','84fad0f80c9b9c921d9bffd8da3403968ccb71bcc58672dde93f0accbcda812d')});
 expect(input.config.normId).toBe('11-01-011-01');expect(input.config).not.toHaveProperty('parameterDefinitions');expect(input.config).not.toHaveProperty('verifyCore');
 expect(input.newSource.source_key).toBe(pack.sourceId);expect(input.newSource.artifact_sha256).toBe(pack.source.sha256);expect(input.newLocators).toHaveLength(1);
 expect(input.newLocators[0]?.locator_key).toBe(identity.locatorKey);
 const outputDirectory=mkdtempSync(join(tmpdir(),'screed01101-registry-input-test-'));
 const file=join(outputDirectory,'ordinary-registry-capture-input-r2.json'),bytes=Buffer.from(JSON.stringify(input,null,2)+'\n');
 let created=false;
 try{writeFileSync(file,bytes,{flag:'wx'});created=true;expect(readFileSync(file)).toEqual(bytes);}
 finally{if(created&&readFileSync(file).equals(bytes))unlinkSync(file);rmdirSync(outputDirectory);}
});
