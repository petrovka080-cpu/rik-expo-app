import pack from '../../../../data/estimate-benchmarks/source-packs/egger-el2240-accessories-s27-54.json';
import {eggerEl2240PackS2754 as originalPack,eggerEl2240DefinitionS2754 as original,eggerEl2240PrefixS2754 as prefix,eggerEl2240CompletenessMapS2754} from './eggerEl2240S2754';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const eggerAccessoriesPackS2754=pack;
const originalIds=new Set(original.parameters.map(p=>p.parameter_id)),baseFacts=['product_confirmed','base_confirmed','conditions_confirmed','layout_confirmed','underlay_confirmed','base_reference','layout_reference','room_length_m','room_width_m','project_gap_mm','end_stagger_cm'];
const parameters:AutomaticParameterSpec[]=original.parameters.filter(p=>baseFacts.includes(p.parameter_id)).map(p=>({id:p.parameter_id,title:p.title_ru,valueType:p.value_type as AutomaticParameterSpec['valueType'],unitId:p.unit_id,kind:'conditional',
  values:p.constraints_json?.values as string[]|undefined,min:p.constraints_json?.min as number|undefined,max:p.constraints_json?.max as number|undefined}));
const addParameter=(id:string,title:string,valueType:AutomaticParameterSpec['valueType'],unitId:string|null,min?:number,value?:string)=>parameters.push({id,title,valueType,unitId,kind:'conditional',...(min==null?{}:{min}),...(value?{values:[value]}:{})});
for(const [id,title,value] of [
  ['tape_method_confirmed','Принятый узел AluTape и исключение повторной оплаты встроенной полосыDuo',pack.tapeMethodValue],
  ['skirting_profile_confirmed','Точный поставленный плинтус1818385 текущего профиля2400×58×14мм',pack.skirtingProfileValue],
  ['skirting_climate_confirmed','Акклиматизация и осмотр поставленного плинтуса',pack.skirtingClimateValue],
  ['skirting_layout_confirmed','Чистый периметр и карта раскроя без повторных5%',pack.skirtingLayoutValue],
  ['clip_layout_confirmed','Фактическая ведомость позиций Clipholder и выбранного шага25–50см',pack.clipLayoutValue],
  ['clip_wall_confirmed','Подтверждённый стеновой узел S6PP иDIN7997',pack.clipWallValue],
  ['clip_supply_confirmed','Документ поставки полных комплектов30+30+30 и отсутствие второй цены крепежа',pack.clipSupplyValue]
] as const)addParameter(id,title,'enum',null,undefined,value);
for(const [id,title] of [['tape_layout_reference','Принятая ведомость герметизации: длины AluTape и исключённые встроенные полосы'],['skirting_layout_reference','Ведомость чистых участков и карта раскроя планок2,4м'],
  ['clip_layout_reference','Ведомость фактических позиций клипс по стенам'],['clip_wall_reference','Конкретный технический узел крепления к фактической стене'],['clip_supply_reference','Конкретная накладная/спецификация, подтверждающая полные крепёжные комплекты']] as const)addParameter(id,title,'text',null);
for(const [id,title,type,unit,min] of [
  ['tape_required_m','Длина AluTape по принятой ведомости,м','decimal','linear_m',0],['tape_stock_m','Пригодное наличие AluTape1483117,м','decimal','linear_m',0],['tape_reserve_m','Сохраняемый резерв AluTape,м','decimal','linear_m',0],['tape_supplier_roll_multiple','Фактическая кратность поставщика в рулонах50м','integer','pcs',1],
  ['skirting_installed_m','Чистая длина плинтуса по стенам без проёмов,м','decimal','linear_m',0.001],['skirting_required_boards','Целые планки2,4м,выделенные принятой картой раскроя','integer','pcs',1],['skirting_stock_boards','Пригодное наличие целых планок1818385','integer','pcs',0],['skirting_reserve_boards','Сохраняемые целые планки1818385','integer','pcs',0],['skirting_supplier_board_multiple','Фактическая кратность поставщика в целых планках;PU10неподставляется','integer','pcs',1],
  ['clip_required_pcs','Число устанавливаемых клипс по принятой ведомости','integer','pcs',1],['clip_stock_complete_sets','Пригодное наличие полных комплектов клипса+винт+дюбель','integer','pcs',0],['clip_reserve_complete_sets','Сохраняемый резерв полных крепёжных комплектов','integer','pcs',0],['clip_supplier_box_multiple','Фактическая кратность поставщика в упаковках30клипс','integer','pcs',1]
] as const)addParameter(id,title,type,unit,min);
addParameter('open_qty_skirting_tools',pack.additionalSourceNeed.nameRu,'decimal','item',0);
const tapeFacts=['tape_method_confirmed','tape_layout_reference'],skirtingFacts=['skirting_profile_confirmed','skirting_climate_confirmed','skirting_layout_confirmed','skirting_layout_reference'],
  clipFacts=[...skirtingFacts,'clip_layout_confirmed','clip_layout_reference','clip_wall_confirmed','clip_wall_reference','clip_supply_confirmed','clip_supply_reference'];
const rows:AutomaticRowSpec[]=[],rowFacts:Record<string,string[]>={},info={costTreatment:'INFORMATIONAL_SCOPE' as const};
function add(id:string,title:string,unitId:string,expression:string,facts:string[],extra:Partial<AutomaticRowSpec>={}){rowFacts[id]=facts;rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,title,unitId,expression,section:id.startsWith('alu-tape')?'underlay':'completion',category:'material',procurement:false,inputParameterIds:[...baseFacts,...facts],...extra});}
const balances={
  'alu-tape':effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':alu-tape',orderUnitId:'linear_m',consumed:'tape_required_m',stock:'tape_stock_m',reserve:'tape_reserve_m',quantum:'50*tape_supplier_roll_multiple'}),
  skirting:effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':skirting',orderUnitId:'linear_m',consumed:'skirting_required_boards*2.4',stock:'skirting_stock_boards*2.4',reserve:'skirting_reserve_boards*2.4',quantum:'skirting_supplier_board_multiple*2.4'}),
  'skirting-clips':effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':skirting-clips',orderUnitId:'pcs',consumed:'clip_required_pcs',stock:'clip_stock_complete_sets',reserve:'clip_reserve_complete_sets',quantum:'30*clip_supplier_box_multiple'})
};
add('alu-tape','Лента EGGER Alu Tape1483117,самоклеящаяся50мм,рулон50м','linear_m','ceil(max(0,tape_required_m+tape_reserve_m-tape_stock_m)/(50*tape_supplier_roll_multiple))*50*tape_supplier_roll_multiple',tapeFacts,{procurement:true,...balances['alu-tape'].owner});
add('alu-tape-consumed','AluTape1483117: длина принятой герметизации — без второй цены','linear_m','tape_required_m',tapeFacts,{...info,purchaseBalanceOwnerRowId:prefix+':alu-tape'});
add('alu-tape-rolls','Рулоны AluTape по50м в заказе — без второй цены','pcs',`(${balances['alu-tape'].effective})/50`,tapeFacts,info);
add('alu-tape-remaining','Пригодный остаток AluTape по принятому плану — не отходы','linear_m',balances['alu-tape'].remaining,tapeFacts,info);
add('skirting','Плинтус EGGER6CM L201 CUBICAL1818385,2400×58×14мм','linear_m','ceil(max(0,skirting_required_boards+skirting_reserve_boards-skirting_stock_boards)/skirting_supplier_board_multiple)*skirting_supplier_board_multiple*2.4',skirtingFacts,{procurement:true,...balances.skirting.owner});
add('skirting-planned-length','Номинальная длина целых планок карты раскроя — без второй цены','linear_m','skirting_required_boards*2.4',skirtingFacts,{...info,purchaseBalanceOwnerRowId:prefix+':skirting'});
add('skirting-installed-length','Чистая длина плинтуса без проёмов — не объём закупки','linear_m','skirting_installed_m',skirtingFacts,info);
add('skirting-ordered-boards','Целые планки плинтуса2,4м в заказе — без второй цены','pcs',`(${balances.skirting.effective})/2.4`,skirtingFacts,info);
add('skirting-remaining','Целые планки сверх принятого раскроя: номинальная длина — не фактические обрезки','linear_m',balances.skirting.remaining,skirtingFacts,info);
for(const [id,title,expression] of [['skirting-length-control','Контроль достаточности номинальной длины планок — не доказательство раскроя','skirting_required_boards*2.4-skirting_installed_m'],
  ['skirting-perimeter-control','Контроль чистых прямых участков выбранной комнаты — без отдельной цены','2*(room_length_m+room_width_m)-skirting_installed_m']] as const)
  add(id,title,'linear_m',expression,skirtingFacts,{...info,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'linear_m',minimum:0,reasonRu:'Ведомость плинтусов не согласована с принятым периметром или числом целых планок'}});
add('skirting-clips','Крепление EGGER Clipholder1823775,упаковка30клипс; крепёж по подтверждённой поставке','pcs','ceil(max(0,clip_required_pcs+clip_reserve_complete_sets-clip_stock_complete_sets)/(30*clip_supplier_box_multiple))*30*clip_supplier_box_multiple',clipFacts,{procurement:true,...balances['skirting-clips'].owner});
add('clip-consumed','Clipholder1823775: устанавливаемые клипсы по ведомости — без второй цены','pcs','clip_required_pcs',clipFacts,{...info,purchaseBalanceOwnerRowId:prefix+':skirting-clips'});
add('clip-boxes','Упаковки Clipholder по30клипс в заказе — без второй цены','pcs',`(${balances['skirting-clips'].effective})/30`,clipFacts,info);
add('clip-remaining','Полные крепёжные комплекты сверх принятой установки — справочно','pcs',balances['skirting-clips'].remaining,clipFacts,info);
for(const [id,title] of [['clip-screws-included','Винт стальной оцинкованныйDIN7997 3,5×30мм — в подтверждённом комплекте Clipholder'],['clip-dowels-included','Дюбель S6PP — в подтверждённом комплекте Clipholder и принятом стеновом узле']] as const)
  add(id,title,'pcs','clip_required_pcs',clipFacts,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
add('skirting-tools',pack.additionalSourceNeed.nameRu,'item','open_qty_skirting_tools',skirtingFacts,{category:'equipment'});
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:originalPack.normId,
  sourceMetadata:{source_title:'EGGER: подтверждённые аксессуары и фактическая ведомость',source_document_version:pack.sources.skirtings.edition,definition_hash:pack.sources.skirtings.sha256,artifact_sha256:pack.sources.skirtings.sha256,exact_locator:pack.sources.skirtings.locatorRu},
  applicabilityRu:originalPack.scopeRu+' Конкретные аксессуары только по принятым ведомостям и документу комплектности.',ordinary:[],profile:[],conditional:parameters,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:originalPack.excludedRu});
const replaceIds=new Set(['alu-tape','skirting','skirting-clips']),oldRows=new Map(original.resources.map(r=>[r.row_id,r]));
const requiredFacts=new Set([...tapeFacts,...skirtingFacts,...clipFacts]);
const additions=built.parameters.filter(p=>!originalIds.has(p.parameter_id)).map(p=>({...p,required:p.required||requiredFacts.has(p.parameter_id),truth_metadata:p.parameter_id==='open_qty_skirting_tools'?
  unresolvedApplicationNormTruthR1(p.truth_metadata,pack.additionalSourceNeed.reasonRu):{...p.truth_metadata,source_confirmation_required:false,guide:{...(p.truth_metadata.guide as Record<string,unknown>),verified_at:pack.reviewedAtUtc}}}));
const resourceContent=built.resources.map(r=>{
  const id=r.row_id.slice(prefix.length+1),source=id.startsWith('alu-tape')?pack.sources['alu-tape']:id.startsWith('clip')||id==='skirting-clips'?pack.sources.clipholder:id==='skirting-tools'?pack.sources['skirting-installation']:pack.sources.skirtings,
    included=id==='clip-screws-included'||id==='clip-dowels-included',owner=prefix+':skirting-clips',old=oldRows.get(r.row_id),{row_sha256:_hash,...content}=r;
  const result={...content,...(old?{id:old.id,ordinal:old.ordinal,cost_owner_id:old.cost_owner_id}:{}),...(included?{cost_owner_id:owner}:{}),resource_graph:{...r.resource_graph,
    scopeContextParameterIds:['net_floor_area_m2'],
    ...(included?{includedInResourceOwnerRowId:owner,parentCostOwnerId:owner}:{}),operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:originalPack.titleRu,
      operationId:prefix+':'+(id.startsWith('alu-tape')?'underlay':'completion'),operationTitleRu:id.startsWith('alu-tape')?'Раскладка и герметизация SilenzioDuo':'Монтаж выбранного плинтуса и креплений',processOrdinal:id.startsWith('alu-tape')?10:30,
      completionCriterionRu:'Принята фактическая ведомость, текущие изделия, стеновой узел и полная комплектность; один владелец стоимости.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:id==='skirting-tools'?null:id.startsWith('alu-tape')?'EGGER AluTape1483117':id.startsWith('clip')||id==='skirting-clips'?'EGGER Clipholder1823775':'EGGER6CM L201 CUBICAL1818385',
      specificationRu:id==='skirting-tools'?null:id.startsWith('alu-tape')?'Самоклеящаяся алюминиевая лента50мм×50м;SD≥200м;коробка30рулонов,фактическаякратностьпоставщикаотдельна.':
        id.startsWith('clip')||id==='skirting-clips'?'Clipholder:HIPS;упаковка30клипс. Винт оцинкованныйDIN7997 3,5×30мм идюбельS6PP; число комплектующих принимается по документу поставки,неизобщегоTDS.':'Текущий6cmCUBICAL:2400×58×14мм,MDFсдекоративнойбумагой;PU10планок/24м. Поставляемый1818385 и фактическая кратность подтверждаются отдельно.',
      detailsRu:id==='skirting-tools'?[pack.additionalSourceNeed.reasonRu]:id.startsWith('alu-tape')?[pack.tapeMethodValue,'Длина по ведомости, наличие/резерв/кратность явные. Встроенную полосуDuo повторно не заклеивают и не оплачивают.']:
        id.startsWith('clip')||id==='skirting-clips'?[pack.clipLayoutValue,pack.clipWallValue,pack.clipSupplyValue,'Один установленный узел содержит одну клипсу, один винт и один дюбель. Крепёж входит в цену подтверждённого комплекта; универсальная комплектность из30pieces не выводится.']:
        [pack.skirtingLayoutValue,pack.skirtingClimateValue,'Число целых планок задаёт карта раскроя. Ориентир около5%не добавляется второй раз. Остаток заказа не объявляется фактическими обрезками.']}},
    source_metadata:{...r.source_metadata,normativeTrace:[],source_title:source.edition,source_document_version:source.edition,definition_hash:source.sha256,artifact_sha256:source.sha256,official_url:source.officialUrl,exact_locator:source.locatorRu,
      sourceRole:id==='skirting-tools'?'UNRESOLVED_INSTALLATION_QUANTITY':'VERIFIED_ACCESSORY_AND_EXPLICIT_PROJECT_OR_DELIVERY_FACT',quantityNormApproved:false,manufacturerUniversalQuantityClaimed:false,full_technical_acceptance:false}};
  return {...result,row_sha256:estimateDeterministicHash(result)};
});
const replacements=new Map(resourceContent.filter(r=>replaceIds.has(r.row_id.slice(prefix.length+1))).map(r=>[r.row_id,r]));
const enrichedOriginal=original.resources.map(r=>{
  const replacement=replacements.get(r.row_id);if(replacement)return replacement;
  const id=r.row_id.slice(prefix.length+1),source=id==='installation-set'?pack.sources['installation-set']:id==='threshold-profile'?pack.sources.profile:null;if(!source){
    const presentation=r.resource_graph.publicResourcePresentationV1 as {detailsRu?:string[]},stale='Пороги/плинтусы и герметизация подложки раскрыты, но их узлы и количества пока не приняты.';
    if(!presentation.detailsRu?.some(detail=>detail.includes(stale)))return r;
    const {row_sha256:_hash,...content}=r,result={...content,resource_graph:{...r.resource_graph,publicResourcePresentationV1:{...presentation,detailsRu:presentation.detailsRu.map(detail=>detail.replace(stale,
      'Лента, плинтус и Clipholder рассчитываются отдельно по принятым ведомостям, стеновому узлу и документу поставки; переходные пороги остаются ограниченными до принятия собственного узла.'))}}};
    return {...result,row_sha256:estimateDeterministicHash(result)};
  }
  const {row_sha256:_hash,...content}=r,presentation=r.resource_graph.publicResourcePresentationV1 as Record<string,unknown>,result={...content,resource_graph:{...r.resource_graph,publicResourcePresentationV1:{...presentation,
    specificationRu:id==='installation-set'?'EGGER1430635:1подбивочныйбрусокизбука,1стальнаяскобасвойлоком,20клиньевPP. Числонаборов/обеспечениеисполнителем требуютзадания.':'СемействоEGGER3-in-1Alu:1860×37×5мм,диапазонтолщиныпокрытия4–22мм;PU12шт/22,32м. Для1819082узел,составкрепежа и фактическая поставка пока не приняты.'}},
    source_metadata:{...r.source_metadata,ownProductPassportSha256:source.sha256,official_url:source.officialUrl,source_artifact_sha256:source.sha256,exact_locator:source.locatorRu}};return {...result,row_sha256:estimateDeterministicHash(result)};
});
export const eggerAccessoriesDefinitionS2754:AutomaticOwnerDefinition={...original,parameters:[...original.parameters,...additions].map((p,i)=>({...p,ordinal:i})),
  formulas:[...original.formulas.filter(f=>!replaceIds.has(f.formula_id.slice((prefix+':formula:').length))),...built.formulas],
  resources:[...enrichedOriginal,...resourceContent.filter(r=>!replaceIds.has(r.row_id.slice(prefix.length+1)))].map((r,i)=>{const {row_sha256:_hash,...content}=r,result={...content,ordinal:i};return {...result,row_sha256:estimateDeterministicHash(result)};})};
export function compileEggerAccessoriesS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:originalPack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'net_floor_area_m2',definition:eggerAccessoriesDefinitionS2754,submittedParameters:input});}
export function eggerAccessoriesCompletenessMapS2754(){const old=eggerEl2240CompletenessMapS2754();return {...old,evidenceReferences:[...old.evidenceReferences,...Object.values(pack.sources).map(s=>s.officialUrl)],entries:[
  ...old.entries.map(e=>replaceIds.has(e.expectedResourceId)?{...e,condition:'ACCEPTED_EXACT_ACCESSORY_LAYOUT_AND_DELIVERY',sourceId:pack.sourceId,quantityRule:'EXPLICIT_PROJECT_REQUIREMENT_AND_SUPPLY_QUANTUM_NO_UNIVERSAL_AREA_RATE'}:e),
  ...['clip-screws-included','clip-dowels-included'].map(id=>({expectedResourceId:id,operationId:'completion',category:'material',specification:pack.resourceTable.find(r=>r.rowId===id)!.nameRu,
    condition:'ACCEPTED_WALL_AND_CONFIRMED_COMPLETE_SUPPLIED_KIT',sourceId:pack.sourceId,unitId:'pcs',quantityRule:'ONE_PER_INSTALLED_CLIP_AND_INCLUDED_IN_CONFIRMED_KIT',formulaId:prefix+':formula:'+id,
    resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+id,parentRowId:prefix+':skirting-clips'}})),
  {expectedResourceId:'skirting-tools',operationId:'completion',category:'equipment',specification:pack.additionalSourceNeed.nameRu,condition:'OPEN_TOOL_METHOD_AND_PROVISION',sourceId:pack.sourceId,unitId:'item',quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:prefix+':formula:skirting-tools',resolution:{kind:'ROW',rowId:prefix+':skirting-tools'}}]};}
