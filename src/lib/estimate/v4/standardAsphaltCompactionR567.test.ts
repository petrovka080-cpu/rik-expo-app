import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import capture from '../../../../data/estimate-benchmarks/fixtures/standard-asphalt-compaction-retained-capture-r567.json';
import {buildStandardAsphaltCompactionR567,compileStandardAsphaltCompactionR567,
  standardAsphaltCompactionR567AcceptanceInput,STANDARD_ASPHALT_COMPACTION_R567_METHOD as method,
  STANDARD_ASPHALT_COMPACTION_R567_PROFILE as profile,STANDARD_ASPHALT_COMPACTION_R567_AREA as area,
  STANDARD_ASPHALT_COMPACTION_R567_PACK as pack,rebindStandardAsphaltCompactionInclusionR567 as rebindPredicate} from './standardAsphaltCompactionR567';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {isCanonicalEstimateSourceManagedParameter,isCanonicalEstimateVisibleReplaceableProfile} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {buildConsumerCanonicalPrecompileParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';

type Json=Record<string,any>;
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const oldCompile=(c:Json,submitted:Json,primary='area_m2',confirmed:Json={})=>compileCanonicalEstimateCore({operation:'compile',catalogId:pack.standardCatalogId,
  compilerVersion:'r567-historical-pure-oracle',primaryMeasureParameterId:primary,parameterDefinitions:c.parameters,
  formulaDefinitions:c.formulas,resourceDefinitions:c.resources,submittedParameters:submitted,confirmedParameters:confirmed,currencyCode:'KGS',
  priceItems:[],maximumResourceRows:59,hashJson:async v=>estimateDeterministicHash(v)} as CanonicalEstimateCompileCoreInput);
const projection=(r:Awaited<ReturnType<typeof oldCompile>>)=>r.rows.map(x=>({row:x.row_id,quantity:x.quantity,unit:x.unit_id,
  price:x.unit_price,amount:x.amount,estimate:x.included_in_estimate,procurement:x.included_in_procurement}));

describe('R567 retained standard compaction with explicitly selected three-roller profile',()=>{
  test('preserves exact source bytes, all old rows/history/price declarations and physical cost owners',()=>{
    expect(createHash('sha256').update(readFileSync(resolve(pack.sourceArtifactPath))).digest('hex')).toBe(pack.sourceArtifactSha256);
    const before=clone(capture),d=buildStandardAsphaltCompactionR567();
    expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([24,21,59]);
    expect(capture).toEqual(before);
    expect(capture.standard.priceBindings).toEqual([]);expect(capture.historicalRecipe.priceBindings).toEqual([]);
    expect(d.formulas.slice(0,10)).toEqual(capture.standard.capturedParent.formulas);
    for(const row of [...capture.standard.capturedParent.resources,...pack.resources]){
      const next=d.resources.find(r=>r.row_id===row.row_id)!;
      for(const field of ['id','row_id','formula_id','unit_id','category','cost_owner_id','semantic_owner','procurement_eligible','source_metadata'])
        expect((next as Json)[field]).toEqual((row as Json)[field]);
      expect(next.resource_graph.costTreatment).toBe((row.resource_graph as Json).costTreatment);
    }
    expect(d.ordinaryParameterIds).toHaveLength(3);
    for(const field of [area,'r567_compaction_traffic_control_setup_count','r567_compaction_mobilization_count_per_unique_machine']){
      expect(d.parameters.find(p=>p.parameter_id===field)?.default_value).toBeNull();
      expect(d.runtimeInput).not.toHaveProperty(field);
    }
    expect(d.runtimeInput).not.toHaveProperty('area_m2');
  });
  test('the immutable old recipe and retained compatibility rows preserve ten-row payment arithmetic',async()=>{
    const c=capture.standard.capturedParent,old=await oldCompile(c,c.baseline.input_values),d=buildStandardAsphaltCompactionR567();
    // Test-only historical oracle. No legacy choice is offered on the new work.
    const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
    const compatible={...d,parameters:d.parameters.map(p=>oldIds.has(p.parameter_id)?p:{...p,default_value:null})};
    const next=await oldCompile(compatible,c.baseline.input_values);
    expect(projection(next)).toEqual(projection(old));
    expect(next.preliminaryNeeds).toEqual(old.preliminaryNeeds);
  });
  test('the canonical default context selects the named new method and never exposes old technical fields',async()=>{
    const d=buildStandardAsphaltCompactionR567(),selector=d.parameters.find(p=>p.parameter_id===method)!;
    expect(selector.default_value).toBe(profile);expect(selector.constraints_json.values).toEqual([profile]);
    expect(selector.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
    expect(d.runtimeClassification[method]).toBe('RUNTIME_STRUCTURAL_DEFAULT');
    for(const p of d.parameters.slice(0,8))expect(resolveInclusionGraph(p.truth_metadata.visible_when,{}).value).toBe(false);
    for(const field of d.ordinaryParameterIds){
      const p=d.parameters.find(p=>p.parameter_id===field)!;
      expect(p.default_value).toBeNull();expect(resolveInclusionGraph(p.truth_metadata.visible_when,{[area]:5000}).value).toBe(true);
    }
    // The existing publisher labels only the declared runtime profile as an
    // eligible baseline input. Source/structural constants reach the compiler
    // through this canonical filter; bare schema defaults are never trusted.
    const fixture=standardAsphaltCompactionR567AcceptanceInput(),baseline={
      input_values:{...capture.standard.capturedParent.baseline.input_values,...fixture,...d.runtimeInput},
      input_classification:{...capture.standard.capturedParent.baseline.input_classification,
        ...Object.fromEntries(Object.keys(fixture).map(id=>[id,'VALIDATION_FIXTURE'])),...d.runtimeClassification}};
    const runtime=canonicalApprovedBaselineRuntimeParameters(baseline);
    expect(runtime[method]).toBe(profile);expect(runtime).not.toHaveProperty(area);expect(runtime).not.toHaveProperty('area_m2');
    for(const field of d.ordinaryParameterIds)expect(runtime).not.toHaveProperty(field);
    for(const [field,value] of Object.entries(d.runtimeInput))expect(runtime[field]).toEqual(value);
    const empty=await oldCompile(d,{},area,runtime);
    expect(empty.rows).toEqual([]);
    expect(empty.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(area))).toBe(true);
    expect(empty.preliminaryNeeds.some(n=>n.missing_parameter_ids.some(id=>capture.standard.capturedParent.parameters.some(p=>p.parameter_id===id)))).toBe(false);
    const measured=await oldCompile(d,{[area]:5000},area,runtime);
    expect(measured.rows.some(r=>d.oldResourceRowIds.includes(r.row_id))).toBe(false);
    expect(measured.preliminaryNeeds.every(n=>n.missing_parameter_ids.every(id=>id==='r567_compaction_traffic_control_setup_count'||id==='r567_compaction_mobilization_count_per_unique_machine'))).toBe(true);
  });
  test('the real shared consumer session uses three actual facts without injecting internal selector/profile values',()=>{
    const d=buildStandardAsphaltCompactionR567(),consumers=buildMasterParameterCalculationConsumers(d);
    const parameterSchema=d.parameters.map(p=>{
      const t=p.truth_metadata as Json,g=t.guide;
      return {parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,
        required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,semanticParameterKey:t.semantic_parameter_key,
        visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,visibleWhen:t.visible_when,
        formulaConsumers:consumers.formulaConsumers[p.parameter_id],resourceBranchConsumers:consumers.resourceConsumers[p.parameter_id],
        runtimeProfileClassification:d.runtimeClassification[p.parameter_id],
        guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,
          sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,
          guideShortRu:g.guide_short_ru,guideVersion:g.guide_version}};
    }) as CanonicalEstimateCatalogItem['parameterSchema'];
    const catalog={catalogId:d.catalogId,releaseId:'TEST_ONLY_R567',namespace:'global',domain:'roadworks',workKey:'asphalt_compact_standard',
      titleRu:pack.publicMethodLabelRu,definitionVersion:10,applicability:{},professionalMetadata:{},parameterSchema} as CanonicalEstimateCatalogItem;
    const session=(parameters:Json={})=>buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_R567',parameters,
      missingParameterIds:[],userExplicitParameterIds:Object.keys(parameters),textExtractedParameterIds:[]});
    const empty=session();expect(empty.parameters.map(p=>p.parameterId)).toEqual([area]);
    expect(empty.parameters[0].value).toBeNull();
    const measured=session({[area]:5000});
    expect(measured.parameters.map(p=>p.parameterId).sort()).toEqual([...d.ordinaryParameterIds].sort());
    expect(measured.parameters.find(p=>p.parameterId===area)?.value).toBe(5000);
    expect(measured.parameters.filter(p=>p.parameterId!==area).every(p=>p.value===null)).toBe(true);
    expect(measured.parameters.some(p=>p.parameterId===method||Object.hasOwn(d.runtimeInput,p.parameterId))).toBe(false);
    expect(session({...capture.standard.capturedParent.baseline.input_values,[area]:5000}).parameters
      .some(p=>capture.standard.capturedParent.parameters.some(old=>old.parameter_id===p.parameterId))).toBe(false);
  });
  test('every inclusion parameter and formula input is rebound away from all fifteen historical inputs',()=>{
    const oldIds=new Set(pack.parameters.map(p=>p.parameter_id)),d=buildStandardAsphaltCompactionR567();
    expect(pack.resources.every(r=>r.inclusion_ast.kind==='literal'&&r.inclusion_ast.value===true)).toBe(true);
    const visit=(node:Json):void=>{
      for(const [key,value] of Object.entries(node)){
        if(key==='parameterId'||(key==='id'&&node.kind==='parameter'))expect(oldIds.has(String(value))).toBe(false);
        if(key==='expression'&&typeof value==='string')for(const token of value.match(/[A-Za-z_][A-Za-z_0-9]*/gu)??[])expect(oldIds.has(token)).toBe(false);
        if(Array.isArray(value))value.forEach(v=>{if(v&&typeof v==='object')visit(v);});
        else if(value&&typeof value==='object')visit(value);
      }
    };
    for(const r of d.resources.slice(10))visit(r.inclusion_ast);
    for(const id of oldIds){
      const mapped=rebindPredicate({kind:'and',operands:[{kind:'equals',parameterId:id,value:'literal-choice'},
        {kind:'parameter',id},{kind:'formula_greater_than',expression:`${id}*2`,unitId:'ratio',value:0}]});
      visit(mapped);expect(mapped.operands[0].parameterId).toBe(`r567_compaction_${id}`);
      expect(mapped.operands[0].value).toBe('literal-choice');expect(mapped.operands[2].expression).toBe(`r567_compaction_${id}*2`);
    }
  });
  test('explicit profile has all 49 physical rows, the same arithmetic and no old paid overlap',async()=>{
    const d=buildStandardAsphaltCompactionR567(),actual=await compileStandardAsphaltCompactionR567(standardAsphaltCompactionR567AcceptanceInput());
    const original=await oldCompile(capture.historicalRecipe.capturedParent,capture.historicalRecipe.capturedParent.baseline.input_values);
    expect(projection(actual)).toEqual(projection(original));
    expect(actual.rows).toHaveLength(49);expect(actual.preliminaryNeeds).toEqual([]);
    expect(actual.rows.some(r=>d.oldResourceRowIds.includes(r.row_id))).toBe(false);
    expect(actual.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id)).toEqual(original.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id));
    expect(d.fullTechnicalAcceptance).toBe(false);expect(pack.automaticPriceTransferFromHistoricalRecipe).toBe(false);
  });
  test('routes only matching protected source constants through confirmed input without mutating the caller',async()=>{
    const d=buildStandardAsphaltCompactionR567(),input=standardAsphaltCompactionR567AcceptanceInput(),
      before=canonicalEstimateStableJson({input,runtime:d.runtimeInput}),withoutSource={...input};
    for(const field of Object.keys(d.runtimeInput))delete withoutSource[field];
    const explicit=await compileStandardAsphaltCompactionR567(input),authored=await compileStandardAsphaltCompactionR567(withoutSource);
    expect(projection(explicit)).toEqual(projection(authored));expect(explicit.preliminaryNeeds).toEqual(authored.preliminaryNeeds);
    expect(explicit.rows).toHaveLength(49);
    await expect(oldCompile(d,input,area,d.runtimeInput)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    await expect(compileStandardAsphaltCompactionR567({...input,TEST_ONLY_UNDECLARED_SOURCE_FIELD:'not a profile field'}))
      .rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    expect(canonicalEstimateStableJson({input,runtime:d.runtimeInput})).toBe(before);
  });
  test('the 120 m2 fixture cannot satisfy a missing newly measured area',async()=>{
    const result=await compileStandardAsphaltCompactionR567({area_m2:120,[method]:profile});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(area))).toBe(true);
    expect(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('r567_compaction_traffic_control_setup_count'))).toBe(true);
    expect(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('r567_compaction_mobilization_count_per_unique_machine'))).toBe(true);
  });
  test('actual traffic and mobilization stay unresolved; explicit zero excludes their scopes',async()=>{
    const partial=await compileStandardAsphaltCompactionR567({[method]:profile,[area]:5000});
    expect(partial.preliminaryNeeds.length).toBeGreaterThan(0);
    const zero=await compileStandardAsphaltCompactionR567({[method]:profile,[area]:5000,
      r567_compaction_traffic_control_setup_count:0,r567_compaction_mobilization_count_per_unique_machine:0});
    expect(zero.preliminaryNeeds).toEqual([]);
    expect(zero.rows.some(r=>r.row_id.includes('mobilization:')||r.row_id.includes('work-zone-control'))).toBe(false);
    expect(zero.rows.find(r=>r.row_id==='rc09:asphalt_compaction_breakdown_roller')?.quantity).toBe('3.472222222');
  });
  test('source constants cannot become customer norm questions or scalar norm overrides',async()=>{
    const d=buildStandardAsphaltCompactionR567();
    for(const field of Object.keys(d.runtimeInput)){
      const p=d.parameters.find(p=>p.parameter_id===field)!;
      expect(p.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
      const schema={parameterId:p.parameter_id,titleRu:p.title_ru,valueType:p.value_type,visibilityRole:'INTERNAL_ONLY',
        valueSourceRole:p.truth_metadata.value_source_role,formulaConsumers:['formula'],resourceBranchConsumers:['row'],constraints:{}} as never;
      expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(true);
      expect(isCanonicalEstimateVisibleReplaceableProfile(schema)).toBe(false);
    }
    await expect(compileStandardAsphaltCompactionR567({...standardAsphaltCompactionR567AcceptanceInput(),r567_compaction_breakdown_roller_width_m:2}))
      .rejects.toThrow('R567_PROTECTED_PROFILE_CONSTANT');
    await expect(compileStandardAsphaltCompactionR567({...standardAsphaltCompactionR567AcceptanceInput(),[area]:0}))
      .rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });
});
