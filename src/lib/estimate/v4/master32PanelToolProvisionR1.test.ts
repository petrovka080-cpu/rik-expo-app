import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertMaster32PanelToolWorkflowR1,buildMaster32PanelToolSuccessorR1 as build,master32PanelCurrentCaptureR1 as captured,
 master32PanelCurrentRepresentativeR1 as representative,master32PanelToolCompletenessR1 as completeness,master32PanelToolPackR1 as p} from './master32PanelToolProvisionR1';
import {compileMaster32PanelToolsR1 as compile,master32PanelToolFactsR1 as facts,master32PanelToolMasterConfigR1 as config} from '../../../../scripts/estimate/r4a13/prepareMaster32PanelToolProvisionR1';
import {master30FactoryKitsPackR1} from './master30ElectricalPlumbingFactoryKitsR1';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import oracle from '../../../../data/estimate-benchmarks/fixtures/master32-panel-tool-independent-oracle-r1.json';

// Independent workflow oracle: manual cable preparation + a COMPLETE matched
// prove-before/dead-check/prove-after chain + separate Class I PE measurement.
// Quantities come from a single sequential post inventory, not emitted rows.
const expectedAssets:Record<string,number>={
 'stripper-cutter':1,'measuring-rule':1,'slotted-screwdriver':1,'voltage-indicator':1,'proving-unit':1,'proving-batteries':6,
 'proving-magnetic-hanger':1,'voltage-kit-case':1,'installation-tester':1,'continuity-red-lead':1,'continuity-green-lead':1,
 'continuity-red-probe':1,'continuity-green-probe':1,'continuity-red-gs38-cap':1,'continuity-green-gs38-cap':1,
 'continuity-red-clip':1,'continuity-green-clip':1,'continuity-zero-adapter':1,'continuity-batteries':6,'continuity-padded-strap':1,'continuity-hard-case':1};
const oldClosed=['master30:electrical:open:tool-27','master30:electrical:open:tool-55'];
const oldNeedIds=master30FactoryKitsPackR1.profiles.find(x=>x.key==='electrical')!.openNeeds.map(n=>'master30:electrical:open:'+n.id);
const owner='master32:panel:tool-post:r1:provision-owner',factoryOwner='led-grid:dvo6560-6562:opal-4000';
const target=p.targets[0]!.catalogId,copy=<T,>(v:T):T=>structuredClone(v);
const rowView=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.map(x=>[x.row_id,x.quantity,x.unit_id,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]);
const graph=(r:Awaited<ReturnType<typeof compile>>['rows'][number])=>(r.calculation_trace as Record<string,any>).resourceGraph as Record<string,any>;

test('conditional whole tool scope keeps the potential24 needs and no FULL claim',()=>{
 expect(p.newFULL).toBe(0);expect(p.newPublicCards).toBe(0);expect(p.fullTechnicalAcceptance).toBe(false);expect(p.wholeInstallationComplete).toBe(false);
 expect(p.coveredNeedIds).toEqual(oldClosed);expect(oldNeedIds).toHaveLength(24);
 expect([...p.coveredNeedIds,...p.uncoveredNeedIds].sort()).toEqual([...oldNeedIds].sort());
 expect(Object.fromEntries(p.tools.map(t=>[t.key,t.countPerPost]))).toEqual(expectedAssets);expect(oracle.assets).toEqual(expectedAssets);
 const m=build(representative(target));expect(m.parameters).toHaveLength(30);expect(m.formulas).toHaveLength(112);expect(m.resources).toHaveLength(112);
 expect(m.passport.decision.unresolvedResourceRowIds.slice().sort()).toEqual(oldNeedIds.slice().sort());
 expect(m.passport.decision.conditionalToolProvisionScope.remainingNeedRowIds).toEqual(p.uncoveredNeedIds);
 expect(m.passport.capability_matrix.find((x:Record<string,any>)=>x.capability==='FULL_APPLICABLE_SCOPE').unresolvedResourceRowIds.slice().sort()).toEqual(oldNeedIds.slice().sort());
 for(const id of [p.methodId,p.fitId])expect(m.parameters.find(x=>x.parameter_id===id)!.default_value).toBeNull();
 expect(m.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
});
test('all accepted method and accessory primary bytes match exact declared editions',()=>{
 for(const s of p.sourceArtifacts)expect(createHash('sha256').update(readFileSync(s.path)).digest('hex')).toBe(s.sha256);
 expect(p.source.sha256).toBe('cbe47a51d5727edf98648ff110070bd8a31798f4e93f423a3b3f57fba5e41fca');
 expect(p.sourceArtifacts.find(s=>s.id==='vipd150-srd-datasheet')!.sha256).toBe('60b9b93f3637f13fb21696f57848dbe94f7c846aae62da8708fbca04c63eea9a');
 expect(p.sourceArtifacts.some(s=>/prv240|T150/iu.test(s.path))).toBe(false);
 expect(p.tools.some(t=>/штроборез|перфоратор|однополюсн|PRV240|T150/iu.test(t.titleRu))).toBe(false);
});

for(const t of p.targets){
 test.each(['1','3','1000000'])('whole physical post stays one at N=%s '+t.catalogId,async n=>{
  const r=await compile(t.catalogId,{...facts(n),q:'999999'});
  expect(r.rows).toHaveLength(25);expect(r.preliminaryNeeds).toHaveLength(22);
  expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual(oldNeedIds.filter(id=>!oldClosed.includes(id)).sort());
  expect(r.preliminaryNeeds.every(x=>x.quantity===null)).toBe(true);
  const tools=r.rows.filter(x=>x.row_id.startsWith(p.prefix));expect(tools).toHaveLength(22);
  expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id).sort()).toEqual([factoryOwner,owner].sort());
  expect(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id)).toEqual([factoryOwner]);
  expect(r.rows.find(x=>x.row_id===factoryOwner)!.quantity).toBe(n);expect(r.rows.find(x=>x.row_id===owner)!.quantity).toBe('1');
  let physicalPieces=0;
  for(const [key,quantity] of Object.entries(expectedAssets)){const row=tools.find(x=>x.row_id===p.prefix+':'+key)!;
   expect(row.quantity).toBe(String(quantity));expect(row.unit_id).toBe('piece');expect(row.unit_price).toBeNull();expect(row.amount).toBeNull();
   expect(row.included_in_procurement).toBe(false);physicalPieces+=Number(row.quantity);
   expect(graph(row).costTreatment).toBe('INCLUDED_IN_RESOURCE_ROWS');expect(graph(row).includedInResourceOwnerRowId).toBe(owner);
   expect(graph(row).physicalProvisionV1.newPurchaseClaimed).toBe(false);expect(graph(row).physicalProvisionV1.consumptionOrWearNormClaimed).toBe(false);
   expect(graph(row).derivedQuantityEditPolicyV1.parameterIds).toEqual([p.countId]);
  }expect(physicalPieces).toBe(31);
 });
 test('missing method/fit, fit alone and unresolved choice preserve all24 null needs '+t.catalogId,async()=>{
  const base={[p.factorySelectorId]:p.factoryChoiceRu,[p.countId]:'3'};
  for(const input of [base,{...base,[p.methodId]:p.methodRu},{...base,[p.fitId]:p.fitRu},{...base,[p.methodId]:p.unresolvedMethodRu}]){
   const r=await compile(t.catalogId,input);expect(r.rows).toHaveLength(3);expect(r.rows.some(x=>x.row_id.startsWith(p.prefix))).toBe(false);
   expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual(oldNeedIds.slice().sort());expect(r.preliminaryNeeds.every(x=>x.quantity===null)).toBe(true);
  }
 });
 test('factory-only and legacy rows, formula semantics, bound payment and baseline remain exact '+t.catalogId,async()=>{
  const before=representative(t.catalogId),after=build(before),baseline=copy(before.baseline.input_values),c=captured(t.catalogId);
  for(const input of [baseline,{q:'100',[p.factorySelectorId]:p.legacyChoiceRu}]){
   const a=await compile(t.catalogId,input,{model:before}),b=await compile(t.catalogId,input,{model:after});expect(rowView(b)).toEqual(rowView(a));expect(b.totals).toEqual(a.totals);
  }
  expect(after.formulas.slice(0,c.formulas.length)).toEqual(c.formulas);expect(after.baseline.input_values).toEqual(c.baseline.input_values);
  for(const b of c.bindings){const old=c.resources.find((x:Record<string,any>)=>x.id===b.resource_spec_id)!;expect(after.resources.find(x=>x.row_id===old.row_id)).toEqual(old);}
  for(const row of before.resources){if(!oldClosed.includes(row.row_id))expect(after.resources.find(x=>x.row_id===row.row_id)).toEqual(row);}
 });
 test('N0 selects no artificial post or source-need null-to-zero conversion '+t.catalogId,async()=>{
  const r=await compile(t.catalogId,facts('0'));expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds).toHaveLength(0);
 });
 test('sole-writer config retains provenance and validates current branch without new public cards '+t.catalogId,async()=>{
  const c=config({releaseId:p.baseDefinitionReleaseId,searchReleaseId:p.baseSearchReleaseId},t.catalogId);
  expect(c.passport.unresolvedApplicableResourceRowIds!.slice().sort()).toEqual(oldNeedIds.slice().sort());expect(c.binding.additionalRowIds).toHaveLength(21);
  expect(c.binding.retainParentBindings!.successorProvenanceContinuation).toBeDefined();expect((await c.verifyCore()).status).toBe('PASS_EXPLICIT_TOOL_POST_WITH_OLD_SCOPES_RETAINED');
 });
}
test.each(['-1','1.5','1000001','NaN'])('invalid installation count %s fails validation',async n=>{
 await expect(compile(target,facts(n))).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('arbitrary fit and method under legacy factory branch fail closed',async()=>{
 await expect(compile(target,{...facts(),[p.fitId]:'Любая панель, клемма и помещение'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 await expect(compile(target,{...facts(),[p.factorySelectorId]:p.legacyChoiceRu,q:'100'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test.each(['one-pole','mixed-prover','no-prover-power','no-pe-power','no-zero','wrong-strip','bare-stripper','ignored-duty','wrong-uom','per-panel-tools'])('incomplete or incompatible provision %s is rejected',kind=>{
 const changed=copy(p),get=(key:string)=>changed.tools.find(t=>t.key===key)!;
 if(kind==='one-pole')(get('voltage-indicator').profile as Record<string,any>).poles=1;
 if(kind==='mixed-prover')(get('proving-unit').profile as Record<string,any>).manufacturerMatchedTo='unreviewed';
 if(kind==='no-prover-power')changed.tools=changed.tools.filter(t=>t.key!=='proving-batteries');
 if(kind==='no-pe-power')changed.tools=changed.tools.filter(t=>t.key!=='continuity-batteries');
 if(kind==='no-zero')changed.tools=changed.tools.filter(t=>t.key!=='continuity-zero-adapter');
 if(kind==='wrong-strip')(get('stripper-cutter').profile as Record<string,any>).stripSettingMm=10;
 if(kind==='bare-stripper')(get('stripper-cutter').profile as Record<string,any>).assembly='NO_BLADE_OR_STOP';
 if(kind==='ignored-duty')(get('voltage-indicator').profile as Record<string,any>).offToOnRatio=0;
 if(kind==='wrong-uom')get('proving-batteries').unitId='hour';
 if(kind==='per-panel-tools')get('voltage-indicator').countExpression=p.countId;
 expect(()=>assertMaster32PanelToolWorkflowR1(changed)).toThrow('MASTER32_PANEL_TOOLS_');
});
test('whole-post contractual price is paid once with no tool order and no automatic legacy-price inheritance',async()=>{
 const r=await compile(target,facts('10'),{rowOverrides:{[owner]:{unitPrice:'500',provenance:{kind:'manual' as const,reason:'ДЕМО / цена всего оснащения поста'}}}});
 expect(r.rows.find(x=>x.row_id===owner)!.amount).toBe('500');expect(r.rows.find(x=>x.row_id===owner)!.quantity).toBe('1');
 expect(r.rows.filter(x=>x.row_id.startsWith(p.prefix)&&x.row_id!==owner).every(x=>x.amount===null&&!x.included_in_procurement)).toBe(true);
 const row=build(representative(target)).resources.find(x=>x.row_id===owner)!;expect(row.source_metadata.automaticGenericPriceInheritanceAllowed).toBe(false);
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...row,source_metadata:{}},targetResource:row,sourceBindingPriceKey:row.row_id})).toBe(false);
});
test('all assets use the actual accepted installation operation together with the panel, never a duplicate named operation',async()=>{
 const m=build(representative(target)),r=await compile(target,facts());
 for(const row of m.resources.filter(x=>x.row_id.startsWith(p.prefix)))expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(x=>x.operationId)).toEqual(['master30:electrical:installation']);
 const sections=canonicalEstimateResourceOperationSections(r.rows.map(row=>({rowId:row.row_id,titleRu:row.title_ru as string,operation:graph(row).operationCompositionV1})));
 const section=sections.find(s=>s.operation?.groupId==='master30:electrical'&&s.operation.operationId==='master30:electrical:installation')!;expect(section).toBeDefined();
 const all=[...section.resourceIds,...section.sharedResources.map(x=>x.rowId)];expect(all).toContain(factoryOwner);for(const key of Object.keys(expectedAssets))expect(all).toContain(p.prefix+':'+key);
 const broken=copy(m);broken.resources.find(x=>x.row_id===p.prefix+':voltage-indicator')!.resource_graph.operationCompositionV1.operationId='master32:panel:installation';
 expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(target),formulaDefinitions:broken.formulas,resourceDefinitions:broken.resources}).some(x=>x.endsWith('OPERATION_BINDING'))).toBe(true);
});
test('material, PPE, access, isolation preparation and testing scope never disappear into the tool owner',async()=>{
 const r=await compile(target,facts()),ids=r.preliminaryNeeds.map(x=>x.row_id);
 for(const key of ['connection-materials','personal-protection','access','site-preparation','testing-handover','tool-25','tool-26','tool-56'])expect(ids).toContain('master30:electrical:open:'+key);
 expect(p.instrumentVerificationBoundary.acceptanceProgramRemainsOpen).toBe(true);expect(p.tools.find(t=>t.key==='proving-unit')!.profile.calcheckClaimed).toBe(false);
 expect(p.tools.find(t=>t.key==='installation-tester')!.profile.noAutomaticInsulationTestOnLedDriver).toBe(true);
});
test('Class I kit cannot be applied to the adjacent Class II fan or an unreviewed catalog',()=>{
 const other=representative(target);other.definition.catalog_id='canonical-work:master:fan_install_wet_zone';
 expect(()=>build(other)).toThrow('MASTER32_PANEL_TOOLS_EXACT_TARGET_REQUIRED');
});
test('changed parent arithmetic is rejected rather than rebased onto similar titles',()=>{
 const changed=representative(target);changed.formulas[0]!.expression_source='0';
 expect(()=>build(changed)).toThrow('MASTER32_PANEL_TOOLS_EXACT_V4_PARENT_COMPUTATION_REQUIRED');
});
