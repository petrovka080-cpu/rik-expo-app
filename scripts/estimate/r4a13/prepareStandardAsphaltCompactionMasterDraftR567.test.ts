import {prepareStandardAsphaltCompactionMasterDraftR567} from './prepareStandardAsphaltCompactionMasterDraftR567';
import capture from '../../../data/estimate-benchmarks/fixtures/standard-asphalt-compaction-retained-capture-r567.json';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';

test('R567 stages one retained replacement through the existing Master and exact original registry',()=>{
  const draft=prepareStandardAsphaltCompactionMasterDraftR567(),config=draft.knownConfigFields;
  expect(draft.publicationAllowed).toBe(false);expect(draft.parentReleaseId).toBeNull();expect(draft.parentSearchReleaseId).toBeNull();
  expect(config.catalogId).toBe('canonical-work:base:paving_roads_landscape_interior_asphalt_compact_standard');
  expect(config.expectedParentShape).toEqual([8,10,10]);
  expect(config.binding.retainParentBindings?.capturedParentSha256).toBe(masterRetainedParentCaptureSha256R1(capture.standard.capturedParent));
  expect(config.binding.retainParentBindings?.capturedParent).toEqual(capture.standard.capturedParent);
  expect(config.binding.reuseExistingNormativeRegistry?.source).toEqual(capture.historicalRecipe.capturedParent.normativeSources[0]);
  expect(config.binding.reuseExistingNormativeRegistry?.locators).toEqual(capture.historicalRecipe.capturedParent.normativeLocators);
  expect(config.binding.reuseExistingNormativeRegistry?.source.created_at).toBe('2026-09-23T04:51:17.849633+00:00');
  expect(config.binding.rowId).toBe('rc09:asphalt_compaction_breakdown_work');
  expect(config.binding.additionalRowIds).toBeUndefined();
  const c=capture.standard.capturedParent,registered=new Set(c.normativeSources.map(s=>s.source_key));
  const exact=Object.fromEntries(Object.entries(c.baseline.normative_source_ids).map(([id,sources])=>[
    id,(sources as string[]).filter(key=>!registered.has(key)),
  ]).filter(([,sources])=>(sources as string[]).length>0));
  expect(config.binding.retainParentBindings?.legacyCapturedFixtureSources).toEqual({
    contract:'master-retained-captured-fixture-provenance/r1',parameterSources:exact,
  });
  expect(Object.values(exact).flat()).not.toContain('kg_krer_27_roadworks_2015');
  const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
  for(const formula of config.formulaDefinitions.filter(f=>!c.formulas.some(old=>old.formula_id===f.formula_id)))
    expect(formula.input_parameter_ids.some((id:string)=>oldIds.has(id))).toBe(false);
  for(const parameter of config.parameterDefinitions.filter(p=>p.parameter_id.startsWith('r567_compaction_')))
    if(['r567_compaction_area_m2','r567_compaction_traffic_control_setup_count','r567_compaction_mobilization_count_per_unique_machine'].includes(parameter.parameter_id))
      expect(parameter.default_value).toBeNull();
  expect(config.applicability.fullTechnicalAcceptance).toBe(false);expect(config.applicability.ordinaryParameterIds).toHaveLength(3);
  expect(config.applicability.automaticSavedRevisionSwitch).toBe(false);
  for(const [id,value]of Object.entries(c.baseline.input_values))expect(config.acceptanceInput[id]).toEqual(value);
  for(const [id,kind]of Object.entries(c.baseline.input_classification))if(kind==='DERIVED'){
    expect(config.runtimeProfileInput?.[id]).toEqual(c.baseline.input_values[id as keyof typeof c.baseline.input_values]);
    expect(config.runtimeProfileClassification?.[id]).toBe('DERIVED');
    expect(config.runtimeProfileSourceIds?.[id]).toEqual(c.baseline.normative_source_ids[id as keyof typeof c.baseline.normative_source_ids]);
  }
  expect(config.passport.independentCompletenessMap).toEqual(capture.historicalRecipe.passport.decision.independentCompletenessMap);
  expect(config.runtimeProfileInput).not.toHaveProperty('area_m2');expect(config.runtimeProfileInput).not.toHaveProperty('r567_compaction_area_m2');
});
