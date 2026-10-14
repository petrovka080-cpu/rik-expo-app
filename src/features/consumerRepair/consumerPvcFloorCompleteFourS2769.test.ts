import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import type {CanonicalEstimateParameterSessionRevision} from '../../lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import {buildCanonicalBaselinePlan} from './consumerCanonicalBaselineCompile';
import {canonicalPublicEstimateChoiceLabelRu as label,canonicalPublicEstimateParameterTitleRu as title} from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import {canonicalApprovedBaselineRuntimeDefaultValue as defaultValue} from '../../lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {buildConsumerCanonicalParameterSession as saved,buildConsumerCanonicalPrecompileParameterSession as fresh} from './consumerCanonicalParameterEditor';
import {buildPvcFloorCompleteFourS2769 as build} from '../../lib/estimate/v4/pvcFloorCompleteFourS2769';
import {pvcFloorFreshDefaultsS2769 as defaults} from '../../lib/estimate/v4/pvcFloorCompleteFourS2769';
import {FLOOR_DEMOLITION_SERIES_S2752 as waste} from '../../lib/estimate/v4/floorDemolitionSeriesS2752';
import pack from '../../../data/estimate-benchmarks/source-packs/pvc-floor-complete-four-s27-69.json';
import type {PurchaseGroupRepresentative as Model} from '../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../data/estimate-benchmarks/fixtures/pvc-floor-four-parents-s27-69.json') as {models:Model[]};
function catalog(parent:Model):CanonicalEstimateCatalogItem{
 const r=build(parent);
 return {catalogId:String(parent.definition.catalog_id),releaseId:String(parent.definition.release_id),namespace:'global',workKey:'floor-preparation',titleRu:'Разборка покрытия из ПВХ',domain:'construction',
  definitionVersion:Number(parent.definition.definition_version)+1,applicability:r.definition.applicability,professionalMetadata:{},
  parameterSchema:r.parameters.map(p=>{const t=p.truth_metadata,g=t.guide??{};return {parameterId:p.parameter_id,semanticParameterKey:t.semantic_parameter_key,titleRu:p.title_ru,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,
   required:p.required,defaultValue:defaultValue(r.baseline,p.parameter_id),constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,
   formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,runtimeProfileClassification:r.baseline.input_classification[p.parameter_id],visibleWhen:t.visible_when,requiredWhen:t.required_when,
   guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,guideShortRu:g.guide_short_ru,guideVersion:g.guide_version,applicability:g.applicability,
    verifiedAt:g.verified_at,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash}};})} as CanonicalEstimateCatalogItem;
}
test.each(parents.models)('saved editor preserves legacy intent; fresh defaults remain a visible plan: $definition.catalog_id',parent=>{
 const c=catalog(parent),parameters={...parent.baseline.input_values};
 const revision={revisionId:'old-saved-control',parentRevisionId:null,releaseId:c.releaseId,catalogId:c.catalogId,definitionVersionId:String(parent.definition.id),definitionVersion:c.definitionVersion,
  status:'ready',parameters,userInputSnapshot:parameters,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:'schema',compilerVersion:'old',checksumSha256:'a'.repeat(64),
  createdAt:'2026-10-14T00:00:00Z',contentWithdrawalReasonRu:null,preliminaryNeeds:[]} as CanonicalEstimateParameterSessionRevision;
 const s=saved({catalog:c,revision,draftId:'FLOOR_PREPARATION'});
 expect(s.parameters.find(p=>p.parameterId===pack.modeId)?.value).toBe(pack.legacyMode);
 expect(s.parameters.some(p=>p.parameterId===pack.wasteModeId)).toBe(false);
 expect(s.parameters.some(p=>p.parameterId==='pvc_floor_floor_waste_mass_t')).toBe(false);
 expect(s.parameters.some(p=>p.consumerInputRole==='APPLICATION_TECHNICAL')).toBe(false);expect(s.parameters.some(p=>p.parameterId===pack.profileId)).toBe(false);
 expect(parameters).not.toHaveProperty(pack.modeId);
 const n=fresh({catalog:c,draftId:'FRESH_FLOOR',parameters:{...defaults},missingParameterIds:[],userExplicitParameterIds:[],textExtractedParameterIds:[]});
 expect(n.parameters.find(p=>p.parameterId===pack.modeId)?.value).toBe(pack.plannedMode);
 expect(n.parameters.find(p=>p.parameterId===pack.wasteModeId)?.value).toBe(defaults[pack.wasteModeId]);
 expect(n.parameters.find(p=>p.parameterId===pack.barrierAreaId)?.value).toBeNull();
 const empty=fresh({catalog:c,draftId:'BEFORE_COMPILE',parameters:{},missingParameterIds:[]});
 expect(empty.parameters.find(p=>p.parameterId===pack.modeId)?.value).not.toBe(pack.legacyMode);
 expect(c.parameterSchema.find(p=>p.parameterId===pack.modeId)?.defaultValue).toBe(pack.plannedMode);
 for(const stage of pack.stages){const choices=n.parameters.find(p=>p.parameterId===stage.id)?.allowedValues??[];
  expect(choices.map(v=>v.value)).toEqual([stage.planned,stage.provided,stage.covered,stage.notRequired]);}
});

test('switching to legacy hides additional-service questions while retaining answers for a return to the plan',()=>{
 const c=catalog(parents.models[0]!),parameters={...defaults,[pack.wasteModeId]:waste.contractorModeValue,pvc_floor_floor_waste_mass_t:'0.75'};
 const session=(mode:string)=>fresh({catalog:c,draftId:'PVC_SERVICE_SWITCH',parameters:{...parameters,[pack.modeId]:mode},missingParameterIds:[]});
 const planned=session(pack.plannedMode);
 expect(planned.parameters.find(p=>p.parameterId==='pvc_floor_floor_waste_mass_t')?.value).toBe(0.75);
 const legacy=session(pack.legacyMode);
 for(const id of [pack.wasteModeId,'pvc_floor_floor_waste_mass_t','pvc_floor_haul_distance_km'])expect(legacy.parameters.some(p=>p.parameterId===id)).toBe(false);
 expect(session(pack.plannedMode).parameters.find(p=>p.parameterId==='pvc_floor_floor_waste_mass_t')?.value).toBe(0.75);
 expect(parameters.pvc_floor_floor_waste_mass_t).toBe('0.75');
});
test.each(parents.models)('floor area in the brief is reused and no barrier area is inferred: $definition.catalog_id',parent=>{
 const c=catalog(parent),plan=buildCanonicalBaselinePlan({catalog:c,prompt:'Разборка покрытия из ПВХ 35,5 м²'});
 expect(plan.primaryMeasureParameterId).toBe('floor_covering_area_m2');
 expect(plan.parameters.floor_covering_area_m2).toBe('35.5');
 expect(plan.parameters[pack.barrierAreaId]).toBeUndefined();expect(plan.parameters[pack.dustAreaId]).toBe('35.5');
});
