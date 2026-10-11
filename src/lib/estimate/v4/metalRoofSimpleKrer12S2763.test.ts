import {overlayS2763MetalRoofSimpleKrer12 as overlay} from '../../../../scripts/estimate/r4a13/s2763MetalRoofSimpleKrer12Overlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {metalRoofSimpleKrer12PackS2763 as pack,metalRoofSimplePrefixS2763 as prefix,metalRoofSimpleSystemYesS2763 as system,metalRoofSimpleConditionsYesS2763 as conditions,metalRoofSimpleAreaYesS2763 as area} from './metalRoofSimpleKrer12S2763';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/metal-roof-simple-krer12-six-parents-s27-63.json') as {sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const locators={roof:'CONTROL_ROOF',guidance:'CONTROL_GUIDANCE'};
const facts={q:'37.5',metal_roof_system:system,metal_roof_conditions:conditions,metal_roof_area_scope:area};
const compile=(r:PurchaseGroupRepresentative,input:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,
 parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});

test('six exact parents preserve354 owners and old formulas; template100 is removed from forward runtime',()=>{
 expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);let ownerCount=0;
 for(const parent of fixture.reps){const before=JSON.stringify(parent),r=overlay(parent,locators).representative;
  expect(JSON.stringify(parent)).toBe(before);expect(r.formulas.slice(0,parent.formulas.length)).toEqual(parent.formulas);
  expect(r.resources.slice(0,59).map(x=>[x.id,x.row_id,x.cost_owner_id,x.unit_id,x.formula_id])).toEqual(parent.resources.map(x=>[x.id,x.row_id,x.cost_owner_id,x.unit_id,x.formula_id]));ownerCount+=59;
  expect(r.parameters.find(p=>p.parameter_id==='q')?.default_value).toBeNull();expect(r.baseline.input_values).not.toHaveProperty('q');
  expect(canonicalApprovedBaselineRuntimeParameters(r.baseline)).toEqual({});expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);
  expect(r.passport.decision.legacyOwnerDisposition).toHaveLength(59);
  const publicFacts=r.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT');expect(publicFacts.map(p=>p.parameter_id)).toEqual(['q','metal_roof_system','metal_roof_conditions','metal_roof_area_scope']);
  expect(publicFacts.every(p=>p.default_value===null)).toBe(true);
  expect(r.parameters.filter(p=>p.parameter_id.startsWith('metal_roof_open_')).every(p=>p.default_value===null&&p.truth_metadata.visibility_role==='INTERNAL_ONLY'&&p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);
 }expect(ownerCount).toBe(354);
});

test.each(fixture.reps.map(r=>[String(r.definition.catalog_id),r] as const))('one shared norm uses the source Decimal oracle without sheets/strips/shifts rounding: %s',async(_id,parent)=>{
 const r=overlay(parent,locators).representative,result=await compile(r,facts);
 const oracle=pack.oracle.find(o=>o.measuredNormAreaM2==='37.5')!;
 const normalized=(v:string)=>v.includes('.')?v.replace(/0+$/u,'').replace(/\.$/u,''):v;
 for(const [role,q]of Object.entries(oracle.quantities))expect(result.rows.find(row=>row.row_id===prefix+':'+role)?.quantity).toBe(normalized(q));
 expect(result.rows.filter(row=>row.included_in_estimate)).toHaveLength(9);expect(result.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null)).toBe(true);
 const operator=result.rows.find(row=>row.row_id===prefix+':included_machine_operators')!;expect(operator.included_in_estimate).toBe(false);expect(operator.included_in_procurement).toBe(false);
 expect(result.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);
 expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+':remaining:cutting')).toBe(true);
 for(const suffix of ['materials_05','materials_04','labor_22','equipment_27','logistics_28','quality_control_59'])expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+':remaining:'+suffix)).toBe(true);
});

test.each(['metal_roof_conditions','metal_roof_area_scope'])('missing or unknown %s never revives old q quantities in the selected exact branch',async key=>{
 const parent=fixture.reps[0]!,r=overlay(parent,locators).representative;
 for(const value of [undefined,key==='metal_roof_conditions'?'Условия ещё не проверены':'Площадь ещё нужно проверить']){
  const input:Record<string,unknown>={...facts,[key]:value};if(value===undefined)delete input[key];const result=await compile(r,input);
  expect(result.rows.some(row=>parent.resources.some(old=>old.row_id===row.row_id))).toBe(false);
  expect(result.rows.some(row=>pack.rates.some(rate=>row.row_id===prefix+':'+rate.role))).toBe(false);
 }
});

test('legacy values and quotes remain historical; incompatible legacy prices never become norm prices',async()=>{
 const parent=fixture.reps[0]!,r=overlay(parent,locators).representative,old=parent.resources[0]!;
 const extra={rowOverrides:{[old.row_id]:{titleRu:'Историческое название',unitPrice:'17.25',quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}},
  priceItems:[{price_key:old.cost_owner_id,unit_id:old.unit_id,currency_code:'KGS',unit_price:'91.23',snapshot_id:'CONTROL_OLD_PRICE'}]};
 const legacy=await compile(r,{q:'37.5',metal_roof_system:'Другая система или состав ещё не проверен'},extra);
 expect(legacy.rows.find(row=>row.row_id===old.row_id)?.title_ru).toBe('Историческое название');expect(legacy.rows.find(row=>row.row_id===old.row_id)?.quantity).toBe('7');
 const exact=await compile(r,facts,extra);expect(exact.rows.filter(row=>row.included_in_estimate).every(row=>row.unit_price===null)).toBe(true);
 const residualId=prefix+':remaining:materials_05';
 await expect(compile(r,facts,{rowOverrides:{[residualId]:{quantity:'7',provenance:{kind:'manual',reason:'SYNTHETIC_CONTROL'}}}})).rejects.toThrow('source-owned norm quantity cannot be replaced');
});
