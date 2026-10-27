import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {buildMaster29RoofSuccessorR1,buildMaster29FacadeSuccessorR1,master29CapturedRepresentativeR1 as captured,master29RoofFacadePackR1 as pack,master29IndependentCompletenessMapR1 as independent,master29FacadeKitR1} from './master29RoofFacadeWholeSubworksR1';
import {master29RoofFacadeMasterConfigR1 as configFactory,master29RoofControlR1 as roofFacts,master29FacadeControlR1 as facadeFacts,compileMaster29RoofFacadeDemoR1 as compile} from '../../../../scripts/estimate/r4a13/prepareMaster29RoofFacadeWholeSubworksR1';
import {buildMasterPublicationResourceRowsR1,buildMasterParameterCalculationConsumers,buildMasterCapabilityMatrix,buildMasterScopeReadiness,validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {prepareMasterRetainedBindingRepresentativeR1,assertMasterRetainedBindingSnapshotR1,assertMasterRetainedBindingPlanR1,masterRetainedParentCaptureSha256R1,type MasterRetainedBindingGuardInputR1} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {canonicalPublisherQuantityScopeIsConsistent,createCanonicalDefinitionClonePlan} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {ct54ProtectionPackS2770,ct54Tesa2600PackR1} from './ct54RectangularProtectionS2770';
import {canonicalPublicResourceDisplayPresentationV1 as presentation} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const expected=require('../../../../data/estimate-benchmarks/fixtures/master29-roof-facade-independent-expected-r1.json');
const clone=<T,>(x:T):T=>structuredClone(x);
const build=(catalogId:string)=>{const p=captured(catalogId);return pack.targets.find(t=>t.catalogId===catalogId)!.group==='roof'?buildMaster29RoofSuccessorR1(p):buildMaster29FacadeSuccessorR1(p);};
const q=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(row=>row.row_id===id)?.quantity;
const uuid=(s:string)=>{const h=createHash('sha256').update(s).digest('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
function sourceOnlyConfig(id:string){const read=fs.readFileSync,after=resolve(__dirname,'../../../..');const mock=jest.spyOn(fs,'readFileSync').mockImplementation(((path:any,...args:any[])=>{
 const candidate=typeof path==='string'&&!fs.existsSync(path)?join(after,path):path;return(read as any)(candidate,...args);}) as any);try{return configFactory({releaseId:pack.baseDefinitionReleaseId,searchReleaseId:'00000000-0000-5000-8000-000000000001'},id);}finally{mock.mockRestore();}}

test('scope is exactly8 current roofs plus4 active facade consumers, no retired areas or new FULL',()=>{
 expect(pack.targets).toHaveLength(12);expect(pack.targets.filter(t=>t.group==='roof')).toHaveLength(8);expect(pack.targets.filter(t=>t.group==='facade')).toHaveLength(4);expect(pack.targets.some(t=>/_area_/u.test(t.catalogId))).toBe(false);expect(pack.counts.newWorkTypes).toBe(0);expect(pack.counts.newFullTechnologies).toBe(0);expect(pack.sourceRegistrySharing.sourceBundles).toBe(3);
});
for(const target of pack.targets){
 test('preserves whole parent arithmetic, exact owners and correct new SQL types: '+target.catalogId,()=>{
  const old=captured(target.catalogId),next=build(target.catalogId),oldIds=new Set(old.resources.map(r=>r.row_id));expect(next.formulas.slice(0,old.formulas.length)).toEqual(old.formulas);
  expect(next.parameters.map(p=>p.parameter_id).slice(0,old.parameters.length)).toEqual(old.parameters.map(p=>p.parameter_id));
  for(const row of old.resources){const r=next.resources.find(r=>r.row_id===row.row_id)!;for(const key of ['unit_id','category','row_type','cost_owner_id','semantic_owner','procurement_eligible','formula_id','source_metadata'])expect(r[key]).toEqual(row[key]);expect(r.resource_graph.costTreatment).toEqual(row.resource_graph.costTreatment);}
  for(const r of next.resources.filter(r=>!oldIds.has(r.row_id))){expect(r.row_type).toBe(r.category==='labor'?'labor':r.category);expect(r.semantic_owner).toBe(target.catalogId+':'+r.row_id);const p=r.resource_graph.publicResourcePresentationV1;expect(p.nameRu).not.toMatch(/tesa|4369|4363|CT54|Ceresit|VGT/iu);expect(p.sourceTitleRu).toBe(r.title_ru);expect(presentation({titleRu:r.title_ru,rowId:r.row_id,descriptor:p})).not.toBeNull();if(target.group==='roof')expect(p.rowKind).toBeUndefined();}
  expect(next.passport.decision.quantityScope).toBe('PARTIAL');expect(next.passport.decision.unresolvedResourceRowIds.length).toBeGreaterThan(0);expect(canonicalPublisherQuantityScopeIsConsistent({...next,passport:next.passport})).toBe(true);
  expect(validateIndependentCompletenessMapReferences({completenessMap:independent(target.catalogId),formulaDefinitions:next.formulas,resourceDefinitions:next.resources})).toEqual([]);
 });
 test('exact current identity is required: '+target.catalogId,()=>{const wrong=captured(target.catalogId);wrong.definition.definition_sha256='a'.repeat(64);expect(()=>target.group==='roof'?buildMaster29RoofSuccessorR1(wrong):buildMaster29FacadeSuccessorR1(wrong)).toThrow('EXACT_CURRENT_IDENTITY');});
}
for(const profile of expected.profiles){for(const catalogId of profile.targetCatalogIds){
 for(const c of profile.cases.filter((c:any)=>['normal','small','boundary','boundary-zero'].includes(c.kind)))test(c.id+' '+catalogId,async()=>{
  const model=build(catalogId),r=await compile(model,c.input??{...facadeFacts(),...c.geometryInput});
  for(const[rowId,value]of Object.entries(c.expectedQuantities))expect({rowId,quantity:q(r,rowId)}).toEqual({rowId,quantity:value});
  for(const known of profile.knownResources){const def=model.resources.find(r=>r.row_id===known.rowId)!;expect(def.unit_id).toBe(known.unitId);expect(def.category).toBe(known.category);expect(def.cost_owner_id).toBe(known.costOwnerId);expect(def.resource_graph.costTreatment).toBe(known.costTreatment);expect(def.procurement_eligible).toBe(known.procurement);
   const actual=r.rows.find(r=>r.row_id===known.rowId)!;expect(actual.unit_price).toBeNull();expect(actual.included_in_procurement).toBe(known.procurement);}
  if(profile.profileKey==='protection2600'){for(const id of c.conditionallyClosedNeedIds)expect(r.preliminaryNeeds.some(n=>n.row_id===id)).toBe(false);expect(r.rows.filter(x=>x.row_id.startsWith(pack.facade.sourcePrefix+':')&&x.included_in_procurement)).toHaveLength(2);expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...c.expectedActiveNeedIds].sort());}
  else{expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...c.expectedActiveNeedIds].sort());expect(r.rows).toHaveLength(profile.knownResources.length);expect(r.rows.some(x=>!x.row_id.startsWith(pack.roofProfiles.find(p=>p.key===profile.profileKey)!.sourcePrefix+':'))).toBe(false);for(const n of r.preliminaryNeeds)expect(n.quantity).toBeNull();}
 });
 test('unconfirmed selector cannot become another material/profile '+catalogId,async()=>{
  const negative=profile.cases.find((c:any)=>c.kind==='selector-negative');await expect(compile(build(catalogId),{...(profile.profileKey==='protection2600'?facadeFacts():roofFacts(profile.profileKey)),...negative.input})).rejects.toThrow();
 });
}}
for(const p of pack.roofProfiles){const target=pack.targets.find(t=>t.profileKey===p.key)!;
 test('q100 cannot replace the separate physical measure; legacy59 and new norm never overlap '+p.key,async()=>{
  const model=build(target.catalogId),facts=roofFacts(p.key);delete facts[p.measureId];const r=await compile(model,{...facts,q:100});expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(p.measureId))).toBe(true);
  // Direct frozen-parent compile is the oracle, not its declaration count.
  // Both use the same real compiler/legacy primary q, with only the new exact
  // legacy selector supplied to the successor. Compare complete emitted rows,
  // including every trace and row hash, plus needs and all totals.
  const parent=captured(target.catalogId),legacyCompile=(rep:Rep,submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:target.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'q',
   definition:{parameters:rep.parameters,formulas:rep.formulas,resources:rep.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']} as unknown as AutomaticOwnerDefinition,submittedParameters});
  const original=await legacyCompile(parent,{q:100}),legacy=await legacyCompile(model,{q:100,[p.choiceId]:p.legacyChoiceRu});
  expect(parent.resources).toHaveLength(59);expect(model.resources.filter(r=>parent.resources.some(old=>old.row_id===r.row_id))).toHaveLength(59);
  const sourceExcluded=parent.resources.filter(r=>r.inclusion_ast.kind==='literal'&&r.inclusion_ast.value===false);expect(sourceExcluded).toHaveLength(1);expect(sourceExcluded[0]!.row_id).toBe(target.catalogId.replace('canonical-work:base:','')+'_materials_37');
  expect(model.resources.find(r=>r.row_id===sourceExcluded[0]!.row_id)!.inclusion_ast).toEqual({kind:'and',operands:[sourceExcluded[0]!.inclusion_ast,{kind:'equals',parameterId:p.choiceId,value:p.legacyChoiceRu}]});
  expect(original.rows).toHaveLength(58);expect(original.preliminaryNeeds).toEqual([]);expect(original.rows.some(r=>r.row_id===sourceExcluded[0]!.row_id)).toBe(false);
  expect(legacy.rows).toEqual(original.rows);expect(legacy.preliminaryNeeds).toEqual(original.preliminaryNeeds);expect(legacy.totals).toEqual(original.totals);
  expect(legacy.rows.every(x=>!x.row_id.startsWith(p.sourcePrefix+':'))).toBe(true);
  expect(model.formulas.filter(f=>!captured(target.catalogId).formulas.some(old=>old.formula_id===f.formula_id)).every(f=>!f.input_parameter_ids.includes('q'))).toBe(true);
 });
 test('wrong conditions cannot emit a source quantity; gaps have unknown unit and quantity '+p.key,async()=>{
  const model=build(target.catalogId),r=await compile(model,{...roofFacts(p.key),[p.conditionsParameterId]:'Нужен другой расчёт'});expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds).toHaveLength(4);
  for(const need of expected.profiles.find((x:any)=>x.profileKey===p.key).openNeeds){const row=model.resources.find(x=>x.row_id===need.rowId)!;expect(row.unit_id).toBe('');expect(row.source_metadata.quantityUnitUnconfirmed).toBe(true);expect(row.source_metadata.sourceNormQuantityAccepted).toBe(false);expect(row.procurement_eligible).toBe(false);expect(independent(target.catalogId).entries.find(x=>x.resolution.rowId===need.rowId)).toMatchObject({unitId:null,quantityUnitUnconfirmed:true});}
 });
}
const facadeId=pack.targets.find(t=>t.group==='facade')!.catalogId,fp=pack.facade.sourcePrefix;
test('2.6m cut kit keeps packing gap and every other source need',async()=>{
 const m=build(facadeId),r=await compile(m,facadeFacts('3','10','2.6'));expect(q(r,fp+':film-order')).toBe('3');expect(q(r,fp+':tape-order')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===pack.facade.closedNeedIds[1])).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===pack.facade.closedNeedIds[0])).toBe(false);
 expect(r.rows.filter(x=>x.row_id.startsWith(fp+':')&&x.category==='labor')).toHaveLength(0);
});
test.each([{ct54_tesa2600_cut_height_m:'2.601'},{ct54_tesa2600_cut_width_m:'14.001'},{ct54_tesa2600_cut_height_m:'0'},{ct54_tesa2600_rectangle_count:'0.5'},{ct54_tesa2600_rectangle_count:'1001'},{ct54_tesa2600_film_supplier_multiple:'0'},{ct54_tesa2600_site:'Непроверенное основание'}])('2.6m exact source bounds reject %o',async change=>{await expect(compile(build(facadeId),{...facadeFacts(),...change})).rejects.toThrow();});
test('old1.8m saved values and stock remain independent; new dimensions/stock are required only for2.6m',async()=>{
 const m=build(facadeId),old=captured(facadeId),choice=m.parameters.find(p=>p.parameter_id==='ct54_protection_method')!;expect(choice.constraints_json.values.slice(0,2)).toEqual(old.parameters.find(p=>p.parameter_id===choice.parameter_id)!.constraints_json.values);
 const f={...facadeFacts(),ct54_protection_method:ct54ProtectionPackS2770.exactChoiceRu,ct54_protection_site:ct54ProtectionPackS2770.exactSiteRu,ct54_protection_rectangle_count:'4',ct54_protection_cut_width_m:'1.2',ct54_protection_cut_height_m:'1.5',ct54_protection_film_stock:'0',ct54_protection_film_reserve:'0',ct54_protection_film_supplier_multiple:'1',ct54_protection_tape_stock:'0',ct54_protection_tape_reserve:'0',ct54_protection_tape_supplier_multiple:'1'};
 for(const key of Object.keys(f))if(key.startsWith('ct54_tesa2600_'))delete(f as any)[key];const r=await compile(m,f);expect(q(r,'paint:ct54-rectangular-protection:film-order')).toBe('1');expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.some(id=>id.startsWith('ct54_tesa2600_')))).toBe(false);
 const missing={...facadeFacts(),ct54_protection_film_stock:'999'};delete(missing as any).ct54_tesa2600_film_stock;const pending=await compile(m,missing);expect(q(pending,fp+':film-order')).toBeUndefined();expect(pending.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('ct54_tesa2600_film_stock'))).toBe(true);
});
test('all13 kit positions have generic captions; only2 physical order owners are paid/procured',()=>{
 const d=master29FacadeKitR1() as unknown as {parameters:Record<string,any>[];resources:Record<string,any>[]};expect(d.resources).toHaveLength(13);expect(d.resources.filter(r=>r.procurement_eligible)).toHaveLength(2);expect(d.resources.filter(r=>r.resource_graph.publicResourcePresentationV1.rowKind==='CALCULATION_DETAIL')).toHaveLength(11);
 for(const p of d.parameters.filter(p=>p.parameter_id!=='ct54_protection_method'))expect(p.title_ru).not.toMatch(/tesa|4369|4363|CT54/iu);
 for(const r of d.resources){const p=r.resource_graph.publicResourcePresentationV1;expect(p.nameRu).not.toMatch(/tesa|4369|4363|CT54/iu);expect(p.brandAndModelRu).toBeNull();expect(p.sourceTitleRu).toBe(r.title_ru);}
});
test('independent map rejects wrong units/categories/physical operations',()=>{
 const id=pack.targets.find(t=>t.group==='roof')!.catalogId,m=build(id),row=m.resources.find(r=>r.row_id.endsWith(':galvanized_sheet_0_7mm'))!,check=()=>validateIndependentCompletenessMapReferences({completenessMap:independent(id),formulaDefinitions:m.formulas,resourceDefinitions:m.resources});
 row.unit_id='l';expect(check().some(e=>e.endsWith('RESOURCE_UNIT'))).toBe(true);row.unit_id='t';row.category='service';expect(check().some(e=>e.endsWith('RESOURCE_CATEGORY'))).toBe(true);row.category='material';row.resource_graph.operationCompositionV1.operationId='unrelated';expect(check().some(e=>e.endsWith('OPERATION_BINDING'))).toBe(true);
});

for(const target of pack.targets)test('actual Master resource preparation and retained clone plan '+target.catalogId,async()=>{
 const config=sourceOnlyConfig(target.catalogId),opt=config.binding.retainParentBindings!,c=opt.capturedParent,metadata=config.sourceMetadata,sourceId=uuid(target.sourceId),locatorId=uuid(target.sourceId+':locator');
 expect(opt.capturedParentSha256).toBe(masterRetainedParentCaptureSha256R1(c));expect(config.passport.unresolvedApplicableResourceRowIds!.length).toBeGreaterThan(0);expect(config.passport.canonicalRuName).not.toMatch(/tesa|4369|CT54|VGT/iu);
 const input:MasterRetainedBindingGuardInputR1={config,newSource:{id:sourceId,source_key:target.sourceId,title_ru:metadata.source_title,authority:metadata.source_authority,official_url:metadata.official_url,artifact_sha256:metadata.artifact_sha256,effective_from:null,effective_to:null,metadata:{sourceKind:metadata.source_kind,useRestriction:metadata.use_restriction}},newLocators:[{id:locatorId,source_id:sourceId,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:'b'.repeat(64)}]};
 const snapshot={membership:[{release_id:config.parentReleaseId,catalog_id:target.catalogId,definition_version_id:c.definition.id,approved_template_baseline_id:c.baseline.id,definition_hash:c.definition.definition_sha256}],capture:c,newSources:[],newLocators:[]};expect(()=>assertMasterRetainedBindingSnapshotR1(input,snapshot)).not.toThrow();
 const evidence=await config.verifyCore(),resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),model={parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources};expect(resources.map(r=>r.row_type)).toEqual(config.resourceDefinitions.map(r=>r.row_type));
 const consumers=buildMasterParameterCalculationConsumers(model),truth=(p:any)=>({...p.truth_metadata,contract:config.contract,semantic_parameter_key:target.catalogId+':'+p.parameter_id,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]});
 for(const p of model.parameters)expect(p.truth_metadata).toEqual(truth(p));
 const bound=[config.binding.rowId,...(config.binding.additionalRowIds??[])],newBindings=bound.map(row_id=>({row_id,locator_id:locatorId,applicability:config.binding.applicabilityByRowId![row_id]})),assembled=prepareMasterRetainedBindingRepresentativeR1(input,{...model,newBindings,successorProvenance:{contract:config.contract,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:opt.capturedParentSha256}}),rep=build(target.catalogId);
 for(const[id,oldSources]of Object.entries(c.baseline.normative_source_ids))expect(assembled.normativeSourceIds[id]).toEqual(oldSources);
 const unconfirmed=Object.values(opt.newParameterSources).filter(p=>p.kind==='UNRESOLVED');expect(unconfirmed).toHaveLength(target.group==='roof'?4:0);expect(unconfirmed.every(p=>p.sourceIds.length===0)).toBe(true);
 const baseline={...rep.baseline,input_values:{...config.acceptanceInput,...config.runtimeProfileInput},input_classification:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,config.runtimeProfileClassification?.[p.parameter_id]??'VALIDATION_FIXTURE'])),normative_source_ids:assembled.normativeSourceIds};
 const plan=createCanonicalDefinitionClonePlan({contract:config.contract,definition:{id:uuid(target.catalogId+':next'),releaseId:uuid('release'),catalogId:target.catalogId,definitionVersion:target.definitionVersion+1,passport:{canonicalRuName:config.passport.canonicalRuName},applicability:config.applicability,definitionSha256:'c'.repeat(64),sourceMetadata:assembled.sourceMetadata},
  representative:{parameters:[...model.parameters],formulas:[...model.formulas],resources:[...model.resources],bindings:[...assembled.bindings],baseline,passport:{...rep.passport,capability_matrix:buildMasterCapabilityMatrix(config.passport.unresolvedApplicableResourceRowIds,resources)}},
  parameterTruthMetadata:truth,resourceId:r=>uuid(target.catalogId+':'+r.row_id),resourceSemanticOwner:r=>c.resources.find(old=>old.row_id===r.row_id)?.semantic_owner??target.catalogId+':'+r.row_id,resourceSha256:()=>'d'.repeat(64),
  baseline:{id:uuid('baseline'),key:'DEMO_ONLY_MASTER29',sourceDefinitionVersionId:c.definition.id,validationScenarioRefs:[],acceptanceEvidenceSha256:'e'.repeat(64),acceptedReleaseId:uuid('release'),supersedesBaselineId:c.baseline.id},passport:{physicalResultRu:config.passport.physicalResultRu,excludedScopeRu:config.passport.excludedScopeRu,decision:{...rep.passport.decision,...buildMasterScopeReadiness(config.passport.unresolvedApplicableResourceRowIds,resources)},payloadSha256:'f'.repeat(64),sourceHead:'0'.repeat(40),sourceTree:'1'.repeat(40)},bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:c.bindings.length+bound.length});
 expect(()=>assertMasterRetainedBindingPlanR1(input,plan,assembled)).not.toThrow();expect(canonicalPublisherQuantityScopeIsConsistent(plan)).toBe(true);expect(evidence.newFullTechnologies).toBe(0);
 const tampered=clone(snapshot);tampered.capture.formulas[0]!.created_at+=' drift';expect(()=>assertMasterRetainedBindingSnapshotR1(input,tampered)).toThrow('PARENT_FULL_CAPTURE_DRIFT');
 const changed=clone(plan);if(c.bindings.length){const old=c.resources.find(r=>c.bindings.some(b=>b.resource_spec_id===r.id))!;changed.resources.find(r=>r.row_id===old.row_id)!.cost_owner_id='second-owner';expect(()=>assertMasterRetainedBindingPlanR1(input,changed,assembled)).toThrow('OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT');}
});

// Added after ROOT's first bounded run. Existing assertions above are unchanged.
// This is the ACTUAL ordinary client chooser; the API normalizer fields below
// mirror serveCanonicalEstimateLocalR1's catalog parameter view, including the
// approved historical q default. No numeric operand is synthesized here.
import {buildCanonicalBaselinePlan} from '../backendPlatform/canonicalConsumerPromptPlanServerR1';
import {canonicalApprovedBaselineRuntimeDefaultValue} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {resolvePrimaryMeasureSelectionV1,assertCanonicalPrimaryMeasureSelectionV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
function roofClientCatalog(catalogId:string):CanonicalEstimateCatalogItem{
 const config=sourceOnlyConfig(catalogId),model=build(catalogId);
 return{catalogId,releaseId:pack.baseDefinitionReleaseId,namespace:'global',domain:'roofing',workKey:catalogId.replace('canonical-work:base:',''),titleRu:config.passport.canonicalRuName,definitionVersion:model.definition.definition_version+1,professionalMetadata:{},applicability:config.applicability,
  parameterSchema:model.parameters.map(p=>{const t=p.truth_metadata,g=t.guide;return{parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,required:p.required,
   preliminaryCompilationAllowed:t.preliminary_compilation_allowed===true,defaultValue:p.default_value??canonicalApprovedBaselineRuntimeDefaultValue(model.baseline,p.parameter_id),constraints:p.constraints_json,
   visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,visibleWhen:t.visible_when,provenance:t.provenance,formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
   ...(g?{guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,guideVersion:g.guide_version,sourceSnapshotHash:g.source_snapshot_hash,applicability:g.applicability,verifiedAt:g.verified_at}}:{})};})};
}
for(const target of pack.targets.filter(t=>t.group==='roof')){
 const profile=pack.roofProfiles.find(p=>p.key===target.profileKey)!;
 test('client finite identity covers exactly selected roof and retained legacy '+target.catalogId,()=>{
  const c=roofClientCatalog(target.catalogId),metadata=c.applicability.primaryMeasureSelectionV1 as any,domain=c.parameterSchema.find(p=>p.parameterId===profile.choiceId)!.constraints.values;
  expect(domain).toEqual([profile.exactChoiceRu,profile.legacyChoiceRu]);expect(metadata.selections).toEqual([{selectorValue:profile.exactChoiceRu,primaryMeasureParameterId:profile.measureId,unitId:profile.unitId},{selectorValue:profile.legacyChoiceRu,primaryMeasureParameterId:'q',unitId:'m2'}]);
  expect(c.parameterSchema.find(p=>p.parameterId==='q')!.defaultValue).toBe(100);
 });
 test('actual client uses measured roof identity despite historical q100 '+target.catalogId,()=>{
  const catalog=roofClientCatalog(target.catalogId),facts=roofFacts(profile.key,'25') as Record<string,string>,result=buildCanonicalBaselinePlan({catalog,prompt:profile.publicNameRu,parameterOverrides:facts});
  expect(result.primaryMeasureParameterId).toBe(profile.measureId);expect(result.parameters[profile.measureId]).toBe('25');
  expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:catalog.applicability.primaryMeasureSelectionV1,parameterSchema:catalog.parameterSchema,submittedParameters:facts})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:profile.measureId,unitId:profile.unitId}});
 });
 test('actual client retains legacy q identity without demanding independent roof facts '+target.catalogId,()=>{
  const catalog=roofClientCatalog(target.catalogId),facts={[profile.choiceId]:profile.legacyChoiceRu,q:'7'},result=buildCanonicalBaselinePlan({catalog,prompt:profile.publicNameRu,parameterOverrides:facts});
  expect(result.primaryMeasureParameterId).toBe('q');expect(result.parameters.q).toBe('7');expect(result.parameters).not.toHaveProperty(profile.measureId);
  expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:catalog.applicability.primaryMeasureSelectionV1,parameterSchema:catalog.parameterSchema,submittedParameters:facts})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:'q',unitId:'m2'}});
 });
 test('actual client asks for selector before accepting historical q100 '+target.catalogId,()=>{
  expect(()=>buildCanonicalBaselinePlan({catalog:roofClientCatalog(target.catalogId),prompt:profile.publicNameRu,parameterOverrides:{q:'100'}})).toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:[profile.choiceId]}));
 });
 test('actual client cannot substitute q for missing selected physical measure '+target.catalogId,()=>{
  const facts=roofFacts(profile.key) as Record<string,string>;delete facts[profile.measureId];facts.q='100';
  expect(()=>buildCanonicalBaselinePlan({catalog:roofClientCatalog(target.catalogId),prompt:profile.publicNameRu,parameterOverrides:facts})).toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:expect.arrayContaining([profile.measureId])}));
 });
 test('server rejects a wrong explicit identity and requires a new root across legacy boundary '+target.catalogId,()=>{
  const catalog=roofClientCatalog(target.catalogId),input={selectionMetadata:catalog.applicability.primaryMeasureSelectionV1,parameterSchema:catalog.parameterSchema,submittedParameters:roofFacts(profile.key,'25')};
  expect(()=>assertCanonicalPrimaryMeasureSelectionV1({...input,explicitPrimaryMeasureParameterId:'q'})).toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_SELECTION_INVALID'}));
  expect(()=>assertCanonicalPrimaryMeasureSelectionV1({...input,parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}})).toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED'}));
 });
}

import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
