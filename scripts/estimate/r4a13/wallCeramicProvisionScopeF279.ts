import assert from 'node:assert/strict';
import source from '../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-native-f266.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {CanonicalScopeRequirementV1} from '../../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import {WALL_METHOD_F271,WALL_CEMENT_F271,WALL_LEGACY_F271} from '../../../src/lib/estimate/v4/wallCeramicCementExistingOwnerF271';

export const WALL_SUBSTRATE_NEED_F279='tile-wall:kg15-01901:need:substrate';
export const WALL_SUBSTRATE_FACT_F279='wall019_substrate_readiness';
export const WALL_SUBSTRATE_READY_F279='Фактически подготовлено под выбранную цементную облицовку';
export const WALL_SUBSTRATE_REQUIRED_F279='Требуется отдельная подготовка основания';
export const WALL_SUBSTRATE_UNKNOWN_F279='Не установлено';

/** An object-state companion, never a numeric preparation norm or a PPR receipt.
 * The six provision quantities remain null. In particular this declares no
 * chipping area, preparation labour, stock, purchase, price or execution charge.
 * Apply only through a future reviewed ordinary Config, after the frozen R07
 * finite gate. This file does not modify or register that Config. */
export function wallSubstrateScopeRequirementF279():CanonicalScopeRequirementV1{
 return{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',
  groupId:WALL_SUBSTRATE_NEED_F279,groupTitleRu:'Подготовка основания',titleRu:'Готовность основания под цементную облицовку',
  reasonRu:'Готовность фактической плоской кирпичной или бетонной стены — исходное состояние объекта. §1.9 относит требуемую насечку к отдельным работам; колонка019-01 не даёт их положительного количества. Готовое основание не создаёт новую оплату.',
  exactScopeWhen:{kind:'and',operands:[{kind:'equals',parameterId:WALL_METHOD_F271,value:WALL_CEMENT_F271},
   {kind:'equals',parameterId:WALL_SUBSTRATE_FACT_F279,value:WALL_SUBSTRATE_READY_F279}]},
  sourceEvidence:[{sha256:source.sourceArtifact.sha256,locator:'КРЕР15; удержанная техническая часть §1.9; выбранная колонка15-01-019-01,PDF56–58'}],
  coveringRowIds:[],originalRowIds:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:WALL_SUBSTRATE_FACT_F279,
  unknownObjectValues:[WALL_SUBSTRATE_UNKNOWN_F279]};
}

/** Concrete owner-local composition of existing contracts, not a second engine.
 * Keeps all 81 formulas, 81 row IDs, 10 old parameters and every paid owner.
 * One ordinary fact field is added. The old unresolved preparation quantity is
 * retained; attaching a scope decision does not replace it with zero or a kit.
 * Normal/locked retention and finite validation of this future composition are
 * intentionally pending; no verifyCore callback or publisher bypass is added. */
export function withWallSubstrateScopeF279(model:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 assert.equal(source.catalogId,'canonical-work:base:tile_stone_interior_tile_wall_lay_standard');
 assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[10,81,81]);
 assert(!model.parameters.some(p=>p.parameter_id===WALL_SUBSTRATE_FACT_F279));
 const old=model.resources.find(r=>r.row_id===WALL_SUBSTRATE_NEED_F279);assert(old);
 assert.equal(old.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(old.unit_id,'');assert.equal(old.procurement_eligible,false);
 const fact=buildAutomaticConstructionOwnerR1({contract:'existing-wall-substrate-object-scope/f279',
  semanticOwner:'tile-wall:kg15-01901:existing-substrate-state',sourceId:source.sourceKey,normId:'OBJECT_STATE_NOT_NUMERIC_NORM',
  sourceMetadata:{source_title:'Готовность основания под цементную облицовку',source_document_version:'КРЕР15-2015,§1.9',
   definition_hash:source.sourceArtifact.sha256,exact_locator:'Техническая часть§1.9;не норма подготовки в019-01'},applicabilityRu:source.scopeRu,
  ordinary:[{id:WALL_SUBSTRATE_FACT_F279,title:'Готовность основания под выбранную облицовку',kind:'ordinary',valueType:'enum',unitId:null,
   values:[WALL_SUBSTRATE_READY_F279,WALL_SUBSTRATE_REQUIRED_F279,WALL_SUBSTRATE_UNKNOWN_F279]}],
  profile:[],conditional:[],rows:[],excludedUnownedAssumptions:['Ответ не является нормой подготовки,ППР,заказом,остатком или подтверждением оплаты.']});
 const parameters=[...model.parameters,...fact.parameters.map((p,index)=>({...p,ordinal:model.parameters.length+index,required:false,default_value:null,
  constraints_json:{...p.constraints_json,forbiddenWhen:{kind:'equals',parameterId:WALL_METHOD_F271,value:WALL_LEGACY_F271}},
  truth_metadata:{...p.truth_metadata,visible_when:{kind:'equals',parameterId:WALL_METHOD_F271,value:WALL_CEMENT_F271},
   preliminary_compilation_allowed:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',project_approval_claimed:false}}}))];
 const resources=model.resources.map(r=>{
  if(r.row_id!==WALL_SUBSTRATE_NEED_F279)return r;
  const{row_sha256:_old,...body}=r;
  const next={...body,resource_graph:{...body.resource_graph,scopeRequirementV1:wallSubstrateScopeRequirementF279()}};
  return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 return{...model,parameters,resources,ordinaryParameterIds:[...model.ordinaryParameterIds,WALL_SUBSTRATE_FACT_F279]};
}
