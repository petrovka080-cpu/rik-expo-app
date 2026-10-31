import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import pack from '../../../../data/estimate-benchmarks/source-packs/facade-bolix-mw120-krer15-r1.json';
import {facadeMw120DefinitionR1,facadeMw120GeometryParameterIdsR5,facadeMw120TechnicalParameterIdsR5,
  facadeMw120ScenarioFactsR1,compileFacadeMw120R1,facadeMw120RowIdR1} from './facadeMw120Krer15R1';
import {master35FacadeCapturedParentR1,master35FacadeRepresentativeR1,buildMaster35FacadeMw120SuccessorR1,
  master35FacadeParameterIdR1} from './master35FacadeMw120R1';
import {master35FacadeMw120MasterConfigR1} from '../../../../scripts/estimate/r4a13/prepareMaster35FacadeMw120R1';
import {facadeCurrentWetFamilyMasterConfigR3} from '../../../../scripts/estimate/r4a13/prepareFacadeCurrentWetFamilyR3';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';

const geometry={facade_length_m:'10',facade_height_m:'10',openings_outer_frame_area_m2:'0'};
const readback=()=>Object.fromEntries(Object.entries(facadeMw120ScenarioFactsR1({project_wall_anchor_count:'1333',project_starter_fastener_count:'17'}))
  .filter(([id])=>facadeMw120TechnicalParameterIdsR5.includes(id)));
// TEST_ONLY source fixture from the existing independent oracle. It is not an
// importer, actual document approval, runtime default or source of a new norm.
function trusted(input:Record<string,unknown>){return compileFacadeMw120R1(input,{confirmedParameters:readback()});}

it('owns only three ordinary geometries and leaves every project, machine and norm fact internal',()=>{
  const d=facadeMw120DefinitionR1(),publicIds=d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id);
  expect(publicIds).toEqual([...facadeMw120GeometryParameterIdsR5]);expect(facadeMw120TechnicalParameterIdsR5).toHaveLength(16);
  for(const id of facadeMw120TechnicalParameterIdsR5){const p=d.parameters.find(p=>p.parameter_id===id);assert(p);
    expect(p.default_value).toBeNull();expect(p.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}});
    expect(['PROJECT_DOCUMENTATION','SITE_SURVEY','ENGINEERING_DESIGN']).toContain(p.truth_metadata.value_source_role);
  }
  for(const n of pack.residual){const row=d.resources.find(r=>r.row_id===n.needId);assert(row);
    const parameter=d.parameters.find(p=>p.parameter_id==='facade_unresolved_'+n.key.replaceAll('-','_'));assert(parameter);
    expect(parameter.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');expect(parameter.default_value).toBeNull();}
},30000);

it('keeps a measured area while missing layouts leave anchors unknown and do not select machine procurement',async()=>{
  const r=await compileFacadeMw120R1(geometry),diagnosticPath=process.env.FACADE_MW120_MISSING_FACTS_RESULT_R5;
  // Persist the complete actual projection before any assertion in the scoped
  // diagnostic run. This TEST_ONLY output never becomes a source/runtime fact.
  if(diagnosticPath){const d=facadeMw120DefinitionR1(),resource=d.resources.find(row=>row.row_id===facadeMw120RowIdR1('net-area'));
    writeFileSync(diagnosticPath,JSON.stringify({contract:'facade-mw120-missing-facts-diagnostic/r5-54',submitted:geometry,confirmedParameters:{},
      source:{...pack.source,normId:pack.normId,scope:pack.scope},netAreaResource:resource,
      netAreaFormula:d.formulas.find(formula=>formula.formula_id===resource?.formula_id),
      heightParameter:d.parameters.find(parameter=>parameter.parameter_id==='facade_height_m'),
      workTopParameter:d.parameters.find(parameter=>parameter.parameter_id==='work_top_height_m'),result:r},null,2)+'\n','utf8');}
  // The original height<=work_top numeric condition remains unresolved. The
  // common core retains the exactly calculable area on the preliminary need;
  // that number does not confirm source applicability or the scaffold height.
  const scope=r.preliminaryNeeds.find(row=>row.row_id===facadeMw120RowIdR1('net-area'));assert(scope?.quantity!=null);
  expect(r.rows.some(row=>row.row_id===scope.row_id)).toBe(false);
  expect(scope.need_state).toBe('CONDITION_REQUIRED');expect(scope.missing_parameter_ids).toEqual(['work_top_height_m']);
  expect(scope.unit_id).toBe('m2');expect(cmp(scope.quantity,'100')).toBe(0);
  for(const key of ['wall-anchor','starter-fastener']){const need=r.preliminaryNeeds.find(row=>row.row_id===facadeMw120RowIdR1(key));assert(need);
    expect(need.quantity).toBeNull();expect(r.rows.some(row=>row.row_id===need.row_id&&row.included_in_procurement)).toBe(false);}
  for(const m of pack.rows.filter(row=>row.category==='equipment'))for(const mode of ['own','hired'])
    expect(r.rows.some(row=>row.row_id===facadeMw120RowIdR1(m.key+'-'+mode)&&row.included_in_estimate)).toBe(false);
  for(const need of pack.residual)expect(r.preliminaryNeeds.some(row=>row.row_id===need.needId)).toBe(true);
},60000);

it('preserves original rates, units and one-owner arithmetic with explicit TEST_ONLY trusted source facts',async()=>{
  const small=await trusted(geometry),large=await trusted({...geometry,facade_length_m:'20'});
  for(const [r,expected]of [[small,'370.51'],[large,'741.02']] as const){
    const labour=r.rows.find(row=>row.row_id===facadeMw120RowIdR1('labour'));assert(labour?.quantity!=null);
    expect(cmp(labour.quantity,expected)).toBe(0);expect(labour.unit_id).toBe('man_hour');expect(labour.included_in_estimate).toBe(true);
    const anchor=r.rows.find(row=>row.row_id===facadeMw120RowIdR1('wall-anchor'));assert(anchor?.quantity!=null);
    expect(cmp(anchor.quantity,'1333')).toBe(0);expect(anchor.unit_id).toBe('piece');expect(anchor.included_in_procurement).toBe(true);
    const operator=r.rows.find(row=>row.row_id===facadeMw120RowIdR1('operators'));assert(operator);expect(operator.included_in_estimate).toBe(false);
    expect(r.preliminaryNeeds).toHaveLength(8);
  }
},60000);

it('rejects raw echo, null and undefined technical values at the direct existing core even with trusted facts',async()=>{
  const d=facadeMw120DefinitionR1(),confirmedParameters=readback();
  for(const id of ['project_wall_anchor_count','source_conditions','architecture_detail_percent'])for(const value of [confirmedParameters[id],null,undefined])
    await assert.rejects(()=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.contract,
      primaryMeasureParameterId:'facade_length_m',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
      submittedParameters:{...geometry,[id]:value},confirmedParameters,rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash}),
    {code:'PARAMETER_VALIDATION_FAILED'});
},60000);

it('preserves the complete actual historical219/122 capture and old numerical/payment owners',()=>{
  const captured=master35FacadeCapturedParentR1(),before=JSON.stringify(captured),old=master35FacadeRepresentativeR1(),next=buildMaster35FacadeMw120SuccessorR1(old);
  expect(captured.parameters).toHaveLength(219);expect(captured.formulas).toHaveLength(122);expect(captured.resources).toHaveLength(122);
  expect(next.formulas.slice(0,old.formulas.length)).toEqual(old.formulas);expect(next.bindings).toEqual(old.bindings);
  expect(next.baseline.input_values).toEqual(captured.baseline.input_values);expect(next.baseline.input_classification).toEqual(captured.baseline.input_classification);
  for(const p of old.parameters){const q=next.parameters.find(q=>q.parameter_id===p.parameter_id);assert(q);
    expect([q.unit_id,q.default_value,q.truth_metadata.visibility_role,q.truth_metadata.value_source_role,q.truth_metadata.guide,q.truth_metadata.provenance])
      .toEqual([p.unit_id,p.default_value,p.truth_metadata.visibility_role,p.truth_metadata.value_source_role,p.truth_metadata.guide,p.truth_metadata.provenance]);
    expect(next.baseline.normative_source_ids[p.parameter_id]).toEqual(captured.baseline.normative_source_ids[p.parameter_id]);}
  for(const r of old.resources){const n=next.resources.find(n=>n.row_id===r.row_id);assert(n);
    expect([n.id,n.formula_id,n.unit_id,n.semantic_owner,n.cost_owner_id,n.procurement_eligible,n.source_metadata,n.resource_graph.costTreatment])
      .toEqual([r.id,r.formula_id,r.unit_id,r.semantic_owner,r.cost_owner_id,r.procurement_eligible,r.source_metadata,r.resource_graph.costTreatment]);}
  expect(JSON.stringify(captured)).toBe(before);
},30000);

it('keeps actual Config runtime empty and never seeds project acceptance, anchors or machine choices',()=>{
  const base=master35FacadeMw120MasterConfigR1({releaseId:'TEST_ONLY_CURRENT_RELEASE',searchReleaseId:'TEST_ONLY_CURRENT_SEARCH'}),
    current=facadeCurrentWetFamilyMasterConfigR3({releaseId:'TEST_ONLY_CURRENT_RELEASE',searchReleaseId:'TEST_ONLY_CURRENT_SEARCH'});
  expect(base.runtimeProfileInput).toEqual({});expect(base.runtimeProfileClassification).toEqual({});expect(base.runtimeProfileSourceIds).toEqual({});
  expect(base.shortInput).toEqual(master35FacadeCapturedParentR1().baseline.input_values);
  for(const id of facadeMw120TechnicalParameterIdsR5){const key=master35FacadeParameterIdR1(id);
    expect(Object.hasOwn(base.runtimeProfileInput??{},key)).toBe(false);expect(Object.hasOwn(current.runtimeProfileInput??{},key)).toBe(false);}
  expect(current.binding.retainParentBindings?.capturedParentSha256).toBe(base.binding.retainParentBindings?.capturedParentSha256);
},30000);
