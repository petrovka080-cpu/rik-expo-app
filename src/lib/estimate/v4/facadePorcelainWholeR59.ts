import current from '../../../../data/estimate-benchmarks/source-packs/facade-porcelain-current-whole-r59.json';
import {facadeVentilatedPorcelainPackR3 as originalProfile,facadeVentilatedPorcelainPrimaryR3,
 facadeVentilatedPorcelainGeometryR5,facadeVentilatedPorcelainDefinitionR3,facadeVentilatedPorcelainCompletenessR3,
 facadeVentilatedPorcelainControlR3,facadeVentilatedPorcelainNeedsR3,FACADE_PORCELAIN_CHOICE_R3,
} from './facadeVentilatedPorcelainR3';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
export const facadePorcelainCurrentPackR59=current;
export const facadePorcelainProfileR59=originalProfile;
export const facadePorcelainPrimaryR59=facadeVentilatedPorcelainPrimaryR3;
export const facadePorcelainGeometryR59=facadeVentilatedPorcelainGeometryR5;
export const facadePorcelainChoiceR59=FACADE_PORCELAIN_CHOICE_R3;
export const facadePorcelainRowIdR59=(key:string)=>current.prefix+':'+key;
export const facadePorcelainNeedsR59=facadeVentilatedPorcelainNeedsR3;
export const facadePorcelainControlR59=facadeVentilatedPorcelainControlR3;
export const facadePorcelainSourceFactsR59=()=>({porcelain_exact_whole_method:FACADE_PORCELAIN_CHOICE_R3,
 porcelain_insulation_thickness_mm:'100',porcelain_panel_thickness_mm:'10'});
/** Existing source builder owns all identities, formulas and quantities. */
export function facadePorcelainDefinitionR59():AutomaticOwnerDefinition{
 if(originalProfile.catalogId!==current.catalogId||originalProfile.sourceId!==current.sourceId||originalProfile.projectComponents.length!==22)
  throw Error('FACADE_PORCELAIN_EXISTING_EXACT_SOURCE_REQUIRED');
 const built=facadeVentilatedPorcelainDefinitionR3(),names:Readonly<Record<string,string>>=current.publicResourceNames;
 return{...built,resources:built.resources.map(row=>{
  const key=row.row_id.slice(current.prefix.length+1),name=names[key];if(name===undefined)return row;
  const{row_sha256:_old,...body}=row;
  const next={...body,resource_graph:{...row.resource_graph,publicResourcePresentationV1:{
   contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:name,
   brandAndModelRu:null,specificationRu:null,detailsRu:[]}}};return{...next,row_sha256:hash(next)};
 })};
}
/** Literal source roster:49 original entries plus23 supply and48 exclusive period owners.
 * All source stock consumers bind the raw row and each provision owner independently. */
export function facadePorcelainCompletenessR59(){
 const base=facadeVentilatedPorcelainCompletenessR3(),rid=facadePorcelainRowIdR59;
 return{...base,entries:[...base.entries.map(entry=>{
  const stock=current.literalStockResourceRoster.find(stock=>entry.resolution.rowId===rid('stock:'+stock.key));
  return stock?{...entry,requiredOperationIds:stock.operationKeys.map(key=>rid('operation:'+key))}:entry;
 }),...current.independentAdditionalOwnerRoster.map(owner=>({
  expectedResourceId:'ST_KG_V_T:'+owner.key,operationId:rid('operation:'+owner.operationKeys[0]!),
  requiredOperationIds:owner.operationKeys.map(key=>rid('operation:'+key)),category:owner.category,unitId:owner.unitId,
  specification:owner.title,condition:FACADE_PORCELAIN_CHOICE_R3+(owner.mode===null?'':'; '+owner.mode),
  sourceId:current.sourceId,quantityRule:owner.quantityRule,formulaId:rid('formula:'+owner.key),
  resolution:{kind:'ROW',rowId:rid(owner.key)},
 }))],fullTechnicalAcceptance:false,newFULL:0};
}
/** Same canonical core and existing geometry/trusted-readback boundary. */
export function compileFacadePorcelainWholeR59(parameters:Record<string,unknown>,options:Readonly<{
 confirmedParameters?:CanonicalEstimateCompileCoreInput['confirmedParameters'];rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
 model?:AutomaticOwnerDefinition;
}>={}){
 if(Object.keys(parameters).some(id=>!facadePorcelainGeometryR59.some(geometry=>geometry===id)))
  throw Object.assign(new Error('PORCELAIN_TECHNICAL_VALUES_REQUIRE_TRUSTED_SOURCE_READBACK'),{code:'PARAMETER_VALIDATION_FAILED'});
 const d=options.model??facadePorcelainDefinitionR59();
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:current.contract,catalogId:current.catalogId,
  primaryMeasureParameterId:facadePorcelainPrimaryR59,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],
  resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:options.confirmedParameters??{},
  rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash});
}
