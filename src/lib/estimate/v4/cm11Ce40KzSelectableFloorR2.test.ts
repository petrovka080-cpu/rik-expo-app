import captured from '../../../../data/estimate-benchmarks/fixtures/cm11-kz-selectable-legacy59-r2.json';
import currentCaptured from '../../../../.release-runtime/r568/master29-floor-drywall/floor-parent.json';
import {cm11Ce40KzSelectableFloorDefinitionR2 as definition,cm11Ce40KzSelectableFloorCompletenessR2 as completeness,compileCm11Ce40KzSelectableFloorR2 as compile,cm11Ce40KzSelectableFloorPackR2 as pack,cm11Ce40KzPrimaryMeasureSelectionR2 as primary,cm11Ce40KzBindingApplicabilityByRowIdR2 as applicability} from './cm11Ce40KzWholeFloorGroupR1';
import {cm11SmallCeramicDefinitionS2754 as oldCm11} from './cm11SmallCeramicS2754';
import {ce40ReadyCeramicDefinitionS2754 as oldCe40} from './ce40ReadyCeramicGroutingS2754';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {compileFormulaGraph,evaluateFormulaGraph} from '../backendPlatform/formulaGraph';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {resolvePrimaryMeasureSelectionV1,assertCanonicalPrimaryMeasureSelectionV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {verifyMaster29PhysicalPrimaryProjectionR1,master29SubjectCatalogR1,assertMaster29IncludedPhysicalOwnersR1} from '../../../../scripts/estimate/r4a13/master29FloorDrywallSubjectVerificationR1';
import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {buildCanonicalBaselinePlan} from '../backendPlatform/canonicalConsumerPromptPlanServerR1';
import {writeFileSync} from 'node:fs';

type Parent=Parameters<typeof definition>[0];
const parent=currentCaptured.capturedParent as unknown as Parent,identity={catalogId:pack.catalogId,definitionVersionId:captured.sourceCapture.definitionVersionId,definitionSha256:captured.sourceCapture.definitionSha256,version:3};
const s=pack.selectableSuccessorR2.selector,exact=(L=2,W=5)=>({[s.parameterId]:s.exactValue,floor_length_m:L,floor_width_m:W});
const row=(r:Awaited<ReturnType<typeof compile>>,suffix:string)=>r.rows.find(r=>r.row_id.endsWith(':'+suffix));
const schema=(d:ReturnType<typeof definition>)=>d.parameters.map(p=>{const t=p.truth_metadata,g=t.guide as Record<string,string>;return{parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:String(t.visibility_role),valueSourceRole:String(t.value_source_role),runtimeProfileClassification:String(t.runtime_profile_classification??''),provenance:t.provenance as Record<string,unknown>,guide:{sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash},normativeLinks:g.source_document?[{sourceId:g.source_document}]:[],constraints:p.constraints_json!,formulaConsumers:d.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id)};});
const core=(next:boolean,q:string,rowOverrides:Record<string,Record<string,unknown>>={})=>{const d=next?definition(parent,identity):parent;return compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.executableProfile.contract,primaryMeasureParameterId:'q',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{q},confirmedParameters:next?{...definition(parent,identity).runtimeInput}:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>hash(v)});};
const physical=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.map(x=>({id:x.row_id,quantity:x.quantity,unit:x.unit_id,owner:x.cost_owner_id,procurement:x.included_in_procurement,estimate:x.included_in_estimate}));

it('retains source factories, the legacy59 preimage, all old formula ASTs and owners',()=>{
 const a=hash(oldCm11),b=hash(oldCe40(2)),old=hash(parent),d=definition(parent,identity);
 expect(currentCaptured.capturedParent.definition.id).toBe(identity.definitionVersionId);expect(currentCaptured.capturedParent.definition.definition_sha256).toBe(identity.definitionSha256);
 expect(hash(oldCm11)).toBe(a);expect(hash(oldCe40(2))).toBe(b);expect(hash(parent)).toBe(old);expect(d.formulas.slice(0,59)).toEqual(parent.formulas);
 for(const r of parent.resources){const next=d.resources.find(x=>x.row_id===r.row_id)!;expect(next.formula_id).toBe(r.formula_id);expect(next.unit_id).toBe(r.unit_id);expect(next.cost_owner_id).toBe(r.cost_owner_id);expect(next.procurement_eligible).toBe(r.procurement_eligible);expect(next.resource_graph).toEqual(r.resource_graph);expect(next.inclusion_ast).toEqual({kind:'and',operands:[{kind:'equals',parameterId:s.parameterId,value:s.legacyValue},r.inclusion_ast]});}
 expect(d.resources).toHaveLength(117);expect(d.formulas).toHaveLength(117);expect(d.parameters).toHaveLength(34);expect(validateMasterFormulaGraphConsistency(d.formulas)).toEqual([]);
});
it.each(['10','100'])('preserves omitted and explicit legacy selection at q=%s',async q=>{
 const before=await core(false,q),after=await compile(parent,identity,{q}),explicit=await compile(parent,identity,{q,[s.parameterId]:s.legacyValue});
 const excluded='tile_stone_interior_tile_floor_lay_standard_materials_37';expect(parent.resources).toHaveLength(59);
 expect(parent.resources.find(r=>r.row_id===excluded)!.inclusion_ast).toEqual({kind:'literal',value:false});
 expect(before.rows).toHaveLength(58);expect(before.preliminaryNeeds).toEqual([]);expect(before.rows.some(r=>r.row_id===excluded)).toBe(false);
 for(const result of [after,explicit]){expect(result.rows).toEqual(before.rows);expect(result.preliminaryNeeds).toEqual(before.preliminaryNeeds);expect(result.totals).toEqual(before.totals);}
 expect(physical(after)).toEqual(physical(before));expect(physical(explicit)).toEqual(physical(before));
});
it('keeps saved legacy manual quantity, price, name, amount and original owner',async()=>{
 const id=parent.resources[0]!.row_id,edit={[id]:{quantity:'7',unitPrice:'120.5',titleRu:'Моя сохранённая плитка',provenance:{kind:'manual',reason:'Retained saved user revision'}}},before=await core(false,'10',edit),after=await core(true,'10',edit),a=after.rows.find(r=>r.row_id===id)!,b=before.rows.find(r=>r.row_id===id)!;
 expect(a.quantity).toBe('7');expect(a.unit_price).toBe(b.unit_price);expect(Number(a.amount)).toBe(843.5);expect(a.amount).toBe(b.amount);expect(a.title_ru).toBe(b.title_ru);expect(a.cost_owner_id).toBe(b.cost_owner_id);expect(after.totals).toEqual(before.totals);
});
it('rejects mismatched parent identity, altered legacy arithmetic and altered owner',()=>{
 expect(()=>definition(parent,{...identity,definitionSha256:'0'.repeat(64)})).toThrow(/EXACT_RETAINED/);
 const changed=JSON.parse(JSON.stringify(parent)) as Parent;(changed.formulas[0] as unknown as {expression_source:string}).expression_source='q*999';expect(()=>definition(changed,identity)).toThrow(/EXACT_RETAINED/);
 const owner=JSON.parse(JSON.stringify(parent)) as Parent;(owner.resources[0] as unknown as {cost_owner_id:string}).cost_owner_id='replacement-owner';expect(()=>definition(owner,identity)).toThrow(/EXACT_RETAINED/);
});
it('uses the exact KZ profile and removes the disconnected joint-depth question',()=>{
 const d=definition(parent,identity);expect(d.parameters.some(p=>p.parameter_id==='floor_joint_depth_mm')).toBe(false);expect(d.parameters.filter(p=>p.required)).toHaveLength(0);
 expect(d.parameters.find(p=>p.parameter_id==='floor_length_m')!.constraints_json!.requiredWhen).toEqual({kind:'equals',parameterId:s.parameterId,value:s.exactValue});
 expect(pack.executableProfile.jointDepthDispositionR2).toMatchObject({numericNormInferenceAllowed:false,futureUniformityAndCleanlinessCheck:'PROCESS_REQUIRED',approximateRateGuaranteed:false});
 expect(pack.regionalProfileDecision.cm11).toMatchObject({maturingMinutes:5,approxKgM2:2.5,floorContactMinimumPercent:80,floorGroutWaitMinimumHours:24});expect(pack.regionalProfileDecision.ct17).toMatchObject({rangeLPerM2PerCoat:[0.1,0.2],dryingHoursRange:[4,6],packL:[5,10,30]});
});
it.each([
 [1,1,'0.4','2','1.6','0','0.4','0.12','0.52','2.5','0.6'],
 [2,5,'4','4','0','0','4','1.2','5.2','0','0'],
 [10,10,'40','40','0','6','4','1.2','5.2','0','0'],
 [2.05,5,'4.1','6','1.9','0','4.1','1.23','5.33','0.625','0.15'],
 [5,6,'12','12','0','2','0','0','0','0','0'],
])('keeps exact order/dry remainder and short-tail balance at %s×%s',async(L,W,mixed,order,dry,full,tail,water,wet,glueTail,glueWater)=>{
 const facts=exact(Number(L),Number(W)),r=await compile(parent,identity,facts),f=pack.wholeMixingNodePlan.formulaPlan,value=(x:string)=>evaluateFormulaGraph(compileFormulaGraph(x),facts);
 expect(row(r,'ce40-mixed-plan')?.quantity).toBe(mixed);expect(row(r,'ce40-order')?.quantity).toBe(order);expect(row(r,'ce40-dry-remaining')?.quantity).toBe(dry);
 expect(value(f.ce40FullBatches)).toBe(full);expect(value(f.ce40LastShortDryKg)).toBe(tail);expect(value(f.ce40LastShortWaterL)).toBe(water);expect(value(f.ce40LastShortWetKg)).toBe(wet);expect(value(f.cm11LastShortDryKg)).toBe(glueTail);expect(value(f.cm11LastShortWaterL)).toBe(glueWater);
 expect(r.preliminaryNeeds.some(n=>n.row_id.endsWith(':open-batch-provision'))).toBe(tail!=='0'||glueTail!=='0');expect(r.rows.filter(r=>r.row_id.endsWith(':water-order'))).toHaveLength(1);expect(r.rows.some(r=>r.row_id.startsWith('tile_stone_interior_tile_floor_lay_standard_'))).toBe(false);
});
it.each([[1,1,'2.5','5','0.72'],[2,5,'25','25','7.2'],[10,10,'250','250','72']])('keeps regional glue and shared mixing water at %s×%s',async(L,W,used,ordered,water)=>{
 const r=await compile(parent,identity,exact(Number(L),Number(W)));expect(row(r,'cm11-consumed')?.quantity).toBe(used);expect(row(r,'cm11-order')?.quantity).toBe(ordered);expect(row(r,'water-order')?.quantity).toBe(water);
});
it('retains one supported sequential station and honest unknown PPE/tool quantities',async()=>{
 const r=await compile(parent,identity,exact(5,6));for(const key of ['mix-drive','mix-sw10-hf','mix-cm11-paddle','mix-ce40-paddle','mix-vessel','mix-rotation-lock','mix-water-measure']){const x=row(r,key)!;expect(x.quantity).toBe('1');expect(x.included_in_estimate).toBe(false);expect(x.included_in_procurement).toBe(false);}
 for(const key of ['mix-goggles','mix-gloves','mix-dust-mask','mix-hearing-protection','mix-snug-clothing','primer-brush','primer-vessel','notched-trowel','rubber-float','grout-sponge','dry-cloth']){expect(row(r,key)).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id==='cm11-ce40-kz-whole-floor:'+key)).toBe(true);}
});
it('covers all24 physical needs with independent category/unit and exact operation owners',async()=>{
 const d=definition(parent,identity),map=completeness(),r=await compile(parent,identity,exact());expect(map.entries).toHaveLength(58);expect(pack.executableProfile.gaps).toHaveLength(24);
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 for(const g of pack.executableProfile.gaps){const id='cm11-ce40-kz-whole-floor:'+g.rowKey,x=d.resources.find(x=>x.row_id===id)!,e=map.entries.find(e=>e.resolution.rowId===id)!;expect(x.category).toBe(g.category);expect(x.unit_id).toBe(g.unitId);expect(e.category).toBe(g.category);expect(e.unitId).toBe(g.unitId||null);expect(e.requiredOperationIds).toEqual(g.operations.map(o=>'cm11-ce40-kz-whole-floor:operation:'+o));expect(canonicalEstimateOperationReferences(x.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(e.requiredOperationIds);expect(r.preliminaryNeeds.some(n=>n.row_id===id)).toBe(true);}
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.filter(r=>!r.row_id.endsWith(':grout-sponge'))}).length).toBeGreaterThan(0);
});
it('rejects fake 0/1 norms, keeps generic names and leaves FULL false',async()=>{
 await expect(compile(parent,identity,{...exact(),kz_floor_open_cleaning_water:0})).rejects.toBeDefined();await expect(compile(parent,identity,{...exact(),kz_floor_open_grout_sponge:1})).rejects.toBeDefined();
 for(const r of definition(parent,identity).resources.filter(r=>!parent.resources.some(p=>p.row_id===r.row_id))){expect(r.title_ru).not.toMatch(/Ceresit|Collomix|Bürkle|\bCM\s*11\b|\bCE\s*40\b|\bCT\s*17\b|HEXAFIX|49498|41621|41200/iu);expect((r.resource_graph.publicResourcePresentationV1 as {detailsRu:unknown[]}).detailsRu).toEqual([]);}
 expect(Object.keys(applicability())).toHaveLength(58);expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.published).toBe(false);
});
it('uses existing client/server primary selection and requires a new exact root without losing legacy facts',()=>{
 const d=definition(parent,identity),parameterSchema=schema(d),before=Object.freeze({[s.parameterId]:s.legacyValue,q:'77'}),next=Object.freeze({...exact(),q:'77'});
 expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema,submittedParameters:{...d.runtimeInput,q:'10'}})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:'q',unitId:'m2'}});
 expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema,submittedParameters:before,parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:'q',unitId:'m2'}});
 expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema,submittedParameters:exact()})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:'floor_area_m2',unitId:'m2'}});
 expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema,submittedParameters:next,parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}})).toMatchObject({kind:'NEW_ROOT_REQUIRED',carryForward:{parameters:false,rowOverrides:false,prices:false}});
 expect(()=>assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema,submittedParameters:next,parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}})).toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED',httpStatus:422}));expect(before.q).toBe('77');expect(next.q).toBe('77');
});

/** Uses the actual common writer, adapter, ViewModel and PDF. */
export async function captureCm11KzPhysicalAreaPresentationR2(){
 const d=definition(parent,identity),result=await compile(parent,identity,exact(10,10)),needIds=pack.executableProfile.gaps.map(g=>pack.executableProfile.namespace+':'+g.rowKey);
 const receipt=await verifyMaster29PhysicalPrimaryProjectionR1({catalogId:pack.catalogId,definitionVersionId:identity.definitionVersionId,titleRu:'Укладка плиточного пола',
  definition:d,result,submittedParameters:exact(10,10),primaryParameterId:'floor_area_m2',expectedArea:'100',expectedPhysicalNeedRowIds:needIds});
 if(process.env.CM11_R2_PROJECTION_RECEIPT_PATH)writeFileSync(process.env.CM11_R2_PROJECTION_RECEIPT_PATH,JSON.stringify(receipt,null,2)+'\n');
 return receipt;
}
it('projects source-derived100m2 through the actual shared writer-adapter-ViewModel-PDF without a second area question',async()=>{
 const proof=await captureCm11KzPhysicalAreaPresentationR2();expect(proof.status).toBe('PASS_ACTUAL_WRITER_ADAPTER_VIEWMODEL_PDF_AREA');
 expect(proof.area).toBe('100');expect(proof.unitId).toBe('m2');expect(proof.identityTitle).toBe('Укладка плиточного пола — 100 м²');expect(proof.unresolvedPhysicalNeedsChecked).toBe(24);
});
it('requires measured geometry and rejects a caller-supplied999m2 conflicting with its length and width',async()=>{
 const missing=await compile(parent,identity,{[s.parameterId]:s.exactValue});expect(missing.parameters.floor_area_m2).toBeUndefined();
 expect(missing.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('floor_length_m'))).toBe(true);
 expect(missing.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('floor_width_m'))).toBe(true);
 await expect(compile(parent,identity,{...exact(10,10),floor_area_m2:'999'})).rejects.toBeDefined();
 const explicit=await compile(parent,identity,{...exact(10,10),q:'77'});expect(explicit.parameters.q).toBe('77');expect(explicit.parameters.floor_area_m2).toBe('100');
});
it('keeps14 calculated balances and7 operation notes out of the37 default physical positions',()=>{
 const d=definition(parent,identity),roles=pack.selectableSuccessorR2.publicRowRoles;
 expect(Object.values(roles).filter(r=>r==='RESOURCE')).toHaveLength(37);expect(Object.values(roles).filter(r=>r==='CALCULATION_DETAIL')).toHaveLength(14);expect(Object.values(roles).filter(r=>r==='PROCESS_NOTE')).toHaveLength(7);
 for(const row of d.resources.filter(row=>Object.hasOwn(roles,row.row_id))){const role=(roles as Record<string,string>)[row.row_id];
  expect(parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1)).not.toBeNull();
  expect(Object.keys(row.resource_graph.publicResourcePresentationV1 as object)).toHaveLength(role==='RESOURCE'?6:7);
  expect(canonicalPublicResourceRowKindV1({titleRu:row.title_ru,descriptor:row.resource_graph.publicResourcePresentationV1,costTreatment:row.resource_graph.costTreatment,
   includedInEstimate:false,includedInProcurement:false,unitPrice:role==='CALCULATION_DETAIL'?'120.5':null,amount:null,rowId:row.row_id,graph:row.resource_graph,category:row.category})).toBe(role);
 }
});
it('ordinary client collects only source geometry and never asks the internal area or borrows legacyq',()=>{
 const d=definition(parent,identity),catalog=master29SubjectCatalogR1(d,pack.catalogId,'Укладка плиточного пола',primary);
 const area=catalog.parameterSchema.find(p=>p.parameterId==='floor_area_m2')!,rule=pack.selectableSuccessorR2.computedPhysicalPrimaryArea.geometryRule;
 expect(area.guide).toMatchObject({guideKind:'DERIVED_VALUE_RULE',sourceRole:'ENGINEERING_DESIGN',guideVersion:pack.executableProfile.contract,
  sourceDocument:rule.sourceDocument,sourceLocator:rule.locator,sourceSnapshotHash:rule.sha256,verifiedAt:rule.verifiedAt,guideValidationPolicy:'MANDATORY_BLOCK'});
 expect(area.normativeLinks).toEqual([{sourceId:rule.sourceDocument,documentTitleRu:rule.sourceDocument,editionStatus:pack.executableProfile.contract,
  locator:rule.locator,applicabilityRu:area.guide!.applicability,verifiedAt:rule.verifiedAt,verifiedSource:'ENGINEERING_DESIGN'}]);
 const plan=buildCanonicalBaselinePlan({catalog,prompt:'Укладка плиточного пола',parameterOverrides:exact(10,10)});
 expect(plan.primaryMeasureParameterId).toBe('floor_area_m2');expect(plan.parameters).not.toHaveProperty('floor_area_m2');expect(plan.parameters).not.toHaveProperty('q');
 expect(plan.parameters.floor_length_m).toBe(10);expect(plan.parameters.floor_width_m).toBe(10);
 expect(typeof plan.parameters.floor_length_m).toBe('number');expect(typeof plan.parameters.floor_width_m).toBe('number');
 expect(()=>buildCanonicalBaselinePlan({catalog,prompt:'Укладка плиточного пола',parameterOverrides:{[s.parameterId]:s.exactValue}}))
  .toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:expect.arrayContaining(['floor_length_m','floor_width_m'])}));
});
it('one area workowner pays the unknown installation labour and station; a second labour owner is rejected',async()=>{
 const d=definition(parent,identity),costs=pack.selectableSuccessorR2.paidOwnerOracle,included=[costs.sameInstallationLabour.rowId,...costs.sequentialStation.rowIds];
 assertMaster29IncludedPhysicalOwnersR1(d,{workOwnerRowId:costs.workOwnerRowId,includedRowIds:included});
 const bad=JSON.parse(JSON.stringify(d)) as ReturnType<typeof definition>,labour=bad.resources.find(r=>r.row_id===costs.sameInstallationLabour.rowId)!;
 (labour.resource_graph as Record<string,unknown>).costTreatment='OWN_COST';(labour as unknown as {cost_owner_id:string}).cost_owner_id=labour.row_id;
 expect(()=>assertMaster29IncludedPhysicalOwnersR1(bad,{workOwnerRowId:costs.workOwnerRowId,includedRowIds:included})).toThrow(/SECOND_LABOUR/);
 const result=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.executableProfile.contract,primaryMeasureParameterId:'floor_area_m2',
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:exact(10,10),confirmedParameters:d.runtimeInput,
  rowOverrides:{[costs.workOwnerRowId]:{unitPrice:'77',provenance:{kind:'manual',reason:'One quoted installation owner'}},
   [costs.sameInstallationLabour.rowId]:{quantity:'7',unitPrice:'120.5',provenance:{kind:'manual',reason:'Saved physical hours and reference price, included in owner'}}},
  priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>hash(v)});
 expect(result.totals.amount).toBe('7700');const saved=[...result.rows,...result.preliminaryNeeds].find(r=>r.row_id===costs.sameInstallationLabour.rowId)!;
 expect(saved.quantity).toBe('7');expect(saved.unit_price).toBe('120.5');expect(saved.selected).toBe(false);
 const proof=await verifyMaster29PhysicalPrimaryProjectionR1({catalogId:pack.catalogId,definitionVersionId:identity.definitionVersionId,titleRu:'Укладка плиточного пола',
  definition:d,result,submittedParameters:exact(10,10),primaryParameterId:'floor_area_m2',expectedArea:'100',expectedAmount:'7700',
  rowOverrides:{[costs.workOwnerRowId]:{unitPrice:'77',provenance:{kind:'manual',reason:'One quoted installation owner'}},
   [costs.sameInstallationLabour.rowId]:{quantity:'7',unitPrice:'120.5',provenance:{kind:'manual',reason:'Saved physical hours and reference price, included in owner'}}},
  expectedIncludedManualPhysicalRows:[{rowId:costs.sameInstallationLabour.rowId,quantity:'7',unitPrice:'120.5',unitId:'man_hour'}]});
 expect(proof.manualPhysicalRows).toEqual([{rowId:costs.sameInstallationLabour.rowId,quantity:'7',unitPrice:'120.5',unitId:'man_hour',includedInEstimate:false,amount:null}]);expect(proof.totalAmount).toBe('7700');
});


import currentCm11FixtureR951 from '../../../../data/estimate-benchmarks/fixtures/cm11-ct17-ce40-current-parent-r951.json';
import {cm11Ce40KzCurrentConsumerDefinitionR3 as currentConsumerDefinition,compileCm11Ce40KzCurrentConsumerR3 as compileCurrentConsumer,
 cm11Ce40KzCurrentConsumerPackR3 as currentConsumerPack,cm11Ce40KzCurrentConsumerExpectationsR3 as currentConsumerExpectations} from './cm11Ce40KzWholeFloorGroupR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const currentConsumerFacts=(L=5,W=6)=>({[s.parameterId]:s.exactValue,floor_length_m:L,floor_width_m:W});
const currentConsumerSuffix=(result:Awaited<ReturnType<typeof compileCurrentConsumer>>,suffix:string)=>result.rows.find(item=>item.row_id.endsWith(':'+suffix));
describe('CM11 current R951 whole consumers',()=>{
 it('pins actual v4 34/117/117 and reuses the whole CE40 regional operation without legacy reconstruction',()=>{
  const bytes=readFileSync(require.resolve('../../../../data/estimate-benchmarks/fixtures/cm11-ct17-ce40-current-parent-r951.json'));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('70093a1a64f3d5235d3b955b3431f7f4122813b29bb01dcd993da94fc00a2ee1');
  const d=currentConsumerDefinition(),b=currentCm11FixtureR951.currentBody;
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([36,118,118]);
  expect(d.parameters.slice(0,34)).toEqual(b.parameters);expect(d.formulas.slice(0,117)).toEqual(b.formulas);expect(d.runtimeInput).toEqual({});
  expect(currentConsumerPack.reusedWholeOperation.factory).toBe('ce40ReadyCeramicDefinitionS2754(2)');
  expect(currentConsumerPack.quantityBoundary.smallTailAssemblyStillHeld).toBe(true);
 });
 it('refuses a changed real header and changed real formula body before consumer mapping',()=>{
  const header=structuredClone(currentCm11FixtureR951);header.header.definition_sha256='0'.repeat(64);
  expect(()=>currentConsumerDefinition(header)).toThrow('CM11_R3_EXACT_ACTUAL_R951_BODY_REQUIRED');
  const body=structuredClone(currentCm11FixtureR951);body.currentBody.formulas[0]!.expression_source='q*999';
  expect(()=>currentConsumerDefinition(body)).toThrow('CM11_R3_EXACT_ACTUAL_R951_BODY_REQUIRED');
 });
 it('preserves all current formulas source metadata owners supply and legacy59 while adding only declared consumers',()=>{
  const d=currentConsumerDefinition(),b=currentCm11FixtureR951.currentBody,changed=new Set(currentConsumerPack.consumerRows.map(x=>x.rowId));
  for(const before of b.resources){const after=d.resources.find(x=>x.row_id===before.row_id)!;
   expect(after.formula_id).toBe(before.formula_id);expect(after.unit_id).toBe(before.unit_id);expect(after.cost_owner_id).toBe(before.cost_owner_id);
   expect(after.procurement_eligible).toBe(before.procurement_eligible);expect(after.inclusion_ast).toEqual(before.inclusion_ast);expect(after.source_metadata).toEqual(before.source_metadata);
   if(!changed.has(before.row_id)){expect(after.resource_graph).toEqual(before.resource_graph);expect(after.row_sha256).toBe(before.row_sha256);}
  }
  expect(d.resources.slice(0,59)).toEqual(b.resources.slice(0,59));
 });
 it('shows regional mixed CM11 at laying and regional CE40 at grouting with one unchanged material order owner',()=>{
  const d=currentConsumerDefinition(),ids=(id:string)=>canonicalEstimateOperationReferences(d.resources.find(x=>x.row_id===id)!.resource_graph.operationCompositionV1).map(x=>x.operationId);
  expect(ids('ceramic:cm11-10cm-4mm:cm11-consumed')).toContain('cm11-ce40-kz-whole-floor:operation:laying');
  expect(ids('ceramic:ce40-ready:10x10-2mm:ce40-mixed-plan')).toContain('cm11-ce40-kz-whole-floor:operation:grouting');
  expect(d.resources.filter(x=>x.row_id==='ceramic:ce40-ready:10x10-2mm:ce40-order'&&x.procurement_eligible)).toHaveLength(1);
  expect(d.resources.filter(x=>x.row_id==='ceramic:cm11-10cm-4mm:water-order'&&x.procurement_eligible)).toHaveLength(1);
 });
 it('exposes one cleaning-water and compatible wash-vessel need at every actual wet consumer without extra litres or orders',async()=>{
  const d=currentConsumerDefinition(),water=d.resources.find(x=>x.row_id.endsWith(':open-cleaning-water'))!,vessel=d.resources.find(x=>x.row_id.endsWith(':open-wash-vessel'))!;
  for(const r of [water,vessel])expect(canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1).map(x=>x.operationId).sort()).toEqual(['priming','cm11-mixing','laying','ce40-mixing','grouting','cleaning'].map(x=>'cm11-ce40-kz-whole-floor:operation:'+x).sort());
  const r=await compileCurrentConsumer(currentConsumerFacts());
  const need=r.preliminaryNeeds.find(x=>x.row_id===water.row_id)!;expect(need.quantity).toBeNull();expect(need.need_state).toBe('QUANTITY_REQUIRED');
  expect(currentConsumerSuffix(r,'water-order')?.quantity).toBe('21.6');expect(r.rows.filter(x=>x.row_id===water.row_id)).toHaveLength(0);
 });
 it('shows cement eye and skin protection at mixing laying grouting and cleaning with one included whole-work owner',()=>{
  const d=currentConsumerDefinition();for(const suffix of ['mix-goggles','mix-gloves']){
   const row=d.resources.find(x=>x.row_id.endsWith(':'+suffix))!;
   expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(x=>x.operationId)).toEqual(expect.arrayContaining(['laying','grouting','cleaning'].map(x=>'cm11-ce40-kz-whole-floor:operation:'+x)));
   expect(row.cost_owner_id).toBe('cm11-ce40-kz-whole-floor:whole-owner');expect(row.procurement_eligible).toBe(false);
  }
 });
 it('keeps all24 developer norm holds internal and never turns source incompleteness into a user norm question',()=>{
  const d=currentConsumerDefinition();expect(currentConsumerPack.retainedQuantityNeeds).toHaveLength(24);
  for(const g of currentConsumerPack.retainedQuantityNeeds){const p=d.parameters.find(x=>x.parameter_id==='kz_floor_open_'+g.key.replaceAll('-','_'))!;
   expect(p.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');expect(p.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');expect(p.default_value).toBeNull();
  }
 });
 it('validates an independent source-authored shared consumer map against real current resources',()=>{
  const d=currentConsumerDefinition(),map=currentConsumerExpectations();expect(map.sourceKind).toBe('PROJECT_SYSTEM');expect(map.generatedFromCurrentRows).toBe(false);expect(map.entries).toHaveLength(59);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas.map(f=>({...f})),resourceDefinitions:d.resources.map(r=>({...r})),requireOperationBindings:true})).toEqual([]);expect(validateMasterFormulaGraphConsistency(d.formulas)).toEqual([]);
 });
 it.each([[1,1,'2.5','5','0.4','2','0.72'],[2,5,'25','25','4','4','7.2'],[5,6,'75','75','12','12','21.6']])('retains normative consumption separate from nominal packaging and short tails at %s x %s',async(L,W,glue,order,grout,groutOrder,mixingWater)=>{
  const r=await compileCurrentConsumer(currentConsumerFacts(Number(L),Number(W)));
  expect(currentConsumerSuffix(r,'cm11-consumed')?.quantity).toBe(glue);expect(currentConsumerSuffix(r,'cm11-order')?.quantity).toBe(order);
  expect(currentConsumerSuffix(r,'ce40-mixed-plan')?.quantity).toBe(grout);expect(currentConsumerSuffix(r,'ce40-order')?.quantity).toBe(groutOrder);
  expect(currentConsumerSuffix(r,'water-order')?.quantity).toBe(mixingWater);
  expect(r.preliminaryNeeds.some(x=>x.row_id.endsWith(':open-batch-provision'))).toBe(Number(L)*Number(W)!==30);
 });
 it('refuses zero invalid dimensions and unsupported selector rather than inventing a different product system',async()=>{
  for(const input of [currentConsumerFacts(0,6),currentConsumerFacts(-1,6),{...currentConsumerFacts(),[s.parameterId]:'wet heated diagonal larger tiles'}])await expect(compileCurrentConsumer(input)).rejects.toThrow();
 });
 it('preserves the omitted legacy selection and cold submitted measurements without baseline hydration',async()=>{
  const omittedInput={q:'10'},before=await compileCurrentConsumer(omittedInput),explicit=await compileCurrentConsumer({q:'10',[s.parameterId]:s.legacyValue});
  expect(omittedInput).toEqual({q:'10'});expect(before.parameters[s.parameterId]).toBe(s.legacyValue);expect(before.parameters.q).toBe('10');
  const retainedLegacy=currentCm11FixtureR951.currentBody.resources.slice(0,59),retainedLegacyIds=retainedLegacy.map(row=>row.row_id).sort(),
   actualDefinitionIds=currentConsumerDefinition().resources.slice(0,59).map(row=>row.row_id).sort(),excluded='tile_stone_interior_tile_floor_lay_standard_materials_37',
   predecessor=await core(false,'10'),runtimeExpectedIds=[...predecessor.rows,...predecessor.preliminaryNeeds].map(row=>row.row_id).sort(),
   omittedIds=[...before.rows,...before.preliminaryNeeds].map(row=>row.row_id).sort(),explicitIds=[...explicit.rows,...explicit.preliminaryNeeds].map(row=>row.row_id).sort();
  expect(retainedLegacyIds).toHaveLength(59);expect(actualDefinitionIds).toEqual(retainedLegacyIds);expect(parent.resources.map(row=>row.row_id).sort()).toEqual(retainedLegacyIds);
  expect(parent.resources.find(row=>row.row_id===excluded)!.inclusion_ast).toEqual({kind:'literal',value:false});
  expect(retainedLegacy.find(row=>row.row_id===excluded)!.inclusion_ast).toEqual({kind:'and',operands:[{kind:'equals',parameterId:s.parameterId,value:s.legacyValue},{kind:'literal',value:false}]});
  expect(runtimeExpectedIds).toEqual(retainedLegacyIds.filter(id=>id!==excluded));expect(new Set(omittedIds).size).toBe(omittedIds.length);
  expect({missing:runtimeExpectedIds.filter(id=>!omittedIds.includes(id)),extra:omittedIds.filter(id=>!runtimeExpectedIds.includes(id))}).toEqual({missing:[],extra:[]});
  expect(omittedIds).toEqual(runtimeExpectedIds);expect(explicitIds).toEqual(runtimeExpectedIds);expect(omittedIds).not.toContain(excluded);
  expect(physical(before)).toEqual(physical(predecessor));expect(physical(explicit)).toEqual(physical(predecessor));
  expect(before.rows).toEqual(explicit.rows);expect(before.preliminaryNeeds).toEqual(explicit.preliminaryNeeds);expect(before.preliminaryNeeds).toEqual(predecessor.preliminaryNeeds);
  expect(before.totals).toEqual(explicit.totals);expect(before.totals).toEqual(predecessor.totals);
  expect(Object.keys(before.parameters).filter(id=>id.startsWith('kz_floor_open_'))).toEqual([]);
  expect(before.parameters.floor_length_m).toBeUndefined();expect(before.parameters.floor_width_m).toBeUndefined();expect(before.parameters.floor_area_m2).toBeUndefined();
  const saved:unknown=JSON.parse(JSON.stringify(currentConsumerFacts(2,5)));
  const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(!record(saved))throw Error('CM11_R3_SAVED_INPUT_RECORD_REQUIRED');const r=await compileCurrentConsumer(saved);
  expect(saved).toMatchObject({floor_length_m:2,floor_width_m:5});
  expect(typeof r.parameters.floor_length_m).toBe('number');expect(typeof r.parameters.floor_width_m).toBe('number');
  expect(r.parameters.floor_length_m).toBe(saved.floor_length_m);expect(r.parameters.floor_width_m).toBe(saved.floor_width_m);
  const derivedArea=evaluateFormulaGraph(compileFormulaGraph('floor_length_m*floor_width_m'),{floor_length_m:2,floor_width_m:5});
  expect(derivedArea).toBe('10');expect(r.parameters.floor_area_m2).toBe(derivedArea);
  expect(Object.keys(r.parameters).filter(x=>x.startsWith('kz_floor_open_'))).toEqual([]);
 });
 it('keeps the same actual source and binding snapshot byte domains without mistaking them for fresh publication admission',()=>{
  const b=currentCm11FixtureR951.currentBody;expect(b.bindings).toHaveLength(34);expect(b.sources).toHaveLength(1);expect(b.locators).toHaveLength(1);
  expect(canonicalEstimateStableJson(b)).toBe(canonicalEstimateStableJson(structuredClone(b)));
  expect(currentConsumerPack.sourceAdmission).toBe('R968_NEW_SOURCE_ABSENCE_OBSERVED_FORMAL_CAPTURE_UNRUN');expect(currentConsumerPack.fullTechnicalAcceptance).toBe(false);
 });
});


describe('CM11 current R951 saved and sole-owner boundary',()=>{
 const coreCurrent=(submittedParameters:Record<string,unknown>,rowOverrides:Record<string,Record<string,unknown>>={},confirmedParameters:Record<string,unknown>={})=>{
  const d=currentConsumerDefinition();return compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:currentConsumerPack.contract,
   primaryMeasureParameterId:'floor_area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
   submittedParameters,confirmedParameters,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash});
 };
 it('retains explicit manual physical PPE without another payment or procurement owner',async()=>{
  const whole='cm11-ce40-kz-whole-floor:whole-owner',gloves='cm11-ce40-kz-whole-floor:mix-gloves',r=await coreCurrent(currentConsumerFacts(),{
   [whole]:{unitPrice:'77',provenance:{kind:'manual',reason:'Explicit whole-work quote'}},
   [gloves]:{quantity:'2',unitPrice:'42',provenance:{kind:'manual',reason:'Explicit measured physical requirement, included in work'}}});
  const child=r.preliminaryNeeds.find(row=>row.row_id===gloves)!;
  expect(child).toBeDefined();expect(child.quantity).toBe('2');expect(child.unit_price).toBe('42');expect(child.need_state).toBe('QUANTITY_REQUIRED');
  const d=currentConsumerDefinition(),resource=d.resources.find(row=>row.row_id===gloves)!,formula=d.formulas.find(f=>f.formula_id===resource.formula_id)!;
  expect(formula.input_parameter_ids).toHaveLength(1);const quantityParameterId=formula.input_parameter_ids[0]!;
  expect(d.parameters.find(p=>p.parameter_id===quantityParameterId)!.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
  expect(child.missing_parameter_ids).toContain(quantityParameterId);expect(r.rows.some(row=>row.row_id===gloves)).toBe(false);
  expect([...r.rows,...r.preliminaryNeeds].filter(row=>row.row_id===gloves)).toHaveLength(1);
  expect(child.selected).toBe(false);expect(child.procurement_eligible).toBe(false);expect(resource.cost_owner_id).toBe(whole);
  const record=(value:unknown):Record<string,unknown>=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('CM11_MANUAL_NEED_RECORD_REQUIRED');return value as Record<string,unknown>;},
   trace=record(child.calculation_trace),graph=record(trace.resourceGraph),inclusion=record(trace.inclusionDecision);
  expect(graph.costTreatment).toBe('INCLUDED_IN_RESOURCE_ROWS');expect(graph.parentCostOwnerId).toBe(whole);expect(graph.includedInResourceOwnerRowId).toBe(whole);
  expect(inclusion).toMatchObject({source:'definition_cost_treatment',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',effectiveIncludedInEstimate:false,effectiveIncludedInProcurement:false});
  const checksum=createHash('sha256').update(canonicalEstimateStableJson(r.revisionProjection)).digest('hex'),
   commit=buildCanonicalRevisionCommitPayload({rowCount:r.rows.length,currencyCode:'KGS',totals:r.totals,checksumSha256:checksum,compilerVersion:currentConsumerPack.contract,
    parameters:r.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:currentConsumerFacts(),parentRevisionId:null,identityContract:{},preliminaryNeeds:r.preliminaryNeeds}),
   stored={id:'TEST_ONLY_CM11_MANUAL_PPE_REVISION',release_id:'TEST_ONLY_CM11_CURRENT_RELEASE',definition_version_id:'TEST_ONLY_CM11_CURRENT_DEFINITION',catalog_id:pack.catalogId,
    row_count:r.rows.length,currency_code:'KGS',checksum_sha256:checksum,input_parameters:r.parameters,amendment_contract:{parameterSources:commit.parameterSources}},
   coldUnknown:unknown=JSON.parse(JSON.stringify(stored)),cold=record(coldUnknown),
   artifact=canonicalArtifactPreliminaryNeeds({...cold,id:cold.id,release_id:cold.release_id,catalog_id:cold.catalog_id,checksum_sha256:cold.checksum_sha256,row_count:cold.row_count}),
   projected=artifact.find(row=>row.row_id===gloves);
  expect(projected).toBeDefined();expect(projected).toMatchObject({quantity:'2',unit_price:'42',need_state:'QUANTITY_REQUIRED',included_in_estimate:false,included_in_procurement:false,amount:null,ownership_status:'PRELIMINARY_NEED'});
  expect(artifact.filter(row=>row.row_id===gloves)).toHaveLength(1);expect(canonicalEstimateStableJson(cold)).toBe(canonicalEstimateStableJson(stored));
  // Raw preliminary needs intentionally have no ordinary-row money flags or
  // cost_owner_id field; the definition/trace owns coverage, saved projection owns display.
  expect(r.rows.filter(row=>row.row_id===whole)).toHaveLength(1);expect(r.totals.amount).toBe('2310');
 });
 it('replays Core saved-shaped measurements through a cold recalculation with the same quantities and unresolved source holds',async()=>{
  const first=await coreCurrent(currentConsumerFacts(2,5)),saved:unknown=JSON.parse(JSON.stringify({parameters:first.revisionProjection.parameters}));
  const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(!record(saved)||!record(saved.parameters))throw Error('CM11_R3_SAVED_REVISION_PARAMETERS_REQUIRED');
  const cold=await coreCurrent({[s.parameterId]:saved.parameters[s.parameterId],floor_length_m:saved.parameters.floor_length_m,floor_width_m:saved.parameters.floor_width_m},{},saved.parameters);expect(cold.rows).toEqual(first.rows);expect(cold.preliminaryNeeds).toEqual(first.preliminaryNeeds);expect(cold.totals).toEqual(first.totals);
  expect(cold.preliminaryNeeds.some(row=>row.row_id.endsWith(':open-cleaning-water'))).toBe(true);
 });
});


import {prepareCm11Ce40KzCurrentConsumerR3 as prepareCurrentCm11Ordinary} from '../../../../scripts/estimate/r4a13/prepareCm11Ce40KzSelectableFloorR2';
it('CM11 current ordinary producer refuses absent fresh scoped capture before source files or historical59 admission',()=>{
 expect(()=>prepareCurrentCm11Ordinary({releaseId:'not-an-admitted-release',searchReleaseId:'not-an-admitted-search',outputRoot:'not-executed',currentReleasePath:'not-executed',sourceRoot:'not-executed',
  search:{primaryUom:'m2',canonicalNameRu:'Укладка плиточного пола',aliases:[],shortScopeRu:'SOURCE_ONLY',keyDistinguishingParameters:[],clarificationFields:[],
   includedBoundaries:[],excludedBoundaries:[],extraSearchTermsRu:'',sourceProvenance:{}}})).toThrow('STOP_CM11_CURRENT_CONSUMERS_R3_FRESH_SCOPED_REGISTRY_CAPTURE_REQUIRED');
});


import {validateCanonicalFormulaOutputBoundsV1,parseCanonicalFormulaOutputBoundsV1} from '../backendPlatform/canonicalFormulaOutputBounds';
describe('CM11 current CT17 adjacent protection',()=>{
 const protection=currentConsumerPack.adjacentProtection,confirmed=(value:string)=>({[protection.scopeParameterId]:value});
 it('keeps absent actual adjacent-element scope a CONDITION_REQUIRED even with numeric quantities still unknown',async()=>{
  const r=await compileCurrentConsumer(currentConsumerFacts());const need=r.preliminaryNeeds.find(row=>row.row_id===protection.rowId)!;
  expect(need.need_state).toBe('CONDITION_REQUIRED');expect(need.missing_parameter_ids).toContain(protection.scopeParameterId);expect(need.quantity).toBeNull();
 });
 it('keeps a known applicable masking method with missing material quantity QUANTITY_REQUIRED',async()=>{
  const r=await compileCurrentConsumer(currentConsumerFacts(),currentCm11FixtureR951,confirmed(protection.maskRequiredValue));
  const need=r.preliminaryNeeds.find(row=>row.row_id===protection.rowId)!;expect(need.need_state).toBe('QUANTITY_REQUIRED');
  expect(need.missing_parameter_ids).toContain(protection.quantityParameterId);expect(need.missing_parameter_ids).not.toContain(protection.scopeParameterId);
 });
 it('excludes masking only after explicit trusted no-adjacent-elements observation without supplying zero or a fake roll',async()=>{
  const r=await compileCurrentConsumer(currentConsumerFacts(),currentCm11FixtureR951,confirmed(protection.noneConfirmedValue));
  expect(r.rows.some(row=>row.row_id===protection.rowId)).toBe(false);expect(r.preliminaryNeeds.some(row=>row.row_id===protection.rowId)).toBe(false);
  expect(r.parameters[protection.scopeParameterId]).toBe(protection.noneConfirmedValue);expect(r.parameters[protection.quantityParameterId]).toBeUndefined();
 });
 it('refuses user-injected protected no-mask scope through the existing source-managed parameter authority guard',async()=>{
  await expect(compileCurrentConsumer({...currentConsumerFacts(),[protection.scopeParameterId]:protection.noneConfirmedValue})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'source-managed parameter cannot be submitted '+protection.scopeParameterId});
 });
 it('does not let a manual material quantity and price hide the missing actual applicability condition',async()=>{
  const d=currentConsumerDefinition(),r=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:currentConsumerPack.contract,
   primaryMeasureParameterId:'floor_area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
   submittedParameters:currentConsumerFacts(),confirmedParameters:{},rowOverrides:{[protection.rowId]:{quantity:'10',unitPrice:'42',provenance:{kind:'manual',reason:'Explicit material edit does not confirm survey'}}},
   currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash});
  expect(r.preliminaryNeeds.find(row=>row.row_id===protection.rowId)?.need_state).toBe('CONDITION_REQUIRED');
 });
 it('uses only an exclusive zero bound for an applicable material need and never invents a one-roll norm',()=>{
  const d=currentConsumerDefinition(),row=d.resources.find(row=>row.row_id===protection.rowId)!,f=d.formulas.find(f=>f.formula_id===row.formula_id)!,
   bounds=parseCanonicalFormulaOutputBoundsV1(row.resource_graph.formulaOutputBoundsV1,row.unit_id,f.output_unit_id,row.row_id);
  if(!bounds)throw Error('CM11_CT17_MASKING_BOUNDS_REQUIRED');expect(bounds.exclusiveMinimum).toBe(0);expect(bounds.minimum).toBeUndefined();
  expect(()=>validateCanonicalFormulaOutputBoundsV1(bounds,'0',row.row_id)).toThrow();
  expect(validateCanonicalFormulaOutputBoundsV1(bounds,'0.01',row.row_id).status).toBe('PASSED');
  expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(['priming','cleaning'].map(o=>'cm11-ce40-kz-whole-floor:operation:'+o));
 });
});


import {buildCanonicalRevisionCommitPayload} from '../backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
it('CM11 current missing CT17 masking scope survives the existing Core commit cold artifact mapper as its own PDF refusal',async()=>{
 const compiled=await compileCurrentConsumer(currentConsumerFacts()),evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'TEST_ONLY_CM11_R3_RELEASE',definitionVersionId:'TEST_ONLY_CM11_R3_DEFINITION',
  passport:{definition_version_id:'TEST_ONLY_CM11_R3_DEFINITION',payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:currentConsumerExpectations()}}});
 if(!evidence)throw Error('CM11_R3_INDEPENDENT_SAVED_EVIDENCE_REQUIRED');
 const checksum=createHash('sha256').update(canonicalEstimateStableJson({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence})).digest('hex'),
  commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:currentConsumerPack.contract,
   parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:currentConsumerFacts(),parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence}),
  saved={id:'TEST_ONLY_CM11_R3_REVISION',release_id:'TEST_ONLY_CM11_R3_RELEASE',definition_version_id:'TEST_ONLY_CM11_R3_DEFINITION',catalog_id:pack.catalogId,
   row_count:compiled.rows.length,currency_code:'KGS',checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},
  resources=[...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)],before=canonicalEstimateStableJson({saved,resources}),
  cold:unknown=JSON.parse(JSON.stringify({saved,resources}));
 const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 if(!record(cold)||!record(cold.saved)||!Array.isArray(cold.resources)||!cold.resources.every(record))throw Error('CM11_R3_COLD_ARTIFACT_SHAPE_REQUIRED');
 const mask=cold.resources.find(row=>row.row_id===currentConsumerPack.adjacentProtection.rowId);expect(mask).toMatchObject({need_state:'CONDITION_REQUIRED'});
 const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:cold.saved,resources:cold.resources});expect(gate.pdfAllowed).toBe(false);
 expect(gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:currentConsumerPack.adjacentProtection.rowId});
 expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));
 expect(canonicalEstimateStableJson(cold)).toBe(before);
});
