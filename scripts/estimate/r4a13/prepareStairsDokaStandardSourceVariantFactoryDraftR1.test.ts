import {prepareStairsDokaStandardSourceVariantFactoryDraftR1 as draft,
 stairsDokaStandardRetainedSourceDeclarationR1 as retention,
 verifyStairsDokaStandardSourceVariantCoreR1 as verify} from './prepareStairsDokaStandardSourceVariantFactoryDraftR1';

it('prepares the existing-ID field set while refusing to label pending retention/command guards as publishable',()=>{
 const r=draft();expect(r.publicationAllowed).toBe(false);expect(r.newCatalogIds).toBe(0);expect(r.catalogAppend).toBeNull();
 expect(r.knownConfigFields.catalogId).toBe('canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard');
 expect(r.knownConfigFields.expectedParentShape).toEqual([188,92,95]);expect(r.sourceBindingIds).toHaveLength(20);
 expect(r.knownConfigFields.parameterDefinitions).toHaveLength(301);expect(r.knownConfigFields.formulaDefinitions).toHaveLength(137);expect(r.knownConfigFields.resourceDefinitions).toHaveLength(140);
 expect(r.automaticParentRebase).toBe(false);expect(r.capturedContextMustRemainHistorical.sourceHead).toBe('513dc2fa8d75b773d057c19b0c4c00c11dba148f');
});
it('retains old188 source-map entries and plans only the source-backed new closure, leaving application gaps unresolved',()=>{
 const r=retention();expect(r.expectedFinalBindings).toBe(28);expect(r.expectedRetainedBindings).toBe(8);expect(r.expectedNewBindings).toBe(20);
 expect(Object.keys(r.normativeSourceIdsByParameterId)).toHaveLength(301);
 for(const [id,sources] of Object.entries(r.captured.retainedNormativeSourceIdsByParameterId))expect(r.normativeSourceIdsByParameterId[id]).toEqual(sources);
 const keys=[...new Set(Object.values(r.normativeSourceIdsByParameterId).flat())].sort();
 expect(keys).toEqual(['kg_krer06_01_111_01_straight_doka_stair_r1','manufacturer_sika_antisol250w_us_202006_v0103','stairs_complete_installation_standard_s27_23']);
 expect(Object.keys(r.normativeSourceIdsByParameterId).filter(id=>id.startsWith('stair111_unresolved_')).every(id=>r.normativeSourceIdsByParameterId[id]!.length===0)).toBe(true);
});
it('checks independent completeness, exact source quantities and non-overlapping whole-worker payment with the existing core',async()=>{
 await expect(verify()).resolves.toMatchObject({status:'PURE_EXISTING_STANDARD_SOURCE_VARIANT_CORE_ONLY',newCatalogIds:0,
  definitionShape:[301,137,140],source111Quantities:20,machinePriceAdmission:false,sourceOpenNeeds:9,unresolvedOldScopeOwners:58,unresolvedResourceRows:67,sourceVariantSavedSwitchAccepted:false});
});
