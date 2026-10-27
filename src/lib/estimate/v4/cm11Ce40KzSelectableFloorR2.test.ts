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
