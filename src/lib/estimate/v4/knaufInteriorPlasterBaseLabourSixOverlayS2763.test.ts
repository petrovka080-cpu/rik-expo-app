import {overlayS2763KnaufInteriorPlasterBaseLabour} from '../../../../scripts/estimate/r4a13/s2763KnaufInteriorPlasterBaseLabourOverlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {knaufInteriorPlasterBaseLabourPackS2763 as pack,knaufPlasterLabourPrefixS2763 as prefix,knaufPlasterNormBasisYesS2763,knaufPlasterNormConditionsYesS2763,knaufPlasterNormAreaYesS2763} from './knaufInteriorPlasterBaseLabourS2763';
import {knaufInteriorPlasterPackS2763 as material} from './knaufInteriorPlasterMaterialsS2763';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/knauf-interior-plaster-base-labour-six-parents-s27-63.json') as {sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const locators={wall:'CONTROL_WALL',ceiling:'CONTROL_CEILING',guidance:'CONTROL_GUIDANCE'};
const materialFacts={q:'35.5',interior_plaster_material_system:material.manualChoiceRu,betogrund_primer_state:material.primerNeededRu,betogrund_actual_area_m2:'30',betogrund_package_kg:'15',betogrund_usable_stock_kg:'0',betogrund_retained_reserve_kg:'0',betogrund_bucket_multiple:'1',rotband_usable_stock_kg:'0',rotband_retained_reserve_kg:'0',rotband_bag_multiple:'1'};
const admittedFacts={...materialFacts,krer15_manual_norm_basis:knaufPlasterNormBasisYesS2763,krer15_manual_conditions:knaufPlasterNormConditionsYesS2763,krer15_manual_area_scope:knaufPlasterNormAreaYesS2763};
const compile=(r:PurchaseGroupRepresentative,facts:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:facts,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});

test('six actual successors preserve every old owner/formula/unit and all old guarded facts without rewriting history',()=>{
  expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);let old=0;
  for(const parent of fixture.reps){const before=JSON.stringify(parent),{representative:r,addedRowIds}=overlayS2763KnaufInteriorPlasterBaseLabour(parent,locators),target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id)!;
    expect(JSON.stringify(parent)).toBe(before);expect(r.formulas.slice(0,parent.formulas.length)).toEqual(parent.formulas);
    expect(r.resources.slice(0,parent.resources.length).map(x=>[x.id,x.row_id,x.unit_id,x.formula_id,x.cost_owner_id])).toEqual(parent.resources.map(x=>[x.id,x.row_id,x.unit_id,x.formula_id,x.cost_owner_id]));old+=parent.resources.length;
    expect(addedRowIds).toHaveLength(target.primerOnly?0:5);expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);
    for(const p of parent.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')){const next=r.parameters.find(x=>x.parameter_id===p.parameter_id)!;expect(next.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');expect(next.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');}
    if(!target.primerOnly){expect(canonicalApprovedBaselineRuntimeParameters(r.baseline)).toEqual({});expect(r.parameters.find(p=>p.parameter_id==='q')?.title_ru).toBe('Площадь штукатурки этого участка, м²');}
    expect(r.resources.some(x=>x.title_ru.includes('SKU'))).toBe(false);
  }expect(old).toBe(563);
});

test('five manual types use wall or ceiling base norms, independently preserve materials and keep residual work',async()=>{
  for(const parent of fixture.reps.filter(p=>p.resources.length===108)){const r=overlayS2763KnaufInteriorPlasterBaseLabour(parent,locators).representative,result=await compile(r,admittedFacts),ceiling=String(parent.definition.catalog_id).includes('_ceiling_');
    const row=(id:string)=>result.rows.find(x=>x.row_id===prefix+':'+id);
    expect(row('workers')?.quantity).toBe(ceiling?'22.4005':'18.42095');expect(row('loader')?.quantity).toBe(ceiling?'0.01775':'0.0142');expect(row('lift')?.quantity).toBe(ceiling?'0.0639':'0.0568');expect(row('mixer')?.quantity).toBe(ceiling?'0.69225':'0.59285');
    expect(row('operators')?.included_in_estimate).toBe(false);expect(row('operators')?.unit_price).toBeNull();
    expect(result.rows.find(x=>x.row_id==='plaster:knauf-materials:rotband-consumed')?.quantity).toBe('301.75');expect(result.rows.find(x=>x.row_id==='plaster:knauf-materials:betogrund-consumed')?.quantity).toBe('7.5');
    expect(result.rows.find(x=>x.row_id==='plaster:knauf-materials:rotband-30kg-order')?.quantity).toBe('330');expect(result.rows.find(x=>x.row_id==='plaster:knauf-materials:betogrund-15kg-order')?.quantity).toBe('15');
    expect(result.rows.filter(x=>x.included_in_estimate)).toHaveLength(6);expect(result.rows.filter(x=>x.included_in_estimate).every(x=>x.unit_price==null)).toBe(true);
    for(const id of ['main-labour','preparation','logistics','mixing-tool','water','primer-labour','cleanup'])expect(result.preliminaryNeeds.some(n=>n.row_id==='plaster:knauf-materials:open-'+id)).toBe(true);
  }
});

test('missing or incompatible applicability never activates a base norm or blocks independently known material quantities',async()=>{
  const r=overlayS2763KnaufInteriorPlasterBaseLabour(fixture.reps[0]!,locators).representative;
  for(const [key,unknown] of [['krer15_manual_norm_basis','Применимость КРЕР пока не подтверждена'],['krer15_manual_conditions','Условия пока не проверены'],['krer15_manual_area_scope','Площадь ещё не проверена по этим правилам']])for(const value of [undefined,unknown]){
    const facts:Record<string,unknown>={...admittedFacts,[key]:value};if(value===undefined)delete facts[key];
    const result=await compile(r,facts);expect(result.rows.some(x=>x.row_id.startsWith(prefix))).toBe(false);
    expect(result.rows.find(x=>x.row_id==='plaster:knauf-materials:rotband-consumed')?.quantity).toBe('301.75');
  }
  const other=await compile(r,{...admittedFacts,krer15_manual_conditions:'Есть отличия от условий ниже'});expect(other.rows.some(x=>x.row_id.startsWith(prefix))).toBe(false);expect(other.preliminaryNeeds.some(n=>n.row_id==='plaster:knauf-materials:open-main-labour')).toBe(true);
});

test('standard mechanized15mm type receives no manual norms, and legacy manual branches retain old identities',async()=>{
  const standard=fixture.reps.find(r=>r.resources.length===23)!,r=overlayS2763KnaufInteriorPlasterBaseLabour(standard,locators).representative;
  expect(r.formulas).toEqual(standard.formulas);expect(r.parameters.map(p=>p.parameter_id)).toEqual(standard.parameters.map(p=>p.parameter_id));expect(r.bindings).toEqual(standard.bindings);expect(r.resources.some(x=>x.row_id.startsWith(prefix))).toBe(false);
  const manual=overlayS2763KnaufInteriorPlasterBaseLabour(fixture.reps[0]!,locators).representative,result=await compile(manual,{...admittedFacts,interior_plaster_material_system:material.legacyChoiceRu});expect(result.rows.some(x=>x.row_id.startsWith(prefix))).toBe(false);
});

test('old unresolved labour quotes and manual edits remain preserved but never become a new norm quote',async()=>{
  const parent=fixture.reps[0]!,r=overlayS2763KnaufInteriorPlasterBaseLabour(parent,locators).representative,old=parent.resources.find(x=>x.row_id==='plaster:knauf-materials:open-main-labour')!;
  await expect(compile(r,admittedFacts,{rowOverrides:{[old.row_id]:{quantity:'7.25',provenance:{kind:'manual',reason:'CONTROL_ONLY'}}}})).rejects.toThrow('source-owned norm quantity cannot be replaced');
  const result=await compile(r,admittedFacts,{rowOverrides:{[old.row_id]:{titleRu:'Сохранённая ручная отделка',unitPrice:'91.23',provenance:{kind:'manual',reason:'CONTROL_ONLY'}}},priceItems:[{price_key:old.cost_owner_id,unit_id:old.unit_id,currency_code:'KGS',unit_price:'123.45',snapshot_id:'CONTROL_OLD_PRICE'}]});
  expect(result.rows.find(x=>x.row_id===prefix+':workers')?.unit_price).toBeNull();expect(result.preliminaryNeeds.some(n=>n.row_id===old.row_id)).toBe(true);
});
