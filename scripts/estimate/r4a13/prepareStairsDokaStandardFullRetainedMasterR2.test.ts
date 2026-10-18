import {prepareStairsDokaStandardFullRetainedMasterDraftR2 as draft,stairsDokaStandardFullRetainedCaptureR2 as capture,
 stairsDokaStandardFullRetainedComputationR2 as computation} from './prepareStairsDokaStandardFullRetainedMasterR2';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import {stairsDokaStandardVariantSelectorR1 as selector} from '../../../src/lib/estimate/v4/stairsDokaStandardSourceVariantR1';

it('uses exact full nine-set raw capture and all actual DDL source fields, never projected substitutes',()=>{
 const p=capture(),c=p.capturedParent;
 expect(p.evidencePins.fullRead.sha256).toBe('9951b6c5d3ef3b67e158567b25d2266aff20526fd19b2d45d2429ef34959e5b4');
 expect([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length]).toEqual([188,92,95,8,2,2]);
 expect(p.capturedParentSha256).toBe(masterRetainedParentCaptureSha256R1(c));
 for(const s of c.normativeSources){expect(Object.hasOwn(s,'effective_to')).toBe(true);expect(Object.hasOwn(s,'created_at')).toBe(true);expect(typeof s.created_at).toBe('string');}
 expect(c.normativeSources.map(s=>s.created_at)).toEqual(['2026-10-11T16:33:01.026081+05:00','2026-10-01T14:24:41.497034+05:00']);
 expect(c.parameters.every(p=>!Object.hasOwn(p,'catalog_id'))).toBe(true);
 expect(c.parameters.every(p=>Object.hasOwn(p,'approved_template_baseline_id'))).toBe(true);
});
it('retains exact old188 parameters and92formulas, all95logical rows and8physical bindings while declaring only20new binding rows',()=>{
 const p=computation(),c=p.capturedParent,d=p.definition;
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([301,137,140]);
 expect(d.parameters.slice(0,188)).toEqual(c.parameters);expect(d.formulas.slice(0,92)).toEqual(c.formulas);
 for(const old of c.resources){const row=d.resources.find(r=>r.row_id===old.row_id)!;
  expect(row.id).toBe(old.id);expect(row.unit_id).toBe(old.unit_id);expect(row.formula_id).toBe(old.formula_id);
  expect(row.cost_owner_id).toBe(old.cost_owner_id);expect(row.procurement_eligible).toBe(old.procurement_eligible);expect(row.source_metadata).toEqual(old.source_metadata);
 }
 const r=draft();expect(r.knownConfigFields.binding.retainParentBindings).toEqual(p.retainParentBindings);
 expect(r.knownConfigFields.binding.additionalRowIds!.length+1).toBe(20);expect(r.catalogAppend).toBeNull();expect(r.newCatalogIds).toBe(0);
});
it('keeps the188 baseline source arrays intact and assigns only113new parameter source entries with precise unresolved/derived roles',()=>{
 const p=computation(),c=p.capturedParent,n=p.retainParentBindings.newParameterSources;
 expect(Object.keys(c.baseline.normative_source_ids)).toHaveLength(188);expect(Object.keys(n)).toHaveLength(113);
 expect(Object.keys(n).some(id=>c.parameters.some(old=>old.parameter_id===id))).toBe(false);
 for(const parameter of p.definition.parameters.slice(188)){
  const spec=n[parameter.parameter_id]!,role=parameter.truth_metadata.value_source_role;
  expect(spec.kind==='UNRESOLVED').toBe(role==='UNRESOLVED_APPLICATION_NORM');
  if(spec.kind==='UNRESOLVED')expect(spec.sourceIds).toEqual([]);
  if(spec.kind==='DERIVED'&&spec.sourceIds.length===0){
   expect(role).toBe('COMPILER_DERIVED_RESOURCE_QUANTITY');expect(parameter.truth_metadata.effective_resource_quantity_v1).toBeDefined();
  }
 }
 const before=JSON.stringify(c.baseline.normative_source_ids);draft();expect(JSON.stringify(c.baseline.normative_source_ids)).toBe(before);
});
it('preserves exactly24 old runtime profile facts/classes/source arrays and never selects Doka by default',()=>{
 const p=computation(),cfg=draft().knownConfigFields;
 expect(Object.keys(cfg.runtimeProfileInput!)).toHaveLength(24);expect(cfg.runtimeProfileInput).not.toHaveProperty(selector);
 for(const [id,value] of Object.entries(cfg.runtimeProfileInput!)){
  expect(value).toEqual(p.capturedParent.baseline.input_values[id]);expect(cfg.runtimeProfileClassification![id]).toBe(p.capturedParent.baseline.input_classification[id]);
  expect(cfg.runtimeProfileSourceIds![id]).toEqual(p.capturedParent.baseline.normative_source_ids[id]);
 }
 expect(cfg.acceptanceInput[selector]).toBe('KRER06_111_01_DOKA');
 expect(cfg.runtimeProfileClassification).not.toHaveProperty(selector);
});
it('does not guess next ELECOR parent IDs, accept projected capture as full or bypass ROOT admission',()=>{
 const r=draft();expect(r.publicationAllowed).toBe(false);expect(r.parentReleaseId).toBeNull();expect(r.parentSearchReleaseId).toBeNull();
 expect(r.rootDecisionPin).toBeNull();expect(r.nextElecorPublicationPin).toBeNull();expect(r.nextElecorReadbackPin).toBeNull();expect(r.freshRootExecutionPin).toBeNull();
 expect(r.automaticParentRebase).toBe(false);expect(r.oldProjectedDeclarationsUsedAsFullCapture).toBe(false);
 expect(r.knownConfigFields).not.toHaveProperty('parentReleaseId');expect(r.knownConfigFields).not.toHaveProperty('parentSearchReleaseId');
 expect(r.historicalFullCaptureContext.sourceHead).toBe('7f5754c0212613f563ca823e9f958b46c200cf1b');
 expect(r.historicalOriginalAContext.sourceHead).toBe('513dc2fa8d75b773d057c19b0c4c00c11dba148f');
});
it('pure verifyCore checks selected source quantities and missing-selector legacy behavior using the existing shared compiler',async()=>{
 await expect(draft().knownConfigFields.verifyCore()).resolves.toMatchObject({definitionShape:[301,137,140],
  fullPreimages:{parameters:188,formulas:92,resources:95,bindings:8,sources:2,locators:2},oldRuntimeProfileSlotsRetained:24,
  oldBaselineSourceArraysRetained:188,newParameterSourceMap:113,expectedFinalBindings:28,actualNextElecorParentAccepted:false,publicationPerformed:false});
});
