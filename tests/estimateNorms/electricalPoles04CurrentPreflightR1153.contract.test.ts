import type {ElectricalPoles04kvCanonicalParentR1117} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import s from '../../data/estimate-benchmarks/source-packs/electrical-poles-04kv-whole-current-r1117-r1.json';
import {electricalPoles04kvWholeOrdinaryMaterializerInputR1117} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {CanonicalParameterValidationError,assertCanonicalSubmittedSourceParameterAuthorityV1,validateCanonicalEstimateParameters} from '../../src/lib/estimate/backendPlatform/parameterConstraints';
import {compileFormulaGraph,evaluateFormulaGraph} from '../../src/lib/estimate/backendPlatform/formulaGraph';
type Json=Record<string,any>;
const stableHash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const parent=():ElectricalPoles04kvCanonicalParentR1117=>{
 const formulas=s.currentNative.formulas.map(formula=>{
  const graph=compileFormulaGraph(formula.expression_source);
  expect(graph.ast).toEqual(formula.ast);
  expect(graph.inputParameterIds).toEqual(formula.input_parameter_ids);
  const typed={...formula,ast:graph.ast,input_parameter_ids:[...graph.inputParameterIds]};
  expect(typed).toEqual(formula);expect(stableHash(typed)).toBe(stableHash(formula));
  return typed;
 });
 const body={...s.currentNative,formulas};
 expect(body).toEqual(s.currentNative);expect(stableHash(body)).toBe(stableHash(s.currentNative));
 return {header:s.currentHeader,body};
};
const formulaSource=(formula:{formula_id:string;expression_source?:string})=>{
 if(typeof formula.expression_source!=='string')throw Error('EXACT_FORMULA_SOURCE_REQUIRED:'+formula.formula_id);
 return formula.expression_source;
};
const final=()=>electricalPoles04kvWholeOrdinaryMaterializerInputR1117(parent());
describe('Poles04 current public guide exact native final R1153 — authored UNRUN',()=>{
 it('R1153-01 freshcurrent6/63native and55parts13needs give100/131/map68 final',()=>{expect([s.currentNative.parameters.length,s.currentNative.formulas.length,s.currentNative.resources.length]).toEqual([6,63,63]);expect(s.parts.length+s.unresolvedNeeds.length).toBe(68);const r=final();expect([r.definition.parameters.length,r.definition.formulas.length,r.definition.resources.length,r.independentCompletenessMap.entries.length]).toEqual([100,131,131,68]);});
 it('R1153-02 all77newpublicmethod/spec guides meet actualPGcontract without claimingnormdate/actualobject',()=>{const d=final().definition,ids=[s.fields.method,...s.parameterSpecs.map(p=>p.id)];expect(ids).toHaveLength(77);for(const id of ids){const g=d.parameters.find(p=>p.parameter_id===id)!.truth_metadata.guide as Json;expect(g.source_snapshot_hash).toBe('11e582798496f47b3642d6c7ba1524176721592f272073e162fd7baacac5d032');expect(g.applicability).toContain('source-review');expect(Number.isFinite(Date.parse(g.verified_at))).toBe(true);expect(g.guide_short_ru).toBeTruthy();expect(g.source_role).toBeTruthy();expect(g.guide_kind).toBe('PROJECT_DEFINED');}});
 it('R1153-03 onlypreviouslyauthorised2protectednativeexpressions differ, other61originalobjects retained',()=>{const d=final().definition,ids=new Set(s.retainedUnboundNativeQuantities.map(v=>v.formulaId));expect(ids.size).toBe(2);for(const f of s.currentNative.formulas){const current=d.formulas.find(v=>v.formula_id===f.formula_id)!;if(ids.has(f.formula_id)){const binding=s.retainedUnboundNativeQuantities.find(v=>v.formulaId===f.formula_id)!;expect(current.expression_source).toBe(binding.parameterId);}else expect(current).toEqual(f);}expect(d.resources.slice(0,63).map(r=>[r.row_id,r.unit_id,r.cost_owner_id])).toEqual(s.currentNative.resources.map(r=>[r.row_id,r.unit_id,r.cost_owner_id]));});
 it('R1153-04 mandatoryscope104/25exactunion129/notruncation andalloldfacts remain',()=>{const groups=final().definition.resources.filter(r=>r.resource_graph?.scopeRequirementV1).map(r=>(r.resource_graph.scopeRequirementV1 as Json));expect(groups.map(g=>g.originalRowIds.length)).toEqual([104,25]);expect(new Set(groups.flatMap(g=>g.originalRowIds)).size).toBe(129);expect(groups.every(g=>g.kind==='OBJECT_SCOPE'&&g.originalRowIds.length<=128)).toBe(true);});
 it('R1153-05 actualsharedinteger+1 accepted but string1.0 rejectswithoutcoercion',()=>{const d=final().definition,validate=(v:unknown)=>{const input={[s.fields.pole_count]:v};assertCanonicalSubmittedSourceParameterAuthorityV1(d.parameters,input);return validateCanonicalEstimateParameters(d.parameters,input,{baselineContext:{catalogId:s.catalogId}});};expect(()=>validate('+1')).not.toThrow();expect(()=>validate('1.0')).toThrow(CanonicalParameterValidationError);});
 it('R1153-06 exactIMWScompatibleintersection doesnotadmitdiameterbelow11mm',()=>{const d=final().definition;expect(()=>validateCanonicalEstimateParameters(d.parameters,{[s.fields.messenger_diameter_mm]:'10.999999999'},{baselineContext:{catalogId:s.catalogId}})).toThrow(CanonicalParameterValidationError);});
 it('R1153-07 sourceST31twowedgesperactualtoolkit isnotoneperpole/newtoolpurchase',()=>{const d=final().definition,part=s.parts.find(p=>p.key.includes('wedge'))!;expect(part).toBeTruthy();const f=d.formulas.find(f=>f.formula_id===s.prefix+':formula:'+part.key)!;expect(f.expression_source).toBe(part.expression);expect(Number(evaluateFormulaGraph(compileFormulaGraph(formulaSource(f)),{[s.fields.toolkits_deployed]:2}))).toBe(4);const r=d.resources.find(r=>r.row_id===s.prefix+':'+part.key)!;expect(r.cost_owner_id).toBeNull();expect(r.procurement_eligible).toBe(false);});
 it('R1153-08 all260classes13needs17returns remainSOURCEHOLD/notfullbygrowingguides',()=>{const r=final(),classes=r.independentCompletenessMap.operationRequirements.flatMap(o=>Object.values(o.requirements))as Json[];expect(classes).toHaveLength(260);expect(classes.every(v=>v.status==='UNRESOLVED')).toBe(true);expect(s.unresolvedNeeds).toHaveLength(13);expect(s.returnWhen).toHaveLength(17);expect(r.sourceRegistryAdmission).toBeNull();expect(r.newReady).toBe(false);expect(r.fullTechnicalAcceptance).toBe(false);});
 it('R1153-09 wrongcurrentparentheader rejected and unresolvedsourcegate notconsumerapproval',()=>{const p=parent();p.header={...p.header,definition_sha256:'f'.repeat(64)};expect(()=>electricalPoles04kvWholeOrdinaryMaterializerInputR1117(p)).toThrow('ELECTRICAL_POLES_04KV_EXACT_CURRENT_R1117_HEADER_REQUIRED');const d=final().definition;expect(()=>assertCanonicalSubmittedSourceParameterAuthorityV1(d.parameters,{[s.fields.method_source_gate]:'SYNTHETIC_APPROVAL'})).toThrow(CanonicalParameterValidationError);});
});
// R1153 exact OEM whole manual path; all quantities remain synthetic evaluations.
describe('Poles04 exact complete manual ratchet BOM source successor R1153 — authored UNRUN',()=>{
 it('R1153-10 one complete13/17ratchet has no extra mandatory socket or secondtoolperwrenchsize',()=>{
  const r=final(),part=s.parts.find(p=>p.key==='connector-ratchet');if(!part)throw Error('EXACT_MANUAL_RATCHET_PART_REQUIRED');
  expect(part.titleRu).toBe('Ключ-трещотка 13/17 мм для контактного зажима');expect(part.titleRu).not.toMatch(/Ensto|CT6|643838/i);
  expect(s.current150ManualToolDispositionR1153.completeTool.code).toBe('CT6.1317');expect(s.current150ManualToolDispositionR1153.completeTool.gtin).toBe('6438389022025');
  expect(s.current150ManualToolDispositionR1153.completeTool.workingSizesMm).toEqual([13,17]);
  const row=r.definition.resources.find(row=>row.row_id===s.prefix+':connector-ratchet');if(!row)throw Error('COMPLETE_MANUAL_TOOL_ROW_REQUIRED');
  const formula=r.definition.formulas.find(formula=>formula.formula_id===row.formula_id);if(!formula)throw Error('COMPLETE_MANUAL_TOOL_FORMULA_REQUIRED');
  expect(Number(evaluateFormulaGraph(compileFormulaGraph(formulaSource(formula)),{[s.fields.toolkits_deployed]:2}))).toBe(2);
  expect(row.unit_id).toBe('item');expect(row.cost_owner_id).toBeNull();expect(row.procurement_eligible).toBe(false);
  expect(s.parts.some(p=>p.key==='connector-socket')).toBe(false);expect(r.definition.resources.some(row=>row.row_id===s.prefix+':connector-socket')).toBe(false);
  expect(r.independentCompletenessMap.entries.some(entry=>entry.expectedResourceId===s.prefix+':connector-socket')).toBe(false);
  expect(s.scopeGroups.some(group=>group.originalRowIds.includes(s.prefix+':connector-socket'))).toBe(false);
 });
 it('R1153-11 complete shared manualkit is oneholder oneratcht twowedgesperactualJ andmissingJdoesnotdefault',()=>{
  const d=final().definition;
  for(const [key,expected] of [['connector-holder',3],['connector-ratchet',3],['wedge',6]] as const){const formula=d.formulas.find(f=>f.formula_id===s.prefix+':formula:'+key);if(!formula)throw Error('EXACT_MANUAL_TOOL_FORMULA_REQUIRED:'+key);expect(Number(evaluateFormulaGraph(compileFormulaGraph(formulaSource(formula)),{[s.fields.toolkits_deployed]:3}))).toBe(expected);}
  const parameter=d.parameters.find(p=>p.parameter_id===s.fields.toolkits_deployed);if(!parameter)throw Error('ACTUAL_TOOL_COUNT_REQUIRED');expect(parameter.default_value).toBeNull();
  const holder=d.resources.find(row=>row.row_id===s.prefix+':connector-holder'),ratchet=d.resources.find(row=>row.row_id===s.prefix+':connector-ratchet');if(!holder||!ratchet)throw Error('FULL_MANUAL_TOOL_ROWS_REQUIRED');
  for(const row of [holder,ratchet]){expect(row.cost_owner_id).toBeNull();expect(row.procurement_eligible).toBe(false);const operation=row.resource_graph.operationCompositionV1 as {operationId:string;additionalOperations?:{operationId:string}[]};expect([operation.operationId,...(operation.additionalOperations??[]).map(op=>op.operationId)]).toEqual(['contacts','stock'].map(key=>{const op=s.operations.find(op=>op.key===key);if(!op)throw Error('EXACT_OPERATION_REQUIRED:'+key);return op.operationId;}));}
 });
 it('R1153-12 oldunpublishedtoolmethod andrawsourcegate cannot silentlyadmitpoweredpath ornewsourceabsence',()=>{
  const d=final().definition;
  expect(()=>validateCanonicalEstimateParameters(d.parameters,{[s.fields.method]:s.current150ManualToolDispositionR1153.supersededUnpublishedMethodValue},{baselineContext:{catalogId:s.catalogId}})).toThrow(CanonicalParameterValidationError);
  expect(s.proposedBranchLookupCount).toBe(0);expect(s.proposedBranchSourceCapture).toBeNull();expect(final().proposedLookupActualCount).toBe(0);expect(final().currentLookupIsNotFormalCapture).toBe(true);
  expect(s.current150ManualToolDispositionR1153.methodScope).toContain('Powered path needs');
  expect(()=>assertCanonicalSubmittedSourceParameterAuthorityV1(d.parameters,{[s.fields.method_source_gate]:'SYNTHETIC_OEM_OR_SITE_APPROVAL'})).toThrow(CanonicalParameterValidationError);
 });
 it('R1153-13 beforeuselubrication has no fabricatedunitdoseormaintenanceapproval andall13needsremain',()=>{
  const m=s.current150ManualToolDispositionR1153.maintenance;
  expect(m.requiredBeforeUse).toBe(true);expect(m.status).toBe('SOURCE_UNIT_QUANTITY_AND_OBJECT_HOLD');expect([m.material,m.unit,m.quantity,m.actualServicingProof]).toEqual([null,null,null,null]);
  const need=s.unresolvedNeeds.find(n=>n.key==='tool-fit');if(!need)throw Error('WHOLE_TOOLING_HOLD_REQUIRED');expect(need.reasonRu).toContain('No lubricant chemistry');expect(need.reasonRu).toContain('do not invent1kit/ml/oil/grease');
  expect(s.unresolvedNeeds).toHaveLength(13);expect(s.returnWhen).toHaveLength(17);expect(final().fullTechnicalAcceptance).toBe(false);
 });
 it('R1153-14 exactSP19includednailsremainactualcount andpackageisnotnailorwearnorm',()=>{
  const d=final().definition,p=s.parts.find(p=>p.key==='cap-nails');if(!p)throw Error('INCLUDED_NAIL_PART_REQUIRED');
  const f=d.formulas.find(f=>f.formula_id===s.prefix+':formula:'+p.key);if(!f)throw Error('ACTUAL_NAIL_FORMULA_REQUIRED');
  expect(Number(evaluateFormulaGraph(compileFormulaGraph(formulaSource(f)),{[s.fields.cap_nails_installed]:7,[s.fields.pole_count]:2}))).toBe(7);
  expect(s.current150ManualToolDispositionR1153.mountAndNails.nailsPerHat).toBeNull();expect(s.current150ManualToolDispositionR1153.mountAndNails.includedHotDipNails).toBe(true);
  const row=d.resources.find(row=>row.row_id===s.prefix+':cap-nails');if(!row)throw Error('INCLUDED_NAIL_ROW_REQUIRED');expect(row.procurement_eligible).toBe(false);expect(row.resource_graph.physicalProvisionV1).toMatchObject({includedFactoryComponentNotOrderedAgain:true,newPaidOwnerCreated:false});
 });
});
describe('Poles04 exact source trace remains component evidence rather than a quantity norm',()=>{
 it('R1153-15 each corrected OEM tool or cap row retains its own exact primary artifact and no newnormativebinding',()=>{
  const d=final().definition;
  for(const [partKey,sourceKey] of [['connector-ratchet','ensto-ct6-1317-complete-ratchet-current'],['connector-holder','ensto-st34-holding-tool-current'],['pole-cap','ensto-sp19-exact-top-hat-current'],['cap-nails','ensto-sp19-fi-installation-range-current']]){
   const source=s.primarySources.find(source=>source.key===sourceKey),row=d.resources.find(row=>row.row_id===s.prefix+':'+partKey);if(!source||!row)throw Error('EXACT_PRIMARY_AND_ROW_REQUIRED:'+partKey);if(!row.source_metadata)throw Error('EXACT_PRIMARY_METADATA_REQUIRED:'+partKey);
   expect(row.source_metadata.artifact_sha256).toBe(source.sha256);expect(row.source_metadata.primaryOfficialUrl).toBe(source.url);expect(row.source_metadata.normative_source_ids).toEqual([]);expect(row.source_metadata.normativeTrace).toEqual([]);
   expect(row.source_metadata).toMatchObject({manufacturerComponentEvidenceNotQuantityNorm:true,projectQuantitiesStillRequireObjectFacts:true,sourceRegistryAdmission:null,newPaidOwnerCreated:false,actualProjectAuthenticated:false});
  }
 });
 it('R1153-16 absent exact ratchet primary doesnotfall backto handbook orapprove anunproven socket',()=>{
  const index=s.primarySources.findIndex(source=>source.key==='ensto-ct6-1317-complete-ratchet-current');if(index<0)throw Error('EXACT_TEST_SOURCE_REQUIRED');const [source]=s.primarySources.splice(index,1);if(!source)throw Error('EXACT_TEST_SOURCE_REQUIRED');
  try{expect(()=>final()).toThrow('ELECTRICAL_POLES_04KV_EXACT_METHOD_ARTIFACT_REQUIRED:ensto-ct6-1317-complete-ratchet-current');}
  finally{s.primarySources.splice(index,0,source);}
  expect(final().fullTechnicalAcceptance).toBe(false);
 });
});
describe('Poles04 actual current167 parent and SP19 supply boundary — authored UNRUN',()=>{
 it('R1153-17 fresh normalR1target/R2zero carries realreceipt/10raw but no formalsourceadmission',()=>{
  const read=s.currentNormalTargetReadR1153,r=final();
  expect(read.catalogId).toBe(s.catalogId);expect(read.sourceId).toBe(s.proposedBranchSourceKey);expect(read.releaseId).toBe('6df52368-002e-51ea-b11d-39803f3c14c3');
  expect(read.receipt.sha256).toBe('851710e704639415aaacdcb50db8e533fec6d02f566b6ef1bab93169f781739f');expect(read.nativeResult.sha256).toBe('09a40f1e55127843a6d812ac32cc6f50434c79b18100d7db652e38aa0228c17a');
  expect(read.preimage.sha256).toBe(s.currentParentProof.sha256);expect(read.header).toEqual(s.currentHeader);expect(Object.keys(read.rawSets)).toHaveLength(10);expect(read.actualCounts).toEqual({definition:1,baseline:1,parameters:6,formulas:63,resources:63,bindings:0,locators:0,sources:0,newSource:0,identity:1});
  expect([read.transactionRolledBack,read.connectionClosed,read.partialOrTruncated]).toEqual([true,true,false]);expect(r.currentNormalTargetReadR1153).toEqual(read);expect(r.proposedLookupActualCount).toBe(0);expect(r.proposedBranchSourceCapture).toBeNull();expect(r.sourceRegistryAdmission).toBeNull();expect(r.fullTechnicalAcceptance).toBe(false);
 });
 it('R1153-18 other sourcekey or mismatched current preimage cannot reuse the normalR1 absence',()=>{
  const read=s.currentNormalTargetReadR1153,source=read.sourceId,sha=read.preimage.sha256;
  try{read.sourceId='project-system:other-unrelated-source';expect(()=>final()).toThrow('ELECTRICAL_POLES_04KV_FRESH_NORMAL_R1_PARENT_PROOF_REQUIRED');read.sourceId=source;read.preimage.sha256='0'.repeat(64);expect(()=>final()).toThrow('ELECTRICAL_POLES_04KV_FRESH_NORMAL_R1_PARENT_PROOF_REQUIRED');}
  finally{read.sourceId=source;read.preimage.sha256=sha;}
  expect(final().fullTechnicalAcceptance).toBe(false);
 });
 it('R1153-19 SP19supplied3x75mm is distinct from percap1to3 and cannot replace actual installedC',()=>{
  const fact=s.sp19IncludedNailSourceR1153,d=final().definition,part=s.parts.find(p=>p.key==='cap-nails');if(!part)throw Error('INCLUDED_NAIL_PART_REQUIRED');
  expect(fact.suppliedComponentBOM).toMatchObject({nailsPerExactCompleteDeliveredKit:3,nailLengthMm:75,unitId:'item',actualCompleteDeliveredKitCount:null,supplyNotInstalledQuantity:true});
  expect(fact.installationApplicability).toMatchObject({minimumPerCap:1,maximumPerCap:3,actualPerCapRecordRequired:true,aggregateBoundNotSufficient:true,actualInstalledNailCount:null});expect(fact.deliveredKitEditionAccepted).toBe(false);expect(fact.poleReceiptNotDeliveredCapKits).toBe(true);expect(fact.automaticInstalledQuantity).toBeNull();
  const row=d.resources.find(r=>r.row_id===s.prefix+':cap-nails');if(!row)throw Error('INCLUDED_NAIL_ROW_REQUIRED');const formula=d.formulas.find(f=>f.formula_id===row.formula_id);if(!formula)throw Error('ACTUAL_NAIL_FORMULA_REQUIRED');expect(formula.expression_source).toBe(s.fields.cap_nails_installed);expect(row.procurement_eligible).toBe(false);expect(row.cost_owner_id).toBeNull();if(!row.source_metadata)throw Error('INCLUDED_NAIL_METADATA_REQUIRED');expect(row.source_metadata.includedSupplyComponentEvidenceV1).toEqual(fact);expect(s.current150ManualToolDispositionR1153.mountAndNails.nailsPerHat).toBeNull();
  for(const key of [fact.suppliedComponentBOM.sourceKey,fact.installationApplicability.sourceKey]){const source=s.primarySources.find(p=>p.key===key);if(!source)throw Error('EXACT_SP19_PRIMARY_REQUIRED');expect(source.sourceApproval).toBe(false);expect('gtin' in source?source.gtin:null).toBe('6418677405235');}
  expect(s.unresolvedNeeds).toHaveLength(13);expect(s.returnWhen).toHaveLength(17);
 });
});

describe('Poles04 supplied component primary cannot disappear',()=>{
 it('R1153-20 missing exactSVsupply source cannot leave3x75mm attributed onlytoFIrange',()=>{
  const key=s.sp19IncludedNailSourceR1153.suppliedComponentBOM.sourceKey,index=s.primarySources.findIndex(v=>v.key===key);if(index<0)throw Error('EXACT_SP19_SV_SOURCE_REQUIRED');const [source]=s.primarySources.splice(index,1);if(!source)throw Error('EXACT_SP19_SV_SOURCE_REQUIRED');
  try{expect(()=>final()).toThrow('ELECTRICAL_POLES_04KV_EXACT_METHOD_ARTIFACT_REQUIRED:'+key);}
  finally{s.primarySources.splice(index,0,source);}
  expect(final().fullTechnicalAcceptance).toBe(false);
 });
});
