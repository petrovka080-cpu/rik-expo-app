import pack from '../../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-native-f266.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec}
 from './automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const WALL_CERAMIC_CEMENT_CATALOG_F266=pack.catalogId;
export const WALL_CERAMIC_CEMENT_AREA_F266='wall019_actual_cladding_area_m2';
export const WALL_CERAMIC_CEMENT_SOURCE_F266=pack.sourceKey;
export const WALL_CERAMIC_CEMENT_PREFIX_F266='tile-wall:kg15-01901';
export const WALL_CERAMIC_CEMENT_PROVISION_STATUS_F266='SOURCE_ONLY_NATIVE_COMPLETE_WHOLE_PROVISION_HOLD' as const;
function check(v:unknown,c:string):asserts v{if(!v)throw Error('WALL_CERAMIC_CEMENT_F266_'+c);}

/** Backend-native constructor only, through the existing owner. It is not an
 * admitted ordinary Config, source publisher or new calculation engine.
 * Exact01901 quantities are independent of historicalq100/floor/CM11/CE40.
 * Whole physical tool/access/PPE and supply provision remain unproved; this
 * constructor alone must not be registered as a complete whole technology.
 */
export function wallCeramicCementNativeF266():AutomaticOwnerDefinition{
 check(pack.normId==='15-01-019-01'&&pack.nativeRows.length===10&&pack.includedOperations.length===6,'SOURCE_WHOLE_COLUMN');
 check(pack.sourceArtifact.sha256==='58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc','ARTIFACT');
 const area=WALL_CERAMIC_CEMENT_AREA_F266,labour=WALL_CERAMIC_CEMENT_PREFIX_F266+':whole-labour';
 const native:AutomaticRowSpec[]=pack.nativeRows.map((r):AutomaticRowSpec=>{
  check(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(r.ratePer100M2),'EXACT_DECIMAL_RATE');
  check(r.rowId===WALL_CERAMIC_CEMENT_PREFIX_F266+':'+r.key&&!r.procurementEligible,'SOURCE_ROW_ID_AND_PROCUREMENT');
  const cost:AutomaticRowSpec['costTreatment']=r.key==='whole-labour'||r.category==='material'
   ?'OWN_COST':'INFORMATIONAL_SCOPE';
  check(r.costTreatment===cost,'EXACT_CURRENT_COMMERCIAL_BOUNDARY');
  return{rowId:r.rowId,section:r.category==='labor'?'Труд':r.category==='equipment'?'Механизмы':'Материалы',
   category:r.category,title:r.nameRu,unitId:r.unitId,formulaId:r.rowId+':quantity',
   expression:area+' * '+r.ratePer100M2+' / 100',costTreatment:cost,procurement:false};
 });
 const operations:AutomaticRowSpec[]=pack.includedOperations.map((op):AutomaticRowSpec=>{
  check(op.paidOwnerRowId===labour&&!op.separatePayment,'ONE_WHOLE_LABOUR_OWNER');
  return{rowId:op.rowId,section:'Включённые операции',category:'labor',title:op.nameRu,unitId:'m2',
   formulaId:op.rowId+':quantity',expression:area,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false};
 });
 const body=buildAutomaticConstructionOwnerR1({contract:pack.contract,
  semanticOwner:'tile-wall:kg15-01901:existing-physical-owner',sourceId:pack.sourceKey,normId:pack.normId,
  sourceMetadata:{source_title:'Облицовка стен глазурованной керамической плиткой на цементном растворе',
   source_document_version:'КРЕР15-2015;15-01-019-01',definition_hash:pack.sourceArtifact.sha256,
   artifact_sha256:pack.sourceArtifact.sha256,exact_locator:'КРЕР15,PDF56 состав/единица;PDF57 только колонка15-01-019-01;техническая часть§1.2а/1.4/1.9/2.3'},
  applicabilityRu:pack.scopeRu,
  ordinary:[{id:area,title:'Фактическая площадь облицовки стены',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],
  profile:[],conditional:[],rows:[...native,...operations],
  operationCompositionGroupId:WALL_CERAMIC_CEMENT_PREFIX_F266+':whole-operation',
  excludedUnownedAssumptions:[...pack.excludedRu,
   '228.00чел.-ч — норма рабочегоразряда3,6;112.62/116.05 — базовыецены, не расходы и не актуальные тарифы.',
   'Машинисты0.86чел.-ч не оплачиваются повторно; машинныйценовойдопуск ещё не предоставлен.',
   'Количество и наличие ручногоинструмента,инвентаря доступа,СИЗ и запасов не выводятсяизплощади или часов.']});
 const nativeByRow=new Map(pack.nativeRows.map(r=>[r.rowId,r]));
 const opIds=new Set(pack.includedOperations.map(op=>op.rowId));
 const resources=body.resources.map(row=>{
  const norm=nativeByRow.get(row.row_id),isOperation=opIds.has(row.row_id);
  check(norm||isOperation,'NO_ADDITIONAL_RESOURCES');
  const{row_sha256:_prior,...r}=row;
  const next={...r,cost_owner_id:isOperation?labour:row.cost_owner_id,
   source_metadata:{...row.source_metadata,sourceNormColumnV1:{sourceId:pack.sourceKey,
    artifactSha256:pack.sourceArtifact.sha256,column:'15-01-019-01',basisQuantity:'100',basisUnit:'m2',
    role:isOperation?'INCLUDED_SOURCE_OPERATION':'EXACT_NATIVE_RESOURCE',
    ...(norm?{resourceCode:norm.sourceResourceCode,ratePer100M2:norm.ratePer100M2}:{}),
    tableBasePriceIsCurrentTariff:false,physicalProvisionQuantityDerived:false},
    commercialBoundaryV1:{procurementReady:false,machinePriceAdmission:false,
     operatorSeparatePayment:false,actualProjectDocuments:0,fullTechnicalAcceptance:false}}};
  return{...next,row_sha256:hash(next)};
 });
 check(resources.length===16&&resources.filter(r=>opIds.has(r.row_id)).every(r=>r.cost_owner_id===labour),'EXACT10PLUS6_ONEPAY');
 check(Object.keys(body.runtimeInput).length===0,'NO_STATIC_PROFILE_OR_PROJECT_AUTHORITY');
 return{...body,resources};
}
