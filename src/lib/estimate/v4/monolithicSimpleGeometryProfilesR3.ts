import {createRequire} from 'node:module';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Geometry={parameterId:string;templateParameterId:string;titleRu:string;unitId:string|null;valueType:string;constraints:Record<string,unknown>};
type Source={sourceId:string;artifactSha256:string;locator:string};
type Copy={fromParameterId:string;toParameterId:string};
type Profile={selectorValue:string;sources:Source[];when:Record<string,unknown>;geometryCopies:Copy[]};
type Target={kind:string;catalogId:string;parentDefinitionId:string;parentDefinitionSha256:string;geometry:Geometry[];
 unitCorrections:{parameterId:string;beforeUnitId:string|null;afterUnitId:string;basis:string}[];
 selection:{contract:'canonical-source-profile-selection/v1';selectorParameterId:string;geometryParameterIds:string[];profiles:Profile[]}};
export const MONOLITHIC_GEOMETRY_PROFILE_PACK_R3='data/estimate-benchmarks/source-packs/monolithic-simple-geometry-source-profiles-r3.json';
export const MONOLITHIC_GEOMETRY_PROFILE_PACK_SHA_R3='781ee5a906cb41f30d2e624738afac5835d5b56f76ff880b8c29df5a45d020ac';
const pack=createRequire(__filename)('../../../../'+MONOLITHIC_GEOMETRY_PROFILE_PACK_R3) as {targets:Target[]};
const requireThat=(value:unknown,code:string):void=>{if(!value)throw Error('MONOLITHIC_GEOMETRY_PROFILE_R3_'+code);};

/** Adds measured input declarations and immutable source-selection metadata to
 * the existing content model. This never evaluates a condition or a quantity;
 * the ordinary shared profile resolver and canonical compiler own those steps. */
export function applyMonolithicSimpleGeometryProfilesR3(model:Rep){
 const target=pack.targets.find(t=>t.catalogId===model.definition.catalog_id);
 requireThat(target&&target.parentDefinitionId===model.definition.id
  &&target.parentDefinitionSha256===model.definition.definition_sha256,'EXACT_CURRENT_PARENT');
 const t=target!,byId=new Map(model.parameters.map(p=>[p.parameter_id,p]));
 const input:Record<string,unknown>={};
 for(const correction of t.unitCorrections){
  const p=byId.get(correction.parameterId);
  requireThat(p&&p.unit_id===correction.beforeUnitId,'EXACT_UNIT_CORRECTION_PREIMAGE');
  p!.unit_id=correction.afterUnitId;
  p!.truth_metadata={...p!.truth_metadata,provenance:{...p!.truth_metadata.provenance,
   retained_geometry_unit_correction_r3:structuredClone(correction)}};
 }
 for(const geometry of t.geometry){
  const template=byId.get(geometry.templateParameterId);requireThat(template,'MEASURED_GEOMETRY_TEMPLATE');
  input[geometry.parameterId]=model.baseline.input_values[geometry.templateParameterId];
  if(geometry.parameterId===geometry.templateParameterId){
   template!.truth_metadata={...template!.truth_metadata,visible_when:{kind:'literal',value:true},
    provenance:{...template!.truth_metadata.provenance,
     retained_geometry_visibility_r3:structuredClone(template!.truth_metadata.visible_when??null)}};
   continue;
  }
  requireThat(!byId.has(geometry.parameterId),'NEW_GEOMETRY_NAMESPACE');
  const copies=t.selection.profiles.flatMap(p=>p.geometryCopies).filter(c=>c.fromParameterId===geometry.parameterId);
  const consumers=[...new Set(copies.flatMap(c=>byId.get(c.toParameterId)!.truth_metadata.resource_branch_consumers))];
  const p={...structuredClone(template!),parameter_id:geometry.parameterId,ordinal:model.parameters.length,
   title_ru:geometry.titleRu,unit_id:geometry.unitId,value_type:geometry.valueType,required:false,default_value:null,
   constraints_json:structuredClone(geometry.constraints),truth_metadata:{...structuredClone(template!.truth_metadata),
    visibility_role:'USER_INPUT',value_source_role:'USER_MEASURED',visible_when:{kind:'literal',value:true},
    semantic_parameter_key:model.definition.catalog_id+':'+geometry.parameterId,
    provenance:{consumer_input_role_v1:'OBJECT_FACT',geometry_copy_consumers_r3:copies.map(c=>c.toParameterId)},
    formula_consumers:[],resource_branch_consumers:consumers,
    guide:{...structuredClone(template!.truth_metadata.guide),guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_PRIMARY_FACT',
     guide_short_ru:'Укажите фактический размер или объём конструкции. Приложение само выберет проверенную ветвь расчёта в пределах источника.',
     guide_validation_policy:'MANDATORY_BLOCK'}}};
  model.parameters.push(p);byId.set(p.parameter_id,p);
 }
 for(const profile of t.selection.profiles)for(const copy of profile.geometryCopies){
  const from=byId.get(copy.fromParameterId),to=byId.get(copy.toParameterId);
  requireThat(from&&to&&from.unit_id===to.unit_id&&from.value_type===to.value_type,'IDENTITY_GEOMETRY_COPY_ONLY');
  to!.truth_metadata={...to!.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'BACKEND_DERIVED',
   provenance:{...to!.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',
    source_geometry_copy_v1:{contract:'canonical-source-geometry-copy/v1',fromParameterId:copy.fromParameterId,unitId:to!.unit_id}}};
 }
 const selector=byId.get(t.selection.selectorParameterId);
 requireThat(selector?.value_type==='enum','EXISTING_FINITE_SOURCE_SELECTOR');
 selector!.truth_metadata={...selector!.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',
  provenance:{...selector!.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  guide:{...selector!.truth_metadata.guide,
   guide_short_ru:'Расчётный профиль выбирается приложением по измерениям и зарегистрированному источнику. Выбор не подтверждает проект, ППР, армирование, комплект опалубки или оборудование.',
   guide_validation_policy:'APPLICATION_PRELIMINARY_SOURCE_PROFILE_NOT_OBJECT_DESIGN_APPROVAL'}};
 model.definition.applicability={...model.definition.applicability,sourceProfileSelectionV1:structuredClone(t.selection)};
 const consumers=buildMasterParameterCalculationConsumers(model);
 for(const p of model.parameters){p.truth_metadata={...p.truth_metadata,
  formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]};}
 return {geometryInput:input,geometryParameterIds:t.selection.geometryParameterIds,
  copiedParameterIds:[...new Set(t.selection.profiles.flatMap(p=>p.geometryCopies.map(c=>c.toParameterId)))],
  sources:t.selection.profiles.flatMap(p=>p.sources)};
}
