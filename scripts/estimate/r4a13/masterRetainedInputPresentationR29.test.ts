import {randomUUID} from 'node:crypto';
import {prepareRoofExistingSourceProfileR11,validateRoofExistingSourcePublisherR11} from './prepareRoofExistingSourceProfileR11';
import {roofSourceProfilePackR11 as pack} from '../../../src/lib/estimate/v4/roofExistingSourceProfileR11';
import {masterRetainedLineageValueSha256V1 as hash,masterRetainedSourceProfileMetadataCompactR1,
  prepareMasterRetainedBindingRepresentativeR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Json=Record<string,any>;
const copy=<T,>(v:T):T=>structuredClone(v);
function setup(index=0){
  const entry=pack.entries[index],config=prepareRoofExistingSourceProfileR11({
    releaseId:randomUUID(),searchReleaseId:randomUUID(),outputRoot:'work/test-only-input-presentation-r29'},entry.catalogId);
  const opt=config.binding.retainParentBindings!,mode=opt.truthAuthorityOnlyV1!,capture=opt.capturedParent;
  const profile=mode.sourceProfileMetadataOnlyV1!;
  // Test the actual family declaration, with the original full captured parent.
  expect(profile.inputPresentationOnlyV1).toBeDefined();
  const source=config.binding.reuseExistingNormativeRegistry!.source;
  const input={config,newSource:Object.fromEntries(Object.entries(source).filter(([k])=>k!=='created_at')),
    newLocators:config.binding.reuseExistingNormativeRegistry!.locators};
  const next={parameters:copy([...config.parameterDefinitions]),formulas:copy([...config.formulaDefinitions]),
    resources:copy([...config.resourceDefinitions]),newBindings:[],successorProvenance:{
      contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:capture.definition.id,
      parentBaselineId:capture.baseline.id,capturedParentSha256:opt.capturedParentSha256,
      truthAuthorityOnlyV1:{contract:mode.contract,changesSha256:mode.changesSha256,parameterIds:Object.keys(mode.changes).sort(),
        sourceProfileMetadataOnlyV1:masterRetainedSourceProfileMetadataCompactR1(mode)}}};
  return{config,opt,mode,profile,capture,input,next};
}
function prepare(state:ReturnType<typeof setup>){
  const proof=state.next.successorProvenance.truthAuthorityOnlyV1;
  proof.sourceProfileMetadataOnlyV1=masterRetainedSourceProfileMetadataCompactR1(state.mode);
  return prepareMasterRetainedBindingRepresentativeR1(state.input,state.next);
}
function rehash(state:ReturnType<typeof setup>){
  const p=state.profile.inputPresentationOnlyV1!;
  Object.assign(p,{changesSha256:hash(p.changes)});
}
function geometry(state:ReturnType<typeof setup>){
  return state.next.parameters.find(p=>p.parameter_id===state.profile.sourceProfileSelectionMetadata.geometryParameterIds[0])!;
}
function rehashAfter(state:ReturnType<typeof setup>,id:string){
  const next=state.next.parameters.find(p=>p.parameter_id===id)!;
  Object.assign(state.profile.inputPresentationOnlyV1!.changes[id]!,{afterTruthMetadataSha256:hash(next.truth_metadata)});rehash(state);
}

test.each([0,1,2])('actual roof family %s retains all rows, bindings, guides and baseline with disjoint presentation and existing-source composition proofs',async index=>{
  const state=setup(index),before=copy(state.capture),proof=state.profile.inputPresentationOnlyV1!;
  const result=prepare(state);
  // The flat Config now declares the same23 legacy fields exactly once:
  // 17 presentation-only fields and6 final whole-consumer truth changes.
  const reuse=state.profile.existingSourceConsumerReuseV1;
  const presentationIds=Object.keys(proof.changes),reuseTruthIds=Object.keys(reuse?.truthChanges??{});
  expect(presentationIds).toHaveLength([17,5,5][index]);
  expect(reuseTruthIds).toHaveLength([6,0,0][index]);
  expect(Object.keys(reuse?.resourceChanges??{})).toHaveLength([16,0,0][index]);
  const combinedIds=[...presentationIds,...reuseTruthIds];
  expect(new Set(combinedIds).size).toBe(combinedIds.length);
  const entry=pack.entries[index],expectedIds=[...new Set([
    ...Object.keys(entry.geometryRoleChanges??{}),...Object.keys(entry.initialFormVisibilityChanges??{})])].sort();
  expect([...combinedIds].sort()).toEqual(expectedIds);
  expect(combinedIds).toHaveLength([23,5,5][index]);
  for(const id of reuseTruthIds){
    expect(state.mode.changes).not.toHaveProperty(id);expect(id).not.toBe(pack.selectorId);
    const declaration=reuse!.truthChanges[id]!,old=before.parameters.find(p=>p.parameter_id===id)!;
    const next=state.next.parameters.find(p=>p.parameter_id===id)!;
    expect(declaration.capturedTruthMetadataSha256).toBe(hash(old.truth_metadata));
    expect(declaration.afterTruthMetadataSha256).toBe(hash(next.truth_metadata));
  }
  expect(result.bindings).toHaveLength(before.bindings.length);
  expect(result.normativeSourceIds).toEqual(before.baseline.normative_source_ids);
  expect(state.next.formulas).toEqual(before.formulas);
  // Keep deep equality of EVERY resource field. Only the explicitly declared
  // inclusion can be the exact old AST OR its exact bounded addition.
  const expectedResources=copy(before.resources);
  for(const expected of expectedResources){
    const declaration=reuse?.resourceChanges[expected.row_id];
    if(!declaration)continue;
    const oldAst=copy(expected.inclusion_ast);
    expect(declaration.capturedInclusionSha256).toBe(hash(oldAst));
    const addition=reuse!.additionsBySha256[declaration.additionSha256]!;
    expect(hash(addition)).toBe(declaration.additionSha256);
    expected.inclusion_ast={kind:'or',operands:[oldAst,copy(addition)]};
    expect(hash(expected.inclusion_ast)).toBe(declaration.afterInclusionSha256);
  }
  expect(state.next.resources).toEqual(expectedResources);
  for(const next of state.next.parameters){
    const old=before.parameters.find(p=>p.parameter_id===next.parameter_id)!;
    expect(next.default_value).toEqual(old.default_value);expect(next.constraints_json).toEqual(old.constraints_json);
    expect(next.unit_id).toEqual(old.unit_id);expect(next.required).toEqual(old.required);
  }
  expect(state.capture).toEqual(before);
  expect(validateRoofExistingSourcePublisherR11(state.config).bindings).toHaveLength(before.bindings.length);
  const accepted=await state.config.verifyCore!();
  expect(accepted).toMatchObject({status:'PASS_ORDINARY_SOURCE_PROFILE_CURRENT_ROWS_RETAINED',newParameters:0,newRows:0,newBindings:0,baselinePromotions:0});
});

test('undeclared role and visibility changes are still rejected',()=>{
  const state=setup();delete (state.profile as Json).inputPresentationOnlyV1;
  // This actual flat Config has a composed reuse proof. It must fail at the
  // exact declaration dependency before any later parameter comparison.
  expect(state.profile.existingSourceConsumerReuseV1).toBeDefined();
  expect(()=>prepare(state)).toThrow(/PROFILE_REUSE_DECLARATION/);
});
test.each(['contract','legacySelectorValue','changesSha256','capturedTruthMetadataSha256','afterTruthMetadataSha256'])(
  'presentation rejects a stale or foreign anchor: %s',field=>{
    const state=setup(),p=state.profile.inputPresentationOnlyV1! as Json,id=Object.keys(p.changes)[0];
    if(field==='contract')p.contract='foreign';
    else if(field==='legacySelectorValue')p.legacySelectorValue=state.profile.sourceProfileSelectionMetadata.profiles[0].selectorValue;
    else if(field==='changesSha256')p.changesSha256='0'.repeat(64);
    else{p.changes[id][field]='0'.repeat(64);rehash(state);}
    expect(()=>prepare(state)).toThrow(/PROFILE_INPUT_PRESENTATION/);
  });
test.each(['unit_id','default_value','required','constraints_json'])(
  'presentation never admits a numerical or validation declaration change: %s',field=>{
    const state=setup(),p=geometry(state);
    p[field]=field==='unit_id'?'meter':field==='default_value'?'1':field==='required'?!p.required:{min:123};
    expect(()=>prepare(state)).toThrow(/AUTHORITY_PARAMETERS_DRIFT/);
  });
test.each(['value_source_role','visibility_role','source_confirmation_required','guide','provenance'])(
  'even a freshly rehashed geometry truth cannot promote facts or change its guide: %s',field=>{
    const state=setup(),p=geometry(state),t=p.truth_metadata;
    if(field==='value_source_role')t[field]='MANDATORY_NORM_VALUE';
    else if(field==='visibility_role')t[field]='INTERNAL_ONLY';
    else if(field==='source_confirmation_required')t[field]=!t[field];
    else if(field==='guide')t.guide={...t.guide,source_document:'foreign'};
    else t.provenance={...t.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'};
    rehashAfter(state,p.parameter_id);
    expect(()=>prepare(state)).toThrow(/PROFILE_INPUT_PRESENTATION_AFTER_TRUTH_ANCHOR/);
  });
test.each([true,{kind:'literal',value:false},{kind:'selected',parameterId:'foreign',value:'foreign'}])(
  'geometry visibility must be the exact literal condition: %p',condition=>{
    const state=setup(),p=geometry(state);p.truth_metadata.visible_when=condition;rehashAfter(state,p.parameter_id);
    expect(()=>prepare(state)).toThrow(/PROFILE_INPUT_PRESENTATION_AFTER_TRUTH_ANCHOR/);
  });
test('historical field retains its whole original visibility condition on the exact legacy branch',()=>{
  const state=setup(),ids=state.profile.sourceProfileSelectionMetadata.geometryParameterIds;
  const id=Object.keys(state.profile.inputPresentationOnlyV1!.changes).find(id=>!ids.includes(id))!;
  const p=state.next.parameters.find(p=>p.parameter_id===id)!;
  p.truth_metadata.visible_when={kind:'literal',value:true};rehashAfter(state,id);
  expect(()=>prepare(state)).toThrow(/PROFILE_INPUT_PRESENTATION_AFTER_TRUTH_ANCHOR/);
});
test('presentation cannot overlap the authority map or source selector',()=>{
  for(const id of [Object.keys(setup().mode.changes)[0],pack.selectorId]){
    const state=setup(),old=state.capture.parameters.find(p=>p.parameter_id===id)!;
    (state.profile.inputPresentationOnlyV1!.changes as Json)[id]={capturedTruthMetadata:copy(old.truth_metadata),
      capturedTruthMetadataSha256:hash(old.truth_metadata),afterTruthMetadataSha256:'1'.repeat(64)};rehash(state);
    expect(()=>prepare(state)).toThrow(/PROFILE_INPUT_PRESENTATION_OLD_TRUTH_ANCHOR/);
  }
});
test.each(['count','bytes'])('presentation bounds remain unchanged: %s',kind=>{
  const state=setup(),p=state.profile.inputPresentationOnlyV1!;
  if(kind==='count')for(let i=0;i<65;i++)(p.changes as Json)['foreign'+i]={capturedTruthMetadata:{},capturedTruthMetadataSha256:'0'.repeat(64),afterTruthMetadataSha256:'1'.repeat(64)};
  else (p.changes as Json).foreign={capturedTruthMetadata:{oversize:'x'.repeat(262144)},capturedTruthMetadataSha256:'0'.repeat(64),afterTruthMetadataSha256:'1'.repeat(64)};
  rehash(state);expect(()=>prepare(state)).toThrow(/PROFILE_INPUT_PRESENTATION_CHANGE_MAP/);
});
