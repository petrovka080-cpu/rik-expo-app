// 31 prospective cases. NOT_RUN. Uses actual historical capture only for pure plans;
// no fresh capture fabrication, PG, writer, subprocess, or runtime admission.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {prepareFloorStraightedgeRetainedDraftR3,prepareFloorSandStraightedgeRetainedMasterR3,
 floorStraightedgeRegistryDescriptorR3,floorStraightedgeNewParameterSourcesR3,floorStraightedgeParameterIdsR3,
 type FloorStraightedgeDraftInputR3} from './prepareFloorSandStraightedgeRetainedMasterR3';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import {canonicalPublisherPriceBindingIsCompatible} from './canonicalDefinitionPublisherR1';
import {floorSandStraightedgePackR1 as pack} from '../../../src/lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1';
const json=(p:string)=>JSON.parse(readFileSync(resolve(process.cwd(),p),'utf8').replace(/^\uFEFF/u,''));
const fixturePath='data/estimate-benchmarks/fixtures/floor-sand-retained-continuation-parent-r1.json';
const fixtureSha='2607cc90bc50ea55245ce17eb0fd53c8106c90fd5d98b4181aa126877188aba6';
const fixture=json(fixturePath);
const passportFixturePath='data/estimate-benchmarks/fixtures/floor-sand-straightedge-parent-passport-test-r3.json';
const passportFixtureSha='e27e351c2702c7815bbe7623e34e7b20d5518036e7e833dd91958c7a1a8fe792';
const witness=json(passportFixturePath),passport=JSON.parse(witness.rawPassport);
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function input():FloorStraightedgeDraftInputR3{
 const capturedParent=clone(fixture.capture);return{capturedParent,capturedParentSha256:masterRetainedParentCaptureSha256R1(capturedParent),parentPassport:clone(passport),parentPriceBindings:[]};
}
const d=prepareFloorStraightedgeRetainedDraftR3(input());
it('pins exact actual historical source captures and explicitly refuses to label them fresh',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),fixturePath))).digest('hex')).toBe(fixtureSha);
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),passportFixturePath))).digest('hex')).toBe(passportFixtureSha);
 expect(fixture.notFreshRuntimeCapture).toBe(true);expect(fixture.publicationAllowed).toBe(false);expect(witness.publicationAllowed).toBe(false);
 expect(witness.parentPayloadSha256).toBe('bb6228736c9069c5de0064cd0f3d4ab2c16d3f70a1b861ae435e23f1f461c906');
});
it('retains all29/28/28 and full13 currentbindings, sources, locators while adding14/3/3',()=>{
 const i=input();expect([d.next.parameters.length,d.next.formulas.length,d.next.resources.length]).toEqual([43,31,31]);
 expect(d.next.parameters.slice(0,29)).toEqual(i.capturedParent.parameters);expect(d.next.formulas.slice(0,28)).toEqual(i.capturedParent.formulas);expect(d.next.resources.slice(0,28)).toEqual(i.capturedParent.resources);
 expect(d.binding.retainParentBindings.capturedParent).toEqual(i.capturedParent);expect(d.capture.bindings).toHaveLength(13);
});
it.each(floorStraightedgeParameterIdsR3)('has exact explicit admitted source constraint for new objectfact%s',id=>{
 expect(floorStraightedgeNewParameterSourcesR3()[id]).toEqual({kind:'KNOWN',sourceIds:[pack.sourceIdProposal]});
 expect(d.next.parameters.slice(29).find(p=>p.parameter_id===id)?.truth_metadata.value_source_role).toBe('PROJECT_SPECIFIC_INPUT');
 expect(Object.keys(d.newParameterSources)).toHaveLength(14);expect(Object.keys(d.newParameterSources).sort()).toEqual(d.next.parameters.slice(29).map(p=>p.parameter_id).sort());
});
it.each(Object.values(pack.rows))('sameunit/key route cannot bypass explicitINFO priceinheritance ban%s',rowId=>{
 const r=d.next.resources.find(r=>r.row_id===rowId)!;
 expect(r.source_metadata.automaticGenericPriceInheritanceAllowed).toBe(false);expect(r.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');expect(r.procurement_eligible).toBe(false);
 const source={...r,source_metadata:{}},legacy={...r,source_metadata:{}};
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:r,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:legacy,sourceBindingPriceKey:source.cost_owner_id})).toBe(true);
});
it('uses realshared retained representative to preserve29sourcearrays/provenance and produce15bindings',async()=>{
 await expect(d.verifyCore()).resolves.toMatchObject({shape:[43,31,31],oldSourceArrays:29,newParameterSources:14,oldBindings:13,newBindings:2,bindings:15,staticNeeds:5,fullTechnicalAcceptance:false,publicationPerformed:false});
 const old=d.capture.definition.source_metadata;expect(d.binding.retainParentBindings.successorProvenanceContinuation?.capturedSourceMetadata).toEqual(old);
 expect(d.binding.retainParentBindings.capturedSourcePreimage).toEqual({sourceKey:pack.sourceIdProposal,expected:null});
});
it('binds only planconstraint andexcessconstraint, never thedeclared observation',()=>{
 expect([d.binding.rowId,...d.binding.additionalRowIds]).toEqual([pack.rows.minimumCount,pack.rows.excess]);expect(Object.keys(d.binding.applicabilityByRowId).sort()).toEqual([pack.rows.minimumCount,pack.rows.excess].sort());
 const observation=d.next.resources.find(r=>r.row_id===pack.rows.recordedMaximum)!;expect(observation.source_metadata.normativeTrace).toEqual([]);expect(observation.source_metadata.normative_source_ids).toEqual([]);
});
it('supplies exactly31row plan preserving28 and admitting3INFO withoutinventedoldnormbindings',()=>{
 expect(d.resourcePlan31).toHaveLength(31);expect(d.resourcePlan31.slice(0,28).map(r=>r.rowId)).toEqual(d.capture.resources.map(r=>r.row_id));
 expect(d.resourcePlan31.slice(28).filter(r=>r.normativeBindingMode==='NEW_CONSTRAINT_ONLY_BINDING')).toHaveLength(2);expect(d.resourcePlan31.slice(28).every(r=>r.genericPriceInheritanceAllowed===false)).toBe(true);
});
it('preserves authored16 completeness entries and adds3; not fabricate oldmapfrom31rows',()=>{
 expect(d.completenessMap.entries).toHaveLength(19);expect(d.completenessMap.entries.slice(0,16)).toEqual(passport.decision.independentCompletenessMap.entries);
 expect(d.completenessMap.entries.slice(16).map((e:any)=>e.resolution.rowId)).toEqual(d.next.resources.slice(28).map(r=>r.row_id));
});
it('supplies honest distinct source/locator managedDDL descriptor andsameofficialPDF',()=>{
 const r=floorStraightedgeRegistryDescriptorR3();expect(r).toEqual(json('data/estimate-benchmarks/fixtures/floor-sand-straightedge-registry-descriptor-test-r3.json'));expect(r.managedSource.source_key).toBe(pack.sourceIdProposal);expect(r.managedSource.artifact_sha256).toBe(pack.source.sha256);
 expect(r.managedSource.source_key).not.toBe(pack.registry.existingParentSourceKey);expect(r.managedLocators).toHaveLength(1);expect(r.managedLocators[0].source_id).toBe(r.managedSource.id);
 expect(r.managedLocators[0].locator.normId).toBe(pack.normId);expect(r.scope.generatedLocatorIds).toEqual([r.managedLocators[0].id]);
 expect(r.managedLocators[0].excerpt_sha256).toBe(createHash('sha256').update(pack.source.exactLocatorRu).digest('hex'));
 expect(Object.keys(r.managedSource).sort()).toEqual(['id','source_key','title_ru','authority','official_url','artifact_sha256','effective_from','effective_to','metadata'].sort());
});
it('keeps strictpositivecontextarea withoutsourceepsilon orfakeformula dependency',()=>{
 const p=d.next.parameters.find(p=>p.parameter_id==='floor_sand_straightedge_room_area_m2')!;expect(p.constraints_json).toMatchObject({min:0,exclusiveMin:0,max:50});
 expect(d.next.formulas.slice(28).every(f=>!f.input_parameter_ids.includes(p.parameter_id))).toBe(true);
});
it('refuses stale capturehash even withthe right parentIDs',()=>{const i=input();expect(()=>prepareFloorStraightedgeRetainedDraftR3({...i,capturedParentSha256:'0'.repeat(64)})).toThrow('FLOOR_STRAIGHTEDGE_PARENT_HASH');});
it('refuses31-resource allegedparent ratherthanappending twice',()=>{const i=input();const c={...i.capturedParent,resources:[...i.capturedParent.resources,...d.next.resources.slice(28)]};expect(()=>prepareFloorStraightedgeRetainedDraftR3({...i,capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c)})).toThrow('FLOOR_STRAIGHTEDGE_PARENT_29_28_28_NOT31');});
it('doesnotdefault missing root/scopedcapture to historicalfixture or emptyabsences',()=>{expect(()=>prepareFloorSandStraightedgeRetainedMasterR3(undefined as never)).toThrow('FLOOR_STRAIGHTEDGE_FRESH_ROOT_BINDING_REQUIRED');});
it('refusesunexpectedcurrentoldprice rows ratherthan silentlyfiltering/importing',()=>{const i=input();expect(()=>prepareFloorStraightedgeRetainedDraftR3({...i,parentPriceBindings:[{row_id:pack.rows.minimumCount,price_key:'FAKE'}]})).toThrow('FLOOR_STRAIGHTEDGE_CURRENT_EXACT_ZERO_OLD_PRICE_ROWS_REQUIRED');});
it('refusesalreadycontinuedparent insteadof recursivelyrewritingprovenance',()=>{const i=input(),c=clone(i.capturedParent);c.definition.source_metadata.retainedParentBindingContinuationV1={contract:'FAKE'};expect(()=>prepareFloorStraightedgeRetainedDraftR3({...i,capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c)})).toThrow('FLOOR_STRAIGHTEDGE_ONE_CONTINUATION_ONLY');});
it('refusesoldwholeworkerunit drift evenwitha recomputedcapturehash',()=>{const i=input(),c=clone(i.capturedParent);c.resources.find(r=>r.row_id==='floor-underlayer:sand:krer11-01-002-01:worker')!.unit_id='m2';expect(()=>prepareFloorStraightedgeRetainedDraftR3({...i,capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c)})).toThrow('FLOOR_STRAIGHTEDGE_OLD_PAYMENT_OR_UNIT_DRIFT:worker');});
