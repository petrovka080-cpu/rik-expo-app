import assert from 'node:assert/strict';
import {facadeBoardWithEndProtectionDefinitionR5 as build,compileFacadeBoardWithEndProtectionR5 as compile,facadeTimberEndCompletenessR5 as complete,facadeTimberEndAreaR5 as area,facadeTimberEndProtectionPrefixR5 as prefix,facadeTimberEndNormR5 as norm,type FacadeTimberEndFactsR5} from './facadeTimberEndProtectionWholeR5';
import {facadeBoardSourceFixingDefinitionR3 as original,type FacadeApprovedBoardScheduleR3} from './facadeBoardSourceFixingR3';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {facadeBoardCutEndFactsR5 as cutFacts,compileFacadeBoardWithCutEndReadbackR5 as compileCuts,type FacadeTimberCutEndReadbackR5} from './facadeTimberEndProtectionWholeR5';

const schedule:FacadeApprovedBoardScheduleR3={profile:'thermowood-horizontal-tg',sourceSha256:'b22f49aef753e630cee81a1e850182232b59c1f4ba8aba47bb18ad65255810a0',approvedProjectReference:'TEST_ONLY exact thermally modified T&G facade with synthetic accepted profile and fixing layout',approvedLayoutSha256:'a'.repeat(64),exactMaterialSupportAndFastenerAccepted:true,
  boards:Array.from({length:10},(_,n)=>({boardId:'TEST_ONLY_BOARD_'+n,widthMm:'90',supportIntersectionIds:['s1','s2','s3']}))};
const facts=(netEndAreaM2:string):FacadeTimberEndFactsR5=>({netEndAreaM2,approvedEndLayoutSha256:'b'.repeat(64),approvedSourceFitReference:'TEST_ONLY exact accepted product/TDS and dry/sanded/dustfree onecoat method; not actual site approval',exactTdsSha256:'f483fd6adfd719e9b4ab74e2d92832247521ccb6a7b3341908c75f9c6cbdd906'});
// Synthetic net cross-section0.0012m2 from accepted actual T&G profile, not
// width*thickness envelope. 2/4/20 exposed ends among10boards; literal masses.
const cases=[{ends:2,endArea:'0.0024',kg:'0.00144'},{ends:4,endArea:'0.0048',kg:'0.00288'},{ends:20,endArea:'0.024',kg:'0.0144'}];
const needKeys=['whole-labour','brush-post','abrasives','dust-removal','chemical-PPE','cleaning-detergent','waste-collection','quality-storage'];
const rawInput={board_fixing_scheduled_boards:'10',board_fixing_actual_narrow_intersections:'30',board_fixing_actual_wide_intersections:'0',board_fixing_approved_project:schedule.approvedProjectReference,board_fixing_layout_sha256:schedule.approvedLayoutSha256,board_fixing_exact_source:schedule.sourceSha256,[area]:'0.024',timber_end_protection_exact_method:'Защита торца одним слоем водного состава',timber_end_protection_approved_source:facts('0.024').approvedSourceFitReference,timber_end_protection_layout_sha256:'b'.repeat(64)};
function rawCompile(parameters:Record<string,unknown>) {
  const model=build();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'TEST_ONLY_endprotection_source_R5',catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',primaryMeasureParameterId:area,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:{},confirmedParameters:parameters,rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}
describe('whole existing thermo-board end-protection source R5, not complete facade',()=>{
  for(const c of cases)test('independent net area of '+c.ends+' exposed ends preserves0.6kg/m2 minimum without litre conversion',async()=>{
    const result=await compile(schedule,facts(c.endArea)),row=result.rows.find(r=>r.row_id===prefix+':sealer-minimum');assert(row);
    assert.equal(cmp(row.quantity,c.kg),0);assert.equal(row.unit_id,'kg');
    assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);assert.equal(row.unit_price,null);
    const screw=result.rows.find(r=>r.row_id.endsWith(':screws'));assert(screw);assert.equal(cmp(screw.quantity,'30'),0);
    assert.equal(result.preliminaryNeeds.length,16);assert(result.preliminaryNeeds.every(n=>n.quantity===null));
  });
  test('whole existing board resources/formulas and independent WPC source stay intact',()=>{
    const parent=original('thermowood-horizontal-tg'),wpc=original('wpc-horizontal-wood'),before=JSON.stringify({parent,wpc}),model=build();
    assert.deepEqual(model.resources.slice(0,parent.resources.length),parent.resources);
    assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas);
    assert.equal(JSON.stringify({parent,wpc}),before);
    assert.equal(JSON.stringify(original('wpc-horizontal-wood')),JSON.stringify(wpc));
    assert.equal(new Set(model.parameters.map(p=>p.parameter_id)).size,model.parameters.length);
  });
  test('wrong product hash or WPC cannot activate the selected thermo-board method',()=>{
    assert.throws(()=>compile(schedule,{...facts('0.024'),exactTdsSha256:'0'.repeat(64)}),{code:'PARAMETER_VALIDATION_FAILED'});
    assert.throws(()=>compile({...schedule,profile:'wpc-horizontal-wood'},facts('0.024')),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test('negative end area rejected; no untreated ends does not hide original whole-facade needs',async()=>{
    await assert.rejects(()=>compile(schedule,facts('-1')),{code:'PARAMETER_VALIDATION_FAILED'});
    const result=await compile(schedule,facts('0'));
    assert(!result.rows.some(r=>r.row_id.startsWith(prefix+':')));
    assert(!result.preliminaryNeeds.some(n=>n.row_id.startsWith(prefix+':')));
    assert.equal(result.preliminaryNeeds.length,8);
  });
  test('all8new whole-cycle internal norms reject supplied0/1/77',async()=>{
    for(const key of needKeys)for(const value of ['0','1','77'])await assert.rejects(()=>rawCompile({...rawInput,[norm(key)]:value}),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test('source minimum is only actual net end area, independent from facade area/nominal density',()=>{
    const model=build(),formula=model.formulas.find(f=>f.formula_id===prefix+':formula:sealer-minimum');assert(formula);
    assert.deepEqual(formula.input_parameter_ids,[area]);
    assert(!model.parameters.some(p=>/density|liter|coverage|kg_per|norm600/iu.test(p.parameter_id)));
    assert(model.parameters.every(p=>p.default_value===null));
    assert.deepEqual(model.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT'),[],
      'INTERNAL_SUBWORK_USES_APPROVED_PROJECT_READBACK_NOT_A_TECHNICAL_FORM');
    assert.deepEqual(model.ordinaryParameterIds,[],'HIDDEN_IMPORTED_CONTEXT_MUST_NOT_REAPPEAR_IN_ORDINARY_PARAMETER_LIST');
  });
  test('retained reference price cannot turn minimum applied mass into second paid supply',async()=>{
    const rowId=prefix+':sealer-minimum',result=await compile(schedule,facts('0.024'),{rowOverrides:{[rowId]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY raw reference price of applied minimum'}}}});
    const row=result.rows.find(r=>r.row_id===rowId);assert(row);assert(row.unit_price!==null&&row.amount!==null,'ACTUAL_REFERENCE_PRICE_AND_AMOUNT_REQUIRED');assert.equal(cmp(row.unit_price,'200'),0);assert.equal(cmp(row.amount,'2.88'),0);
    assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
    assert(result.preliminaryNeeds.some(n=>n.row_id==='facade:board-fixing:r3:thermowood-horizontal-tg:need:cut-end-protection'));
  });
  test('full independent component map/operations and one unresolved source owner retained',()=>{
    const model=build(),minimum=model.resources.find(r=>r.row_id===prefix+':sealer-minimum');assert(minimum);
    assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:complete(),formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
    assert.equal(minimum.resource_graph.includedInResourceOwnerRowId,'facade:board-fixing:r3:thermowood-horizontal-tg:need:cut-end-protection');
    assert.equal(minimum.source_metadata?.parentSupplyOwnerStillUnresolved,true);
    assert.equal(minimum.source_metadata?.full_technical_acceptance,false);
    assert(!model.resources.filter(r=>r.row_id.startsWith(prefix+':')).some(r=>/TEKNOS|DRYWOOD|KOPSE|LUNAWOOD/iu.test(r.title_ru)));
  });
});

// Source-readback identity/geometry extension only. The previous aggregate
// source/owner assertions above remain unchanged and are not repeated by this
// scoped extension. All documents and pieces here are synthetic TEST_ONLY.
const cutSchedule:FacadeApprovedBoardScheduleR3={...schedule,boards:[
  {boardId:'TEST_ONLY_CUT_PIECE_A',widthMm:'90',supportIntersectionIds:['a1','a2','a3']},
  {boardId:'TEST_ONLY_CUT_PIECE_B',widthMm:'150',supportIntersectionIds:['b1','b2','b3']},
]};
function cutReadback():FacadeTimberCutEndReadbackR5 {
  return {boardLayoutSha256:cutSchedule.approvedLayoutSha256,approvedProjectReference:cutSchedule.approvedProjectReference,
    approvedEndLayoutSha256:'c'.repeat(64),approvedSourceFitReference:facts('0').approvedSourceFitReference,
    exactTdsSha256:facts('0').exactTdsSha256,boards:[
      {boardId:'TEST_ONLY_CUT_PIECE_A',widthMm:'90',ends:[
        {end:'START',netAreaM2:'0.0012',actualProfileAndCutGeometrySha256:'d'.repeat(64)},
        {end:'FINISH',netAreaM2:'0.0012',actualProfileAndCutGeometrySha256:'d'.repeat(64)}]},
      {boardId:'TEST_ONLY_CUT_PIECE_B',widthMm:'150',ends:[
        {end:'START',netAreaM2:'0.002',actualProfileAndCutGeometrySha256:'e'.repeat(64)},
        {end:'FINISH',netAreaM2:'0.002',actualProfileAndCutGeometrySha256:'e'.repeat(64)}]},
    ]};
}
const invalidCut=(readback:FacadeTimberCutEndReadbackR5)=>assert.throws(()=>cutFacts(cutSchedule,readback),{code:'PARAMETER_VALIDATION_FAILED'});
describe('same-piece imported timber cut-end readback R5',()=>{
  test('joins actual installed pieces to the existing fixing and coating compiler without another supply owner',async()=>{
    const readback=cutReadback(),before=JSON.stringify({cutSchedule,readback});
    assert.equal(cutFacts(cutSchedule,readback).netEndAreaM2,'0.0064');
    const result=await compileCuts(cutSchedule,readback),minimum=result.rows.find(row=>row.row_id===prefix+':sealer-minimum');
    assert(minimum&&minimum.quantity!==null);assert.equal(cmp(minimum.quantity,'0.00384'),0);
    assert.equal(minimum.unit_id,'kg');assert.equal(minimum.included_in_estimate,false);assert.equal(minimum.included_in_procurement,false);
    const screws=result.rows.find(row=>row.row_id.endsWith(':screws'));assert(screws&&screws.quantity!==null);
    assert.equal(cmp(screws.quantity,'9'),0);assert.equal(result.preliminaryNeeds.length,16);
    assert.equal(result.preliminaryNeeds.filter(need=>need.row_id==='facade:board-fixing:r3:thermowood-horizontal-tg:need:cut-end-protection').length,1);
    assert.equal(JSON.stringify({cutSchedule,readback}),before);
  });
  test('removing exposed ends changes only their measured area while retaining the same board closure',()=>{
    const readback=cutReadback(),oneEnd:FacadeTimberCutEndReadbackR5={...readback,boards:readback.boards.map((board,i)=>({...board,ends:i===0?board.ends.slice(0,1):[]}))};
    assert.equal(cutFacts(cutSchedule,oneEnd).netEndAreaM2,'0.0012');
    assert.equal(cutFacts(cutSchedule,{...readback,boards:readback.boards.map(board=>({...board,ends:[]}))}).netEndAreaM2,'0');
    assert.equal(cutFacts(cutSchedule,{...readback,boards:[...readback.boards].reverse()}).netEndAreaM2,'0.0064');
  });
  test('another project or board-layout capture cannot authorize the same numerical end area',()=>{
    const readback=cutReadback();
    invalidCut({...readback,boardLayoutSha256:'f'.repeat(64)});
    invalidCut({...readback,approvedProjectReference:'TEST_ONLY_ANOTHER_PROJECT'});
  });
  test('missing, duplicate or foreign installed-piece identities cannot close the end takeoff',()=>{
    const readback=cutReadback(),first=readback.boards[0]!;
    invalidCut({...readback,boards:[first]});
    invalidCut({...readback,boards:[first,first]});
    invalidCut({...readback,boards:[first,{...readback.boards[1]!,boardId:'TEST_ONLY_FOREIGN_PIECE'}]});
  });
  test('profile width changes and excess source precision are rejected before the existing screw calculation',()=>{
    const readback=cutReadback();
    invalidCut({...readback,boards:readback.boards.map((board,i)=>i===0?{...board,widthMm:'91'}:board)});
    invalidCut({...readback,boards:readback.boards.map((board,i)=>i===0?{...board,widthMm:'90.0000000001'}:board)});
    assert.throws(()=>cutFacts({...cutSchedule,boards:cutSchedule.boards.map((board,i)=>i===0?{...board,widthMm:'90.0000000001'}:board)},readback),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test('one outer cut end is counted once and unrecognized side geometry is rejected',()=>{
    const readback=cutReadback(),first=readback.boards[0]!,end=first.ends[0]!;
    invalidCut({...readback,boards:[{...first,ends:[end,end]},readback.boards[1]!]});
    const side={...end};Reflect.set(side,'end','SIDE_FACE');
    invalidCut({...readback,boards:[{...first,ends:[side]},readback.boards[1]!]});
  });
  test('each declared exposed end needs positive exact net area and its real profile/cut geometry identity',()=>{
    for(const netAreaM2 of ['0','-0.0012','0.0012000001','NaN']){
      const readback=cutReadback(),first=readback.boards[0]!;
      invalidCut({...readback,boards:[{...first,ends:[{...first.ends[0]!,netAreaM2}]},readback.boards[1]!]});
    }
    const readback=cutReadback(),first=readback.boards[0]!;
    invalidCut({...readback,boards:[{...first,ends:[{...first.ends[0]!,actualProfileAndCutGeometrySha256:'missing'}]},readback.boards[1]!]});
    const numberArea={...first.ends[0]!};Reflect.set(numberArea,'netAreaM2',0.0012);
    invalidCut({...readback,boards:[{...first,ends:[numberArea]},readback.boards[1]!]});
  });
  test('source minimum must be representable exactly and cannot round a positive applied mass into zero',()=>{
    const readback=cutReadback(),first=readback.boards[0]!,one=(netAreaM2:string):FacadeTimberCutEndReadbackR5=>({...readback,boards:[
      {...first,ends:[{...first.ends[0]!,netAreaM2}]},{...readback.boards[1]!,ends:[]}]});
    invalidCut(one('0.000000001'));
    assert.equal(cutFacts(cutSchedule,one('0.000000005')).netEndAreaM2,'0.000000005');
  });
  test('exact original timber and coating sources remain mandatory in the linked readback',()=>{
    const readback=cutReadback();
    invalidCut({...readback,exactTdsSha256:'0'.repeat(64)});
    invalidCut({...readback,approvedEndLayoutSha256:'not-captured'});
    invalidCut({...readback,approvedSourceFitReference:''});
    assert.throws(()=>cutFacts({...cutSchedule,sourceSha256:'0'.repeat(64)},readback),{code:'PARAMETER_VALIDATION_FAILED'});
  });
});
