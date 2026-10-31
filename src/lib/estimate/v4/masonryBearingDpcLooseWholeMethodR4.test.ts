import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildMasonryBearingDpcLoosePartR4 as build} from './masonryBearingDpcLooseWholeMethodR4';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

const length='dpc_test_straight_length_m',prefix='masonry:bearing-dpc:loose-polyolefin:r4:';
function compile(value:string,thickness:'0.25'|'0.4'|'0.5'='0.25',extra:Record<string,unknown>={}){
 const part=build(thickness,length);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'DPC_R4_TARGETED_SOURCE_COMPONENT',catalogId:'TEST_ONLY_CURRENT_MASONRY_COMPONENT',primaryMeasureParameterId:length,parameterDefinitions:part.parameters,formulaDefinitions:[...part.formulas],resourceDefinitions:part.resources,submittedParameters:{[length]:value,...extra},confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:part.resources.length,hashJson:hash});
}

test('DPC straight-run roll boundaries include the physical200mm overlap, without a waste factor',async()=>{
 for(const [L,rolls,installed,offcut] of [['25','1','9.125','0'],['25.001','2','9.198365','24.799'],['49.8','2','18.25','0'],['49.8001','3','18.3230365','24.7999']]){
  const result=await compile(L),quantity=(key:string)=>result.rows.find(row=>row.row_id===prefix+key)?.quantity;
  assert.equal(quantity('strip-gross-rolls'),rolls);assert.equal(quantity('strip-installed'),installed);assert.equal(quantity('strip-offcuts'),offcut);
 }
});

test('DPC source profiles retain at least50mm projection each side and explicit single-layer widths',async()=>{
 for(const [wall,width] of [['0.25','0.365'],['0.4','0.5'],['0.5','0.6']] as const){
  const part=build(wall,length),material=part.resources.find(row=>row.row_id===prefix+'strip-installed')!;
  assert(Number(width)-Number(wall)>=0.1-1e-12);assert.equal(material.source_metadata?.stripWidthM,width);
  const result=await compile('10',wall);assert.equal(result.rows.find(row=>row.row_id===material.row_id)?.quantity,String(10*Number(width)));
  assert.equal(part.wholeFamilyReady,false);assert.deepEqual(part.closedParentNeedIds,[]);
 }
});

test('DPC mortar, labour, complete tools and disposed waste remain application-owned unknowns',async()=>{
 const result=await compile('10');
 for(const key of ['bed-mortar','installation-labour','measuring-cutting-tools','disposed-waste']){const need=result.preliminaryNeeds.find(row=>row.row_id===prefix+key);assert(need,key);assert.equal(need.quantity,null);}
 const part=build('0.25',length);for(const parameter of part.parameters.filter(value=>value.parameter_id!==length)){assert.equal(parameter.default_value,null);assert.equal(parameter.truth_metadata.value_source_role,'UNRESOLVED_APPLICATION_NORM');assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');}
 await assert.rejects(()=>compile('10','0.25',{mdpc4_bed_m3:'0'}));
});

test('DPC has one resource owner across its whole operations and no new paid or procurement owner',()=>{
 const part=build('0.25',length);assert.equal(new Set(part.resources.map(row=>row.row_id)).size,part.resources.length);
 assert.equal(part.wholeMethodOperations.length,4);
 for(const row of part.resources){assert.equal((row.resource_graph as Record<string,unknown>).costTreatment,'INFORMATIONAL_SCOPE');assert.equal(row.procurement_eligible,false);assert.equal(row.source_metadata?.kgComplianceClaim,false);assert(row.resource_graph.operationCompositionV1);}
 const strip=part.resources.find(row=>row.row_id===prefix+'strip-installed')!;assert.equal((strip.resource_graph.operationCompositionV1 as {additionalOperations:unknown[]}).additionalOperations.length,2);
 assert(!part.resources.some(row=>/грунтов|мастик|газов|горелк/iu.test(row.title_ru)));
});
