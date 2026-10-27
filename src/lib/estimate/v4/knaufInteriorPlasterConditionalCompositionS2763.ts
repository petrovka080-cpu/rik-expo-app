import pack from '../../../../data/estimate-benchmarks/source-packs/knauf-interior-plaster-conditional-composition-five-s27-63.json';
import {knaufInteriorPlasterPackS2763 as material} from './knaufInteriorPlasterMaterialsS2763';
export const knaufInteriorPlasterConditionalCompositionPackS2763=pack;
export const knaufPlasterManualScopeGuardS2763={kind:'equals',parameterId:'interior_plaster_material_system',value:material.manualChoiceRu};


/** A missing project fact remains undecided. Only the exact documented
 * non-applicability answer removes a physical need; it never supplies a norm. */
export function knaufPlasterRetainedScopeNeedGuardS2763(fact:typeof pack.facts[number]) {
  return {kind:'and',operands:[knaufPlasterManualScopeGuardS2763,
    {kind:'not',operand:{kind:'equals',parameterId:fact.parameterId,value:fact.notApplicableValueRu}}]};
}

export function knaufPlasterScopeParameterS2763(fact:typeof pack.facts[number],catalogId:string,ordinal:number) {
  const source=pack.source,locator='PDF'+fact.pdfPages.join(',')+'; '+fact.sourceLocatorRu;
  return {parameter_id:fact.parameterId,ordinal,value_type:'enum',unit_id:null,title_ru:fact.titleRu,required:false,default_value:null,
    constraints_json:{values:fact.choicesRu,requiredWhen:knaufPlasterManualScopeGuardS2763},
    truth_metadata:{contract:pack.contract,synthetic:false,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',
      source_confirmation_required:false,input_origin_class:'APPROVED_PROJECT_OR_METHOD_STATEMENT',hidden_default_forbidden:true,
      preliminary_compilation_allowed:true,runtime_profile_value:false,visible_when:knaufPlasterManualScopeGuardS2763,
      semantic_parameter_key:catalogId+':'+fact.parameterId,provenance:{consumer_input_role_v1:'ADVANCED_OPTION'},
      guide:{guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',guide_version:pack.contract,guide_validation_policy:'MANDATORY_BLOCK',
        guide_short_ru:fact.guideRu+' Ответ относится только к этому участку. Неизвестное не означает отсутствие ресурса. Известный расход материалов можно сохранить без этого уточнения.',
        applicability:pack.scopeRu,source_id:source.id,source_title:source.titleRu,source_document:source.id,source_document_version:source.printedEdition,
        source_snapshot_hash:source.sha256,source_sha256:source.sha256,source_artifact_sha256:source.sha256,definition_hash:source.sha256,artifact_sha256:source.sha256,
        source_locator:locator,exact_locator:locator,verified_at:source.reviewedAt}}};
}
