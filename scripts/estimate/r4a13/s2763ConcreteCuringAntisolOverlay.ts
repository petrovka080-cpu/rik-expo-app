import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {concreteCuringAntisolDefinitionS2763,concreteCuringAntisolPackS2763 as pack,concreteCuringAntisolOwnerS2763 as owner,concreteCuringAntisolSelectedS2763 as selected,concreteCuringAntisolLegacyS2763 as legacy} from '../../../src/lib/estimate/v4/concreteCuringAntisolMaterialS2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2763_CURING_ANTISOL_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,[pack.ownershipContract.legacyOwner]]));
export function overlayS2763ConcreteCuringAntisol(parent:PurchaseGroupRepresentative,locatorId:string) {
  const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
  if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion)throw Error('CURING_ANTISOL_PARENT_IDENTITY_DRIFT:'+catalogId);
  const result=structuredClone(parent),oldOwner=result.resources.find(r=>r.row_id===pack.ownershipContract.legacyOwner);
  if(!oldOwner||oldOwner.unit_id!=='l'||oldOwner.cost_owner_id!==oldOwner.row_id)throw Error('CURING_ANTISOL_ORIGINAL_OWNER_DRIFT');
  const contextPrefix=target.areaParameterId==='external_curing_exposed_curing_surface_area_m2'?'external_curing_':'';
  const shared=concreteCuringAntisolDefinitionS2763(contextPrefix);
  const changedLegacyIds=[oldOwner.row_id];
  // Keep old price/formula/source identity. Only explicit branch inclusion changes.
  oldOwner.inclusion_ast={kind:'and',operands:[oldOwner.inclusion_ast,legacy]};
  const rehash=(row:Record<string,any>)=>{const{row_sha256:_old,...body}=row;row.row_sha256=hash(body);};
  rehash(oldOwner);
  const oldFormula=result.formulas.find(f=>f.formula_id===oldOwner.formula_id);
  if(!oldFormula)throw Error('CURING_ANTISOL_OLD_FORMULA_MISSING');
  for(const p of result.parameters)if(oldFormula.input_parameter_ids.includes(p.parameter_id)||p.parameter_id===contextPrefix+'curing_compound_product_designation'){
    const when={kind:'and',operands:[{kind:'equals',parameterId:contextPrefix+'approved_external_curing_method',value:'MEMBRANE_CURING_COMPOUND'},legacy]};
    p.required=false;p.constraints_json={...p.constraints_json,requiredWhen:when};p.truth_metadata={...p.truth_metadata,required_when:when,visible_when:when};
  }
  let ordinal=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1;
  const addedParameterIds:string[]=[];
  for(const p of shared.parameters){const existing=result.parameters.find(v=>v.parameter_id===p.parameter_id);
    if(existing){if(![target.areaParameterId,contextPrefix+'approved_external_curing_method'].includes(p.parameter_id))throw Error('CURING_ANTISOL_PARAMETER_COLLISION:'+p.parameter_id);
      // Shared area/method keep their existing guides and source authority for all legacy branches.
    }else{result.parameters.push({...p,ordinal:ordinal++});addedParameterIds.push(p.parameter_id);}
  }
  result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
  let rowOrdinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
  const newRows=shared.resources.map(r=>{const{row_sha256:_old,...body}=r;const final={...body,ordinal:rowOrdinal++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,
    resource_graph:{...r.resource_graph,operationCompositionV1:oldOwner.resource_graph.operationCompositionV1}};return{...final,row_sha256:hash(final)};});
  result.resources.push(...newRows);
  const oldKit=result.resources.find(r=>r.row_id==='material:concrete:compound-curing-material-included-kit');
  if(oldKit){const originalInclusion=structuredClone(oldKit.inclusion_ast);
    oldKit.inclusion_ast={kind:'and',operands:[originalInclusion,legacy]};rehash(oldKit);changedLegacyIds.push(oldKit.row_id);
    const quoteId='antisol_exact_material_included_kit_quote_reference';
    const kitWhen={kind:'and',operands:[originalInclusion,selected]};
    result.parameters.push({parameter_id:quoteId,ordinal:ordinal++,value_type:'text',unit_id:null,title_ru:'Документ о комплекте, включённом в цену Antisol',required:false,default_value:null,
      constraints_json:{minLength:1,maxLength:1000,requiredWhen:kitWhen},truth_metadata:{...shared.parameters.find(p=>p.parameter_id==='antisol_retained_reserve_l')!.truth_metadata,
        value_source_role:'CONDITIONAL_PROJECT_FACT',visible_when:kitWhen,required_when:kitWhen,guide:{...oldKit.source_metadata.guide,
          guide_kind:'PROJECT_DEFINED',guide_short_ru:'Ссылка на фактическое предложение именно Antisol-250 W: перечисленные совместимые изделия и расходники с количеством каждого явно включены в его цену. Паспорт производителя такого комплекта не обещает. Без документа включение не подтверждено.',source_role:'ACTUAL_EXACT_PRODUCT_QUOTATION_AND_COUNTED_BOM',source_document:pack.sourceId,source_locator:'Actual exact-product quotation and counted BOM; PDS gives no kit or price inclusion',source_snapshot_hash:pack.source.sha256,guide_version:pack.contract,guide_validation_policy:'MANDATORY_BLOCK',applicability:pack.scopeRu,verified_at:'2026-10-11T10:54:00Z'}}});
    addedParameterIds.push(quoteId);
    const{row_sha256:_old,...kitBody}=oldKit;
    const newKit={...kitBody,row_id:oldKit.row_id+':antisol250w-us',ordinal:rowOrdinal++,title_ru:'Крепёж, герметизация и защитные расходники, включённые в подтверждённую цену Antisol-250 W',cost_owner_id:oldKit.row_id+':antisol250w-us',semantic_owner:catalogId+':'+oldKit.row_id+':antisol250w-us',
      inclusion_ast:kitWhen,resource_graph:{...oldKit.resource_graph,includedInResourceOwnerRowId:owner,inputParameterIds:[...(oldKit.resource_graph.inputParameterIds??[]),quoteId],semanticOwnerId:catalogId+':'+oldKit.row_id+':antisol250w-us'},
      source_metadata:{...oldKit.source_metadata,sourceRole:'ACTUAL_EXACT_PRODUCT_QUOTATION_AND_COUNTED_BOM_REQUIRED',manufacturerKitInclusionClaimed:false}};
    result.resources.push({...newKit,row_sha256:hash(newKit)});
    result.bindings.push(...parent.bindings.filter(b=>b.row_id===oldKit.row_id).map(b=>({...b,row_id:newKit.row_id})));
  }
  result.bindings.push(...newRows.map(r=>({row_id:r.row_id,locator_id:locatorId,applicability:{contract:pack.contract,quantityQuality:'APPROXIMATE',sourcePages:[1,2],scopeRu:pack.scopeRu,fullTechnicalAcceptance:false}})));
  result.baseline.input_values.antisol_material_choice=pack.legacyProductRu;
  result.baseline.input_classification.antisol_material_choice='VALIDATION_FIXTURE';
  result.baseline.normative_source_ids.antisol_material_choice=[pack.sourceId];
  const consumers=buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
    if(!Object.hasOwn(result.baseline.normative_source_ids,id))result.baseline.normative_source_ids[id]=[];
    if(!Object.hasOwn(result.baseline.guide_provenance_ru,id))result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
  }
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.included_scope_ru=[...result.passport.included_scope_ru,'Отдельная материальная ветвь ухода за свежим бетоном: Antisol-250 W (США), однородная отделка щёткой, приблизительный расход по фактической площади; закупка канистрами19л.'];
  result.passport.decision={...result.passport.decision,materialSeriesContract:pack.contract,materialSourceScopeOnly:true,completeTechnicalEstimateAccepted:false,legacyPreliminarySourcesRemainUnaccepted:true};
  return{representative:result,legacyRowIds:changedLegacyIds,addedRowIds:result.resources.filter(r=>!parent.resources.some(o=>o.row_id===r.row_id)).map(r=>r.row_id),addedParameterIds,changedFormulaIds:shared.formulas.map(f=>f.formula_id),newPayableOwnerRowId:owner};
}
