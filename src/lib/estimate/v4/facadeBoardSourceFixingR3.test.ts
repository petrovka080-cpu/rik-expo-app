import assert from 'node:assert/strict';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import oracle from '../../../../data/estimate-benchmarks/fixtures/facade-board-source-fixing-independent-r3.json';
import source from '../../../../data/estimate-benchmarks/source-packs/facade-board-source-fixing-r3.json';
import {facadeApprovedBoardFixingCountsR3 as count,compileFacadeBoardSourceFixingR3 as compile,facadeBoardSourceFixingDefinitionR3 as build,type FacadeApprovedBoardScheduleR3,type FacadeBoardFixingKeyR3} from './facadeBoardSourceFixingR3';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
const consumerInputRole=(value:unknown):unknown=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&'consumer_input_role_v1'in value?value.consumer_input_role_v1:undefined;
const capture=(key:FacadeBoardFixingKeyR3,widths:readonly string[],intersections:readonly number[]):FacadeApprovedBoardScheduleR3=>({profile:key,sourceSha256:source.profiles.find(p=>p.key===key)!.source.sha256,approvedProjectReference:'TEST_ONLY manufacturer-specific accepted project;notactualPPR',approvedLayoutSha256:'a'.repeat(64),exactMaterialSupportAndFastenerAccepted:true,boards:widths.map((widthMm,i)=>({boardId:'TEST-B'+i,widthMm,supportIntersectionIds:Array.from({length:intersections[i]!},(_,j)=>'TEST-S'+j)}))});
// Independent literal source oracles. Actual product/Jest imports UNRUN by author.
describe('internal source-specific facade-board fixing R3',()=>{
 for(const c of oracle.examples)test(c.caseId,async()=>{
  const input=capture(c.profile as FacadeBoardFixingKeyR3,c.boardWidthsMm,c.intersectionsPerBoard),before=JSON.stringify(input),q=count(input);
  for(const k of ['narrow','wide','all','screws'] as const)assert.equal(q[k],c.expected[k]);
  const result=await compile(input),p=source.profiles.find(p=>p.key===input.profile)!;
  const row=result.rows.find(r=>r.row_id===p.prefix+':screws');assert(row);assert(row.quantity!==null);assert.equal(cmp(row.quantity,c.expected.screws),0);
  assert.equal(row.included_in_estimate,true);assert.equal(row.included_in_procurement,true);assert.equal(row.unit_id,'piece');
  assert.equal(result.preliminaryNeeds.length,p.needs.length);assert(result.preliminaryNeeds.every(n=>n.quantity===null));
  assert.equal(JSON.stringify(input),before);
 });
 test('same28approvedintersections require28 narrowThermowood screws or56 WPC screws',()=>{
  assert.equal(count(capture('thermowood-horizontal-tg',['117'],[28])).screws,'28');
  assert.equal(count(capture('wpc-horizontal-wood',['184.15'],[28])).screws,'56');
 });
 test('exact140mm timber and unrelatedWPC widths do not inherit neighbouring norm',()=>{
  assert.throws(()=>count(capture('thermowood-horizontal-tg',['140'],[4])),{code:'PARAMETER_VALIDATION_FAILED'});
  assert.throws(()=>count(capture('wpc-horizontal-wood',['117'],[4])),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('unapproved/source/layout and duplicate intersections cannot supply a quantity',()=>{
  const x=capture('wpc-horizontal-wood',['184.15'],[4]);
  for(const patch of [{sourceSha256:'0'.repeat(64)},{exactMaterialSupportAndFastenerAccepted:false},{approvedProjectReference:''},{approvedLayoutSha256:'not-captured'},{boards:[]}])assert.throws(()=>count({...x,...patch} as FacadeApprovedBoardScheduleR3),{code:'PARAMETER_VALIDATION_FAILED'});
  assert.throws(()=>count({...x,boards:[{...x.boards[0]!,supportIntersectionIds:['S1','S1','S2']}]}),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('unknown whole provision stays internal and no object facts are preset',()=>{
  for(const key of ['thermowood-horizontal-tg','wpc-horizontal-wood'] as const){const d=build(key),p=source.profiles.find(p=>p.key===key)!;
   assert(d.parameters.every(p=>p.default_value===null));assert.equal(d.parameters.filter(p=>p.parameter_id.startsWith('board_fixing_unknown_')).length,p.needs.length);
   assert(d.resources.every(r=>r.source_metadata?.full_technical_acceptance===false));
   assert(!d.resources.some(r=>r.category==='labor'&&r.resource_graph.costTreatment==='OWN_COST'));
  }
 });
});

const trustedReadbackCore=(submittedParameters:Record<string,unknown>,confirmedParameters:Record<string,unknown>)=>{
 const definition=build('thermowood-horizontal-tg');
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',compilerVersion:'TEST_ONLY_EXISTING_COMPONENT_READBACK_BOUNDARY',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters,confirmedParameters,priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,hashJson:hash});
};
test('existing imported schedule and passport facts stay outside ordinary inputs and reject raw authority echoes',async()=>{
 const definition=build('thermowood-horizontal-tg'),confirmed:Record<string,unknown>={board_fixing_scheduled_boards:'1',board_fixing_actual_narrow_intersections:'4',board_fixing_actual_wide_intersections:'0',board_fixing_approved_project:'TEST_ONLY imported approved project',board_fixing_layout_sha256:'a'.repeat(64),board_fixing_exact_source:source.profiles[0]!.source.sha256};
 assert.deepEqual(definition.parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT').map(parameter=>parameter.parameter_id),[]);
 assert.deepEqual(definition.ordinaryParameterIds,[]);
 for(const key of ['board_fixing_scheduled_boards','board_fixing_actual_narrow_intersections','board_fixing_approved_project','board_fixing_exact_source']){
  const parameter=definition.parameters.find(parameter=>parameter.parameter_id===key);assert(parameter);
  assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal(consumerInputRole(parameter.truth_metadata.provenance),'APPLICATION_TECHNICAL');
  for(const value of [confirmed[key],null,undefined])await assert.rejects(()=>trustedReadbackCore({...{},[key]:value},confirmed),{code:'PARAMETER_VALIDATION_FAILED'});
 }
});
test('missing imported schedule or PPR never yields a zero quantity or complete equipment provision',async()=>{
 const result=await trustedReadbackCore({},{});
 assert(result.preliminaryNeeds.length>0);assert(result.preliminaryNeeds.every(need=>need.quantity===null));
 assert(!result.rows.some(row=>row.included_in_estimate||row.included_in_procurement));
});

test('source fixing widths preserve exact scale9 neighbours without rounding a foreign profile into WPC',()=>{
 assert.equal(count(capture('thermowood-horizontal-tg',['139.999999999'],[3])).screws,'3');
 assert.equal(count(capture('thermowood-horizontal-tg',['140.000000001'],[3])).screws,'6');
 assert.equal(count(capture('wpc-horizontal-wood',['184.15'],[3])).screws,'6');
 for(const [profile,width]of [['wpc-horizontal-wood','184.1500000001'],['wpc-horizontal-wood','184.1499999999'],['thermowood-horizontal-tg','139.9999999999']]as const)
  assert.throws(()=>count(capture(profile,[width],[3])),{code:'PARAMETER_VALIDATION_FAILED'});
 const numericWidth={...capture('wpc-horizontal-wood',['184.15'],[3]).boards[0]!};Reflect.set(numericWidth,'widthMm',184.15);
 assert.throws(()=>count({...capture('wpc-horizontal-wood',['184.15'],[3]),boards:[numericWidth]}),{code:'PARAMETER_VALIDATION_FAILED'});
});
