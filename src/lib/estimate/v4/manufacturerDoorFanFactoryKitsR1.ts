import artifact from '../../../../data/estimate-benchmarks/source-packs/manufacturer-door-fan-factory-kits-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {canonicalEstimateStableJson as stable} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as sha} from '../backendPlatform/canonicalEstimateSha256';
import {estimateDeterministicHash as rowHash} from '../estimateDeterministicHash';

type Json=Record<string,any>;
type Bom={key:string;rowId:string;formulaId:string;titleRu:string;category:string;unitId:string;
 countPerFactoryUnit:string;sourceKey:string;costTreatment:'INCLUDED_IN_RESOURCE_ROWS';paidOwnerRowId:string;procurement:false;quantityMeaning?:string};
type Expected={rowId:string;formulaId:string;category:string;unitId:string;multiplier:string;costTreatment:string;procurement:boolean;parentRowId?:string;requiredOperationIds:string[]};
type Profile={key:string;family:string;choiceValue:string;prefix:string;ownerTitleRu:string;ownerUnitId:string;sourceKeys:string[];
 manufacturerModelInternal:string;factoryResultComplete:boolean;deliveryBomComplete:boolean;scopeRu:string;diameterMm?:number;timer?:boolean;
 ownerRowId:string;ownerFormulaId:string;operationId:string;useOperationId:string;bom:Bom[];independentExpected:Expected[]};
type Need={key:string;rowId:string;formulaId:string;parameterId:string;titleRu:string;category:string;unitId:string;reasonRu:string;operationId:string};
type Target={key:string;catalogId:string;family:string;sourceId:string;definitionVersionId:string;definitionVersion:number;definitionSha256:string;
 captureValueSha256:string;shape:[number,number,number];legacyPrimaryUnit:string;publicTitleRu:string;profileKeys:string[]};
type Pack={contract:string;selectorId:string;legacyChoice:string;countParameterId:string;parentSnapshot:string;parentSnapshotSha256:string;masterSha256:string;
 sources:{key:string;path:string;sha256:string;officialUrl:string;locator:string;sourceVersion:string}[];targets:Target[];profiles:Profile[];needs:Record<string,Need[]>;
 sourceBoundaries:string[];procurementScope:string};
export const manufacturerDoorFanFactoryKitsPackR1=artifact as unknown as Pack;
const pack=manufacturerDoorFanFactoryKitsPackR1;
const captured=require('../../../../data/estimate-benchmarks/fixtures/manufacturer-door-fan-current-parents-r1.json') as {captures:Json[];readOnly:boolean;sessionTimeZone:string;newSources:unknown[]};
export type ManufacturerFactoryParentR1={definition:Json;baseline:Json;parameters:Json[];formulas:Json[];resources:Json[];bindings:Json[];normativeSources:Json[];normativeLocators:Json[]};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function targetFor(catalogId:string):Target{const t=pack.targets.find(t=>t.catalogId===catalogId);if(!t)throw Error('FACTORY_KIT_R1_EXACT_CURRENT_TARGET_REQUIRED');return t;}
export function manufacturerFactoryParentR1(catalogId:string):ManufacturerFactoryParentR1{
 const raw=captured.captures.find(c=>c.definition.catalog_id===catalogId);if(!raw||captured.readOnly!==true)throw Error('FACTORY_KIT_R1_READONLY_PARENT_REQUIRED');
 const c=Object.fromEntries(['definition','baseline','parameters','formulas','resources','bindings','normativeSources','normativeLocators']
  .map(k=>[k,['bindings','normativeSources','normativeLocators'].includes(k)?raw[k]??[]:raw[k]])) as ManufacturerFactoryParentR1;
 const t=targetFor(catalogId);
 if(c.definition.id!==t.definitionVersionId||c.definition.definition_version!==t.definitionVersion||c.definition.definition_sha256!==t.definitionSha256
  ||sha(stable(c))!==t.captureValueSha256||stable([c.parameters.length,c.formulas.length,c.resources.length])!==stable(t.shape))throw Error('FACTORY_KIT_R1_EXACT_FULL_PARENT_PREIMAGE_REQUIRED');
 return clone(c);
}
export function manufacturerFactoryProfilesR1(catalogId:string):Profile[]{const t=targetFor(catalogId);return pack.profiles.filter(p=>t.profileKeys.includes(p.key));}
export function manufacturerFactoryPrimarySelectionR1(catalogId:string){const t=targetFor(catalogId);return{contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.selectorId,
 selections:[{selectorValue:pack.legacyChoice,primaryMeasureParameterId:'q',unitId:t.legacyPrimaryUnit},...manufacturerFactoryProfilesR1(catalogId).map(p=>({selectorValue:p.choiceValue,primaryMeasureParameterId:pack.countParameterId,unitId:t.legacyPrimaryUnit}))]};}
type FactoryResourceKind='MATERIAL'|'CONSUMABLE'|'TOOL'|'ACCESSORY'|'EQUIPMENT'|'MECHANISM'|'LABOR'|'SERVICE'|'TRANSPORT'|'PPE';
/** Explicit source-owned key declarations; financial categories remain unchanged. */
const onsiteResourceKinds:Readonly<Record<string,FactoryResourceKind>>={
 'site-fittings':'MATERIAL','opening-preparation':'LABOR','site-anchors':'MATERIAL','foam-sealant':'CONSUMABLE',
 'reveals-trims':'MATERIAL','installation-labour':'LABOR','perforator':'TOOL','drill-bit':'ACCESSORY',
 'powered-screwdriver':'TOOL','marking-pencil':'TOOL','screwdrivers':'TOOL','hammer':'TOOL','level':'TOOL',
 'nail-puller':'TOOL','measuring-tape':'TOOL','knife':'TOOL','sprayer':'TOOL','access':'EQUIPMENT','ppe':'PPE',
 'delivery-handling':'TRANSPORT','packaging-protection':'MATERIAL','cleanup-waste':'SERVICE',
 'site-fixings':'MATERIAL','duct-interface':'MATERIAL','electrical-cable':'MATERIAL','isolator':'EQUIPMENT',
 'drill':'TOOL','screwdriver':'TOOL','electrical-tools':'TOOL',
};
function onsiteResourceKind(g:Need):FactoryResourceKind{
 const kind=onsiteResourceKinds[g.key];if(!kind)throw Error('FACTORY_KIT_R1_EXPLICIT_RESOURCE_KIND_REQUIRED');return kind;
}
/** Resource names are not process headings. Keep separately authored site/logistics
 * stages, and bind installation resources to the existing physical using stage. */
function onsiteOperation(g:Need,profiles:Profile[],family:string){
 const independent:Record<string,string>={
  'opening-preparation':'Подготовка и восстановление дверного проёма',
  'reveals-trims':'Устройство доборов, откосов и отделка примыканий двери',
  'duct-interface':'Устройство воздуховода и примыкания выбранного вентилятора',
  'delivery-handling':g.titleRu,
  'cleanup-waste':g.titleRu,
  'packaging-protection':'Упаковка и защита дверного блока при доставке и монтаже',
 };
 if(Object.hasOwn(independent,g.key))return{operationId:g.operationId,operationTitleRu:independent[g.key]!};
 const ids=[...new Set(profiles.map(p=>p.useOperationId))];
 if(ids.length!==1)throw Error('FACTORY_KIT_R1_ONE_AUTHORED_INSTALLATION_OPERATION_REQUIRED');
 return{operationId:ids[0]!,operationTitleRu:family==='hvac'?'Установка и подключение вытяжного вентилятора':'Установка и регулировка дверного блока'};
}
const eq=(value:string)=>({kind:'equals' as const,parameterId:pack.selectorId,value});
const rehash=(r:Json)=>{const{row_sha256:_hash,...body}=r;return{...body,row_sha256:rowHash(body)};};
/** Same-catalog explicit successor. Only source-declared manufactured physical
 * results are complete. Generic arithmetic is retained on EXPLICIT legacy;
 * factory selection never inherits generic rates, baseline q or onsite quantities. */
export function manufacturerDoorFanFactoryDefinitionR1(catalogId:string):AutomaticOwnerDefinition{
 const t=targetFor(catalogId),parent=manufacturerFactoryParentR1(catalogId),profiles=manufacturerFactoryProfilesR1(catalogId),needs=pack.needs[t.family]!,
  legacy=eq(pack.legacyChoice),selected={kind:'or' as const,operands:profiles.map(p=>eq(p.choiceValue))},rows:AutomaticRowSpec[]=[];
 for(const need of needs)if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(need.parameterId))throw Error('FACTORY_KIT_R1_FORMULA_PARAMETER_IDENTIFIER_REQUIRED');
 const ordinary:AutomaticParameterSpec[]=[
  {id:pack.selectorId,title:'Какой расчёт изделия нужен?',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.legacyChoice,...profiles.map(p=>p.choiceValue)]},
 ];
 const conditional:AutomaticParameterSpec[]=[{id:pack.countParameterId,title:t.family==='hvac'?'Количество одинаковых заводских комплектов вентилятора':'Количество одинаковых собранных дверных блоков',valueType:'integer',unitId:t.legacyPrimaryUnit,kind:'conditional',min:1,max:1000000,requiredWhen:selected},
  ...needs.map(g=>({id:g.parameterId,title:g.titleRu,valueType:'decimal' as const,unitId:g.unitId,kind:'conditional' as const,min:0}))];
 for(const p of profiles){
  rows.push({rowId:p.ownerRowId,formulaId:p.ownerFormulaId,title:p.ownerTitleRu,section:'Заводское изделие',category:'material',unitId:p.ownerUnitId,
   expression:pack.countParameterId,procurement:true,costTreatment:'OWN_COST',inclusion:eq(p.choiceValue)});
  for(const b of p.bom)rows.push({rowId:b.rowId,formulaId:b.formulaId,title:b.titleRu,section:'Состав заводского изделия',category:b.category,unitId:b.unitId,
   expression:pack.countParameterId+'*'+b.countPerFactoryUnit,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:eq(p.choiceValue)});
 }
 for(const g of needs)rows.push({rowId:g.rowId,formulaId:g.formulaId,title:g.titleRu,section:'Необходимое обеспечение монтажа',category:g.category,unitId:g.unitId,
  expression:g.parameterId,procurement:false,costTreatment:'OWN_COST',inclusion:selected});
 const source=pack.sources.find(s=>s.key===(t.family==='hvac'?'fan-manual':'door-model'))!,built=buildAutomaticConstructionOwnerR1({
  contract:pack.contract,semanticOwner:'manufacturer-factory:'+t.key,sourceId:t.sourceId,normId:'FACTORY_ASSEMBLY_BOM_NO_ONSITE_RATE',
  sourceMetadata:{source_title:'Заводской состав изделия с отдельными потребностями монтажа',source_document_version:source.sourceVersion,
   definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locator},applicabilityRu:profiles.map(p=>p.scopeRu).join(' '),
  ordinary,profile:[],conditional,rows,excludedUnownedAssumptions:pack.sourceBoundaries,deferMissingProjectFactsToRows:true});
 const parameters=[...parent.parameters.map(p=>({...p,required:false,constraints_json:{...p.constraints_json,requiredWhen:legacy},
  truth_metadata:{...p.truth_metadata,visible_when:legacy}})),...built.parameters.map(p=>{
   const g=needs.find(g=>g.parameterId===p.parameter_id);
   if(g)return{...p,required:false,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,g.reasonRu)};
   if(p.parameter_id===pack.selectorId)return{...p,required:true,default_value:null,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Json),guide_kind:'ENUM_DECISION_RULE',source_role:'ENGINEERING_DESIGN',
     guide_short_ru:'Выберите прежний общий расчёт или конкретный заводской профиль. Выбор не подтверждает пригодность места монтажа или полную обеспеченность установки.'}}};
   return{...p,required:false,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,visible_when:selected,
    value_source_role:'USER_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Json),guide_kind:'MEASUREMENT_RULE',source_role:'USER_MEASURED',
     guide_short_ru:'Укажите фактическое целое число одинаковых изделий выбранного профиля. Норма и состав заводского изделия берутся приложением из источника.'}}};
  })].map((p,ordinal)=>({...p,ordinal}));
 const resources=[...parent.resources.map(row=>rehash({...row,inclusion_ast:{kind:'and',operands:[legacy,row.inclusion_ast]}})),...built.resources.map((row,index)=>{
  const p=profiles.find(p=>row.row_id===p.ownerRowId||p.bom.some(b=>b.rowId===row.row_id)),b=p?.bom.find(b=>b.rowId===row.row_id),g=needs.find(g=>g.rowId===row.row_id),
   sourceKey=b?.sourceKey??p?.sourceKeys[0],evidence=pack.sources.find(s=>s.key===sourceKey),onsite=g?onsiteOperation(g,profiles,t.family):null,operationId=p?.operationId??onsite!.operationId,
   uses=p?.independentExpected.find(e=>e.rowId===row.row_id)?.requiredOperationIds.slice(1)??[],
   owner=b?.paidOwnerRowId,body={...row,ordinal:parent.resources.length+index,row_type:row.category==='work'?'labor':row.category,
    cost_owner_id:owner??row.cost_owner_id,resource_graph:{...row.resource_graph,...(owner?{parentCostOwnerId:owner,includedInResourceOwnerRowId:owner}:{}),
     operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'manufacturer-factory:'+t.key,groupTitleRu:t.publicTitleRu,
      operationId,operationTitleRu:p?'Заводское изделие и его состав':onsite!.operationTitleRu,processOrdinal:p?0:30,completionCriterionRu:p?'Изделие обеспечено в точном заводском составе выбранного профиля; монтаж не принят.':'Отдельная физическая потребность монтажа сохраняется до подтверждённого расчёта.',
      ...(uses.length?{additionalOperations:uses.map(id=>({operationId:id,operationTitleRu:t.family==='hvac'?'Установка и подключение вытяжного вентилятора':'Установка и регулировка дверного блока',processOrdinal:30,
       completionCriterionRu:'Известное заводское изделие или штатная часть используется в монтаже; неизвестный труд и дополнительное обеспечение сохраняются.'}))}:{})},
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',resourceKind:g?onsiteResourceKind(g):b?.key==='setting-screwdriver'?'TOOL':'MATERIAL',sourceTitleRu:row.title_ru,nameRu:row.title_ru,brandAndModelRu:null,
      specificationRu:null,detailsRu:[]}},
    source_metadata:{...row.source_metadata,sourceRole:g?'UNRESOLVED_APPLICATION_NORM':'PRIMARY_MANUFACTURER_DOCUMENT',normativeTrace:g?[]:[{
     sourceId:t.sourceId,source_id:t.sourceId,normId:'FACTORY_ASSEMBLY_BOM_NO_ONSITE_RATE',norm_id:'FACTORY_ASSEMBLY_BOM_NO_ONSITE_RATE',sourceRole:'PRIMARY_MANUFACTURER_DOCUMENT',
     source_definition_hash:evidence!.sha256,artifact_sha256:evidence!.sha256,exact_locator:evidence!.locator,official_url:evidence!.officialUrl}],
     ...(g?{normative_source_ids:[],missingPhysicalQuantityReasonRu:g.reasonRu}:{manufacturerModelInternal:p!.manufacturerModelInternal,factoryPhysicalResultComplete:true,
      factoryDeliveryBomComplete:p!.deliveryBomComplete,quantityMeaning:b?.quantityMeaning??'Declared count per manufactured unit; no onsite consumption rate.'}),
     full_technical_acceptance:false,onsiteInstallationQuantitiesAdmitted:false,costAndSupplyScope:owner?'Included in the one factory owner; no separate purchase or price.':g?'Separate unresolved onsite scope; not included in factory price.':pack.procurementScope}};
  return rehash(body);
 })];
 // Exact full raw capture plus identity/shape guards above justify the typed
 // declaration view. No field/value is discarded from historical formulas.
 return{parameters:parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:[...parent.formulas,...built.formulas] as AutomaticOwnerDefinition['formulas'],
  resources:resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[pack.selectorId,'q',pack.countParameterId]};
}
/** Independently authored manufacturer inventory, never derived from emitted rows. */
export function manufacturerDoorFanFactoryCompletenessR1(catalogId:string){const t=targetFor(catalogId),profiles=manufacturerFactoryProfilesR1(catalogId),needs=pack.needs[t.family]!;
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,operationResourceBindingRequired:true,
  evidenceSha256:pack.sources.find(s=>s.key===(t.family==='hvac'?'fan-manual':'door-model'))!.sha256,
  evidenceReferences:pack.sources.filter(s=>profiles.some(p=>p.sourceKeys.includes(s.key))).map(s=>s.officialUrl+' '+s.locator),
  entries:[...profiles.flatMap(p=>p.independentExpected.map(e=>({expectedResourceId:p.key+':'+e.rowId,operationId:p.operationId,requiredOperationIds:e.requiredOperationIds,category:e.category,unitId:e.unitId,
   specification:e.rowId,sourceId:t.sourceId,formulaId:e.formulaId,condition:p.scopeRu,exactTechnologyChoice:eq(p.choiceValue),quantityRule:'EXACT_MANUFACTURED_UNIT_BOM',
   resolution:e.parentRowId?{kind:'INCLUDED_COMPONENT_ROW',rowId:e.rowId,parentRowId:e.parentRowId}:{kind:'ROW',rowId:e.rowId}}))),
   ...needs.map(g=>({expectedResourceId:t.family+':'+g.key,operationId:onsiteOperation(g,profiles,t.family).operationId,requiredOperationIds:[onsiteOperation(g,profiles,t.family).operationId],category:g.category,unitId:g.unitId,
    specification:g.titleRu,sourceId:t.sourceId,formulaId:g.formulaId,condition:'Any explicit factory profile; installation applicability retained.',quantityRule:'UNRESOLVED_PHYSICAL_NEED',resolution:{kind:'ROW',rowId:g.rowId}}))],
  factoryPhysicalResultComplete:true,factoryDeliveryBomComplete:t.family==='hvac',fullTechnicalAcceptance:false,unresolvedOnsiteNeedRowIds:needs.map(g=>g.rowId)};
}
