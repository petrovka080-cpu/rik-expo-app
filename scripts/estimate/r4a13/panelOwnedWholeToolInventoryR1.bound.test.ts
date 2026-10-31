import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {preparePanelReadyGridCurrentMasterR287 as config,compilePanelReadyGridCurrentSubmittedR1 as compile,
  type PanelReadyGridCurrentContextR287} from './preparePanelReadyGridCurrentMasterR287';
import {panelReadyGridWholePackR287 as pack} from './ownedDomain/panelReadyGridWholePostR287';
import {lightingOwnedWholePostR1 as owned,lightingOwnedWholePostRowR1 as row} from '../../../src/lib/estimate/backendPlatform/lightingOwnedWholeToolPostR1';
import tools from '../../../data/estimate-benchmarks/source-packs/master32-panel-tool-provision-r1.json';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
function record(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function actualContext():PanelReadyGridCurrentContextR287{
  const p=process.env.PANEL_R287_BOUND_CONTEXT_PATH;assert(typeof p==='string'&&isAbsolute(p));
  const d:unknown=JSON.parse(readFileSync(p,'utf8'));assert(record(d)&&typeof d.sourceRoot==='string'&&record(d.currentFullParent));
  assert(typeof d.currentFullParent.path==='string'&&typeof d.currentFullParent.sha256==='string');
  return{sourceRoot:d.sourceRoot,currentFullParent:{path:d.currentFullParent.path,sha256:d.currentFullParent.sha256}};
}
const input=():Record<string,unknown>=>({q:'100',[pack.countParameterId]:'3',
  [pack.retainedFactory.selectorId]:pack.retainedFactory.choiceRu,[pack.retainedToolPost.methodId]:pack.retainedToolPost.methodRu,
  [pack.retainedToolPost.fitId]:pack.retainedToolPost.fitRu,[pack.fields.method]:pack.methodRu,[pack.fields.qualification]:pack.qualificationRu,
  [pack.fields.ppr]:'TEST_ONLY actual-input document label; no source authority',[owned.methodId]:owned.method,[owned.countId]:'2',
  [owned.scheduleId]:'TEST_ONLY two allocated whole usable sets; no real serials or verified server context',[owned.fitId]:owned.fit});
const options={enableSourceOnlyCalculation:true,includeOwnedWholeToolInventoryR1:true} as const;
describe('existing lighting owned whole21/31 post opt-in backend continuation; UNRUN',()=>{
  let context:PanelReadyGridCurrentContextR287;
  beforeAll(()=>{context=actualContext();});
  it('leaves the default121-row Config and existing paid owner untouched without opt-in',()=>{
    const base=config(context);expect(base.resourceDefinitions).toHaveLength(121);
    expect(base.parameterDefinitions.some(q=>q.parameter_id===owned.countId)).toBe(false);
    expect(base.resourceDefinitions.find(r=>r.row_id===tools.ownerRowId)?.resource_graph.costTreatment).toBe('OWN_COST');
    expect(base.locator.payload.ownedWholeToolInventoryR1).toBeUndefined();
    for(const key of ['delivery','waste'])expect(base.resourceDefinitions.find(r=>r.row_id===pack.prefix+':'+key)?.resource_graph.excludeKnownZeroQuantityV1).toBe(true);
    for(const id of Object.values(pack.fields)){
      const parameter=base.parameterDefinitions.find(q=>q.parameter_id===id);assert(parameter);
      expect(parameter.default_value).toBeNull();
      expect(parameter.truth_metadata).toMatchObject({value_source_role:'PROJECT_SPECIFIC_INPUT',projectAuthenticated:false,
        sourceAuthorityPromoted:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},
        guide:{source_role:'ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING'}});
      const guide=parameter.truth_metadata?.guide;assert(record(guide));
      expect(Object.hasOwn(guide,'verified_at')).toBe(false);
      expect(Object.hasOwn(guide,'source_snapshot_hash')).toBe(false);
    }
  });
  it('retains all old IDs/17 protected unknown rows and original passport with21 owned parts, one noncommercial inventory owner and3 unresolved lifecycle scopes',()=>{
    const base=config(context),next=config({...context,ownedWholeToolInventoryR1:true});
    expect(next.parameterDefinitions).toHaveLength(base.parameterDefinitions.length+7);
    expect(next.resourceDefinitions).toHaveLength(base.resourceDefinitions.length+25);
    expect(next.formulaDefinitions).toHaveLength(base.formulaDefinitions.length+25);
    expect(next.sourceId).toBe(base.sourceId);expect(next.sourceMetadata).toEqual(base.sourceMetadata);expect(next.binding).toEqual(base.binding);
    expect(next.sourcePaths).toContain('src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts');
    for(const artifact of tools.sourceArtifacts){
      expect(next.sourcePaths.filter(path=>path===artifact.path)).toHaveLength(1);
    }
    const withoutConsumers=(definitions:typeof base.parameterDefinitions)=>definitions.map(q=>{
      const {formula_consumers:_f,resource_branch_consumers:_r,...truth}=q.truth_metadata??{};
      return{...q,truth_metadata:truth};});
    expect(withoutConsumers(next.parameterDefinitions.slice(0,base.parameterDefinitions.length))).toEqual(withoutConsumers(base.parameterDefinitions));
    const count=next.parameterDefinitions.find(q=>q.parameter_id===owned.countId);assert(count);
    expect(count.truth_metadata?.formula_consumers).toHaveLength(22);
    for(const id of [owned.methodId,owned.countId,owned.scheduleId,owned.fitId]){
      const fact=next.parameterDefinitions.find(q=>q.parameter_id===id);assert(fact);
      expect(fact.truth_metadata?.resource_branch_consumers).toHaveLength(47);
      expect(fact.truth_metadata?.resource_branch_consumers).toContain(tools.ownerRowId);
      for(const tool of tools.tools)expect(fact.truth_metadata?.resource_branch_consumers).toContain(row(tool.key));
    }
    for(const need of owned.openNeeds){
      const parameter=next.parameterDefinitions.find(q=>q.parameter_id===need.parameterId);assert(parameter);
      expect(parameter.unit_id).toBeNull();expect(parameter.default_value).toBeNull();
      expect(parameter.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
        provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:need.reasonRu,
        guide:{source_role:'UNRESOLVED_APPLICATION_NORM',source_locator:need.reasonRu}});
      const unresolvedGuide=parameter.truth_metadata?.guide;assert(record(unresolvedGuide));
      expect(Object.hasOwn(unresolvedGuide,'verified_at')).toBe(false);
      expect(Object.hasOwn(unresolvedGuide,'source_snapshot_hash')).toBe(false);
      const resource=next.resourceDefinitions.find(r=>r.row_id===row('need:'+need.key));assert(resource);
      expect(resource.unit_id).toBe('');expect(resource.procurement_eligible).toBe(false);expect(resource.cost_owner_id).toBeNull();
      expect(resource.resource_graph).toMatchObject({costTreatment:'INFORMATIONAL_SCOPE',
        physicalProvisionV1:{basis:'UNRESOLVED_APPLICATION_SCOPE_NOT_INITIAL_INVENTORY',inventoryMultiplier:null},
        operationCompositionV1:{groupId:pack.prefix+':whole',operationId:pack.prefix+':readback'}});
      expect(resource.resource_graph.derivedQuantityEditPolicyV1).toBeUndefined();
      expect(resource.source_metadata).toMatchObject({sourceRole:'UNRESOLVED_APPLICATION_NORM',primaryCapabilityArtifacts:[],
        quantityUnitIntervalAndSeparatePriceUnresolved:true,publicationAllowed:false,full_technical_acceptance:false});
      expect(parameter.truth_metadata?.formula_consumers).toContain(resource.formula_id);
      expect(parameter.truth_metadata?.resource_branch_consumers).toContain(resource.row_id);
    }
    expect(next.locator.payload.ownedWholeToolInventoryR1).toMatchObject({toolTypes:21,physicalPiecesPerDeclaredWholeSet:31,
      renewalMetrologyAndAdditionalTestNormsAuthored:false,protected17Closed:0,full:false});
    const parentSelector=next.parameterDefinitions.find(q=>q.parameter_id===tools.methodId);assert(parentSelector);
    expect(parentSelector.truth_metadata?.resource_branch_consumers).toContain(row('stripper-cutter'));
    for(const id of pack.protectedOldNeedIds)expect(next.resourceDefinitions.find(r=>r.row_id===id)).toEqual(base.resourceDefinitions.find(r=>r.row_id===id));
    for(const key of ['stripper-cutter','measuring-rule','slotted-screwdriver'])expect(next.resourceDefinitions.some(r=>r.row_id===row(key))).toBe(true);
    for(const tool of tools.tools){const resource=next.resourceDefinitions.find(r=>r.row_id===row(tool.key));assert(resource);
      expect(resource.resource_graph.operationCompositionV1).toMatchObject({groupId:pack.prefix+':whole'});}
    expect(next.resourceDefinitions.find(r=>r.row_id===row('stripper-cutter'))?.resource_graph.operationCompositionV1).toMatchObject({operationId:pack.prefix+':connect'});
    expect(next.resourceDefinitions.find(r=>r.row_id===row('slotted-screwdriver'))?.resource_graph.operationCompositionV1).toMatchObject({operationId:pack.prefix+':readback'});
    expect(next.verifyTargetPrecondition?.toString()).toBe(base.verifyTargetPrecondition?.toString());
  });
  it('preserves paid provision when owned choice is absent and only excludes it after the whole declaration',()=>{
    const next=config({...context,ownedWholeToolInventoryR1:true}),paid=next.resourceDefinitions.find(r=>r.row_id===tools.ownerRowId);assert(paid);
    const legacy=input();delete legacy[owned.methodId];
    expect(resolveInclusionGraph(paid.inclusion_ast,legacy).value).toBe(true);
    expect(resolveInclusionGraph(paid.inclusion_ast,input()).value).toBe(false);
    const missing=input();delete missing[owned.countId];
    expect(resolveInclusionGraph(paid.inclusion_ast,missing).value).toBeNull();
  });
  it('compiles actual two whole sets into62 physical pieces independently of three panels and100legacyq without second payment/order',async()=>{
    const actual={...input(),[pack.fields.labourHours]:'5.5',[pack.fields.qaCount]:'3',
      [pack.fields.quoteScope]:'TEST_ONLY separate whole-labour and external-service prices; no project authentication',
      [pack.fields.deliveryTrips]:'0',[pack.fields.wasteTrips]:'0'};
    const provenance={kind:'manual',reason:'TEST_ONLY external-service reference prices; no source admission'};
    const serviceOptions={...options,rowOverrides:{[pack.prefix+':delivery']:{unitPrice:'77',provenance},[pack.prefix+':waste']:{unitPrice:'88',provenance}}};
    const before=JSON.stringify(actual),out=await compile(actual,context,serviceOptions);expect(JSON.stringify(actual)).toBe(before);
    for(const [key,price] of [['delivery','77'],['waste','88']] as const){
      const service=out.result.rows.find(r=>r.row_id===pack.prefix+':'+key);assert(service);
      expect(service).toMatchObject({quantity:'0',unit_price:price,included_in_estimate:false,included_in_procurement:false});
      expect(service.calculation_trace).toMatchObject({knownZeroExclusionV1:{calculatedQuantity:'0',orderedQuantity:'0'}});
    }
    const positive=await compile({...actual,[pack.fields.deliveryTrips]:'1',[pack.fields.wasteTrips]:'1'},context,serviceOptions);
    for(const [key,price] of [['delivery','77'],['waste','88']] as const){
      const services=positive.result.rows.filter(r=>r.row_id===pack.prefix+':'+key);expect(services).toHaveLength(1);
      expect(services[0]).toMatchObject({quantity:'1',unit_price:price,amount:price,included_in_estimate:true,included_in_procurement:true});
    }
    const parts=out.result.rows.filter(r=>tools.tools.some(t=>r.row_id===row(t.key)));
    expect(parts).toHaveLength(21);expect(parts.reduce((n,r)=>n+Number(r.quantity),0)).toBe(62);
    for(const tool of tools.tools){const r=parts.find(r=>r.row_id===row(tool.key));assert(r);
      expect(r.quantity).toBe(String(tool.countPerPost*2));expect(r.included_in_procurement).toBe(false);expect(r.unit_price).toBeNull();}
    expect(out.result.rows.some(r=>r.row_id===tools.ownerRowId&&r.included_in_estimate)).toBe(false);
    expect(out).toMatchObject({sourceAuthorityPromoted:false,projectAuthenticated:false,publicationAllowed:false,savedHere:false,fullTechnicalAcceptance:false});
    for(const id of pack.protectedOldNeedIds)expect(out.result.preliminaryNeeds.some(r=>r.row_id===id)).toBe(true);
    for(const need of owned.openNeeds){
      const pending=out.result.preliminaryNeeds.find(r=>r.row_id===row('need:'+need.key));assert(pending);
      expect(pending.quantity).toBeNull();expect(pending.missing_parameter_ids).toContain(need.parameterId);
      expect(out.result.rows.some(r=>r.row_id===row('need:'+need.key)&&r.included_in_procurement)).toBe(false);
    }
  });
  it('keeps absent usable-set count unknown and rejects fractional or zero counts rather than using a one-post assumption',async()=>{
    const missing=input();delete missing[owned.countId];const out=await compile(missing,context,options);
    expect(out.result.preliminaryNeeds.some(r=>r.row_id===row('installation-tester')&&r.missing_parameter_ids.includes(owned.countId))).toBe(true);
    await expect(compile({...input(),[owned.countId]:'1.5'},context,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    await expect(compile({...input(),[owned.countId]:'0'},context,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    for(const need of owned.openNeeds)for(const supplied of ['0','1']){
      await expect(compile({...input(),[need.parameterId]:supplied},context,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    }
  });
  it('rejects wrong factory or retained method/fit before any core call and refuses using historical finite13 as new-branch proof',async()=>{
    await expect(compile({q:'100'},context,options)).rejects.toThrow('PANEL_OWNED_WHOLE_POST_EXACT_EXISTING_FACTORY_METHOD_AND_FIT_REQUIRED');
    const next=config({...context,ownedWholeToolInventoryR1:true});
    await expect(next.verifyCore?.()).rejects.toThrow('PANEL_OWNED_WHOLE_POST_NEW_BOUND_CASES_REQUIRED_NOT_HISTORICAL_FINITE13');
  });
});
