import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {floorConcreteUnderlayerDefinitionR1 as historical,floorConcreteUnderlayerPackR1 as pack,
 floorConcreteUnderlayerScenarioFactsR1} from '../../../src/lib/estimate/v4/floorConcreteUnderlayerKrer11Column09R1';
import {floorConcrete00209AdmittedDefinitionR1 as admitted,floorConcrete00209ExplicitParameterSourcesR1 as sourceMap,
 floorConcrete00209MachineBoundaryRuR1,type FloorConcrete00209RootScopeR1} from '../../../src/lib/estimate/v4/floorConcreteUnderlayer00209AdmittedR1';
import {assertFloorConcrete00209CurrentIntakeR1,prepareFloorConcreteUnderlayerColumn09AppendR1,
 prepareFloorConcrete00209RegistryCaptureInputR1} from './prepareFloorConcreteUnderlayerColumn09AppendR1';
import {assembleMasterExplicitParameterSourcesR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';

// Synthetic metadata projection fixture only. It is NOT a ROOT decision or publication proof.
const scope:FloorConcrete00209RootScopeR1={contractVersion:'floor-concrete00209-root-scope/r1',rootDecisionSha256:'a'.repeat(64),
 currentIntakeSha256:'97da664fd5b9c444dfb1feb37f531700459c20ad5c13ac773367bf5cd72e17fe',
 parentReleaseId:'f36fa786-6634-518c-853d-b9ae54ab3ccf',parentSearchReleaseId:'304b7f3f-1618-5e0e-91ea-da062e4f287e',
 sourceArtifactSha256:pack.source.sha256,quantityPackSha256:'d6c43122d3020d595e556f39b97a6efc9ef6ace0b900c82b5bef513144c2bffd',
 disposition:'SOURCE_SPECIFIC_PARTIAL_APPEND',quantityScope:'PARTIAL'};
const N='data/estimate-benchmarks/fixtures/floor-concrete00209-r65b/';
const read=()=>JSON.parse(readFileSync(N+'current-intake-result-r65b.json','utf8'));
const guard=()=>JSON.parse(readFileSync(N+'floor-current-read-r65b-receipt.json','utf8'));
const id=(suffix:string)=>pack.prefix+':'+suffix;
// This disposable fixture is not an integrator review. No writer is invoked by this suite.
function withSyntheticDecision<T>(change:Record<string,unknown>,run:(pin:{path:string;sha256:string})=>T):T {
 const path=N+'TEST_ONLY_SYNTHETIC_DECISION_'+process.pid+'.json';
 const decision={status:'ROOT_REVIEWED_FLOOR_CONCRETE00209_PARTIAL_APPEND',currentIntakeSha256:scope.currentIntakeSha256,
  pair:{definitionReleaseId:scope.parentReleaseId,searchReleaseId:scope.parentSearchReleaseId},
  identity:{catalogId:pack.proposedIdentity.catalogId,workKey:pack.proposedIdentity.workKey,groupId:pack.proposedIdentity.groupId,
   sourceIdentity:'master-work:'+pack.proposedIdentity.workKey,locatorKey:'krer11-01-002-09-floor-concrete-underlayer-exact'},
  boundedSemanticComparison:'EIGHT_CURRENT_HASHES_UNCHANGED_DIFFERENT_STANDALONE_SCOPE',quantityScope:'PARTIAL',
  fullTechnicalAcceptance:false,machineFinancialAdmission:false,acceptedNewCompleteTypes:0,...change};
 const bytes=JSON.stringify(decision);writeFileSync(path,bytes,{flag:'wx'});
 try{return run({path,sha256:createHash('sha256').update(bytes).digest('hex')});}finally{unlinkSync(path);}
}
it('uses the actual closed R65b read, not the rejected NULL R65 or the old release',()=>{
 const base=assertFloorConcrete00209CurrentIntakeR1(read(),guard());
 expect(base.proposed.catalog_id).toBe(pack.proposedIdentity.catalogId);
 expect(Object.values(base.collisionCounts)).toEqual(Array(8).fill(0));
});
it.each(['allTransactionsRolledBack','allConnectionsClosed','completeReadSet'] as const)
 ('requires closure and completion: %s',key=>{const r=read();r[key]=false;expect(()=>assertFloorConcrete00209CurrentIntakeR1(r,guard())).toThrow();});
it('rejects a collision, changed old passport, or old parent pair',()=>{
 const a=read();a.rows.find((r:any)=>r.kind==='base').payload.collisionCounts.groups=1;
 expect(()=>assertFloorConcrete00209CurrentIntakeR1(a,guard())).toThrow();
 const b=read();b.rows.find((r:any)=>r.kind==='comparison').payload.unchanged=false;
 expect(()=>assertFloorConcrete00209CurrentIntakeR1(b,guard())).toThrow();
 const c=read();c.rows.find((r:any)=>r.kind==='base').payload.parent.id='d7fa85c8-5625-5944-9324-ca230164a29b';
 expect(()=>assertFloorConcrete00209CurrentIntakeR1(c,guard())).toThrow();
});
it('cannot construct a publication config from source diagnostics alone',()=>{
 expect(()=>prepareFloorConcreteUnderlayerColumn09AppendR1({
  rootDecision:{path:N+'MISSING_ROOT_DECISION_NOT_AUTHORED_BY_TEST.json',sha256:'0'.repeat(64)},
  scopedRegistryCapture:{path:N+'MISSING_SCOPED_CAPTURE_NOT_AUTHORED_BY_TEST.json',sha256:'0'.repeat(64)}})).toThrow();
});
it('rejects substituted intake provenance even when its replacement has valid hash syntax',()=>{
 expect(()=>admitted({...scope,currentIntakeSha256:'b'.repeat(64)})).toThrow('FLOOR_CONCRETE00209_ROOT_SCOPE_REQUIRED');
});
it('rejects a decision that admits machine money or full completion',()=>{
 for(const change of [{machineFinancialAdmission:true},{fullTechnicalAcceptance:true},{acceptedNewCompleteTypes:1}])
  withSyntheticDecision(change,pin=>expect(()=>prepareFloorConcreteUnderlayerColumn09AppendR1({rootDecision:pin})).toThrow());
});
it('prepares only the existing bounded registry reader input, with exact proposed identities',()=>{
 withSyntheticDecision({},pin=>{
  const input=prepareFloorConcrete00209RegistryCaptureInputR1(pin);
  expect(input.newSource.id).toBe('44702d44-e96f-52b6-a64b-307a3995c59b');
  expect(input.newLocators.map(r=>r.id)).toEqual(['29a0e02a-64a8-50a9-90b3-bc53aebae967']);
  expect(input.newSource.metadata.activationAllowed).toBe(false);
 });
});
it('capture-only configuration refuses verifyCore before any publication route',async()=>{
 const config=withSyntheticDecision({},pin=>prepareFloorConcreteUnderlayerColumn09AppendR1({rootDecision:pin}));
 expect(config.masterSha256).toBe('cc24bf998bb71d71ecbe38646a20a404e4b700483c69fee769dd9e695a037bab');
 await expect(config.verifyCore()).rejects.toThrow('FLOOR00209_CAPTURE_ONLY_CONFIG_CANNOT_PUBLISH');
});
it('preserves all 53 numerical rows, formulas, payment/inclusion gates and the historical object',()=>{
 const old=historical(),before=JSON.stringify(old),next=admitted(scope);
 expect(JSON.stringify(old)).toBe(before);expect(next.parameters).toEqual(old.parameters);expect(next.formulas).toEqual(old.formulas);
 expect([next.parameters.length,next.formulas.length,next.resources.length]).toEqual([32,53,53]);
 for(let i=0;i<old.resources.length;i++){
  const a=old.resources[i]!,b=next.resources[i]!;
  for(const key of ['row_id','formula_id','unit_id','cost_owner_id','inclusion_ast','procurement_eligible'])
   expect((b as any)[key]).toEqual((a as any)[key]);
  const {publicResourcePresentationV1:_pa,...ga}=a.resource_graph;
  const {publicResourcePresentationV1:_pb,...gb}=b.resource_graph;
  expect(gb).toEqual(ga);
 }
 expect(next.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id).sort())
  .toEqual(['whole-labor','concrete-b125-order','bitumen-latex-mastic-order','water-order','softwood-board-order'].map(id).sort());
});
it('keeps five unknown needs with no normative source and four real derived control slots with empty sources',()=>{
 const d=admitted(scope),map=sourceMap(),values=Object.values(map);
 expect(values.filter(v=>v.kind==='UNRESOLVED')).toHaveLength(5);
 expect(values.filter(v=>v.kind==='DERIVED')).toHaveLength(4);
 expect(values.filter(v=>v.kind==='KNOWN')).toHaveLength(23);
 const assembled=assembleMasterExplicitParameterSourcesR1({errorPrefix:'TEST_FLOOR00209_',parameters:d.parameters,
  newParameterSources:map,sourceClosure:[pack.sourceId],oldResourceRowIds:[],
  next:{parameters:d.parameters,formulas:d.formulas,resources:d.resources}});
 for(const p of d.parameters)expect(assembled[p.parameter_id]).toEqual(map[p.parameter_id]!.sourceIds);
 for(const r of d.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM')){
  expect(r.source_metadata?.normative_source_ids).toEqual([]);expect(r.source_metadata?.normativeTrace).toEqual([]);
 }
});
it('removes only authoring admission flags, preserves exact roles and does not promise an admitted vibrator price',()=>{
 const next=admitted(scope);
 for(const r of next.resources){
  expect(r.source_metadata).not.toHaveProperty('sourceAdmissionPending');
  expect(r.source_metadata).not.toHaveProperty('identityAdmissionPending');
  expect(r.source_metadata).not.toHaveProperty('publicationAllowed');
  expect(r.source_metadata?.full_technical_acceptance).toBe(false);
  expect((r.source_metadata?.rootScopeProvenanceR1 as any).newCompleteTypesAccepted).toBe(0);
 }
 for(const suffix of ['surface-vibrator-consumed','surface-vibrator-own','surface-vibrator-hired','open-machine-price-scope']){
  const r=next.resources.find(r=>r.row_id===id(suffix))!,p=r.resource_graph.publicResourcePresentationV1 as any;
  expect(p.detailsRu).toContain(floorConcrete00209MachineBoundaryRuR1);
  expect(p.detailsRu.join(' ')).not.toContain('Оплачивается один выбранный способ');
  expect(r.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
 }
 expect(next.resources.filter(r=>r.source_metadata?.sourceNormQuantityAccepted===true)).toHaveLength(10);
});
it('uses the ordinary compiler and keeps machine price77 outside payment/procurement with5 open needs',async()=>{
 const d=admitted(scope);
 const r=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.proposedIdentity.catalogId,
  primaryMeasureParameterId:pack.measurement.parameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],
  resourceDefinitions:[...d.resources],submittedParameters:floorConcreteUnderlayerScenarioFactsR1('12.5'),confirmedParameters:{},
  currencyCode:'KGS',maximumResourceRows:53,priceItems:[],rowOverrides:{[id('surface-vibrator-own')]:{
   unitPrice:'77',provenance:{kind:'manual',reason:'TEST_ONLY scalar must not resolve missing machine rule'}}},hashJson:estimateDeterministicHash});
 expect(r.preliminaryNeeds).toHaveLength(5);expect(r.totals.amount).toBe('0');
 expect(r.rows.filter(r=>r.included_in_procurement)).toHaveLength(4);
 for(const [suffix,quantity] of [['whole-labor','22.5'],['surface-vibrator-consumed','6'],['concrete-b125-consumed','12.75'],
  ['bitumen-latex-mastic-consumed','0.025'],['water-consumed','4.375'],['softwood-board-consumed','0.0125']])
  expect(r.rows.find(r=>r.row_id===id(suffix))?.quantity).toBe(quantity);
 const machine=r.rows.find(r=>r.row_id===id('surface-vibrator-own'))!;
 expect(machine.included_in_estimate).toBe(false);expect(machine.included_in_procurement).toBe(false);
});
