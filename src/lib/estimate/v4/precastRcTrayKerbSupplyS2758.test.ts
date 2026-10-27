import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView,type CanonicalEstimateRevisionRowView} from '../backendPlatform/contracts';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {trayControlS2758,traySupplyControlS2758,kerbSupplyControlS2758,verifyTrayS2758,verifyKerbSupplyS2758} from '../../../../scripts/estimate/r4a13/preflightS2758TrayKerbSupplyWave';
import {precastRcTrayPackS2758 as pack,precastRcTrayDefinitionS2758,compilePrecastRcTrayS2758,ownTrayMachinesS2758,hiredTrayMachinesS2758} from './precastRcEmbankmentRunoffTrayS2758';
import {kerbSupplyIdentityDefinitionS2758,kerbSupplyMaterialKeysS2758} from './concreteKerbSupplyIdentityS2758';
import {concreteKerbSourcePackS2754,ownKerbMachinesS2754,hiredKerbMachinesS2754} from './concreteKerbInstallationS2754';
import {extractPromptOwnedProfessionalParameters} from '../../../features/consumerRepair/consumerCanonicalBaselineCompile';
import {buildCanonicalBaselinePlan} from '../backendPlatform/canonicalConsumerPromptPlanServerR1';
import {buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {consumerCanonicalMigrationUserParameters} from '../../../features/consumerRepair/consumerCanonicalReleaseMigration';
import {buildCanonicalParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateVisibleUserResourceSelectionParameter,canonicalEstimateParameterChoiceLabelRu} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';

function catalog(d:AutomaticOwnerDefinition,catalogId:string,titleRu:string,primaryMeasureParameterId:string):CanonicalEstimateCatalogItem{
  const c=buildMasterParameterCalculationConsumers(d);
  return {catalogId,titleRu,releaseId:'00000000-0000-5000-8000-000000000001',namespace:'global',domain:'transport',workKey:catalogId.split(':').at(-1)!,definitionVersion:1,
    applicability:{primaryMeasureParameterId},professionalMetadata:{},parameterSchema:d.parameters.map(p=>{const t=p.truth_metadata,g=t.guide as Record<string,unknown>;
      return {parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,
        constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,
        semanticParameterKey:t.semantic_parameter_key,provenance:t.provenance,requiredWhen:t.required_when,
        formulaConsumers:c.formulaConsumers[p.parameter_id],resourceBranchConsumers:c.resourceConsumers[p.parameter_id],
        guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,
          sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,
          applicability:g.applicability,verifiedAt:g.verified_at}} as CanonicalEstimateCatalogItem['parameterSchema'][number];})};
}
const trayCatalog=()=>catalog(precastRcTrayDefinitionS2758(),pack.catalogId,pack.titleRu,'length_m');
const kerbCatalog=(index:0|1)=>catalog(kerbSupplyIdentityDefinitionS2758(index),concreteKerbSourcePackS2754.types[index].catalogId,concreteKerbSourcePackS2754.types[index].titleRu,'kerb_length_m');
function session(c:CanonicalEstimateCatalogItem,parameters:Record<string,unknown>,missingParameterIds:string[]=[]){return buildConsumerCanonicalPrecompileParameterSession({catalog:c,draftId:'s2758-prepublication-ordinary',
  parameters:parameters as Record<string,string|number>,userExplicitParameterIds:Object.keys(parameters),textExtractedParameterIds:[],missingParameterIds});}

it('independently verifies exact tray source quantities, all required branches and purchase gates',async()=>{expect(await verifyTrayS2758()).toMatchObject({own:[16,6,3],hired:[16,6,8],fullTechnicalAcceptance:false});});
it.each([0,1] as const)('preserves old column%s physical formulas and validates its purchase-only identity gates',async index=>{expect(await verifyKerbSupplyS2758(index)).toMatchObject({own:[18,6,5],all27FormulasAnd22OtherResourcesUnchanged:true});});

it.each([ownTrayMachinesS2758,hiredTrayMachinesS2758])('projects aggregate operator hours without assigning all hours to one machine: %s',async choice=>{
  const c=trayCatalog(),input={...traySupplyControlS2758(),mechanism_fulfillment:choice},core=await compilePrecastRcTrayS2758(input);
  const rows:CanonicalEstimateRevisionRowView[]=core.rows.map(r=>({rowId:r.row_id,ordinal:r.ordinal,titleRu:r.title_ru as string,section:r.section as string,category:r.category as string,
    quantity:r.quantity,unitId:r.unit_id as string,includedInEstimate:r.included_in_estimate,includedInProcurement:r.included_in_procurement,procurementEligible:false,
    ownershipStatus:'OWNED',unitPrice:r.unit_price,amount:r.amount,currencyCode:'KGS',calculationTrace:r.calculation_trace as Record<string,unknown>,normativeTrace:r.normative_trace as unknown[],rowSha256:'a'.repeat(64)}));
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:'source-only-not-persisted',parentRevisionId:null,releaseId:c.releaseId,catalogId:c.catalogId,
    revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:input,totals:{amount:'0'},amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null},
    rowCount:rows.length,checksumSha256:'b'.repeat(64),compilerVersion:'source-only',createdAt:'2026-10-10T00:00:00.000Z'};
  const operator=adaptCanonicalRevisionToStructuredEstimate({catalog:c,revision,rows}).rows.find(r=>r.rowId.includes(':operator-'))!;
  const source=operator.sourceParameters;expect(source).toBeTruthy();if(!source)throw Error('OPERATOR_PROJECTION_SOURCE_REQUIRED');
  expect(operator.quantity).toBe(15.3715);expect(source.payable).toBe(false);
  expect(source.canonicalIncludedCostOwnerTitleRu).toBeFalsy();
  const original=core.rows.find(r=>r.row_id.includes(':operator-'))!;expect(original.included_in_estimate).toBe(false);
  expect(((original.calculation_trace as Record<string,unknown>).resourceGraph as Record<string,unknown>).costTreatment).toBe('INFORMATIONAL_SCOPE');
});

it.each(['длиной 35,5 м','длиной35,5м','длиной35.5м'])('extracts selected tray length from %s without a new parser',tail=>{
  const c=trayCatalog(),plan=buildCanonicalBaselinePlan({catalog:c,prompt:pack.titleRu+' '+tail});expect(plan.parameters.length_m).toBe('35.5');
  expect(plan.primaryMeasureParameterId).toBe('length_m');expect(plan.parameters.crushed_stone_quantum).toBeUndefined();expect(plan.parameters.construction_scope_conditions).toBeUndefined();
  const manual=buildCanonicalBaselinePlan({catalog:c,prompt:pack.titleRu+' '+tail,parameterOverrides:{length_m:'36'}});expect(manual.parameters.length_m).toBe('36');
});
it('does not infer length from a tray product designation or open application norms',()=>{
  const c=trayCatalog();expect(extractPromptOwnedProfessionalParameters(c.parameterSchema,'Лоток Л35.5, изделие М400')).not.toHaveProperty('length_m');
  const migrated=consumerCanonicalMigrationUserParameters(c,{...traySupplyControlS2758(),open_scope_qty_curing:4,effective_resource_quantity_precast_rc_embankment_runoff_tray_precast_rc:99});
  expect(migrated).not.toHaveProperty('open_scope_qty_curing');expect(migrated).not.toHaveProperty('effective_resource_quantity_precast_rc_embankment_runoff_tray_precast_rc');
});
it('reaches all actual tray questions and final saved cards with no hidden norm or default',()=>{
  const c=trayCatalog(),input=traySupplyControlS2758(),s=session(c,input),cards=buildCanonicalParameterCards({session:s,revision:null});
  expect(s.parameters).toHaveLength(19);expect(cards).toHaveLength(19);
  for(const p of c.parameterSchema.filter(p=>p.visibilityRole==='USER_INPUT'))expect(isCanonicalEstimateConsumerSuppliedParameter(p)||isCanonicalEstimateVisibleUserResourceSelectionParameter(p)).toBe(true);
  expect(c.parameterSchema.every(p=>p.defaultValue==null)).toBe(true);
  expect(cards.some(p=>p.key==='mechanism_fulfillment')).toBe(true);expect(s.parameters.some(p=>p.parameterId.startsWith('open_scope_qty_'))).toBe(false);
  for(const p of s.parameters)expect(p.label).toMatch(/[А-Яа-яЁё]/u);
  for(const p of c.parameterSchema.filter(p=>p.valueType==='enum')){const values=p.constraints?.values as string[];const labels=values.map(v=>canonicalEstimateParameterChoiceLabelRu(p.parameterId,v));expect(new Set(labels).size).toBe(values.length);expect(labels.every(x=>/[А-Яа-яЁё]/u.test(x))).toBe(true);}
});
it('retains both real mechanism choices through final cards, pending Apply and saved reopen',()=>{
  const c=trayCatalog();for(const value of [ownTrayMachinesS2758,hiredTrayMachinesS2758]){
    const input={...traySupplyControlS2758(),mechanism_fulfillment:value},s=session(c,input),cards=buildCanonicalParameterCards({session:s,revision:null});
    expect(cards.find(p=>p.key==='mechanism_fulfillment')?.value).toBe(value);
    const other=value===ownTrayMachinesS2758?hiredTrayMachinesS2758:ownTrayMachinesS2758;
    const patch=consumerCanonicalPrecompileParameterOverrides({session:s,patches:[{operation:'set_param',paramKey:'mechanism_fulfillment',rawValue:other}] as never});
    expect(patch.mechanism_fulfillment).toBe(other);expect(session(c,patch).parameters.find(p=>p.parameterId==='mechanism_fulfillment')?.value).toBe(other);
    expect(c.parameterSchema.find(p=>p.parameterId==='mechanism_fulfillment')?.required).toBe(false);
  }
});
it('shows only the applicable tray positive-stock reference despite stale missing needs',()=>{
  const c=trayCatalog(),input=traySupplyControlS2758(),refs=['crushed_stone','mortar','precast_rc'].map(k=>k+'_stock_compatibility_reference');
  expect(session(c,input,refs).parameters.filter(p=>refs.includes(p.parameterId))).toHaveLength(0);
  for(const k of ['crushed_stone','mortar','precast_rc']){
    const s=session(c,{...input,[k+'_stock']:0.01},refs);expect(s.parameters.filter(p=>refs.includes(p.parameterId)).map(p=>p.parameterId)).toEqual([k+'_stock_compatibility_reference']);
    const saved=consumerCanonicalPrecompileParameterOverrides({session:s,patches:[{operation:'set_param',paramKey:k+'_stock_compatibility_reference',rawValue:'Паспорт партии: остаток пригоден и соответствует проекту'}] as never});
    expect(buildCanonicalParameterCards({session:session(c,saved),revision:null}).some(p=>p.key===k+'_stock_compatibility_reference')).toBe(true);
  }
});
it.each([0,1] as const)('checks all final ordinary kerb cards for column%s, both choices and stock transitions',index=>{
  const c=kerbCatalog(index),input=kerbSupplyControlS2758(index),refs=kerbSupplyMaterialKeysS2758.map(k=>k+'_stock_compatibility_reference');
  for(const choice of [ownKerbMachinesS2754,hiredKerbMachinesS2754]){
    const s=session(c,{...input,mechanism_fulfillment:choice},refs);expect(s.parameters).toHaveLength(25);expect(buildCanonicalParameterCards({session:s,revision:null})).toHaveLength(25);
    expect(buildCanonicalParameterCards({session:s,revision:null}).find(p=>p.key==='mechanism_fulfillment')?.value).toBe(choice);
    expect(s.parameters.some(p=>p.parameterId==='mortar_supply_specification')).toBe(true);
  }
  const positive={...input,...Object.fromEntries(kerbSupplyMaterialKeysS2758.map(k=>[k+'_stock',1]))},s=session(c,positive,refs);expect(s.parameters).toHaveLength(30);expect(s.parameters.filter(p=>refs.includes(p.parameterId))).toHaveLength(5);
  expect(s.parameters.every(p=>/[А-Яа-яЁё]/u.test(p.label))).toBe(true);
});
it('keeps actual schema ownership independent from norm-like Russian question titles',()=>{
  const original=trayCatalog();for(const titleRu of ['Количество: проектная спецификация','Нормальные условия и расход','Выбор = поставка в м³']){
    const c={...original,parameterSchema:original.parameterSchema.map(p=>p.parameterId==='precast_rc_supply_specification'?{...p,titleRu}:p)};
    expect(session(c,traySupplyControlS2758()).parameters.some(p=>p.parameterId==='precast_rc_supply_specification')).toBe(true);
  }
  expect(session(original,trayControlS2758()).parameters.some(p=>p.parameterId.startsWith('open_scope_qty_'))).toBe(false);
});
