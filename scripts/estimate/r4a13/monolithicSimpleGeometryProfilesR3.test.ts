import {monolithicExistingDeepAssemblyReuseConfigR3 as configure,monolithicExistingDeepAssemblyReuseTargetsR3 as targets} from './prepareMonolithicExistingDeepAssemblyReuseR3';
import {compileMonolithicPhysicalR2} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolveCanonicalEstimateProfileInputsS2723 as resolve} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723';
import {compareFormulaGraphDecimals} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import type {PurchaseGroupRepresentative as Rep} from './s2732PurchaseGroupOverlay';
import type {CanonicalEstimateCatalogItem} from '../../../src/lib/estimate/backendPlatform/contracts';
import {buildCanonicalBaselinePlan} from '../../../src/lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1';
import {buildConsumerCanonicalPrecompileParameterSession} from '../../../src/features/consumerRepair/consumerCanonicalParameterEditor';
const context={releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY',outputRoot:'.tmp/no-write'};
const prepared=(kind:string)=>{
 const catalog=targets.find(t=>t.includes('_'+kind+'_'))!,c=configure(context,catalog),parent=c.binding.retainParentBindings!.capturedParent;
 const model:Rep={definition:{...parent.definition,applicability:c.applicability},baseline:{...parent.baseline,input_values:c.acceptanceInput},passport:{...c.passport},
  parameters:[...c.parameterDefinitions],formulas:[...c.formulaDefinitions],resources:[...c.resourceDefinitions],bindings:[]};
 const schema=model.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:p.truth_metadata.visibility_role,
  valueSourceRole:p.truth_metadata.value_source_role,provenance:p.truth_metadata.provenance,defaultValue:p.default_value,
  constraints:p.constraints_json,formulaConsumers:p.truth_metadata.formula_consumers}));
 const runtime=canonicalApprovedBaselineRuntimeParameters({input_values:c.runtimeProfileInput,input_classification:c.runtimeProfileClassification});
 return {c,model,schema,runtime,run:(user:Record<string,unknown>,confirmed:Record<string,unknown>=runtime)=>resolve({catalogId:catalog,
  sourceProfileSelectionMetadata:c.applicability.sourceProfileSelectionV1,parameterSchema:schema,effectiveUserParameters:user,confirmedParameters:confirmed})};
};
const catalogFor=(p:ReturnType<typeof prepared>):CanonicalEstimateCatalogItem=>({catalogId:p.c.catalogId,releaseId:context.releaseId,
 namespace:'global',domain:'concrete',workKey:p.c.catalogId.split(':').at(-1)!,titleRu:p.c.passport.canonicalRuName,definitionVersion:3,
 applicability:p.c.applicability,professionalMetadata:{},parameterSchema:p.model.parameters.map(d=>{
  const t=d.truth_metadata,g=t.guide;
  return {parameterId:d.parameter_id,semanticParameterKey:t.semantic_parameter_key,titleRu:d.title_ru,ordinal:d.ordinal,
   valueType:d.value_type,unitId:d.unit_id,required:d.required,defaultValue:p.runtime[d.parameter_id]??null,
   visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,constraints:d.constraints_json,
   formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,visibleWhen:t.visible_when,
   runtimeProfileClassification:p.c.runtimeProfileClassification?.[d.parameter_id],
   guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,sourceRole:g.source_role,sourceDocument:g.source_document,
    sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,
    guideValidationPolicy:g.guide_validation_policy,applicability:g.applicability,verifiedAt:g.verified_at}};
 }) as CanonicalEstimateCatalogItem['parameterSchema']});
const beam=(depth:string)=>({monolithic_geometry_r3_beam_volume_m3:'10',monolithic_geometry_r3_beam_depth_mm:depth,
 monolithic_geometry_r3_beam_support_height_m:'3',monolithic_geometry_r3_beam_work_elevation_m:'0'});
const column=(height:string)=>({monolithic_geometry_r3_column_volume_m3:'10',monolithic_geometry_r3_column_height_m:height,
 monolithic_geometry_r3_column_perimeter_m:'1.8',monolithic_geometry_r3_column_work_elevation_m:'0'});

describe('ordinary concrete source profiles from measured geometry',()=>{
 test.each(['slab','strip','beam','column','wall'])('%s initial ordinary editor asks only the declared simple geometry',kind=>{
  const p=prepared(kind),catalog=catalogFor(p);let error:unknown;
  try{buildCanonicalBaselinePlan({catalog,prompt:'Рассчитать конструкцию'});}catch(e){error=e;}
  expect(error).toEqual(expect.objectContaining({name:'CanonicalBaselineContractMissingError'}));
  const missing=(error as {missingParameterIds:string[]}).missingParameterIds;
  expect([...missing].sort()).toEqual(Object.keys(p.c.shortInput).sort());
  const session=buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_NO_SAVE',parameters:{},missingParameterIds:missing});
  expect(session.parameters.map(p=>p.parameterId).sort()).toEqual(Object.keys(p.c.shortInput).sort());
 });
 test.each([['beam',beam('900'),'mono_r1_beam_volume_m3'],['beam',beam('600'),'mono_remaining_r1_beam_109_02_volume_m3'],
  ['column',column('5'),'mono_r1_column_volume_m3'],['column',column('4'),'mono_remaining_r1_column_107_01_volume_m3']] as const)
  ('%s ordinary client sends only four measurements and the exact selected primary identity', (kind,user,primary)=>{
   const p=prepared(kind),plan=buildCanonicalBaselinePlan({catalog:catalogFor(p),prompt:'Рассчитать конструкцию',parameterOverrides:{...user}});
   expect(plan.parameters).toEqual(user);expect(plan.primaryMeasureParameterId).toBe(primary);
  });
 test.each([
  ['beam',beam('900'),'monolithic-family:krer06:r1:beam-109-03:workers','116.04'],
  ['beam',beam('600'),'monolithic-remaining:krer06:r1:beam-109-02:workers','135.14'],
  ['column',column('5'),'monolithic-family:krer06:r1:column-107-02:workers','182.3'],
  ['column',column('4'),'monolithic-remaining:krer06:r1:column-107-01:workers','131.9'],
 ] as const)('%s geometry selects its exact existing source and calculates known labour without technical fixture data',async(kind,user,rowId,expected)=>{
  const p=prepared(kind),r=await compileMonolithicPhysicalR2(p.model,{...user},{},undefined,p.runtime);
  // The norm can determine labour while the actual project/PPR remains an
  // explicit preliminary need. Known quantity does not admit it to payment.
  const row=r.rows.find(r=>r.row_id===rowId)??r.preliminaryNeeds.find(r=>r.row_id===rowId);expect(row).toBeDefined();
  expect(compareFormulaGraphDecimals(row!.quantity!,expected)).toBe(0);
  const other=kind==='beam'?(rowId.includes('109-03')?'109-02':'109-03'):(rowId.includes('107-02')?'107-01':'107-02');
  expect(r.rows.some(r=>r.row_id.includes(other)&&r.row_id.endsWith(':workers'))).toBe(false);
  expect(r.preliminaryNeeds.length).toBeGreaterThan(0);
 });
 test('beam boundaries choose the source without rounding 500 or 800 millimetres',()=>{
  const p=prepared('beam');
  expect(p.run(beam('500')).sourceProfileSelectionV1?.status).toBe('UNRESOLVED');
  expect(p.run(beam('500.000001')).profileId).toContain('500 до 800');
  expect(p.run(beam('800')).profileId).toContain('500 до 800');
  expect(p.run(beam('800.000001')).profileId).toBe('Исходная система КРЕР06-2015, индустриальная опалубка');
  expect(p.run(beam('799.999999999')).profileId).toContain('500 до 800');
  expect(p.run(beam('800.000000001')).profileId).toBe('Исходная система КРЕР06-2015, индустриальная опалубка');
  expect(()=>p.run(beam('800.0000000000000001'))).toThrow('ACTUAL_GEOMETRY_VALUE');
  expect(p.run({...beam('900'),monolithic_geometry_r3_beam_support_height_m:'6.000001'}).sourceProfileSelectionV1?.status).toBe('UNRESOLVED');
 });
 test('column boundaries preserve the exact 4m and 6m source scopes',()=>{
  const p=prepared('column');expect(p.run(column('4')).profileId).toContain('до 4 м');
  expect(p.run(column('4.000001')).profileId).toBe('Исходная система КРЕР06-2015, индустриальная опалубка');
  expect(p.run(column('6')).sourceProfileSelectionV1?.status).toBe('RESOLVED');
  expect(p.run(column('6.000001')).sourceProfileSelectionV1?.status).toBe('UNRESOLVED');
  expect(p.run(column('3.999999999')).profileId).toContain('до 4 м');
  expect(p.run(column('4.000000001')).profileId).toBe('Исходная система КРЕР06-2015, индустриальная опалубка');
  expect(()=>p.run(column('3.9999999999999999'))).toThrow('ACTUAL_GEOMETRY_VALUE');
  expect(p.run({...column('4'),monolithic_geometry_r3_column_perimeter_m:'2.000001'}).sourceProfileSelectionV1?.status).toBe('UNRESOLVED');
 });
 test('clearing geometry cannot retain a selector or either branch primary from the previous estimate',()=>{
  const p=prepared('beam'),previous=p.run(beam('900')).confirmedParameters,next=p.run({},previous);
  expect(next.sourceProfileSelectionV1?.status).toBe('UNRESOLVED');
  expect(next.confirmedParameters.mono_family_source_method_r1).toBeUndefined();
  expect(next.confirmedParameters.mono_r1_beam_volume_m3).toBeUndefined();
  expect(next.confirmedParameters.mono_remaining_r1_beam_109_02_volume_m3).toBeUndefined();
  expect([...(next.sourceProfileSelectionV1?.missingGeometryParameterIds??[])].sort()).toEqual(Object.keys(beam('900')).sort());
 });
 test('raw source selector and copied primary are rejected even when echoed, zero, null or undefined',()=>{
  const p=prepared('beam');
  for(const id of ['mono_family_source_method_r1','mono_r1_beam_volume_m3','mono_remaining_r1_beam_109_02_volume_m3'])
   for(const value of ['Исходная система КРЕР06-2015, индустриальная опалубка','10',0,null,undefined])
    expect(()=>p.run({...beam('900'),[id]:value})).toThrow(expect.objectContaining({code:'SOURCE_PROFILE_TECHNICAL_INPUT_FORBIDDEN'}));
 });
});
