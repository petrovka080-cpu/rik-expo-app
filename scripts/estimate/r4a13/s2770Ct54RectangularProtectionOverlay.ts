import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ct54ReadyFacadeExactS2763} from '../../../src/lib/estimate/v4/ct54ReadyFacadeSeriesS2763';
import {ct54ProtectionPackS2770 as pack,ct54ProtectionChoiceIdS2770,ct54ProtectionFilmReplacementS2770,ct54ProtectionTapeReplacementS2770,ct54RectangularProtectionDefinitionS2770} from '../../../src/lib/estimate/v4/ct54RectangularProtectionS2770';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const sha256=(value:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');

export function overlayS2770Ct54RectangularProtection(parent:PurchaseGroupRepresentative,manufacturerLocatorId:string) {
  const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);
  if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion
    ||parent.passport.payload_sha256!==target.payloadSha256
    ||sha256(JSON.parse(JSON.stringify(parent)))!==target.parentInputSha256
    ||!manufacturerLocatorId.trim())throw Error('CT54_PROTECTION_EXACT_CURRENT_PARENT_REQUIRED');
  const result=structuredClone(parent),shared=ct54RectangularProtectionDefinitionS2770();
  for(const [id,replacement]of [[pack.oldOpenRows[0],ct54ProtectionFilmReplacementS2770],[pack.oldOpenRows[1],ct54ProtectionTapeReplacementS2770]] as const){
    const old=result.resources.find(r=>r.row_id===id);
    if(!old||old.source_metadata.sourceNormQuantityAccepted!==false)throw Error('CT54_PROTECTION_ORIGINAL_OPEN_OWNER_REQUIRED');
    const {row_sha256:_old,...body}=old;
    const updated={...body,inclusion_ast:{kind:'and',operands:[old.inclusion_ast,{kind:'not',operand:replacement}]},
      source_metadata:{...old.source_metadata,conditionalReplacement:{contract:pack.contract,originalCostOwnerId:old.cost_owner_id,
        originalFormulaId:old.formula_id,oldManualValuesPreserved:true,sourceNormAcceptedWhenNotReplaced:false}}};
    Object.assign(old,updated,{row_sha256:sha256(updated)});
  }
  for(const p of shared.parameters){
    if(result.parameters.some(old=>old.parameter_id===p.parameter_id))throw Error('CT54_PROTECTION_PARAMETER_COLLISION');
    result.parameters.push({...p,ordinal:result.parameters.length,truth_metadata:{...p.truth_metadata,semantic_parameter_key:target.catalogId+':'+p.parameter_id,
      visible_when:p.parameter_id===ct54ProtectionChoiceIdS2770?ct54ReadyFacadeExactS2763:{kind:'and',operands:[ct54ReadyFacadeExactS2763,p.truth_metadata.visible_when]}}});
  }
  for(const f of shared.formulas){
    if(result.formulas.some(old=>old.formula_id===f.formula_id))throw Error('CT54_PROTECTION_FORMULA_COLLISION');
    result.formulas.push({...f,ast_sha256:sha256(f.ast)});
  }
  const addedRowIds:string[]=[];
  for(const r of shared.resources){
    if(result.resources.some(old=>old.row_id===r.row_id))throw Error('CT54_PROTECTION_ROW_COLLISION');
    const {row_sha256:_old,...body}=r;
    const value={...body,ordinal:result.resources.length,row_type:r.category,semantic_owner:target.catalogId+':'+r.row_id,
      inclusion_ast:{kind:'and',operands:[ct54ReadyFacadeExactS2763,r.inclusion_ast]}};
    result.resources.push({...value,row_sha256:sha256(value)});
    addedRowIds.push(r.row_id);
    result.bindings.push({row_id:r.row_id,locator_id:manufacturerLocatorId,applicability:{contract:pack.contract,exactParentDefinitionId:target.predecessorDefinitionId,
      scopeRu:pack.scopeRu,geometryModel:pack.geometryModel,fullTechnicalAcceptance:false}});
  }
  const consumers=buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters){
    const id=p.parameter_id;
    p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];
    result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id]=p.unit_id;
    result.baseline.normative_source_ids[id]??=[];
    result.baseline.guide_provenance_ru[id]??=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
  }
  result.baseline.parameter_schema_sha256=sha256(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.decision={...result.passport.decision,rectangularProtectionContract:pack.contract,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
    completeTechnicalEstimateAccepted:false,wholeFacadeGroupComplete:false,rectangularProtectionScope:pack.scopeRu,
    rectangularProtectionClosurePolicy:'Only two original protection needs, only with complete compatible geometry and a proven tape layout; all other needs remain open',
    newPriceOwnersDoNotInheritOldFilmOrTapePrices:true};
  return {representative:result,addedRowIds,conditionallyReplacedRowIds:[...pack.oldOpenRows],originalDefinitionId:target.predecessorDefinitionId};
}
