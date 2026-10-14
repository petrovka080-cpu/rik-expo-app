import pack from '../../../../data/estimate-benchmarks/source-packs/pvc-floor-complete-four-s27-69.json';
import {buildPvcFloorCompleteFourS2769 as build,compilePvcFloorCompleteFourS2769 as compile,pvcFloorFreshDefaultsS2769 as defaults} from './pvcFloorCompleteFourS2769';
import {canonicalApprovedBaselineRuntimeParameters as baseline} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {assertFloorPreparationRecalculationChoiceS2769 as choice} from '../backendPlatform/canonicalFloorPreparationIntentS2769';
import {FLOOR_DEMOLITION_SERIES_S2752 as waste} from './floorDemolitionSeriesS2752';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Model} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
type CoreInput=Parameters<typeof compileCanonicalEstimateCore>[0];
const frozen=require('../../../../data/estimate-benchmarks/fixtures/pvc-floor-four-parents-s27-69.json') as {models:Model[]};
const facts=()=>({floor_covering_area_m2:35.5,[pack.materialId]:true,[pack.barrierAreaId]:12,[pack.siteConditionId]:pack.ordinarySiteValue,[pack.siteConditionBasisId]:'Акт обследования ПВХ-1; участок осмотрен, специальные меры не требуются',[pack.conditionsId]:pack.conditionsValue});
const decisions=(r:Awaited<ReturnType<typeof compile>>)=>r.preliminaryNeeds.map(n=>(n.calculation_trace as {resourceGraph:{scopeRequirementDecisionV1:{status:string;rowId:string}}}).resourceGraph.scopeRequirementDecisionV1).filter(Boolean);
test.each(frozen.models)('complete selected ordinary branch, exact33/100 and no demolition machine: $definition.catalog_id',async p=>{
 const r=await compile(p,facts());expect(r.rows).toHaveLength(17);
 expect(r.rows.find(x=>x.row_id.endsWith(':labor')&&x.row_id.startsWith('f09:aggressive_'))?.quantity).toBe('11.715');
 expect(r.rows.find(x=>x.row_id.endsWith(':vacuum'))?.quantity).toBe('3.55');
 expect(r.rows.find(x=>x.row_id==='f09:temporary_vertical_protective_barrier_board_frame:labor')?.quantity).toBe('6.2928');
 expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(9);
 expect(r.rows.filter(x=>(x.calculation_trace as {resourceGraph:{costTreatment:string}}).resourceGraph.costTreatment==='OWN_COST')).toHaveLength(12);
 expect(r.rows.every(x=>x.unit_price==null)).toBe(true);
 expect(decisions(r).map(d=>d.status).sort()).toEqual(['COMPLETED','COMPLETED','INCLUDED','INCLUDED','INCLUDED']);
 expect(r.rows.some(x=>x.row_id.includes('compressor')||x.row_id.includes('hammer'))).toBe(false);
});
test('fresh runtime contains no fixture site facts, accepted source profile is hidden',()=>{
 const r=build(frozen.models[0]!),approved=baseline(r.baseline);expect(approved).toEqual({...defaults,[pack.profileId]:pack.profileValue});
 expect(r.parameters.find(p=>p.parameter_id===pack.profileId)?.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
 for(const id of [pack.siteConditionId,pack.siteConditionBasisId,pack.materialId,pack.barrierAreaId,'floor_covering_area_m2'])expect(approved).not.toHaveProperty(id);
 expect(r.passport.decision.quantityScope).toBe('PARTIAL');expect(r.passport.decision.independentCompletenessMap.generatedFromCurrentRows).toBe(false);
 const haul=r.passport.decision.independentCompletenessMap.entries.find((e:{operationId:string})=>e.operationId==='offsite_waste_haul');expect(haul.resolution.kind).toBe('CONDITIONAL_PROJECT_SCOPE');
});
test.each([undefined,pack.unknownSiteValue,pack.specialSiteValue])('unknown or special conditions never close full scope: %s',async value=>{
 const input:Record<string,unknown>=facts();if(value===undefined)delete input[pack.siteConditionId];else input[pack.siteConditionId]=value;
 const r=await compile(frozen.models[0]!,input);expect(decisions(r).find(d=>d.rowId.endsWith(':conditions'))?.status).toBe(value===pack.specialSiteValue?'SCOPE_UNVERIFIED':'OBJECT_FACT_REQUIRED');
 expect(decisions(r).some(d=>!['COMPLETED','INCLUDED'].includes(d.status))).toBe(true);expect(r.rows.some(x=>x.row_id.startsWith('dust:')||x.row_id.startsWith('f09:temporary_vertical'))).toBe(false);
});
test.each([pack.materialId,pack.siteConditionBasisId])('missing essential fact remains visible: %s',async id=>{
 const input:Record<string,unknown>=facts();delete input[id];const r=await compile(frozen.models[0]!,input);
 expect(decisions(r).find(d=>d.rowId.endsWith(':conditions'))?.status).toBe('OBJECT_FACT_REQUIRED');
 expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(id))).toBe(true);
});
test('an unknown survey or stage basis is not evidence of applicability or completed work',async()=>{
 const p=frozen.models[0]!,r=await compile(p,{...facts(),[pack.siteConditionBasisId]:'неизвестно'});
 expect(decisions(r).find(d=>d.rowId.endsWith(':conditions'))?.status).toBe('OBJECT_FACT_REQUIRED');
 const s=pack.stages[0]!,provided=await compile(p,{...facts(),[s.id]:s.provided,[s.evidenceId]:'не знаю'});
 expect(decisions(provided).find(d=>d.rowId.endsWith(':protection'))?.status).toBe('SCOPE_UNVERIFIED');
});
test('known floor area is reused by vacuum; barrier area is independent',async()=>{
 const p=frozen.models[0]!,a=await compile(p,facts()),b=await compile(p,{...facts(),floor_covering_area_m2:71});
 expect(b.rows.find(x=>x.row_id.endsWith(':vacuum'))?.quantity).toBe('7.1');
 expect(b.rows.find(x=>x.row_id==='f09:temporary_vertical_protective_barrier_board_frame:labor')?.quantity).toBe(a.rows.find(x=>x.row_id==='f09:temporary_vertical_protective_barrier_board_frame:labor')?.quantity);
});
test.each(frozen.models)('legacy preserves physical owners but exposes four open checks and verifies retained demolition: $definition.catalog_id',async p=>{
 expect(()=>choice({catalogId:String(p.definition.catalog_id),parentParameters:p.baseline.input_values,submittedParameters:{floor_covering_area_m2:36}})).toThrow('Выберите состав');
 const r=await compile(p,{...p.baseline.input_values,[pack.modeId]:pack.legacyMode});expect(r.rows).toHaveLength(2);
 expect(r.rows.map(x=>[x.row_id,x.quantity])).toEqual([[p.resources[0]!.row_id,'35.5'],[p.resources[1]!.row_id,'11.715']]);
 expect(decisions(r)).toHaveLength(5);expect(decisions(r).filter(d=>!['COMPLETED','INCLUDED'].includes(d.status))).toHaveLength(4);
});
test.each(['provided','covered','notRequired'] as const)('nonpayable stages need their own basis: %s',async state=>{
 const input={...facts(),...Object.fromEntries(pack.stages.map(s=>[s.id,s[state]]))},p=frozen.models[0]!;
 const missing=await compile(p,input);expect(decisions(missing).filter(d=>['protection','dedusting'].some(k=>d.rowId.endsWith(':'+k))).every(d=>d.status==='SCOPE_UNVERIFIED')).toBe(true);
 const r=await compile(p,{...input,...Object.fromEntries(pack.stages.map(s=>[s.evidenceId,'Акт этапа1 / смета Б-4 и отдельный владелец стоимости']))});
 expect(r.rows).toHaveLength(3);expect(decisions(r).filter(d=>d.status==='COMPLETED')).toHaveLength(4);expect(decisions(r).find(d=>d.rowId.endsWith(':demolition'))?.status).toBe('INCLUDED');
});
test.each([pack.otherBarrierValue,pack.otherDustValue])('other method remains app-owned scope gap: %s',async method=>{
 const id=method===pack.otherBarrierValue?pack.barrierMethodId:pack.dustMethodId,r=await compile(frozen.models[0]!,{...facts(),[id]:method});
 expect(decisions(r).some(d=>d.status==='SCOPE_UNVERIFIED')).toBe(true);
 await expect(compile(frozen.models[0]!,{...facts(),[slotId()]:1})).rejects.toThrow();
});
function slotId(){return 'pvc_floor_protection_scope_application';}

test.each([waste.contractorModeValue,waste.onSiteExtraModeValue])('additional service requires independent mass and the complete agreed scope: %s',async mode=>{
 const p=frozen.models[0]!,input={...facts(),[pack.wasteModeId]:mode};
 const missing=await compile(p,input);expect(missing.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('pvc_floor_floor_waste_mass_t'))).toBe(true);
 const r=await compile(p,{...input,pvc_floor_floor_waste_mass_t:0.75,pvc_floor_haul_distance_km:12,pvc_floor_waste_service_coverage:waste.coverageValue,
  pvc_floor_transport_designation:'Автомобиль исполнителя, единый владелец услуги',pvc_floor_waste_packaging_description:'Принятая тара по спецификации ПВХ-4',
  pvc_floor_waste_receiver_designation:'Место приёма по спецификации ПВХ-4',pvc_floor_waste_service_specification_ref:'ПВХ-4, полная услуга по согласованному составу',
  pvc_floor_waste_lowering_loading_scope:'Требуемые тара, отдельный спуск и погрузка вне включённого КРЕР, труд и перевозка входят в единую цену услуги'});
 expect(r.rows).toHaveLength(18);const services=r.rows.filter(x=>x.row_id.endsWith(':waste-service')||x.row_id.endsWith(':waste-onsite-service'));
 expect(services).toHaveLength(1);expect(services[0]!.quantity).toBe('0.75');expect(services[0]!.unit_price).toBeNull();expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(10);
 expect(decisions(r).every(d=>['INCLUDED','COMPLETED'].includes(d.status))).toBe(true);
});
async function selected(excludedRowIds:string[]|undefined,rowOverrides:Record<string,Record<string,unknown>>={}){
 const p=frozen.models[0]!,r=build(p);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:String(p.definition.catalog_id),primaryMeasureParameterId:'floor_covering_area_m2',
  parameterDefinitions:r.parameters as unknown as CoreInput['parameterDefinitions'],formulaDefinitions:r.formulas as unknown as CoreInput['formulaDefinitions'],resourceDefinitions:r.resources as unknown as CoreInput['resourceDefinitions'],submittedParameters:facts(),confirmedParameters:baseline(r.baseline),currencyCode:'KGS',priceItems:[],
  ...(excludedRowIds?{compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedRowIds,excludedOperationKeys:[]}}:{}),rowOverrides,maximumResourceRows:r.resources.length,hashJson:estimateDeterministicHash});
}
test.each([
 ['f09:aggressive_environment_polyvinyl_chloride_sheet_roll_floor_demolition:labor','demolition'],
 ['f09:temporary_vertical_protective_barrier_board_frame:labor','protection'],
 ['dust:industrial-vacuum:krer13-06-004-01:vacuum','dedusting'],
])('excluded mandatory resource stays a visible scope gap: %s',async(id,key)=>{
 const r=await selected([id!]);expect(decisions(r).find(d=>d.rowId.endsWith(':'+key))?.status).toBe('REQUIRED_RESOURCE_EXCLUDED');
});
test('applicability check cannot be excluded as a subwork',async()=>{
 await expect(selected(['pvc-floor-complete:check:conditions'])).rejects.toThrow('Проверку системы и применимости норм нельзя исключить');
});
test('excluded historical labor keeps an independent manual price in the successor',async()=>{
 const id='f09:aggressive_environment_polyvinyl_chloride_sheet_roll_floor_demolition:labor';
 const r=await selected(undefined,{[id]:{unitPrice:'125',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'Контроль переноса пользовательской цены'}}});
 const labor=r.rows.find(x=>x.row_id===id)!;expect(labor.quantity).toBe('11.715');expect(labor.unit_price).toBe('125');expect(labor.included_in_estimate).toBe(false);expect(r.compositionSelectionV1).toBeUndefined();expect(decisions(r).find(d=>d.rowId.endsWith(':demolition'))?.status).toBe('REQUIRED_RESOURCE_EXCLUDED');
});
test.each([
 ['f09:temporary_vertical_protective_barrier_board_frame:labor','protection'],['dust:industrial-vacuum:krer13-06-004-01:vacuum','dedusting'],
])('ordinary cost toggle keeps mandatory coverage open without changing physical quantity: %s',async(id,key)=>{
 const r=await selected(undefined,{[id!]:{includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}});
 expect(Number(r.rows.find(x=>x.row_id===id)!.quantity)).toBeGreaterThan(0);expect(decisions(r).find(d=>d.rowId.endsWith(':'+key))?.status).toBe('REQUIRED_RESOURCE_EXCLUDED');
});
