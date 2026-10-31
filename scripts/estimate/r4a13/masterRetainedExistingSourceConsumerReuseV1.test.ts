// Permanent source-consumer admission regressions. The same real Config and
// captured parents as the governed private two/23 case; no core/DB/publisher.
import assert from 'node:assert/strict';
import {prepareRoofExistingSourceProfileR11,validateRoofExistingSourcePublisherR11} from './prepareRoofExistingSourceProfileR11';
import {masterRetainedLineageValueSha256V1 as valueSha,masterRetainedSourceProfileMetadataCompactR1,
 type MasterExistingSourceConsumerReuseV1} from './masterSingleDefinitionRetainParentBindingsR1';
const api={validateRoofExistingSourcePublisherR11};
const guard={masterRetainedSourceProfileMetadataCompactR1};
type Config=ReturnType<typeof prepareRoofExistingSourceProfileR11>;
const cfg=(kind:'flat'|'metal')=>prepareRoofExistingSourceProfileR11({releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY',
 outputRoot:'work/test-only-existing-consumer-reuse-r11',sourceRoot:process.cwd()},
 'canonical-work:base:roofing_interior_'+(kind==='flat'?'flat_roof_install_technical_room':'metal_roof_install_standard'));
const clone=(c:Config):Config=>({...structuredClone({...c,verifyCore:undefined}),verifyCore:c.verifyCore});
const mode=(c:Config)=>c.binding.retainParentBindings!.truthAuthorityOnlyV1!;
const reuse=(c:Config)=>mode(c).sourceProfileMetadataOnlyV1!.existingSourceConsumerReuseV1!;
const refresh=(c:Config)=>{const r=reuse(c);Object.assign(r,{resourceChangesSha256:valueSha(r.resourceChanges),
 additionsSha256:valueSha(r.additionsBySha256),truthChangesSha256:valueSha(r.truthChanges)});};
type Addition=MasterExistingSourceConsumerReuseV1['additionsBySha256'][string];
const replaceAddition=(c:Config,oldHash:string,change:(addition:Addition)=>void)=>{
 const r=reuse(c),addition=structuredClone(r.additionsBySha256[oldHash]);change(addition);
 const newHash=valueSha(addition);Reflect.deleteProperty(r.additionsBySha256,oldHash);Object.assign(r.additionsBySha256,{[newHash]:addition});
 for(const[id,row]of Object.entries(r.resourceChanges))if(row.additionSha256===oldHash){Object.assign(row,{additionSha256:newHash});
  const actual=c.resourceDefinitions.find(x=>x.row_id===id)!;actual.inclusion_ast.operands[1]=structuredClone(addition);
  Object.assign(row,{afterInclusionSha256:valueSha(actual.inclusion_ast)});}
 refresh(c);
};
 test('existing-whole-seven-plus-nine-source-consumer-ordinary-config-boundaries',()=>{
  const c=cfg('flat'),r=reuse(c),retained=c.binding.retainParentBindings!;
  assert.equal(Object.keys(r.resourceChanges).length,16);assert.equal(Object.keys(r.truthChanges).length,6);assert.equal(Object.keys(r.additionsBySha256).length,3);
  assert.deepEqual(Object.values(r.locatorGroups).map(x=>x.capturedBoundRowIds.length).sort((a,b)=>a-b),[7,9]);
  assert.equal(Object.keys(mode(c).sourceProfileMetadataOnlyV1!.inputPresentationOnlyV1!.changes).length,17);
  const good=api.validateRoofExistingSourcePublisherR11(c);assert.equal(good.bindings.length,retained.capturedParent.bindings.length);
  assert.deepEqual(good.normativeSourceIds,retained.capturedParent.baseline.normative_source_ids);
  const compact=guard.masterRetainedSourceProfileMetadataCompactR1(mode(c));
  assert(compact,'SOURCE_PROFILE_COMPACT_REQUIRED');
  const compactReuse=compact.existingSourceConsumerReuseV1;
  assert(compactReuse,'EXISTING_SOURCE_CONSUMER_COMPACT_REQUIRED');
  assert.equal(Object.hasOwn(compactReuse,'additionsBySha256'),false);
  const negatives:string[]=[];const reject=(id:string,mutate:(b:Config)=>void,pattern:RegExp)=>{const b=clone(c);mutate(b);assert.throws(()=>api.validateRoofExistingSourcePublisherR11(b),pattern,id);negatives.push(id);};
  const first=Object.keys(r.resourceChanges)[0],firstHash=r.resourceChanges[first].additionSha256;
  reject('omitted-opt-in-preserves-exact-old-comparator',b=>{Reflect.deleteProperty(mode(b).sourceProfileMetadataOnlyV1!,'existingSourceConsumerReuseV1');},/AUTHORITY_(PARAMETERS|RESOURCES)_DRIFT/);
  reject('fresh-digest-modified-old-OR-branch',b=>{const row=b.resourceDefinitions.find(x=>x.row_id===first)!;row.inclusion_ast.operands[0]={kind:'literal',value:true};Object.assign(reuse(b).resourceChanges[first],{afterInclusionSha256:valueSha(row.inclusion_ast)});refresh(b);},/PROFILE_REUSE_RESOURCE_ANCHOR/);
  reject('fresh-digest-third-OR-branch',b=>{const row=b.resourceDefinitions.find(x=>x.row_id===first)!;row.inclusion_ast.operands.push({kind:'literal',value:true});Object.assign(reuse(b).resourceChanges[first],{afterInclusionSha256:valueSha(row.inclusion_ast)});refresh(b);},/PROFILE_REUSE_RESOURCE_ANCHOR/);
  reject('fresh-digest-new-OR-instead-of-bounded-AND',b=>replaceAddition(b,firstHash,a=>{Object.assign(a,{kind:'or'});}),/PROFILE_REUSE_ADDITION_AST/);
  reject('own-measured-length-cannot-use-main-roof-area',b=>replaceAddition(b,firstHash,a=>{for(const n of a.operands)if(n.kind==='greater_than'&&n.parameterId==='roof_valley_length_m')Object.assign(n,{parameterId:'m212_roof_covering_area_m2'});}),/PROFILE_REUSE_OWN_GEOMETRY/);
  reject('project-payment-scope-cannot-be-dropped',b=>replaceAddition(b,firstHash,a=>{Object.assign(a,{operands:a.operands.filter(n=>n.parameterId!=='roof_valley_scope')});}),/PROFILE_REUSE_PROJECT_SCOPE/);
  reject('partial-whole-locator-not-seven-plus-nine',b=>{Reflect.deleteProperty(reuse(b).resourceChanges,first);refresh(b);},/PROFILE_REUSE_WHOLE_LOCATOR/);
  reject('scope-source-drift',b=>{Object.assign(Object.values(reuse(b).locatorGroups)[0],{capturedSourceSha256:'0'.repeat(64)});},/PROFILE_REUSE_WHOLE_LOCATOR/);
  reject('fresh-digest-wrong-source-profile',b=>{Object.assign(reuse(b),{profileSelectorValue:'UNKNOWN_PROFILE'});},/PROFILE_REUSE_DECLARATION/);
  reject('duplicate-six-truth-in-old-presentation-map',b=>{const id=Object.keys(reuse(b).truthChanges)[0],old=retained.capturedParent.parameters.find(x=>x.parameter_id===id)!,pres=mode(b).sourceProfileMetadataOnlyV1!.inputPresentationOnlyV1!;
   Object.assign(pres.changes,{[id]:{capturedTruthMetadata:old.truth_metadata,capturedTruthMetadataSha256:valueSha(old.truth_metadata),afterTruthMetadataSha256:reuse(b).truthChanges[id].afterTruthMetadataSha256}});Object.assign(pres,{changesSha256:valueSha(pres.changes)});},/PROFILE_INPUT_PRESENTATION_OLD_TRUTH_ANCHOR/);
  reject('fresh-digest-source-guide-substitution',b=>{const id='roof_torch_conditions',p=b.parameterDefinitions.find(x=>x.parameter_id===id)!;p.truth_metadata.guide.source_snapshot_hash='0'.repeat(64);Object.assign(reuse(b).truthChanges[id],{afterTruthMetadataSha256:valueSha(p.truth_metadata)});refresh(b);},/PROFILE_REUSE_TRUTH_ANCHOR/);
  reject('old-unit-unchanged',b=>{b.resourceDefinitions.find(x=>x.row_id===first)!.unit_id='kg';},/AUTHORITY_RESOURCES_DRIFT/);
  reject('old-paid-owner-unchanged',b=>{b.resourceDefinitions.find(x=>x.row_id===first)!.cost_owner_id='FAKE_OWNER';},/AUTHORITY_RESOURCES_DRIFT/);
  reject('old-purchase-owner-unchanged',b=>{b.resourceDefinitions.find(x=>x.row_id===first)!.resource_graph.purchaseBalanceOwnerRowId='FAKE_OWNER';},/AUTHORITY_RESOURCES_DRIFT/);
  reject('old-arithmetic-unchanged',b=>{b.formulaDefinitions[0].expression_source='1';},/AUTHORITY_FORMULAS_DRIFT/);
  reject('measured-geometry-default-stays-null',b=>{b.parameterDefinitions.find(x=>x.parameter_id==='roof_valley_length_m')!.default_value='1';},/AUTHORITY_PARAMETERS_DRIFT/);
  assert.equal(negatives.length,16);
 },120000);
 test('numeric-technical-takeoff-only-narrow-authority-declaration',()=>{
  const c=cfg('metal'),id='m212_roof_metal_cut_length_m',p=c.parameterDefinitions.find(x=>x.parameter_id===id)!,m=mode(c);
  assert.equal(p.default_value,null);assert.equal(p.truth_metadata.visibility_role,'INTERNAL_ONLY');assert(m.changes[id]);assert.equal(reuse(c),undefined);
  api.validateRoofExistingSourcePublisherR11(c);const negatives:string[]=[];
  const reject=(name:string,mutate:(b:Config)=>void,pattern:RegExp)=>{const b=clone(c);mutate(b);assert.throws(()=>api.validateRoofExistingSourcePublisherR11(b),pattern,name);negatives.push(name);};
  const truthRefresh=(b:Config)=>{const bm=mode(b);Object.assign(bm.changes[id],{afterTruthMetadataSha256:valueSha(b.parameterDefinitions.find(x=>x.parameter_id===id)!.truth_metadata)});Object.assign(bm,{changesSha256:valueSha(bm.changes)});};
  reject('fresh-digest-guide-kind-exact',b=>{b.parameterDefinitions.find(x=>x.parameter_id===id)!.truth_metadata.guide.guide_kind='PROJECT_DEFINED';truthRefresh(b);},/AUTHORITY_GUIDE_CONSISTENCY/);
  reject('fresh-digest-guide-short-exact',b=>{b.parameterDefinitions.find(x=>x.parameter_id===id)!.truth_metadata.guide.guide_short_ru='FAKE_NORM';truthRefresh(b);},/AUTHORITY_GUIDE_CONSISTENCY/);
  reject('numeric-unit-exact',b=>{b.parameterDefinitions.find(x=>x.parameter_id===id)!.unit_id='m2';},/AUTHORITY_PARAMETERS_DRIFT/);
  reject('numeric-default-null',b=>{b.parameterDefinitions.find(x=>x.parameter_id===id)!.default_value='1';},/AUTHORITY_PARAMETERS_DRIFT/);
  reject('numeric-constraint-exact',b=>{b.parameterDefinitions.find(x=>x.parameter_id===id)!.constraints_json.min=1;},/AUTHORITY_PARAMETERS_DRIFT/);
  reject('numeric-authority-needs-profile-opt-in',b=>{Reflect.deleteProperty(mode(b),'sourceProfileMetadataOnlyV1');},/AUTHORITY_OLD_TRUTH_ANCHOR/);
  reject('public-primary-geometry-cannot-be-hidden',b=>{const bm=mode(b),primary='m212_roof_covering_area_m2',old=b.binding.retainParentBindings!.capturedParent.parameters.find(x=>x.parameter_id===primary)!,actual=b.parameterDefinitions.find(x=>x.parameter_id===primary)!;
   actual.truth_metadata={...old.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
    provenance:{...old.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide:{...old.truth_metadata.guide,source_role:'PROJECT_DOCUMENTATION'}};
   Object.assign(bm.changes,{[primary]:{capturedTruthMetadata:old.truth_metadata,capturedTruthMetadataSha256:valueSha(old.truth_metadata),afterTruthMetadataSha256:valueSha(actual.truth_metadata)}});
   Object.assign(bm,{changesSha256:valueSha(bm.changes)});const pres=bm.sourceProfileMetadataOnlyV1!.inputPresentationOnlyV1!;Reflect.deleteProperty(pres.changes,primary);Object.assign(pres,{changesSha256:valueSha(pres.changes)});},/AUTHORITY_OLD_TRUTH_ANCHOR/);
  assert.equal(negatives.length,7);
 },120000);
