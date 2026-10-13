import parents from '../../../../data/estimate-benchmarks/fixtures/cn69-four-subfloor-parents-s27-69.json';
import {cn69SubfloorBindingS2769 as pack,cn69SubfloorDefinitionS2769,compileCn69SubfloorS2769,cn69SubfloorPrefixS2769 as prefix} from './cn69SubfloorSeriesS2769';
import {cn69ExplicitControlS2754} from '../../../../scripts/estimate/r4a13/prepareS2754Cn69DryFloor';
import {overlayS2769Cn69SubfloorFour} from '../../../../scripts/estimate/r4a13/s2769Cn69SubfloorFourOverlay';
import {overlayS2769Ct54DisplayTitle} from '../../../../scripts/estimate/r4a13/s2769Ct54DisplayTitleOverlay';
import {canonicalDefinitionTitleRu} from '../backendPlatform/canonicalEstimateRevisionWriter';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {buildConsumerCanonicalParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
const {floor_area_m2:q,...rest}=cn69ExplicitControlS2754();
const facts={...rest,q,subfloor_technology_choice:pack.exactChoiceRu};
const value=(r:Awaited<ReturnType<typeof compileCn69SubfloorS2769>>,id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
function compile(r:PurchaseGroupRepresentative,input:Record<string,unknown>,rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={}){
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as never,formulaDefinitions:r.formulas as never,resourceDefinitions:r.resources as never,submittedParameters:input,confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:97,hashJson:async v=>hash(v)});
}
const project=(p:PurchaseGroupRepresentative['parameters'][number])=>({parameterId:p.parameter_id,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,visibleWhen:p.truth_metadata.visible_when,semanticParameterKey:p.truth_metadata.semantic_parameter_key,provenance:p.truth_metadata.provenance,formulaConsumers:p.truth_metadata.formula_consumers,resourceBranchConsumers:p.truth_metadata.resource_branch_consumers,guide:{guideKind:p.truth_metadata.guide.guide_kind,sourceRole:p.truth_metadata.guide.source_role,guideValidationPolicy:p.truth_metadata.guide.guide_validation_policy,sourceDocument:p.truth_metadata.guide.source_document,sourceLocator:p.truth_metadata.guide.source_locator,sourceSnapshotHash:p.truth_metadata.guide.source_snapshot_hash}});
function session(r:PurchaseGroupRepresentative,parameters:Record<string,unknown>){return buildConsumerCanonicalParameterSession({catalog:{catalogId:String(r.definition.catalog_id),releaseId:'CONTROL_ONLY',definitionVersion:4,parameterSchema:r.parameters.map(project)} as never,draftId:'CONTROL_ONLY',revision:{revisionId:'CONTROL_ONLY',parentRevisionId:null,releaseId:'CONTROL_ONLY',catalogId:String(r.definition.catalog_id),definitionVersionId:'CONTROL_ONLY',definitionVersion:4,status:'ready',parameters,userInputSnapshot:parameters,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:'CONTROL_ONLY',preliminaryNeeds:[],compilerVersion:pack.contract,checksumSha256:'CONTROL_ONLY',createdAt:'2026-10-13T00:00:00Z'}});}
describe('four existing subfloor types reuse the admitted CN69 dry-floor owner',()=>{
 test('both CT54 canonical labels become explicitly exterior without changing a numerical formula, resource or binding',()=>{
  for(const frozen of parents.titleReps){const before=frozen as unknown as PurchaseGroupRepresentative,target=pack.titleFixTargets.find(t=>t.catalogId===before.definition.catalog_id)!,r=overlayS2769Ct54DisplayTitle(before,target,pack.contract).representative;
   expect(canonicalDefinitionTitleRu(r.definition)).toBe(target.titleRu);expect(target.titleRu).toContain('наружного фасада');expect(r.formulas).toEqual(before.formulas);expect(r.resources).toEqual(before.resources);expect(r.bindings).toEqual(before.bindings);expect(before.definition.passport.canonicalRuName).not.toBe(target.titleRu);
  }
 });
 test('all four real parents preserve236 legacy owners and every legacy formula; exact quantities use one price owner',async()=>{
  expect(parents.reps).toHaveLength(4);
  for(const frozen of parents.reps){const before=frozen as unknown as PurchaseGroupRepresentative,r=overlayS2769Cn69SubfloorFour(before,{manufacturer:'CONTROL_CN69',krer:'CONTROL_CT17'}).representative;
   expect(r.resources.slice(0,59).map(x=>[x.row_id,x.cost_owner_id,x.unit_id,x.formula_id])).toEqual(before.resources.map(x=>[x.row_id,x.cost_owner_id,x.unit_id,x.formula_id]));expect(r.formulas.slice(0,59)).toEqual(before.formulas);
   const result=await compile(r,facts);expect(result.rows).toHaveLength(10);expect(result.preliminaryNeeds).toHaveLength(22);expect(result.rows.filter(x=>x.included_in_procurement)).toHaveLength(3);
   for(const[id,quantity]of[['cn69-consumed','184.6'],['cn69-order','200'],['cn69-bags','8'],['ct17-consumed','7.1'],['ct17-5l-order','10'],['water-consumed','42.8272'],['water-order','43']])expect(value(result,id)).toBe(quantity);
   expect(result.rows.some(row=>before.resources.some(old=>old.row_id===row.row_id))).toBe(false);expect(r.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
  }
 });
 test('every old obligation has an independent disposition and unresolved inherited obligations stay visible',async()=>{
  expect(pack.oldDispositionMap).toHaveLength(59);expect(new Set(pack.oldDispositionMap.map(d=>d.suffix)).size).toBe(59);
  const result=await compileCn69SubfloorS2769(facts);
  for(const gap of pack.inheritedNeeds)expect(result.preliminaryNeeds.some(p=>p.row_id===prefix+':inherited-'+gap.suffix)).toBe(true);
  expect(cn69SubfloorDefinitionS2769().parameters.filter(p=>p.parameter_id.includes('_open_')).every(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY'&&p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);
 });
 test('unknown readiness does not assume a ready floor or silently zero the composition',async()=>{
  const result=await compileCn69SubfloorS2769({...facts,base_confirmed:undefined});expect(result.rows).toHaveLength(0);expect(result.preliminaryNeeds.length).toBeGreaterThan(22);
  await expect(compileCn69SubfloorS2769({...facts,product_variant_confirmed:'Региональная смесь из другого TDS'})).rejects.toThrow();
  await expect(compileCn69SubfloorS2769({...facts,layer_thickness_mm:10.01})).rejects.toThrow();
 });
 test('procurement stock and supplier multiples change the order, never water for the consumed mix',async()=>{
  const result=await compileCn69SubfloorS2769({...facts,cn69_stock:50,cn69_reserve:10,cn69_supplier_bag_multiple:2});expect(value(result,'cn69-order')).toBe('150');expect(value(result,'water-consumed')).toBe('42.8272');
  for(const container of ['1 л','2 л','5 л','10 л']){const size=container.split(' ')[0],chosen=await compileCn69SubfloorS2769({...facts,ct17_container:container,['ct17_'+size+'l_supplier_multiple']:1});expect(chosen.rows.filter(r=>r.included_in_procurement&&r.row_id.includes(':ct17-'))).toHaveLength(1);}
 });
 test('legacy manual data survives switching to CN69 and back without migrating its price to new material owners',async()=>{
  const before=parents.reps[0] as unknown as PurchaseGroupRepresentative,r=overlayS2769Cn69SubfloorFour(before,{manufacturer:'CONTROL_CN69',krer:'CONTROL_CT17'}).representative;
  const old=before.resources.find(x=>x.row_id.endsWith('_materials_01'))!,override={titleRu:'Сохранённое контрольное название',quantity:'7.25',unitPrice:'91.23',provenance:{kind:'manual',reason:'CONTROL_ONLY'}};
  const beforeExact=await compile(r,{q:35.5,subfloor_technology_choice:pack.legacyChoiceRu},{[old.row_id]:override}),exact=await compile(r,facts,{[old.row_id]:override}),back=await compile(r,{q:35.5,subfloor_technology_choice:pack.legacyChoiceRu},{[old.row_id]:override});
  expect(beforeExact.rows.find(x=>x.row_id===old.row_id)).toEqual(back.rows.find(x=>x.row_id===old.row_id));expect(back.rows.find(x=>x.row_id===old.row_id)?.quantity).toBe('7.25');expect(exact.rows.find(x=>x.row_id===prefix+':cn69-order')?.unit_price).toBe(null);
 });
 test('legacy form asks no CN69 facts; exact form keeps application norm gaps internal and invents no baseline quantities',()=>{
  const r=overlayS2769Cn69SubfloorFour(parents.reps[0] as unknown as PurchaseGroupRepresentative,{manufacturer:'CONTROL_CN69',krer:'CONTROL_CT17'}).representative;
  expect(r.parameters.every(p=>p.default_value===null)).toBe(true);expect(r.parameters.find(p=>p.parameter_id==='q')!.truth_metadata.provenance?.approvedTemplateBinding).toBeUndefined();
  const legacy=session(r,{q:35.5,subfloor_technology_choice:pack.legacyChoiceRu});
  expect(legacy.parameters.map(p=>p.parameterId).sort()).toEqual(['q','subfloor_technology_choice']);
  const exact=session(r,facts);expect(exact.parameters.some(p=>p.parameterId.startsWith('open_qty_')||p.parameterId.startsWith('cn69_inherited_open_'))).toBe(false);
 });
 test('different frozen parent identity is rejected before constructing a successor',()=>{
  const changed=structuredClone(parents.reps[0]) as unknown as PurchaseGroupRepresentative;changed.definition.definition_sha256='changed';expect(()=>overlayS2769Cn69SubfloorFour(changed,{manufacturer:'CONTROL_CN69',krer:'CONTROL_CT17'})).toThrow('CN69_FOUR_EXACT_PARENT_DRIFT');
 });
});
