import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {canonicalApprovedBaselineRuntimeDefaultValue} from '../../lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides} from './consumerCanonicalParameterEditor';
import {buildAggressiveFloorProtectionDustCompleteS2769 as build,compileAggressiveFloorProtectionDustCompleteS2769 as compile,
 aggressiveFloorCompleteBindingS2769 as pack,aggressiveFloorPlannedDefaultsS2769 as defaults} from '../../lib/estimate/v4/aggressiveFloorProtectionDustCompleteS2769';
import {aggressiveFloorActualThicknessBindingS2769 as old,aggressiveFloorWorkScopeIdS2769 as work} from '../../lib/estimate/v4/aggressiveFloorActualThicknessScopeS2769';
import {canonicalPublicEstimateParameterTitleRu} from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import type {PurchaseGroupRepresentative} from '../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const frozen=require('../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v4-parents-and-barrier-s27-69.json') as {models:PurchaseGroupRepresentative[]};
test.each(frozen.models)('plain object facts keep exact stored inputs and all physical quantities: $definition.catalog_id',async parent=>{
 const before=JSON.stringify(parent),r=build(parent);
 const catalog={catalogId:String(parent.definition.catalog_id),releaseId:String(parent.definition.release_id),namespace:'global',workKey:'aggressive-floor',
  titleRu:String(r.definition.passport.canonicalRuName),domain:'construction',definitionVersion:5,applicability:r.definition.applicability,professionalMetadata:{},
  parameterSchema:r.parameters.map(p=>{const t=p.truth_metadata,g=t.guide??{};return{
   parameterId:p.parameter_id,semanticParameterKey:t.semantic_parameter_key,titleRu:p.title_ru,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,
   required:p.required,defaultValue:canonicalApprovedBaselineRuntimeDefaultValue(r.baseline,p.parameter_id),constraints:p.constraints_json,
   visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
   runtimeProfileClassification:r.baseline.input_classification[p.parameter_id],visibleWhen:t.visible_when,requiredWhen:t.required_when,
   guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,guideShortRu:g.guide_short_ru,
    guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash},
  };})} as CanonicalEstimateCatalogItem;
 const facts={floor_covering_area_m2:35.5,[old.actualThicknessParameterId]:35,[pack.barrierAreaParameterId]:12,[work]:old.workScopeValue};
 const session=buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'PUBLIC_FACTS_CONTROL',parameters:{...defaults,...facts},missingParameterIds:[],
  userExplicitParameterIds:Object.keys(facts),textExtractedParameterIds:[]});
 const area=session.parameters.find(p=>p.parameterId==='floor_covering_area_m2')!,scope=session.parameters.find(p=>p.parameterId===work)!;
 expect(area.label).toContain('Площадь цементного или бетонного покрытия');expect(area.label).not.toContain('25 мм');
 expect(scope.allowedValues).toHaveLength(1);expect(scope.allowedValues![0]!.value).toBe(old.workScopeValue);
 expect(scope.allowedValues![0]!.label).not.toContain('КРЕР');expect(scope.allowedValues![0]!.label).toContain('до 130 м');
 expect(scope.allowedValues![0]!.label).toContain('до 50 м');expect(scope.allowedValues![0]!.label).toContain('кислото- или жароупорного');
 const submitted=consumerCanonicalPrecompileParameterOverrides({session,patches:[]});
 expect(submitted[work]).toBe(old.workScopeValue);expect(submitted.floor_covering_area_m2).toBe(35.5);
 expect(submitted[old.actualThicknessParameterId]).toBe(35);expect(submitted[pack.barrierAreaParameterId]).toBe(12);
 expect(session.parameters.some(p=>p.consumerInputRole==='APPLICATION_TECHNICAL')).toBe(false);
 const result=await compile(parent,submitted);expect(result.preliminaryNeeds).toHaveLength(0);expect(result.rows).toHaveLength(20);
 expect(result.rows.find(row=>row.row_id.endsWith(':vacuum'))?.quantity).toBe('3.55');
 await expect(compile(parent,{...facts,[work]:scope.allowedValues![0]!.label})).rejects.toThrow();
 expect(JSON.stringify(parent)).toBe(before);
});
test('keeps unrelated thickness and source titles intact',()=>{
 const sourceTitle='Разборка цементного покрытия толщиной 25 мм';
 expect(canonicalPublicEstimateParameterTitleRu('other_area',sourceTitle)).toBe(sourceTitle);
 expect(canonicalPublicEstimateParameterTitleRu('floor_covering_area_m2','Площадь покрытия толщиной 40 мм')).toContain('40 мм');
});
