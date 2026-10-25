import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/masonry-glass-m25-display-link-r152.json';
import deltaMap from '../../../data/estimate-benchmarks/source-packs/masonry-glass-m25-display-map-r152.json';
import fixture from '../../../data/estimate-benchmarks/fixtures/masonry-glass-m25-display-fixture-r152.json';
import {prepareMasonryGlassBlockNormalAppendR103,masonryGlassBlockNormalPreflightR103} from './prepareMasonryGlassBlockNormalAppendR103';
import {masonryGlassBlockNormalDefinitionR103,masonryGlassBlockPhysicalInputR103,
 type MasonryGlassBlockCardKeyR103} from '../../../src/lib/estimate/v4/masonryGlassBlockNormalCardsR103';
import {masonryGlassM25OperationDefinitionR152} from '../../../src/lib/estimate/v4/masonryGlassM25OperationDisplayR152';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections}
 from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

type Context=Parameters<typeof prepareMasonryGlassBlockNormalAppendR103>[1];
type Json=Record<string,unknown>;
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function object(v:unknown):Json{assert(record(v));return v;}
const packPath='data/estimate-benchmarks/source-packs/masonry-glass-m25-display-link-r152.json';
let calls=0;
export const masonryGlassM25ActualEntriesR152=()=>calls;
function output(name:string,value:unknown){const root=process.env.MASONRY_R152_ACTUAL_OUTPUT;if(!root)return;
 mkdirSync(root,{recursive:true});writeFileSync(resolve(root,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}

/** Existing backend Config/publisher/core route only. IDs and source owners
 * remain R105; historical R58 search is not a current registry absence guard. */
export function prepareMasonryGlassM25OperationDisplayR152(key:MasonryGlassBlockCardKeyR103,context:Context):Config{
 for(const pin of source.inputs)assert.equal(createHash('sha256').update(readFileSync(resolve(context.sourceRoot,pin.path))).digest('hex'),pin.sha256,pin.path);
 const base=prepareMasonryGlassBlockNormalAppendR103(key,context);masonryGlassBlockNormalPreflightR103(base,key);
 const model=masonryGlassM25OperationDefinitionR152(key),inherited=object(base.passport.independentCompletenessMap);assert(Array.isArray(inherited.entries));
 const required=deltaMap.entries.filter(e=>e.card===key);
 const map={...inherited,entries:inherited.entries.map((v:unknown)=>{
  const entry=object(v),replacement=[...required,...deltaMap.labourEntries.filter(e=>e.card===key)]
   .find(r=>r.expectedResourceId===entry.expectedResourceId);
  return replacement?{...entry,requiredOperationIds:replacement.requiredOperationIds}:entry;
 }),glassM25OperationDisplayR152:{sameNativeRows:true,noQuantityAllocation:true,newPaidOwners:0,full:false}};
 const config:Config={...base,contract:source.contract,stopCode:'MASONRY_GLASS_M25_DISPLAY_R152',
  applicationName:'masonry-glass-m25-display-r152-'+key,receiptFileStem:'masonry_glass_m25_display_r152_'+key,
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  sourcePaths:[...new Set([...base.sourcePaths,packPath,...source.inputs.map(p=>p.path)])],
  sourceMetadata:{...base.sourceMetadata,artifact_sha256:createHash('sha256').update(readFileSync(resolve(context.sourceRoot,packPath))).digest('hex'),
   source_kind:'OWN_KG_GLASS_COLUMNS_SAME_M25_AND_WHOLE_LABOUR_OPERATION_DISPLAY_ONLY',
   use_restriction:base.sourceMetadata.use_restriction+'; Same original M25 quantity/owner referenced at own included operations; original whole-labour references receive the required criterion from their own existing markers. No quantity split, added row, payment or completeness claim.'},
  passport:{...base.passport,independentCompletenessMap:map},
  locator:{key:base.locator.key,payload:{...object(base.locator.payload),m25OperationDisplay:source,independentDisplayMap:deltaMap}},
  verifyCore:async()=>{
   masonryGlassM25DisplayPreflightR152(config,key);
   let local=0;
   for(const scenario of fixture.scenarios.filter(s=>s.card===key)){
    calls++;local++;process.stdout.write('MASONRY_R152_ACTUAL_CORE_ENTRY='+calls+';case='+scenario.normId+'\n');
    let result:Awaited<ReturnType<typeof compileCanonicalEstimateCore>>;
    try{result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:source.contract,catalogId:config.catalogId,
     primaryMeasureParameterId:scenario.primaryMeasureParameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],
     resourceDefinitions:[...model.resources],submittedParameters:masonryGlassBlockPhysicalInputR103(key,scenario.areaM2,scenario.heightM),
     confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:config.resourceDefinitions.length,hashJson:v=>hash(v)});
     output('CORE_OUTCOME_'+String(calls).padStart(2,'0'),{card:key,normId:scenario.normId,result});
    }catch(error:unknown){output('CORE_OUTCOME_'+String(calls).padStart(2,'0'),{card:key,normId:scenario.normId,
     code:record(error)?error.code:null,message:error instanceof Error?error.message:String(error)});throw error;}
    const row=result.rows.find(r=>r.row_id===scenario.mortarRowId);assert(row);
    assert.equal(row.quantity,scenario.expectedM25M3);assert.equal(row.unit_id,'m3');assert.equal(row.included_in_estimate,false);
    assert.equal(row.included_in_procurement,false);assert.equal(row.unit_price,null);
    const graph=object(object(row.calculation_trace).resourceGraph);
    assert.deepEqual(canonicalEstimateOperationReferences(graph.operationCompositionV1).map(r=>r.operationId).sort(),[...scenario.requiredOperationIds].sort());
    const labour=result.rows.find(r=>r.row_id===scenario.labourRowId);assert(labour);
    assert.equal(labour.quantity,scenario.expectedWholeLabourManHours);assert.equal(labour.unit_id,'man_hour');
    const labourGraph=object(object(labour.calculation_trace).resourceGraph);
    assert.deepEqual(canonicalEstimateOperationReferences(labourGraph.operationCompositionV1).map(r=>r.operationId).sort(),
     [...scenario.requiredLabourOperationIds].sort());
    assert.equal(result.preliminaryNeeds.length,10);assert(result.preliminaryNeeds.every(r=>r.quantity===null));
    assert.deepEqual(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id),[scenario.prefix+':whole-labour']);
   }
   assert.equal(local,2);
   return{status:'PASS_TWO_AFFECTED_GLASS_M25_OPERATION_DISPLAY_CORES_NOT_UI_OR_FULL',card:key,entries:local,
    old13CasesRepeated:false,newRows:0,newPaidOwners:0,closedNeeds:0,actualDbNormalLocked:'UNRUN',ui:'UNRUN',full:false};
  }};
 return config;
}

export function masonryGlassM25DisplayPreflightR152(config:Config,key:MasonryGlassBlockCardKeyR103){
 masonryGlassBlockNormalPreflightR103(config,key);
 const old=masonryGlassBlockNormalDefinitionR103(key);
 assert.equal(config.passport.workKey,old.card.workKey);
 assert.equal(config.catalogAppend?.identity.sourceIdentity,old.card.sourceIdentity);
 assert.deepEqual(config.parameterDefinitions,old.parameters);assert.deepEqual(config.formulaDefinitions,old.formulas);
 assert.equal(config.resourceDefinitions.length,old.resources.length);
 const required=deltaMap.entries.filter(e=>e.card===key);assert.equal(required.length,2);
 const labourExpected=deltaMap.labourEntries.filter(e=>e.card===key);assert.equal(labourExpected.length,2);
 for(const before of old.resources){const after=config.resourceDefinitions.find(r=>r.row_id===before.row_id);assert(after);
  for(const field of ['row_id','formula_id','unit_id','cost_owner_id','procurement_eligible','inclusion_ast','source_metadata'] as const)assert.deepEqual(after[field],before[field]);
  assert.equal(after.resource_graph.costTreatment,before.resource_graph.costTreatment);
  const expectation=required.find(e=>e.rowId===after.row_id);
  const expectedLabour=labourExpected.find(e=>e.rowId===after.row_id);
  if(expectedLabour){
   const{operationCompositionV1:_oldOperation,...beforeGraph}=before.resource_graph;
   const{operationCompositionV1:_newOperation,...afterGraph}=after.resource_graph;
   assert.deepEqual(afterGraph,beforeGraph,'LABOUR_QUANTITY_AND_OWNER_GRAPH_UNCHANGED');
   assert.deepEqual(canonicalEstimateOperationReferences(after.resource_graph.operationCompositionV1).map(r=>r.operationId).sort(),
    [...expectedLabour.requiredOperationIds].sort());
   const scenario=fixture.scenarios.find(s=>s.normId===expectedLabour.normId);assert(scenario);
   const input=masonryGlassBlockPhysicalInputR103(key,scenario.areaM2,scenario.heightM);
   const active=config.resourceDefinitions.filter(r=>resolveInclusionGraph(object(r.inclusion_ast),input).value===true);
   const sections=canonicalEstimateResourceOperationSections(active.map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
   for(const id of expectedLabour.requiredOperationIds.filter(id=>!id.endsWith(':assemble'))){
    const section=sections.find(s=>s.operation?.operationId===id);assert(section);
    assert.equal(section.sharedResources.filter(r=>r.rowId===after.row_id).length,1,'SAME_ORIGINAL_LABOUR_EDIT_AND_PAYMENT_OWNER');
   }
   continue;
  }
  if(!expectation){assert.deepEqual(after,before);continue;}
  const refs=canonicalEstimateOperationReferences(after.resource_graph.operationCompositionV1);
  assert.equal(refs[0]?.operationId,expectation.prefix+':operation:assemble');
  assert.deepEqual(refs.map(r=>r.operationId).sort(),[...expectation.requiredOperationIds].sort());
  const scenario=fixture.scenarios.find(s=>s.normId===expectation.normId);assert(scenario);
  const input=masonryGlassBlockPhysicalInputR103(key,scenario.areaM2,scenario.heightM);
  const active=config.resourceDefinitions.filter(r=>resolveInclusionGraph(object(r.inclusion_ast),input).value===true);
  const sections=canonicalEstimateResourceOperationSections(active.map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
  for(const id of expectation.requiredOperationIds.filter(id=>!id.endsWith(':assemble'))){
   const section=sections.find(s=>s.operation?.operationId===id);assert(section);
   assert.equal(section.sharedResources.filter(r=>r.rowId===after.row_id).length,1,'SAME_ORIGINAL_EDIT_AND_QUANTITY_OWNER');
  }
 }
 return{scope:'PURE_BACKEND_MODEL_MAP_AND_SHARED_RESOURCE_PROJECTION_NOT_NATIVE_UI',newRows:0,closedNeeds:0,full:false};
}
