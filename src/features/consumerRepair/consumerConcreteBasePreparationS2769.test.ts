import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import type {CanonicalEstimateParameterSessionRevision} from '../../lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import {buildCanonicalBaselinePlan} from './consumerCanonicalBaselineCompile';
import {canonicalPublicEstimateChoiceLabelRu as label} from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import {canonicalApprovedBaselineRuntimeDefaultValue as defaultValue} from '../../lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {buildConsumerCanonicalParameterSession as saved,buildConsumerCanonicalPrecompileParameterSession as fresh} from './consumerCanonicalParameterEditor';
import {buildConcreteBasePlannedPreparationS2769 as build} from '../../lib/estimate/v4/concreteBasePlannedPreparationS2769';
import {floorPreparationFreshDefaultsS2769 as defaults} from '../../lib/estimate/backendPlatform/canonicalFloorPreparationIntentS2769';
import pack from '../../../data/estimate-benchmarks/source-packs/concrete-base-planned-preparation-two-s27-69.json';
import type {PurchaseGroupRepresentative as Model} from '../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../data/estimate-benchmarks/fixtures/concrete-base-two-parents-s27-69.json') as {models:Model[]};
test.each(parents.models)('public labels ask physical facts and preserve stored source choices: $definition.catalog_id',parent=>{
 const p=build(parent),material=p.parameters.find(p=>p.parameter_id==='existing_covering_confirmed')!,conditions=p.parameters.find(p=>p.parameter_id==='object_conditions')!;
 const materialValue=String(material.constraints_json.values[0]),conditionsValue=String(conditions.constraints_json.values[0]);
 expect(label(materialValue)).not.toMatch(/46-04|КРЕР/u);expect(label(conditionsValue)).toContain('пневматическим инструментом');
 expect(label(conditionsValue)).not.toMatch(/КРЕР|п\.1\.15|подтвердите/u);
 expect(material.constraints_json).toEqual(parent.parameters.find(p=>p.parameter_id===material.parameter_id)!.constraints_json);
 expect(conditions.constraints_json).toEqual(parent.parameters.find(p=>p.parameter_id===conditions.parameter_id)!.constraints_json);
});
function catalog(parent:Model):CanonicalEstimateCatalogItem{
 const r=build(parent);
 return {catalogId:String(parent.definition.catalog_id),releaseId:String(parent.definition.release_id),namespace:'global',workKey:'floor-preparation',titleRu:'Разборка бетонного основания',domain:'construction',
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
 expect(s.parameters.some(p=>p.consumerInputRole==='APPLICATION_TECHNICAL')).toBe(false);
 expect(parameters).not.toHaveProperty(pack.modeId);
 const n=fresh({catalog:c,draftId:'FRESH_FLOOR',parameters:{...defaults},missingParameterIds:[],userExplicitParameterIds:[],textExtractedParameterIds:[]});
 expect(n.parameters.find(p=>p.parameterId===pack.modeId)?.value).toBe(pack.plannedMode);
 expect(n.parameters.find(p=>p.parameterId===pack.barrierAreaId)?.value).toBeNull();
 const empty=fresh({catalog:c,draftId:'BEFORE_COMPILE',parameters:{},missingParameterIds:[]});
 expect(empty.parameters.find(p=>p.parameterId===pack.modeId)?.value).not.toBe(pack.legacyMode);
 expect(c.parameterSchema.find(p=>p.parameterId===pack.modeId)?.defaultValue).toBe(pack.plannedMode);
 for(const stage of pack.stages){const choices=n.parameters.find(p=>p.parameterId===stage.id)?.allowedValues??[];
  expect(choices.map(v=>v.value)).toEqual([stage.planned,stage.provided,stage.covered,stage.notRequired]);}
});
test.each(parents.models)('a volume stated once in the brief never becomes either independent surface area: $definition.catalog_id',parent=>{
 const c=catalog(parent),plan=buildCanonicalBaselinePlan({catalog:c,prompt:'Разборка бетонного основания 3,55 м³'});
 expect(plan.primaryMeasureParameterId).toBe('base_volume_m3');
 expect(plan.parameters.base_volume_m3).toBe('3.55');
 expect(plan.parameters[pack.barrierAreaId]).toBeUndefined();expect(plan.parameters[pack.dustAreaId]).toBeUndefined();
});
