import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {extractPromptOwnedProfessionalParameters} from './consumerCanonicalBaselineCompile';
import {buildCanonicalBaselinePlan} from '../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1';
import {interiorWallFinishingGeometryGroupDefinitionR3 as wallDefinition,interiorWallFinishingGeometryPackR3 as wallPack,
 interiorWallFinishingGeometryParameterR3 as wallParameter} from '../../lib/estimate/v4/interiorWallFinishingGeometryGroupR3';
import {ceramicFloorM150ResourceGroupDefinitionR2 as floorDefinition,ceramicFloorM150ResourceGroupPackR2 as floorPack}
 from '../../lib/estimate/v4/ceramicFloorCementMortarResourceGroupR2';
import {interiorWallFinishingCrewGroupDefinitionR4,interiorWallFinishingCrewPackR4} from '../../lib/estimate/v4/interiorWallFinishingCrewGroupR4';

function catalog(kind:'wall'|'floor'):CanonicalEstimateCatalogItem {
 const definition=kind==='wall'?wallDefinition():floorDefinition(),pack=kind==='wall'?wallPack:floorPack;
 return {catalogId:kind==='wall'?wallPack.selectedExistingCatalogId:floorPack.catalogId,releaseId:'CONTROL',namespace:'global',
  domain:'interior',workKey:'geometry-ingress',titleRu:pack.titleRu,definitionVersion:1,professionalMetadata:{},
  applicability:{primaryMeasureParameterId:kind==='wall'?wallParameter(wallPack.areaId):floorPack.primaryParameterId},
  parameterSchema:definition.parameters.map(p=>{const t=p.truth_metadata;return {
   parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,
   required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,
   visibilityRole:t?.visibility_role,valueSourceRole:t?.value_source_role,semanticParameterKey:t?.semantic_parameter_key,
   provenance:t?.provenance,formulaConsumers:t?.formula_consumers,resourceBranchConsumers:t?.resource_branch_consumers,
   preliminaryCompilationAllowed:t?.preliminary_compilation_allowed===true,
  };}) as CanonicalEstimateCatalogItem['parameterSchema']};
}

it('carries the actual wall group area from the request through the existing baseline ingress',()=>{
 const source=catalog('wall'),before=JSON.stringify(source),plan=buildCanonicalBaselinePlan({catalog:source,prompt:'Отделка стен VGT, площадь 20,1 м².'});
 expect(plan.parameters[wallParameter(wallPack.areaId)]).toBe('20.1');expect(JSON.stringify(source)).toBe(before);
});
it.each(['improved-wall-01','deep-primer-00603'] as const)('carries geometry into the current R4 finishing branch: %s',branch=>{
 const source=catalog('wall'),d=interiorWallFinishingCrewGroupDefinitionR4(branch);
 source.catalogId=interiorWallFinishingCrewPackR4.branches.find(b=>b.id===branch)!.catalogId;
 source.parameterSchema=d.parameters.map(p=>({parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,
  titleRu:p.title_ru,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,
  visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,
  semanticParameterKey:p.truth_metadata.semantic_parameter_key,provenance:p.truth_metadata.provenance,
  formulaConsumers:p.truth_metadata.formula_consumers})) as CanonicalEstimateCatalogItem['parameterSchema'];
 const plan=buildCanonicalBaselinePlan({catalog:source,prompt:'Стены VGT, площадь 20,1 м².'});
 expect(plan.parameters[wallParameter(wallPack.areaId)]).toBe('20.1');
 expect(Object.keys(plan.parameters).filter(id=>id.includes('need_'))).toEqual([]);
});

it.each(['Керамический пол 100 м²; плинтус 50 м.','Площадь пола 100 м², длина плинтуса 50 м.'])(
 'keeps two distinct measured geometries in the actual floor/skirting group: %s',prompt=>{
 const source=catalog('floor'),before=JSON.stringify(source),plan=buildCanonicalBaselinePlan({catalog:source,prompt});
 expect(plan.parameters[floorPack.primaryParameterId]).toBe('100');expect(plan.parameters[floorPack.skirtingLengthParameterId]).toBe('50');
 expect(JSON.stringify(source)).toBe(before);
});

it('preserves a later manual geometric edit over the original request',()=>{
 const plan=buildCanonicalBaselinePlan({catalog:catalog('floor'),prompt:'Керамический пол 100 м²; плинтус 50 м.',
  parameterOverrides:{[floorPack.skirtingLengthParameterId]:'52.5'}});
 expect(plan.parameters[floorPack.primaryParameterId]).toBe('100');expect(plan.parameters[floorPack.skirtingLengthParameterId]).toBe('52.5');
});

it.each(['Плинтус 100 мм.','Длина трубы 50 м.','Плинтус 50 м; плинтус 60 м.'])(
 'does not turn a product dimension, another object or contradictory lengths into the measured perimeter: %s',prompt=>{
 expect(extractPromptOwnedProfessionalParameters(catalog('floor').parameterSchema,prompt)).not.toHaveProperty(floorPack.skirtingLengthParameterId);
});

it('does not extract a labelled quantity into hidden or application-owned parameters',()=>{
 for(const patch of [{visibilityRole:'INTERNAL_ONLY' as const},{provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}]){
  const schema=catalog('floor').parameterSchema.map(p=>p.parameterId===floorPack.skirtingLengthParameterId?{...p,...patch,
   provenance:{...p.provenance,...('provenance' in patch?patch.provenance:{})}}:p);
  expect(extractPromptOwnedProfessionalParameters(schema,'Плинтус 50 м.')).not.toHaveProperty(floorPack.skirtingLengthParameterId);
 }
});

it('keeps a label unresolved when two editable fields claim the same measured quantity',()=>{
 const schema=catalog('floor').parameterSchema,original=schema.find(p=>p.parameterId===floorPack.skirtingLengthParameterId)!;
 const values=extractPromptOwnedProfessionalParameters([...schema,{...original,parameterId:'second_skirting_length_m'}],'Плинтус 50 м.');
 expect(values).not.toHaveProperty(original.parameterId);expect(values).not.toHaveProperty('second_skirting_length_m');
});
