import source from '../../../../data/estimate-benchmarks/source-packs/masonry-bearing-dpc-loose-whole-method-r4.json';

const prefix='masonry:bearing-dpc:loose-polyolefin:r4',own='masonry:silicate65:m75:dpc-reuse:r4';
const operation=(key:string)=>prefix+':operation:'+key;
const condition='Только собственный силикатный кирпич65 на готовом цементно-известковомМ75 и отдельно подтверждённый прямой непрерывный участок250мм у основания внутренней стены; W4-E слой под кладкой без углов, ступеней и проходок, свободные нахлёсты200мм. Силикатные фундаменты, наружные стены подвалов и цоколей не разрешаются. Проектная применимость и полный первый ряд не подтверждаются выбором источника.';

/** The source maker's four whole operations and saved seven component roles
 * determine this roster. It does not enumerate the generated resource rows.
 * A known cut plan neither supplies the four missing norms nor approves work. */
export function masonrySilicate65M75DpcIndependentCompletenessR4(inherited:unknown){
 if(!inherited||typeof inherited!=='object'||Array.isArray(inherited))throw Error('MASONRY_SILICATE65_DPC_COMPLETENESS_PARENT');
 const old=inherited as Record<string,unknown>;
 if(!Array.isArray(old.entries)||!Array.isArray(old.evidenceReferences)||source.wholeOperations.length!==4)throw Error('MASONRY_SILICATE65_DPC_COMPLETENESS_SOURCE');
 const entries=[
  {key:'strip-installed',category:'material',unit:'m2',title:'Однослойное профилированное полотно шириной365мм',rule:'(L+0.2*(max(1,ceil((L-0.2)/24.8))-1))*0.365; overlap and width from own maker, not a consumption rate',operations:['cut-place','lap-inspect','first-course-close']},
  {key:'strip-gross-rolls',category:'material',unit:'piece',title:'Цельные рулоны25м того же полотна',rule:'max(1,ceil((L-0.2)/24.8)); informational gross cut plan, not second paid material or order',operations:['cut-place']},
  {key:'strip-offcuts',category:'material',unit:'m',title:'Измеряемые пригодные остатки полотна после раскроя',rule:'25*rolls-installedLength; not disposed waste and not kg conversion',operations:['cut-place','first-course-close']},
  {key:'bed-mortar',category:'material',unit:'m3',title:'Совместимая свежая выравнивающая постель под полотно',rule:'UNRESOLVED_APPLICATION_NORM; no maker thickness/grade, no .234 wall mortar or AAC .017 transfer',operations:['accept-base','first-course-close']},
  {key:'installation-labour',category:'labor',unit:'man_hour',title:'Укладка, нахлёсты и проверка непрерывности отсечки',rule:'UNRESOLVED_APPLICATION_NORM; existing M75 labour owner preserved, no second paid rate',operations:['accept-base','cut-place','lap-inspect','first-course-close']},
  {key:'measuring-cutting-tools',category:'tool',unit:'set',title:'Целый совместимый инструмент измерения и резки полотна',rule:'UNRESOLVED_APPLICATION_NORM; method need is not a proved tool BOM or stock issue',operations:['cut-place','lap-inspect']},
  {key:'disposed-waste',category:'material',unit:'kg',title:'Фактические передаваемые в отходы остатки полотна',rule:'UNRESOLVED_APPLICATION_NORM; usable offcuts are not automatically disposed',operations:['first-course-close']},
 ].map(value=>({expectedResourceId:own+':expected:'+value.key,operationId:operation(value.operations[0]!),requiredOperationIds:value.operations.map(operation),sourceId:source.sourceId,category:value.category,unitId:value.unit,specification:value.title,quantityRule:value.rule,formulaId:prefix+':formula:'+value.key,condition,resolution:{kind:'ROW',rowId:prefix+':'+value.key}}));
 for(const [key,title,rule]of [
  ['actual-scope','Фактическая применимость прямой отсечки к опиранию','MANDATORY_OBJECT_SCOPE; no geometry inferred approval, no broad wall support/design closure'],
  ['whole-component','Полный исходный состав отсечки без исключённых компонентов','ALL_SEVEN_SAVED_COMPONENTS; removal reopens coverage, no automatic procurement or FULL'],
 ])entries.push({expectedResourceId:own+':expected:'+key,operationId:operation('accept-base'),requiredOperationIds:[operation('accept-base')],sourceId:source.sourceId,category:'service',unitId:'set',specification:title!,quantityRule:rule!,formulaId:own+':formula:'+key,condition,resolution:{kind:'ROW',rowId:own+':'+key}});
 if(entries.length!==9||new Set(entries.map(value=>value.expectedResourceId)).size!==9)throw Error('MASONRY_SILICATE65_DPC_COMPLETENESS_IDENTITIES');
 return{...old,contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceReferences:[...new Set([...old.evidenceReferences,...source.sources.map(value=>value.path)])],entries:[...old.entries,...entries],masonrySilicate65ExistingDpc:{sourceCountry:'Germany',sourceEditions:source.jurisdiction.sourceEditions,independentSourceExpectations:9,actualLayoutRequired:true,unknownApplicationNorms:4,closedBroadNeeds:0,fullTechnicalAcceptance:false}};
}
