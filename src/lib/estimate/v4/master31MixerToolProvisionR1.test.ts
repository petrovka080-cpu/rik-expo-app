import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertMaster31MixerToolWorkflowR1,buildMaster31MixerToolSuccessorR1 as build,master31MixerCurrentCaptureR1 as captured,
 master31MixerCurrentRepresentativeR1 as representative,master31MixerToolCompletenessR1 as completeness,master31MixerToolPackR1 as p} from './master31MixerToolProvisionR1';
import {compileMaster31MixerToolsR1 as compile,master31MixerToolFactsR1 as facts,master31MixerToolMasterConfigR1 as config} from '../../../../scripts/estimate/r4a13/prepareMaster31MixerToolProvisionR1';
import {master30FactoryKitsPackR1} from './master30ElectricalPlumbingFactoryKitsR1';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
// Source workflow independently read from PDF3–5/7. Two separate joint
// wrench roles and a fitted saw blade cannot be inferred from emitted rows.
const expectedAssets=['mounting-key-13','turning-wrench','counterhold-wrench','slotted-screwdriver','hacksaw-with-blade','measuring-rule','marking-pencil','hex-key-2-5','hex-key-3'];
const oldClosed=['master30:plumbing:open:mixer-mounting-key','master30:plumbing:open:waste-valve-key'];
const oldNeedIds=master30FactoryKitsPackR1.profiles.find(x=>x.key==='plumbing')!.openNeeds.map(n=>'master30:plumbing:open:'+n.id);
const owner='master31:mixer:tool-post:r1:provision-owner',factoryOwner='plumbing:basin-mixer:ready-site:r3:kit-order';
const target=p.targets[0]!.catalogId,copy=<T,>(v:T):T=>structuredClone(v);
const rowView=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.map(x=>[x.row_id,x.quantity,x.unit_id,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]);

test('source passport distinguishes conditional physical provision, all potential needs and no FULL',()=>{
 expect(p.newFULL).toBe(0);expect(p.fullTechnicalAcceptance).toBe(false);expect(p.wholeInstallationComplete).toBe(false);
 expect(p.coveredNeedIds).toEqual(oldClosed);expect(oldNeedIds).toHaveLength(30);
 expect([...p.coveredNeedIds,...p.uncoveredNeedIds].sort()).toEqual([...oldNeedIds].sort());
 expect(p.tools.map(t=>t.key)).toEqual(expectedAssets);expect(p.tools.some(t=>/32/.test(t.titleRu))).toBe(false);
 const model=build(representative(target));
 expect(model.passport.decision.unresolvedResourceRowIds.slice().sort()).toEqual(oldNeedIds.slice().sort());
 expect(model.passport.decision.conditionalToolProvisionScope.remainingNeedRowIds).toEqual(p.uncoveredNeedIds);
 expect(model.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
 expect(model.parameters.find(x=>x.parameter_id===p.methodId)!.default_value).toBeNull();
 const manual=readFileSync(p.source.path);expect(createHash('sha256').update(manual).digest('hex')).toBe('601da351cbf1a4423b3af76bfa5e92e70bad2c339564ed72e2bae6dfda7df9bd');
});

for(const t of p.targets){
 test.each(['1','3','1000000'])('one complete serial-post asset set at N=%s '+t.catalogId,async n=>{
  const r=await compile(t.catalogId,{...facts(n),q:'999999'});
  expect(r.rows).toHaveLength(19);expect(r.preliminaryNeeds).toHaveLength(28);
  expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual(oldNeedIds.filter(id=>!oldClosed.includes(id)).sort());
  expect(r.preliminaryNeeds.every(x=>x.quantity===null)).toBe(true);
  const tools=r.rows.filter(x=>x.row_id.startsWith(p.prefix));expect(tools).toHaveLength(10);
  expect(tools.every(x=>x.quantity==='1'&&x.unit_price===null&&x.amount===null&&!x.included_in_procurement)).toBe(true);
  expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id).sort()).toEqual([factoryOwner,owner].sort());
  expect(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id)).toEqual([factoryOwner]);
  expect(r.rows.find(x=>x.row_id===factoryOwner)!.quantity).toBe(n);
  for(const key of expectedAssets){const row=tools.find(x=>x.row_id===p.prefix+':'+key)!;expect(row.unit_id).toBe('piece');
   const graph=(row.calculation_trace as Record<string,any>).resourceGraph as Record<string,any>;
   expect(graph.costTreatment).toBe('INCLUDED_IN_RESOURCE_ROWS');expect(graph.includedInResourceOwnerRowId).toBe(owner);
   expect(graph.physicalProvisionV1.newPurchaseClaimed).toBe(false);expect(graph.physicalProvisionV1.consumptionOrWearNormClaimed).toBe(false);}
 });
 test('absent method, absent fit and fit alone preserve every former unknown '+t.catalogId,async()=>{
  const base={[p.factorySelectorId]:p.factoryChoiceRu,[p.countId]:'3'};
  for(const input of [base,{...base,[p.methodId]:p.methodRu},{...base,[p.fitId]:p.fitRu},{...base,[p.methodId]:p.unresolvedMethodRu}]){
   const r=await compile(t.catalogId,input);expect(r.rows).toHaveLength(9);
   expect(r.rows.some(x=>x.row_id.startsWith(p.prefix))).toBe(false);
   expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual(oldNeedIds.slice().sort());
   expect(oldClosed.every(id=>r.preliminaryNeeds.some(x=>x.row_id===id&&x.quantity===null))).toBe(true);
  }
 });
 test('accepted factory and explicit legacy calculations preserve old rows and prices '+t.catalogId,async()=>{
  const before=representative(t.catalogId),after=build(before),baseline=copy(before.baseline.input_values);
  for(const input of [baseline,{q:'100',[p.factorySelectorId]:p.legacyChoiceRu}]){
   const a=await compile(t.catalogId,input,{model:before}),b=await compile(t.catalogId,input,{model:after});
   expect(rowView(b)).toEqual(rowView(a));expect(b.totals).toEqual(a.totals);
  }
  const c=captured(t.catalogId);expect(after.formulas.slice(0,c.formulas.length)).toEqual(c.formulas);
  for(const b of c.bindings){const old=c.resources.find((x:Record<string,any>)=>x.id===b.resource_spec_id)!;expect(after.resources.find(x=>x.row_id===old.row_id)).toEqual(old);}
 });
 test('zero selected scope has no artificial post, purchase or null-zero replacement '+t.catalogId,async()=>{
  const r=await compile(t.catalogId,facts('0'));expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds).toHaveLength(0);
 });
 test('existing sole-writer recipe verifies all current selected and unchanged scopes '+t.catalogId,async()=>{
  const c=config({releaseId:p.baseDefinitionReleaseId,searchReleaseId:p.baseSearchReleaseId},t.catalogId);
  expect(c.passport.unresolvedApplicableResourceRowIds!.slice().sort()).toEqual(oldNeedIds.slice().sort());
  expect(c.binding.additionalRowIds).toHaveLength(9);expect(c.binding.retainParentBindings!.successorProvenanceContinuation).toBeDefined();
  expect((await c.verifyCore()).status).toBe('PASS_EXPLICIT_TOOL_POST_WITH_OLD_SCOPES_RETAINED');
 });
}

test.each(['-1','1.5','1000001','NaN'])('invalid installation count %s never produces a valid tool post',async n=>{
 await expect(compile(target,facts(n))).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('unknown fit and legacy method misuse fail closed',async()=>{
 await expect(compile(target,{...facts(),[p.fitId]:'неподтверждённый произвольный узел'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 await expect(compile(target,{...facts(),[p.factorySelectorId]:p.legacyChoiceRu,q:'100'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test.each(['counterhold','blade','socket','unit','quantity'])('incomplete or incompatible whole toolkit %s is rejected',kind=>{
 const changed=copy(p);
 if(kind==='counterhold')changed.tools=changed.tools.filter(t=>t.key!=='counterhold-wrench');
 if(kind==='blade')(changed.tools.find(t=>t.key==='hacksaw-with-blade')!.profile as Record<string,any>).assembly='EMPTY_FRAME';
 if(kind==='socket')(changed.tools.find(t=>t.key==='mounting-key-13')!.profile as Record<string,any>).socketMm=32;
 if(kind==='unit')changed.tools[0]!.unitId='m';
 if(kind==='quantity')changed.tools[0]!.countExpression=p.countId;
 expect(()=>assertMaster31MixerToolWorkflowR1(changed)).toThrow('MASTER31_MIXER_TOOLS_');
});
test('manual contract price is paid once and never orders or separately pays included tools',async()=>{
 const rowOverrides={ [owner]:{unitPrice:'500',provenance:{kind:'manual' as const,reason:'ДЕМО / VALIDATION_FIXTURE: цена всего оснащения поста'}} };
 const r=await compile(target,facts('10'),{rowOverrides});
 expect(r.rows.find(x=>x.row_id===owner)!.amount).toBe('500');expect(r.rows.find(x=>x.row_id===owner)!.quantity).toBe('1');
 expect(r.rows.filter(x=>x.row_id.startsWith(p.prefix)&&x.row_id!==owner).every(x=>x.amount===null&&!x.included_in_procurement)).toBe(true);
 expect(r.preliminaryNeeds).toHaveLength(28);
});
test('target row policy rejects a generic legacy price even if unit and price key match',()=>{
 const row=build(representative(target)).resources.find(x=>x.row_id===owner)!;
 expect(row.source_metadata.automaticGenericPriceInheritanceAllowed).toBe(false);
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...row,source_metadata:{}},targetResource:row,sourceBindingPriceKey:row.row_id})).toBe(false);
});
test('method selection is outside quantity policy and missing a using operation breaks independent map',()=>{
 const model=build(representative(target));const source=model.resources.find(x=>x.row_id===p.prefix+':turning-wrench')!;
 expect(source.resource_graph.derivedQuantityEditPolicyV1.parameterIds).toEqual([p.countId]);
 expect(canonicalEstimateOperationReferences(source.resource_graph.operationCompositionV1).map(x=>x.operationId)).toEqual(['master30:plumbing:water-connection','master30:plumbing:waste-connection']);
 const broken=copy(model);broken.resources.find(x=>x.row_id===source.row_id)!.resource_graph.operationCompositionV1.additionalOperations=[];
 expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(target),formulaDefinitions:broken.formulas,resourceDefinitions:broken.resources}).some(x=>x.endsWith('OPERATION_BINDING'))).toBe(true);
});
test('tools appear in the existing material-consuming subworks without a duplicate mounting group or second payment',async()=>{
 const r=await compile(target,facts());
 const sections=canonicalEstimateResourceOperationSections(r.rows.map(row=>({rowId:row.row_id,titleRu:row.title_ru as string,operation:(row.calculation_trace as Record<string,any>).resourceGraph.operationCompositionV1})));
 const allIds=(key:string)=>{const section=sections.find(s=>s.operation?.groupId==='master30:plumbing'&&s.operation.operationId==='master30:plumbing:'+key)!;
  expect(section).toBeDefined();return [...section.resourceIds,...section.sharedResources.map(x=>x.rowId)];};
 expect(allIds('mounting')).toContain(p.prefix+':mounting-key-13');
 expect(allIds('mounting')).toContain('plumbing:basin-mixer:ready-site:r3:mounting-set-reference');
 for(const op of ['water-connection','waste-connection'])for(const key of ['turning-wrench','counterhold-wrench'])expect(allIds(op)).toContain(p.prefix+':'+key);
 expect(allIds('water-connection')).toContain('plumbing:basin-mixer:ready-site:r3:flexible-hoses-reference');
 expect(allIds('waste-connection')).toContain('plumbing:basin-mixer:ready-site:r3:waste-set-reference');
 expect(sections.some(s=>s.operation?.operationId==='master31:mixer:mounting')).toBe(false);
 expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id).sort()).toEqual([factoryOwner,owner].sort());
 expect(r.rows).toHaveLength(19);
});
