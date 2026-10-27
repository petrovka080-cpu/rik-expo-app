import {getCanonicalEstimateCatalogItem,getCanonicalEstimateRevisionHistory} from '../../lib/estimate/backendPlatform/canonicalEstimateClient';
import type {CanonicalEstimateCatalogItem,CanonicalEstimateRevisionView} from '../../lib/estimate/backendPlatform/contracts';
import {floorPreparationIntentBindingS2769 as pack} from '../../lib/estimate/backendPlatform/canonicalFloorPreparationIntentS2769';
import {resolveConsumerCanonicalRecalculationCatalog as resolve,consumerCanonicalInheritedRecalculationInputs as inherit,
 consumerCanonicalExplicitMigrationParameters as explicit,type ConsumerCanonicalReleaseMigrationPrompt} from './consumerCanonicalReleaseMigration';
jest.mock('../../lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevisionHistory:jest.fn()}));
const facts={floor_covering_area_m2:'35.5',waste_handling_mode:'retain',mechanism_fulfillment:'contractor'};
const schema=Object.keys(facts).map(parameterId=>({parameterId,semanticParameterKey:parameterId,titleRu:parameterId,
 valueType:parameterId==='floor_covering_area_m2'?'decimal':'enum',unitId:parameterId==='floor_covering_area_m2'?'m2':'condition',visibilityRole:'USER_INPUT',valueSourceRole:'USER_INPUT',
 constraints:{},resourceBranchConsumers:['old-demolition'],provenance:{consumer_input_role_v1:'OBJECT_FACT'}}));
const old={catalogId:pack.targets.find(t=>t.catalogId.includes('board_'))!.catalogId,releaseId:'old',workKey:'floor',definitionVersion:1,parameterSchema:schema} as unknown as CanonicalEstimateCatalogItem;
const next={...old,releaseId:'new',definitionVersion:2,parameterSchema:[...schema,{parameterId:pack.modeId,titleRu:'Состав подготовки',valueType:'enum',unitId:'condition',
 defaultValue:pack.plannedMode,runtimeProfileClassification:'ASSUMPTION',visibilityRole:'USER_INPUT',resourceBranchConsumers:['protection'],constraints:{values:[pack.plannedMode,pack.legacyMode]}}]} as unknown as CanonicalEstimateCatalogItem;
const parent={revisionId:'old-board',releaseId:'old',catalogId:old.catalogId,parameters:facts,userInputSnapshot:facts,currencyCode:'KGS',amendmentContract:{rowOverrides:{},customRows:[]}} as unknown as CanonicalEstimateRevisionView;
beforeEach(()=>{
 jest.clearAllMocks();
 (getCanonicalEstimateCatalogItem as jest.Mock).mockImplementation((_id:unknown,_ns:unknown,release:unknown)=>Promise.resolve(release==='old'?old:next));
 (getCanonicalEstimateRevisionHistory as jest.Mock).mockResolvedValue({revisions:[],nextCursor:null});
});
test('only actual consent to preserve composition adds a user intent; missing physical facts stay absent',async()=>{
 const confirm=jest.fn(async(_prompt:ConsumerCanonicalReleaseMigrationPrompt)=>true),r=await resolve({revision:parent,parameterPatchKeys:['floor_covering_area_m2'],confirmReleaseMigration:confirm});
 expect(confirm.mock.calls[0]![0]).toMatchObject({preserveFloorPreparationComposition:true});
 const supplied={...inherit(parent,r.catalog),...r.confirmedCompositionParameters,floor_covering_area_m2:'35.6'};
 const user=explicit(r.catalog,{...supplied},supplied);
 expect(user).toEqual({...facts,floor_covering_area_m2:'35.6',[pack.modeId]:pack.legacyMode});
 expect(user).not.toHaveProperty('existing_covering_confirmed');expect(user).not.toHaveProperty('object_conditions');
 expect(parent.parameters).toEqual(facts);
});
test('cancelled or absent consent never creates the choice',async()=>{
 await expect(resolve({revision:parent,confirmReleaseMigration:async()=>false})).rejects.toMatchObject({code:'RELEASE_MIGRATION_NOT_ACKNOWLEDGED'});
 await expect(resolve({revision:parent})).rejects.toMatchObject({code:'RELEASE_MIGRATION_NOT_ACKNOWLEDGED'});
});
test('an explicit new composition patch is admitted without replacing it with legacy',async()=>{
 const confirm=jest.fn(async(_prompt:ConsumerCanonicalReleaseMigrationPrompt)=>true),r=await resolve({revision:parent,parameterPatchKeys:[pack.modeId],confirmReleaseMigration:confirm});
 expect(confirm.mock.calls[0]![0]).not.toHaveProperty('preserveFloorPreparationComposition');
 expect(r.confirmedCompositionParameters).toBeUndefined();
});
test('the same-release descendant inherits the recorded choice without another consent',async()=>{
 const parameters={...facts,[pack.modeId]:pack.legacyMode},revision={...parent,releaseId:next.releaseId,parameters,userInputSnapshot:parameters};
 const confirm=jest.fn(async()=>true),r=await resolve({revision,confirmReleaseMigration:confirm});
 expect(confirm).not.toHaveBeenCalled();expect(r.releaseMigration).toBeUndefined();
 expect(inherit(revision,r.catalog)[pack.modeId]).toBe(pack.legacyMode);
});
