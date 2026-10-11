import {overlayS2763KnaufInteriorPlasterMaterials} from '../../../../scripts/estimate/r4a13/s2763KnaufInteriorPlasterMaterialsOverlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {isCanonicalEstimateSourceManagedParameter,isCanonicalEstimateUserEditableParameter} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {knaufInteriorPlasterPackS2763 as pack,knaufInteriorPlasterPrefixS2763 as prefix} from './knaufInteriorPlasterMaterialsS2763';

// Captured from the actual prepared release; require avoids inferring a large
// generated JSON literal as the compiler's structural type.
const fixture=require('../../../../data/estimate-benchmarks/fixtures/knauf-interior-plaster-six-parents-s27-63.json') as {
  sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[];
};
const locators={betogrund:'CONTROL_BETOGRUND',rotband:'CONTROL_ROTBAND',mp75:'CONTROL_MP75_COMPATIBILITY'};
function compile(r:PurchaseGroupRepresentative,facts:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={}) {
  return compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,
    parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],
    resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:facts,confirmedParameters:{},
    rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>estimateDeterministicHash(v),...extra});
}
const manualFacts={q:'35.5',interior_plaster_material_system:pack.manualChoiceRu,betogrund_primer_state:pack.primerNeededRu,betogrund_actual_area_m2:'30'};

test('all six actual parents retain every old formula, row identity, unit and quote owner; partial scope is explicit',()=>{
  expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);
  expect(fixture.reps).toHaveLength(6);
  const labourOwners:string[]=[];
  for(const before of fixture.reps){const target=pack.targets.find(t=>t.catalogId===before.definition.catalog_id)!;
    const snapshot=JSON.stringify(before),{representative:r,ownerDisposition}=overlayS2763KnaufInteriorPlasterMaterials(before,locators);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(r.formulas.slice(0,before.formulas.length)).toEqual(before.formulas);
    expect(r.resources.slice(0,before.resources.length).map(x=>[x.id,x.row_id,x.cost_owner_id,x.unit_id,x.formula_id]))
      .toEqual(before.resources.map(x=>[x.id,x.row_id,x.cost_owner_id,x.unit_id,x.formula_id]));
    expect(ownerDisposition).toHaveLength(target.primerOnly?1:59);
    expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);
    expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
    if(target.primerOnly) {
      expect(r.resources.slice(0,8).filter(x=>x.row_id!==target.legacyPrimerOwnerRowId)).toEqual(before.resources.filter(x=>x.row_id!==target.legacyPrimerOwnerRowId));
      expect(r.parameters.find(p=>p.parameter_id==='area_m2')).toEqual(before.parameters.find(p=>p.parameter_id==='area_m2'));
    }else{
      expect(canonicalApprovedBaselineRuntimeParameters(r.baseline)).toEqual({});
      const main=r.resources.find(x=>x.row_id===prefix+':open-main-labour')!;
      expect(main.unit_id).toBe('person_hour');labourOwners.push(main.cost_owner_id);
      expect(r.parameters.find(p=>p.parameter_id==='q')!.default_value).toBeNull();
      expect(r.parameters.find(p=>p.parameter_id==='q')!.truth_metadata.provenance.approvedTemplateBinding).toBeUndefined();
    }
  }
  expect(new Set(labourOwners).size).toBe(5);
});

test('five exact manual branches calculate admitted materials, retain labour gaps and exclude all legacy cement rows',async()=>{
  for(const before of fixture.reps.filter(r=>r.resources.length===59)){
    const r=overlayS2763KnaufInteriorPlasterMaterials(before,locators).representative,result=await compile(r,manualFacts);
    expect(result.rows.find(x=>x.row_id===prefix+':rotband-consumed')?.quantity).toBe('301.75');
    expect(result.rows.find(x=>x.row_id===prefix+':betogrund-consumed')?.quantity).toBe('7.5');
    expect(result.rows.some(row=>before.resources.some(old=>row.row_id===old.row_id))).toBe(false);
    expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+':open-main-labour')).toBe(true);
    expect(r.resources.filter(row=>row.unit_id==='m2'&&row.row_id.endsWith('application-area')).every(row=>row.resource_graph.costTreatment==='INFORMATIONAL_SCOPE')).toBe(true);
    const done=await compile(r,{...manualFacts,betogrund_primer_state:pack.primerCompleteRu});
    expect(done.rows.some(x=>x.row_id.startsWith(prefix+':betogrund'))).toBe(false);
    expect(done.preliminaryNeeds.some(n=>[prefix+':open-primer-labour',prefix+':open-primer-tool'].includes(n.row_id))).toBe(false);
  }
});

test('standard machine parent keeps its15mm project mixture and labour without an extra paid primer-area row',async()=>{
  const before=fixture.reps.find(r=>r.resources.length===8)!,r=overlayS2763KnaufInteriorPlasterMaterials(before,locators).representative;
  const result=await compile(r,{area_m2:'35.5',interior_plaster_material_system:pack.mechanizedChoiceRu,
    betogrund_primer_state:pack.primerNeededRu,betogrund_actual_area_m2:'30'});
  expect(result.rows.find(x=>x.row_id===prefix+':betogrund-consumed')?.quantity).toBe('7.5');
  expect(r.formulas.find(f=>f.formula_id===before.resources.find(row=>row.row_id==='rc09:machine_gypsum_plaster_15mm')!.formula_id))
    .toEqual(before.formulas.find(f=>f.formula_id===before.resources.find(row=>row.row_id==='rc09:machine_gypsum_plaster_15mm')!.formula_id));
  expect(r.resources.find(x=>x.row_id===prefix+':betogrund-application-area')?.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
  expect(result.rows.find(x=>x.row_id===prefix+':betogrund-application-area')?.unit_price).toBeNull();
  expect(result.rows.some(x=>x.row_id==='rc09:concrete_contact_primer')).toBe(false);
});

test('legacy manual quantity, name and price survive legacy to Knauf to legacy without transferring quotes',async()=>{
  const before=fixture.reps.find(r=>r.resources.length===59)!,r=overlayS2763KnaufInteriorPlasterMaterials(before,locators).representative;
  const old=before.resources.find(x=>x.row_id.endsWith('labor_20'))!;
  const extra={rowOverrides:{[old.row_id]:{titleRu:'Сохранённая ручная работа',quantity:'7.25',unitPrice:'91.23',
    provenance:{kind:'manual',reason:'CONTROL_ONLY'}}},priceItems:[{price_key:old.cost_owner_id,unit_id:old.unit_id,currency_code:'KGS',unit_price:'123.45',snapshot_id:'CONTROL_OLD_PRICE'}]};
  for(const choice of [pack.legacyChoiceRu,pack.manualChoiceRu,pack.legacyChoiceRu]){
    const result=await compile(r,{...manualFacts,interior_plaster_material_system:choice},extra);
    if(choice===pack.manualChoiceRu){expect(result.rows.some(x=>x.row_id===old.row_id)).toBe(false);
      expect(result.rows.filter(x=>x.row_id.startsWith(prefix)).every(x=>x.unit_price==null)).toBe(true);
    }else expect(result.rows.find(x=>x.row_id===old.row_id)).toMatchObject({title_ru:'Сохранённая ручная работа',quantity:'7.25',unit_price:'91.23'});
  }
});

test('actual source-derived guides admit enum facts without admitting hidden application quantities',()=>{
  for(const before of fixture.reps){const r=overlayS2763KnaufInteriorPlasterMaterials(before,locators).representative;
    for(const id of ['interior_plaster_material_system','betogrund_primer_state','betogrund_actual_area_m2']){
      const p=r.parameters.find(p=>p.parameter_id===id)!;
      const projected={parameterId:id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,
        visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,semanticParameterKey:p.truth_metadata.semantic_parameter_key,
        formulaConsumers:p.truth_metadata.formula_consumers,resourceBranchConsumers:p.truth_metadata.resource_branch_consumers,provenance:p.truth_metadata.provenance,
        sourceConfirmationRequired:p.truth_metadata.source_confirmation_required,guide:{guideKind:p.truth_metadata.guide.guide_kind,sourceRole:p.truth_metadata.guide.source_role,
          guideValidationPolicy:p.truth_metadata.guide.guide_validation_policy,sourceDocument:p.truth_metadata.guide.source_document,
          sourceLocator:p.truth_metadata.guide.source_locator,sourceSnapshotHash:p.truth_metadata.guide.source_snapshot_hash,
          guideShortRu:p.truth_metadata.guide.guide_short_ru,guideVersion:p.truth_metadata.guide.guide_version,
          applicability:p.truth_metadata.guide.applicability,verifiedAt:p.truth_metadata.guide.verified_at}};
      expect(isCanonicalEstimateUserEditableParameter(projected)).toBe(true);expect(isCanonicalEstimateSourceManagedParameter(projected)).toBe(false);
    }
  }
});
