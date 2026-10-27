import {overlayS2763KnaufInteriorPlasterConditionalComposition as overlay} from '../../../../scripts/estimate/r4a13/s2763KnaufInteriorPlasterConditionalCompositionOverlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {knaufInteriorPlasterConditionalCompositionPackS2763 as pack} from './knaufInteriorPlasterConditionalCompositionS2763';
import {knaufInteriorPlasterPackS2763 as material} from './knaufInteriorPlasterMaterialsS2763';
import {knaufPlasterNormBasisYesS2763,knaufPlasterNormConditionsYesS2763,knaufPlasterNormAreaYesS2763} from './knaufInteriorPlasterBaseLabourS2763';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/knauf-interior-plaster-conditional-composition-five-parents-s27-63.json') as {sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const locators=Object.fromEntries(pack.facts.map(f=>[f.key,'CONTROL_'+f.key]));
const facts={q:'35.5',interior_plaster_material_system:material.manualChoiceRu,betogrund_primer_state:material.primerNeededRu,betogrund_actual_area_m2:'30',betogrund_package_kg:'15',betogrund_usable_stock_kg:'0',betogrund_retained_reserve_kg:'0',betogrund_bucket_multiple:'1',rotband_usable_stock_kg:'0',rotband_retained_reserve_kg:'0',rotband_bag_multiple:'1',krer15_manual_norm_basis:knaufPlasterNormBasisYesS2763,krer15_manual_conditions:knaufPlasterNormConditionsYesS2763,krer15_manual_area_scope:knaufPlasterNormAreaYesS2763};
const compile=(r:PurchaseGroupRepresentative,input:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});

test('one five-type overlay preserves565 physical owner identities, formulas and source-managed norm guards',()=>{
  expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);let preserved=0;
  for(const parent of fixture.reps){const before=JSON.stringify(parent),r=overlay(parent,locators).representative;
    expect(JSON.stringify(parent)).toBe(before);expect(r.formulas).toEqual(parent.formulas);
    expect(r.resources.map(x=>[x.id,x.row_id,x.cost_owner_id,x.unit_id,x.formula_id])).toEqual(parent.resources.map(x=>[x.id,x.row_id,x.cost_owner_id,x.unit_id,x.formula_id]));preserved+=r.resources.length;
    expect(r.resources.filter(x=>x.row_id.startsWith('plaster:krer15-manual-base'))).toEqual(parent.resources.filter(x=>x.row_id.startsWith('plaster:krer15-manual-base')));
    expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
    for(const p of parent.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')){const next=r.parameters.find(x=>x.parameter_id===p.parameter_id)!;
      expect(next.default_value).toBeNull();expect(next.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');expect(next.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');}
    for(const fact of pack.facts){const p=r.parameters.find(x=>x.parameter_id===fact.parameterId)!;expect(p.default_value).toBeNull();expect(p.truth_metadata.value_source_role).toBe('PROJECT_SPECIFIC_INPUT');expect(p.truth_metadata.provenance.consumer_input_role_v1).toBe('ADVANCED_OPTION');}
  }expect(preserved).toBe(565);
});

test.each(fixture.reps.map(r=>[String(r.definition.catalog_id),r] as const))('only explicit inapplicability removes four needs, without changing materials or baseline hours: %s',async(_catalog,parent)=>{
  const r=overlay(parent,locators).representative;
  const prior=await compile(parent,facts),unknown=await compile(r,facts);
  const excluded=await compile(r,{...facts,...Object.fromEntries(pack.facts.map(f=>[f.parameterId,f.notApplicableValueRu]))});
  const quantity=(result:typeof prior,id:string)=>result.rows.find(x=>x.row_id===id)?.quantity;
  for(const id of ['plaster:knauf-materials:rotband-consumed','plaster:knauf-materials:betogrund-consumed','plaster:krer15-manual-base:workers','plaster:krer15-manual-base:loader','plaster:krer15-manual-base:lift','plaster:krer15-manual-base:mixer']){
    expect(quantity(unknown,id)).toBe(quantity(prior,id));expect(quantity(excluded,id)).toBe(quantity(prior,id));
  }
  for(const fact of pack.facts){expect(unknown.preliminaryNeeds.some(n=>n.row_id===fact.rowId)).toBe(true);expect(excluded.preliminaryNeeds.some(n=>n.row_id===fact.rowId)).toBe(false);}
  expect(excluded.preliminaryNeeds.length).toBe(prior.preliminaryNeeds.length-4);
  expect(excluded.preliminaryNeeds.some(n=>n.row_id==='plaster:knauf-materials:open-main-labour')).toBe(true);
  expect(excluded.preliminaryNeeds.some(n=>n.row_id==='plaster:knauf-materials:open-primer-labour')).toBe(true);
});

test.each(pack.facts.map(f=>[f.key,f] as const))('positive, unknown, omitted and material-only answers never silently close the %s need',async(_key,fact)=>{
  const r=overlay(fixture.reps[0]!,locators).representative,row=r.resources.find(x=>x.row_id===fact.rowId)!;
  expect(resolveInclusionGraph(row.inclusion_ast,{...facts,[fact.parameterId]:fact.choicesRu[0]}).value).toBe(true);
  expect(resolveInclusionGraph(row.inclusion_ast,{...facts,[fact.parameterId]:fact.choicesRu[2]}).value).toBe(true);
  expect(resolveInclusionGraph(row.inclusion_ast,facts).value).toBeNull();
  for(const answer of [fact.choicesRu[0],fact.choicesRu[2]]){const result=await compile(r,{...facts,[fact.parameterId]:answer});expect(result.preliminaryNeeds.some(n=>n.row_id===fact.rowId)).toBe(true);}
});

test('scope facts do not activate legacy technology or copy to another area; manual prices/names remain independent of applicability',async()=>{
  const r=overlay(fixture.reps[0]!,locators).representative,fact=pack.facts[0]!;
  const legacy=await compile(r,{...facts,interior_plaster_material_system:material.legacyChoiceRu,...Object.fromEntries(pack.facts.map(f=>[f.parameterId,f.notApplicableValueRu]))});
  expect(legacy.rows.some(x=>x.row_id.startsWith('plaster:knauf-materials:'))).toBe(false);
  const row=r.resources.find(x=>x.row_id===fact.rowId)!;
  const result=await compile(r,{...facts,[fact.parameterId]:fact.choicesRu[0]},{rowOverrides:{[fact.rowId]:{titleRu:'Сохранённое название маяка',unitPrice:'91.23',provenance:{kind:'manual',reason:'CONTROL_ONLY'}}},priceItems:[]});
  expect(result.preliminaryNeeds.some(n=>n.row_id===fact.rowId)).toBe(true);
  expect(result.preliminaryNeeds.find(x=>x.row_id===fact.rowId)?.title_ru).toBe('Сохранённое название маяка');
  expect(result.preliminaryNeeds.find(x=>x.row_id===fact.rowId)?.unit_price).toBe('91.23');
  expect(row.cost_owner_id).toBe(fixture.reps[0]!.resources.find(x=>x.row_id===fact.rowId)!.cost_owner_id);
  expect(resolveInclusionGraph(row.inclusion_ast,{...facts,q:'20'}).value).toBeNull();
});
