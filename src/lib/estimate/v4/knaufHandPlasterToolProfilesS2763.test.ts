import {overlayS2763KnaufHandPlasterToolProfiles as overlay} from '../../../../scripts/estimate/r4a13/s2763KnaufHandPlasterToolProfilesOverlay';
import {knaufHandPlasterToolProfilesPackS2763 as pack} from './knaufHandPlasterToolProfilesS2763';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublicResourcePresentationV1,parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/knauf-hand-plaster-tool-profiles-five-parents-s27-63.json')as{sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
// Explicit synthetic facts copied from the protected prior API control.
const facts={q:'35.5',interior_plaster_material_system:'Ротбанд вручную, 10 мм по бетону',betogrund_primer_state:'Грунтование ещё нужно',betogrund_actual_area_m2:'30',betogrund_package_kg:'15',betogrund_usable_stock_kg:'0',betogrund_retained_reserve_kg:'0',betogrund_bucket_multiple:'1',rotband_usable_stock_kg:'0',rotband_retained_reserve_kg:'0',rotband_bag_multiple:'1',krer15_manual_norm_basis:'КРЕР Кыргызской Республики применимы к этой смете',krer15_manual_conditions:'Условия ниже проверены и подходят',krer15_manual_area_scope:'Указанная площадь соответствует правилам ниже',knauf_scope_beacon_method:'Без маяков с проверкой плоскости',knauf_scope_external_corner_scope:'В этом участке нет внешних углов',knauf_scope_reinforcement_scope:'Подтверждён однородный бетон без стыков и отдельного требования сетки',knauf_scope_additional_abrasive_process:'Выбран описанный влажный процесс без отдельной абразивной обработки'};
const compile=(r:PurchaseGroupRepresentative,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:String(r.parameters[0]!.truth_metadata.contract),parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:facts,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});
const economic=(r:Awaited<ReturnType<typeof compile>>)=>({rows:r.rows.map(row=>[row.row_id,row.unit_id,row.quantity,row.unit_price,row.included_in_estimate,row.included_in_procurement]),needs:r.preliminaryNeeds.map(n=>[n.row_id,n.unit_id])});

test('all565 identities and original calculation data remain exact; only20 requirement presentations are enriched',()=>{
 expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);let owners=0,changed=0;
 for(const parent of fixture.reps){const before=JSON.stringify(parent),r=overlay(parent).representative;expect(JSON.stringify(parent)).toBe(before);expect(r.parameters).toEqual(parent.parameters);expect(r.formulas).toEqual(parent.formulas);expect(r.bindings).toEqual(parent.bindings);expect(r.baseline).toEqual(parent.baseline);expect(r.passport).toEqual(parent.passport);expect(r.definition).toEqual(parent.definition);
 for(const old of parent.resources){const row=r.resources.find(p=>p.row_id===old.row_id)!;expect([row.id,row.row_id,row.cost_owner_id,row.unit_id,row.formula_id,row.inclusion_ast,row.procurement_eligible]).toEqual([old.id,old.row_id,old.cost_owner_id,old.unit_id,old.formula_id,old.inclusion_ast,old.procurement_eligible]);
 if(pack.rows.some(p=>p.rowId===old.row_id)){changed++;expect(row.title_ru).toBe(old.title_ru);expect(row.resource_graph.costTreatment).toBe(old.resource_graph.costTreatment);expect(row.source_metadata.sourceNormQuantityAccepted).toBe(false);expect(parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1)).not.toBeNull();}else expect(row).toEqual(old);owners++;}
 }expect(owners).toBe(565);expect(changed).toBe(20);
});

test.each(fixture.reps.map(r=>[String(r.definition.catalog_id),r]as const))('published material/labour/machine economics remain exact: %s',async(_id,parent)=>{
 const r=overlay(parent).representative,before=await compile(parent),after=await compile(r);expect(economic(after)).toEqual(economic(before));expect(after.preliminaryNeeds).toHaveLength(before.preliminaryNeeds.length);
 expect(after.rows.find(row=>row.row_id==='plaster:knauf-materials:rotband-consumed')?.quantity).toBe('301.75');const ceiling=String(parent.definition.catalog_id).includes('_ceiling_');expect(after.rows.find(row=>row.row_id==='plaster:krer15-manual-base:mixer')?.quantity).toBe(ceiling?'0.69225':'0.59285');
 for(const id of pack.rows.map(p=>p.rowId))expect(after.preliminaryNeeds.some(n=>n.row_id===id)).toBe(true);
});

test('source profiles describe10 tools and no consumable norm, quantity or automatic kit acquisition',()=>{
 for(const parent of fixture.reps){const r=overlay(parent).representative;let profiles=0;for(const spec of pack.rows){const row=r.resources.find(p=>p.row_id===spec.rowId)!,profile=row.resource_graph.toolRequirementProfileV1 as {requirements:typeof pack.requirements;sourceEvidence:unknown;consumableSpecificationStatus:string|null;reusePolicy:typeof pack.reusePolicy};profiles+=profile.requirements.length;expect(profile.reusePolicy).toMatchObject({quantityNorm:null,purchaseNorm:null,wearNorm:null,automaticAcquisitionCount:null,costOwnerMergeAllowed:false,automaticOverheadInclusionAllowed:false});if(spec.profileKeys.length===0){expect(profile.sourceEvidence).toBeNull();expect(profile.consumableSpecificationStatus).toBe('NOT_CONFIRMED');}}
 expect(profiles).toBe(10);
 }
});

test('ceiling application uses a hawk; alternative wall tools and conditional finishing stages are explicit',()=>{
 for(const parent of fixture.reps){const row=overlay(parent).representative.resources.find(p=>p.row_id==='plaster:knauf-materials:open-hand-tool')!,display=parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1)!;
 if(String(parent.definition.catalog_id).includes('_ceiling_'))expect(display.detailsRu[0]).toContain('Кельма не считается');else expect(display.detailsRu[0]).toContain('Альтернативы не означают');expect(display.detailsRu.some(d=>d.includes('Разравнивание'))).toBe(true);expect(display.detailsRu.some(d=>d.includes('Подрезка'))).toBe(true);expect(display.detailsRu.some(d=>d.includes('Q2/Q3'))).toBe(true);expect(display.detailsRu.some(d=>d.includes('рекомендация'))).toBe(true);
 }
});

test('manual names override presentation; stock and manual price inputs keep their original semantics',async()=>{
 const parent=fixture.reps[0]!,r=overlay(parent).representative,row=r.resources.find(p=>p.row_id==='plaster:knauf-materials:open-mixing-container')!;
 expect(canonicalPublicResourcePresentationV1({titleRu:row.title_ru,descriptor:row.resource_graph.publicResourcePresentationV1,manualTitleOverride:true})).toBeNull();
 const extra={submittedParameters:{...facts,rotband_usable_stock_kg:'17',rotband_retained_reserve_kg:'3'},rowOverrides:{[row.row_id]:{titleRu:'Наш бак для бригады',unitPrice:'17.25',provenance:{kind:'manual' as const,reason:'SYNTHETIC_CONTROL'}}}};const before=await compile(parent,extra),after=await compile(r,extra);expect(economic(after)).toEqual(economic(before));const oldNeed=before.preliminaryNeeds.find(n=>n.row_id===row.row_id)!,newNeed=after.preliminaryNeeds.find(n=>n.row_id===row.row_id)!;expect(newNeed).toMatchObject({title_ru:oldNeed.title_ru,unit_price:oldNeed.unit_price});expect(oldNeed.title_ru).toBe('Наш бак для бригады');expect(newNeed.unit_price).toBe('17.25');
});
