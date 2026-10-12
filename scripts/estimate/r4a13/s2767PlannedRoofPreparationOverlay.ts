// Source-bound integration into the existing immutable definition publisher.
import {createHash} from 'node:crypto';
import {sourcePinnedRoofNormOwnerR1} from '../../../src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
import type {SourcePinnedRoofNormPackR1} from '../../../src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {ROOF_PLANNED_PRIMER_CONDITIONS_V1,ROOF_PLANNED_PRIMER_GUIDE_V1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofPlannedPreparationV1';
import {extendRoofPlannedPreparationConditionV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofPreparationMigrationV1';
export const plannedConditionsRu=ROOF_PLANNED_PRIMER_CONDITIONS_V1;
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export function overlayPlannedRoofPreparation(parent:PurchaseGroupRepresentative,field:SourcePinnedRoofNormPackR1,primer:SourcePinnedRoofNormPackR1,locatorId:string) {
 const result=structuredClone(parent),contract='rik-expo-app.s27-67.integrated-planned-roof-priming.v1';
 if(parent.definition.definition_version!==5||parent.resources.length!==128)throw Error('EXACT_FIELD_PARENT_REQUIRED');
 const extend=extendRoofPlannedPreparationConditionV1;
 const conditions=result.parameters.find(p=>p.parameter_id===field.conditionsParameterId);if(!conditions)throw Error('CONDITIONS_PARENT_MISSING');
 const owner=sourcePinnedRoofNormOwnerR1({...primer,contract,systemParameterId:field.systemParameterId,conditionsParameterId:field.conditionsParameterId,areaParameterId:field.areaParameterId,systemYesRu:field.systemYesRu,conditionsYesRu:plannedConditionsRu,areaYesRu:field.areaYesRu});
 const oldConstraint=conditions.constraints_json;
 function addChoice(value:unknown):any{if(Array.isArray(value))return value.includes(field.conditionsYesRu)?[...value,plannedConditionsRu]:value.map(addChoice);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,addChoice(v)]));return value;}
 conditions.constraints_json=addChoice(oldConstraint);
 const guide=conditions.truth_metadata.guide;conditions.truth_metadata={...conditions.truth_metadata,guide:{...guide,guide_short_ru:ROOF_PLANNED_PRIMER_GUIDE_V1}};
 for(const row of result.resources) {
  row.inclusion_ast=extend(row.inclusion_ast);
  const scope=row.resource_graph.scopeRequirementV1;
  if(scope)row.resource_graph={...row.resource_graph,scopeRequirementV1:{...scope,exactScopeWhen:extend(scope.exactScopeWhen),
   ...(scope.satisfiedWhen&&scope.groupId!=='primer'?{satisfiedWhen:extend(scope.satisfiedWhen)}:{})}};
 }
 // Coverage is evaluated in resource order. Insert the three quantities
 // before the existing semantic primer obligation, keeping older numeric
 // field/legacy rows and their identities in their original order.
 const primerScope=result.resources.find(row=>row.row_id===field.prefix+':source-gap:primer');if(!primerScope)throw Error('PRIMER_SCOPE_MISSING');
 let ordinal=primerScope.ordinal;
 for(const row of result.resources)if(row.ordinal>=ordinal)row.ordinal+=3;
 const addedRows=owner.resources.map(row=>({...row,ordinal:ordinal++,row_type:row.category,semantic_owner:parent.definition.catalog_id+':'+row.row_id,cost_owner_id:parent.definition.catalog_id+':'+row.cost_owner_id}));
 if(addedRows.length!==3||addedRows.some(row=>parent.resources.some(old=>old.row_id===row.row_id)))throw Error('PRIMER_RESOURCE_OWNER_COLLISION');
 result.formulas.push(...owner.formulas.map(formula=>({...formula,ast_sha256:hash(formula.ast)})));
 result.resources.push(...addedRows);
 result.resources.sort((left,right)=>left.ordinal-right.ordinal);
 for(const row of addedRows)result.bindings.push({row_id:row.row_id,locator_id:locatorId,applicability:{contract,normId:primer.normId,numericQuantityAdmitted:true,completeTechnicalEstimateAccepted:false}});
 const s=primerScope.resource_graph.scopeRequirementV1;
 primerScope.resource_graph={...primerScope.resource_graph,scopeRequirementV1:{...s,kind:'INCLUDED',coveringRowIds:addedRows.map(row=>row.row_id),reasonRu:'Перед наплавлением огрунтовка должна высохнуть и быть принята. Исключение её стоимости не подтверждает готовность основания. Запланированная огрунтовка готовой совместимой эмульсией входит в эту смету. Уже выполненная огрунтовка не начисляется повторно; её прежняя марка и стоимость не восстанавливаются по одному факту готовности.',sourceEvidence:[...s.sourceEvidence,{sha256:primer.sources.find(source=>source.kind==='roof')!.sha256,locator:primer.sources.find(source=>source.kind==='roof')!.locators}]}};
 for(const row of result.resources){const {row_sha256:_old,...body}=row;row.row_sha256=hash(body);}
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];}
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.decision={...result.passport.decision,plannedPreparationContract:contract,quantityScope:'PARTIAL',newNumericNormClosures:3,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
 result.definition.passport={...result.definition.passport,plannedPreparationContract:contract,rowCount:result.resources.length,fullTechnicalEstimateAccepted:false};
 return {representative:result,addedRowIds:addedRows.map(row=>row.row_id),changedFormulaIds:[],addedParameterIds:[],candidatePublished:false};
}
