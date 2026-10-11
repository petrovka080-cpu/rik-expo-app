import {createHash} from 'node:crypto';import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {pvc15CleanerDefinitionS2763,pvc15CleanerPackS2763 as pack,pvc15CleanerOwnerS2763 as owner,pvc15CleanerLegacyS2763 as legacy} from '../../../src/lib/estimate/v4/pvc15Cleaner472219MaterialS2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2763_PVC15_CLEANER_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,[pack.ownershipContract.legacyOwner]]));
export function overlayS2763Pvc15Cleaner(parent:PurchaseGroupRepresentative,locatorId:string){
 const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion)throw Error('PVC15_CLEANER_PARENT_IDENTITY_DRIFT');
 const result=structuredClone(parent),oldOwner=result.resources.find(r=>r.row_id===pack.ownershipContract.legacyOwner);
 if(!oldOwner||oldOwner.unit_id!=='l'||oldOwner.cost_owner_id!==oldOwner.row_id)throw Error('PVC15_CLEANER_ORIGINAL_OWNER_DRIFT');
 const oldFormula=result.formulas.find(f=>f.formula_id===oldOwner.formula_id);if(!oldFormula)throw Error('PVC15_CLEANER_OLD_FORMULA_MISSING');
 const originalInclusion=structuredClone(oldOwner.inclusion_ast);
 oldOwner.inclusion_ast={kind:'and',operands:[originalInclusion,legacy]};const{row_sha256:_old,...oldBody}=oldOwner;oldOwner.row_sha256=hash(oldBody);
 for(const p of result.parameters)if(oldFormula.input_parameter_ids.includes(p.parameter_id)||p.parameter_id==='pvc15_cleaner_specification'){
 const when={kind:'and',operands:[originalInclusion,legacy]};p.required=false;p.constraints_json={...p.constraints_json,requiredWhen:when};p.truth_metadata={...p.truth_metadata,required_when:when,visible_when:when};}
 const shared=pvc15CleanerDefinitionS2763();let ordinal=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1;
 const sharedMode=shared.parameters.find(p=>p.parameter_id==='pvc15_cleaner_mode')!;
 const existingMode=result.parameters.find(p=>p.parameter_id===sharedMode.parameter_id);
 if(!existingMode||existingMode.default_value!=null||existingMode.unit_id!==sharedMode.unit_id||existingMode.value_type!==sharedMode.value_type||JSON.stringify(existingMode.constraints_json.values)!==JSON.stringify(sharedMode.constraints_json?.values))throw Error('PVC15_CLEANER_EXISTING_MODE_DRIFT');
 existingMode.title_ru=sharedMode.title_ru;
 existingMode.truth_metadata={...existingMode.truth_metadata,source_confirmation_required:false,provenance:{...existingMode.truth_metadata.provenance,consumer_input_role_v1:'OBJECT_FACT'},guide:{...existingMode.truth_metadata.guide,guide_short_ru:'Выберите фактическую потребность в очистке или отдельной активации ПВХ-мембраны по технологии этой работы. Отдельная активация даже чистого полотна требует ответа «Требуется» и проектной ветви продукта. Ответ «Не требуется» допустим только когда ни очистка, ни отдельная активация не нужны. Нормы расхода приложение получает само.'}};
 const addedParameters=shared.parameters.filter(p=>p.parameter_id!==sharedMode.parameter_id);
 const addedParameterIds=addedParameters.map(p=>p.parameter_id);for(const p of addedParameters){if(result.parameters.some(v=>v.parameter_id===p.parameter_id))throw Error('PVC15_CLEANER_PARAMETER_COLLISION');result.parameters.push({...p,ordinal:ordinal++});}
 result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));let rowOrdinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 const newRows=shared.resources.map(r=>{const{row_sha256:_old,...body}=r;const final={...body,ordinal:rowOrdinal++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,resource_graph:{...r.resource_graph,operationCompositionV1:oldOwner.resource_graph.operationCompositionV1}};return{...final,row_sha256:hash(final)};});
 result.resources.push(...newRows);result.bindings.push(...newRows.map(r=>({row_id:r.row_id,locator_id:locatorId,applicability:{contract:pack.contract,sourcePages:[1],scopeRu:pack.scopeRu,fullTechnicalAcceptance:false}})));
 result.baseline.input_values.pvc15_cleaner_product_choice=pack.legacyProductRu;result.baseline.input_classification.pvc15_cleaner_product_choice='VALIDATION_FIXTURE';result.baseline.normative_source_ids.pvc15_cleaner_product_choice=[pack.sourceId];
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:`${catalogId}:${id}`,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
 if(!Object.hasOwn(result.baseline.normative_source_ids,id))result.baseline.normative_source_ids[id]=[];if(!Object.hasOwn(result.baseline.guide_provenance_ru,id))result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.decision={...result.passport.decision,materialSourceScopeOnly:true,completeTechnicalEstimateAccepted:false,legacyPreliminarySourcesRemainUnaccepted:true};
 return{representative:result,legacyRowIds:[oldOwner.row_id],addedRowIds:newRows.map(r=>r.row_id),addedParameterIds,changedFormulaIds:[],newPayableOwnerRowId:owner};
}
