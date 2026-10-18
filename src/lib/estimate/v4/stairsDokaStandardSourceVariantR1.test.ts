import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings} from '../backendPlatform/canonicalManualPriceReleaseMigration';
import {assertCanonicalMachineHourDefinitionV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {monolithicStair111PackR1 as source,monolithicStair111PrefixR1 as prefix} from './monolithicStairDokaKrer06Column11101R1';
import {stairsDokaStandardVariantParentR1 as capture,stairsDokaStandardVariantMapR1 as map,stairsDokaStandardCapturedDefinitionR1 as captured,
 buildStairsDokaStandardSourceVariantR1 as build,compileStairsDokaStandardSourceVariantForTestR1 as compile,
 stairsDokaStandardVariantSelectorR1 as selector,stairsDokaStandardVariantValueR1 as value} from './stairsDokaStandardSourceVariantR1';
import retention from '../../../../data/estimate-benchmarks/fixtures/stairs-doka-standard-retention-declaration-r1.json';
import actualRetention from '../../../../data/estimate-benchmarks/fixtures/stairs-doka-standard-retention-current-v5-r1.json';

const d=build(),old=captured(),hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const provenance={kind:'manual' as const,reason:'CONTROL_ONLY saved user entry'};
function control(volume='12.5'):Record<string,string|number>{
 return {stairs_concrete_volume_m3:volume,[source.primaryMeasureParameterId]:volume,[selector]:value,
  ...Object.fromEntries(source.scopeFacts.map(f=>[f.id,f.value])),
  ...Object.fromEntries(source.requiredProjectReferences.map(id=>[id,'CONTROL_ONLY approved flight project/PPR reference'])),[source.workElevationParameterId]:15,
  ...Object.fromEntries(source.materials.flatMap(m=>[[m.specificationId,'CONTROL_ONLY source-compatible '+m.nameRu],[m.parameterPrefix+'_stock',0],[m.parameterPrefix+'_reserve',0],[m.parameterPrefix+'_quantum',0.000001]]))};
}
const compileOriginal=(parameters:Record<string,unknown>,overrides?:CanonicalEstimateCompileCoreInput['rowOverrides'])=>compileCanonicalEstimateCore({
 operation:overrides?'recalculate':'compile',catalogId:capture.catalogId,compilerVersion:map.contract,primaryMeasureParameterId:'stairs_concrete_volume_m3',
 parameterDefinitions:[...old.parameters],formulaDefinitions:[...old.formulas],resourceDefinitions:[...old.resources],submittedParameters:parameters,
 confirmedParameters:{},currencyCode:'KGS',priceItems:[],rowOverrides:overrides,maximumResourceRows:old.resources.length,hashJson:async x=>estimateDeterministicHash(x)});
const by=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(r=>r.row_id===prefix+':'+id);
const summary=(r:Awaited<ReturnType<typeof compileOriginal>>)=>({
 rows:r.rows.map(x=>({id:x.row_id,quantity:x.quantity,price:x.unit_price,title:x.title_ru,estimate:x.included_in_estimate,procurement:x.included_in_procurement})),
 needs:r.preliminaryNeeds.map(x=>({id:x.row_id,quantity:x.quantity,price:x.unit_price,title:x.title_ru,missing:x.missing_parameter_ids,selected:x.selected}))});

it('pins the exact official111-01 source, accepted current target and addressed review',()=>{
 expect(hash(fs.readFileSync(resolve(process.cwd(),source.source.path)))).toBe(source.source.sha256);
 expect(hash(fs.readFileSync(map.reviewPin.path))).toBe(map.reviewPin.sha256);
 expect(capture.definitionVersionId).toBe('f4d62d59-abe5-584a-8ab0-073ce5a713ea');
 expect(capture.definitionSha256).toBe('dced81ba161e260554f046b4e8dea2d4c9f764981fe5aa7174fc6d3711e968a2');
 expect([old.parameters.length,old.formulas.length,old.resources.length]).toEqual([188,92,95]);
});
it('keeps the exact actual8 bindings and two source headers instead of deriving applicability',()=>{
 const rawBindings=actualRetention.sets.exactCurrentStandardEightBindings.rawRows;
 const rawHeaders=actualRetention.sets.exactBoundLocatorSourceHeaders.rawRows;
 expect(hash(rawBindings.map(s=>s+'\n').join(''))).toBe('3d7ebf3b96a5769c2e1166349c63ad7fed6b5ede7ab082aebd0e820da3bf2977');
 expect(hash(rawHeaders.map(s=>s+'\n').join(''))).toBe('954e1d6e5c417e716a5823dfef8079842fdab5a31f99d5cca5adceb98ea1f6d7');
 expect(retention.retainedBindings).toEqual(rawBindings.map(s=>JSON.parse(s)));
 expect(retention.retainedLocatorAndSourceHeaders).toEqual(rawHeaders.map(s=>JSON.parse(s)));
 expect(actualRetention.completeReadSet&&actualRetention.transactionRolledBack&&actualRetention.connectionClosed).toBe(true);
});
it('retains all188 current baseline source-map entries and both immutable historical query contexts',()=>{
 const b=JSON.parse(actualRetention.sets.exactCurrentManifestApprovedBaseline.rawRows[0]!);
 expect(retention.retainedNormativeSourceIdsByParameterId).toEqual(b.normative_source_ids);
 expect(Object.keys(b.normative_source_ids).sort()).toEqual(old.parameters.map(p=>p.parameter_id).sort());
 expect(retention.retainedBaseline).toEqual(b);
 expect(retention.wholePayloadCapturedContext.sourceHead).toBe('513dc2fa8d75b773d057c19b0c4c00c11dba148f');
 expect(retention.retentionCapturedContext.sourceHead).toBe('19b3b1856468d9889de48cec24d81fff17afafb8');
 expect(retention.wholePayloadCapturedContext.definitionReleaseId).toBe(retention.retentionCapturedContext.definitionReleaseId);
});
it('keeps old8 and new20 binding rows disjoint, with no orders or unknown-needs attributed as printed norms',()=>{
 const oldIds=new Set(retention.retainedBindings.map(x=>x.row_id));
 const ids=retention.newBindingIds.map(id=>retention.newBindingPrefix+':'+id);
 expect(ids).toHaveLength(20);expect(ids.every(id=>!oldIds.has(id)&&d.resources.some(r=>r.row_id===id))).toBe(true);
 expect(ids.some(id=>/order|project-bbs|amortization/.test(id))).toBe(false);
 expect(retention.expectedFinalBindingCount).toBe(28);
});
it('preserves all188 parent parameters and92 formula objects without defaults, renaming or arithmetic edits',()=>{
 expect(d.parameters.slice(0,188)).toEqual(old.parameters);expect(d.formulas.slice(0,92)).toEqual(old.formulas);
 expect(d.parameters.find(p=>p.parameter_id===selector)).toMatchObject({required:false,default_value:null});
});
it('has an exact95 disposition partition and preserves every old owner, source, title, unit and expression',()=>{
 expect(map.rows).toHaveLength(95);expect(new Set(map.rows.map(x=>x.rowId)).size).toBe(95);
 expect(map.counts).toEqual({MUTUALLY_EXCLUSIVE_WITH_SOURCE111:28,OUTSIDE_SELECTED_ORDINARY_SOURCE111_PROFILE:3,RETAIN_NONPAYABLE_PROJECT_CONTROL:6,UNRESOLVED_SEPARATE_SCOPE_VISIBLE_NEED:58});
 for(const before of old.resources){const after=d.resources.find(r=>r.row_id===before.row_id)!;
  for(const key of ['id','row_id','formula_id','title_ru','unit_id','cost_owner_id','procurement_eligible','source_metadata'] as const)expect(after[key]).toEqual(before[key]);
  const graph={...after.resource_graph};if(map.rows.find(m=>m.rowId===before.row_id)!.scopeParameterId){
   if(before.resource_graph.inputParameterIds===undefined)delete graph.inputParameterIds;else graph.inputParameterIds=before.resource_graph.inputParameterIds;}
  expect(graph).toEqual(before.resource_graph);
 }
});
it('does not mutate the captured parent while preparing a successor',()=>{
 const parent=captured(),before=JSON.stringify(parent);build(parent);expect(JSON.stringify(parent)).toBe(before);
});
it.each(['parameters','formulas','resources'] as const)('refuses a changed current%s rather than using historical rows as actual preimage',kind=>{
 const p=captured();(p[kind][0] as Record<string,unknown>).unapprovedChange=true;
 expect(()=>build(p)).toThrow('STAIR111_STANDARD_PREIMAGE_CHANGED');
});
it.each([
 {stairs_concrete_volume_m3:'12.5'},
 {stairs_concrete_volume_m3:'12.5',[selector]:'EXISTING_PROJECT_SCHEDULE'},
 {stairs_concrete_volume_m3:'12.5',formwork_formwork_system_designation:'Doka/Dokaflex free text'},
])('keeps legacy output and needs with no explicit111 choice: %j',async parameters=>{
 const {[selector]:_newSelector,...originalParameters}=parameters;
 const before=await compileOriginal(originalParameters),after=await compile(parameters);
 expect(summary(after)).toEqual(summary(before));expect(after.rows.some(r=>r.row_id.startsWith(prefix+':'))).toBe(false);
 expect(after.preliminaryNeeds.some(r=>r.row_id.startsWith(prefix+':'))).toBe(false);
});
const sourceIds=['whole-labor','operator-information','tower-crane8t-consumed','truck-crane10t-consumed','forklift5t-consumed','arc-welder-consumed','surface-vibrator-consumed','chain-saw-consumed','flatbed8t-consumed',
 'water-consumed','nails-consumed','release-oil-consumed','electrodes-consumed','facing-consumed','timber-bars-consumed','boards25-consumed','boards44-consumed','matting-consumed','concrete-consumed','wire-consumed'];
it.each([
 ['100',['2412.6','56.59','51.7','2.35','2.54','3.2','79','1.21','1.51','0.3066','16','173','13','29.2','0.82','0.26','1.02','42.9','101.5','23.6']],
 ['12.5',['301.575','7.07375','6.4625','0.29375','0.3175','0.4','9.875','0.15125','0.18875','0.038325','2','21.625','1.625','3.65','0.1025','0.0325','0.1275','5.3625','12.6875','2.95']],
] as const)('uses whole source111 arithmetic at%s netm3 and keeps source-specific needs',async(volume,expected)=>{
 const r=await compile(control(volume));sourceIds.forEach((id,i)=>expect(by(r,id)?.quantity).toBe(expected[i]));
 for(const g of source.gaps)expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+g.id)).toBe(true);
 expect(by(r,'operator-information')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
});
it.each(map.rows.filter(m=>m.disposition==='MUTUALLY_EXCLUSIVE_WITH_SOURCE111'))('never charges old $rowId alongside source111',async m=>{
 const r=await compile(control());expect(by(r,'whole-labor')?.quantity).toBe('301.575');
 expect(r.rows.some(r=>r.row_id===m.rowId)).toBe(false);
});
it.each(map.rows.filter(m=>m.disposition==='OUTSIDE_SELECTED_ORDINARY_SOURCE111_PROFILE'))('keeps winter owner $rowId outside the selected ordinary source profile',async m=>{
 expect(resolveInclusionGraph(d.resources.find(r=>r.row_id===m.rowId)!.inclusion_ast,control()).value).toBe(false);
 expect((await compile(control())).rows.some(r=>r.row_id===m.rowId)).toBe(false);
});
const pendingGroups=[...new Set(map.rows.flatMap(r=>r.scopeParameterId?[r.scopeParameterId]:[]))];
it.each(pendingGroups)('keeps unresolved scope%s visible and does not accept a manual applicability assertion',async id=>{
 const r=await compile(control());for(const m of map.rows.filter(m=>m.scopeParameterId===id)){
  expect(r.rows.some(r=>r.row_id===m.rowId)).toBe(false);expect(r.preliminaryNeeds.some(n=>n.row_id===m.rowId&&n.missing_parameter_ids.includes(id))).toBe(true);
 }
 await expect(compile({...control(),[id]:'SEPARATE_SOURCE_SCOPE_ADMITTED'})).rejects.toBeDefined();
});
it.each([...source.scopeFacts.map(f=>f.id),...source.requiredProjectReferences,source.workElevationParameterId,source.primaryMeasureParameterId])('does not infer missing111 project fact%s from parent or title',async id=>{
 const p=control();delete p[id];const r=await compile(p);expect(by(r,'whole-labor')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':whole-labor'&&n.missing_parameter_ids.includes(id))).toBe(true);
});
it.each([
 {[source.primaryMeasureParameterId]:'0'},
 {[source.primaryMeasureParameterId]:'12',stairs_concrete_volume_m3:'12.5'},
 {[source.workElevationParameterId]:15.01},{[source.workElevationParameterId]:-1},
 {flight_profile:'CURVED11102'},{formwork_system:'MODOSTR11901'},
 {concrete_profile:'UNCONFIRMED_B25_PUMP'},{source_conditions:'WINTER_OR_SPECIAL_FACTORS'},
])('rejects incompatible111 scope or total volume including landings: %j',async p=>{
 await expect(compile({...control(),...p})).rejects.toBeDefined();
});
it('does not price or procure source machines and creates no own/hired quote rows',()=>{
 expect(d.resources.filter(r=>source.machines.some(m=>r.row_id===prefix+':'+m.id+'-consumed'))).toHaveLength(7);
 for(const m of source.machines){expect(d.resources.some(r=>r.row_id===prefix+':'+m.id+'-own'||r.row_id===prefix+':'+m.id+'-hired')).toBe(false);
  const row=d.resources.find(r=>r.row_id===prefix+':'+m.id+'-consumed')!;expect(row.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
  expect(assertCanonicalMachineHourDefinitionV1({catalogId:d.catalogId,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata})).toBeNull();
 }
 expect(d.machinePriceAdmission).toBe(false);
});
it.each(source.machines.map(m=>m.id))('cannot separately pay informational machine%s through a row override',async id=>{
 const r=await compile(control(),{[prefix+':'+id+'-consumed']:{unitPrice:'77',includedInEstimate:true,provenance}});
 expect(by(r,id+'-consumed')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
});
it('uses a new whole-worker owner with no extra operator or stage split',async()=>{
 const r=await compile(control(),{[prefix+':whole-labor']:{unitPrice:'77',provenance}});
 expect(by(r,'whole-labor')).toMatchObject({quantity:'301.575',unit_price:'77',included_in_estimate:true});
 expect(r.rows.filter(r=>r.category==='labor'&&r.included_in_estimate).map(r=>r.row_id)).toEqual([prefix+':whole-labor']);
 for(const o of source.operations)expect(by(r,o.id)).toMatchObject({unit_id:'m3',quantity:'12.5',included_in_estimate:false});
});
it('uses exact101.5 concrete consumption, compatible stock/reserve/quantum and one new order owner',async()=>{
 const r=await compile({...control(),concrete_stock:1,concrete_stock_compatibility_reference:'CONTROL_ONLY exact B15 lot',concrete_reserve:0.5,concrete_quantum:1});
 expect(by(r,'concrete-consumed')?.quantity).toBe('12.6875');expect(by(r,'concrete-order')?.quantity).toBe('13');
 expect(r.rows.some(r=>r.row_id==='material:concrete:ready-mix')).toBe(false);
});
it('preserves a same-variant saved order quantity/title/price and a separate exclusion through recalculate',async()=>{
 const r=await compile(control(),{
  [prefix+':concrete-order']:{quantity:'14',unitPrice:'77',titleRu:'CONTROL_ONLY saved B15 order',provenance},
  [prefix+':facing-order']:{includedInEstimate:false,includedInProcurement:false,provenance},
 });
 expect(by(r,'concrete-order')).toMatchObject({quantity:'14',unit_price:'77',title_ru:'CONTROL_ONLY saved B15 order'});
 expect(by(r,'concrete-consumed')?.quantity).toBe('12.6875');expect(by(r,'facing-order')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
});
it('preserves legacy saved manual fields when the source variant is not switched',async()=>{
 const id='labor:formwork:stairs-assembly',overrides={[id]:{quantity:'2',unitPrice:'77',titleRu:'CONTROL_ONLY saved old formwork',includedInEstimate:false,includedInProcurement:false,provenance}};
 const parameters={stairs_concrete_volume_m3:'12.5'},before=await compileOriginal(parameters,overrides),after=await compile(parameters,overrides);
 expect(summary(after)).toEqual(summary(before));expect([...after.rows,...after.preliminaryNeeds].find(r=>r.row_id===id)).toMatchObject({title_ru:'CONTROL_ONLY saved old formwork',unit_price:'77'});
});
it('does not replace averaged BBS or two project amortization needs by invented0or1',async()=>{
 const r=await compile(control());for(const id of ['project-bbs-materials','doka-metal-amortization','doka-wood-amortization']){
  expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id)).toBe(true);
  await expect(compile(control(),{[prefix+':'+id]:{quantity:'1',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 }
 expect(d.formulas.some(f=>f.formula_id.startsWith(prefix)&&/197\s*\*/.test(f.expression_source??''))).toBe(false);
});
it('documents that unchanged price bindings alone cannot authorize a saved variant switch',()=>{
 const before={resources:old.resources,formulas:old.formulas,parameters:old.parameters};
 const after={resources:d.resources,formulas:d.formulas,parameters:d.parameters};
 const id='labor:formwork:stairs-assembly';
 expect(canonicalManualPriceMigrationBindings(before)[id]).toBe(canonicalManualPriceMigrationBindings(after)[id]);
 expect(canonicalManualExclusionMigrationBindings(before)[id]).not.toBe(canonicalManualExclusionMigrationBindings(after)[id]);
 expect(d.newEstimateCommandGuardRequired).toBe(true);expect(d.newCatalogIds).toBe(0);expect(d.sourceBindingPreservationRequired).toBe(8);
});
it('keeps all late Antisol quantities and S27-33 owners with their original metadata and exact current source closure prerequisite',()=>{
 const ids=old.resources.filter(r=>r.row_id.includes('antisol250w-us')).map(r=>r.row_id);expect(ids).toHaveLength(7);
 for(const id of ids){expect(d.resources.find(r=>r.row_id===id)?.source_metadata).toEqual(old.resources.find(r=>r.row_id===id)?.source_metadata);
  expect(map.rows.find(m=>m.rowId===id)?.disposition).toBe('UNRESOLVED_SEPARATE_SCOPE_VISIBLE_NEED');}
 expect(old.resources.filter(r=>r.row_id.startsWith('material:reinforcement:')&&r.row_id.includes('equipment-')).every(r=>d.resources.some(n=>n.row_id===r.row_id))).toBe(true);
});
it('retains nine source needs plus58 unproven legacy-scope owners as partial, with no fabricated completeness',()=>{
 expect(d.resources).toHaveLength(140);expect(d.unresolvedResourceRowIds).toHaveLength(67);
 expect(new Set(d.unresolvedResourceRowIds).size).toBe(67);expect(d.automaticParentRebase).toBe(false);
 expect(d.parameters.filter(p=>p.truth_metadata?.value_source_role==='UNRESOLVED_APPLICATION_NORM').every(p=>p.default_value==null)).toBe(true);
});
