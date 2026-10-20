import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {buildConsumerCanonicalPrecompileParameterSession} from './consumerCanonicalParameterEditor';
import {buildConsumerRepairCanonicalSessionPreview} from './consumerRepairCanonicalSessionPreview';
import {ParameterDisclosurePanel} from './ConsumerRepairProgressiveEstimatePanel';
import {buildCanonicalParameterCards} from '../../lib/estimatePresentation/buildCanonicalParameterCards';
import {canonicalPublicEstimateParameterTitleRu, canonicalPublicEstimateParameterGuideRu} from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevision:jest.fn()}));

const variants=['standard','high_load','large_area','small_area','technical_room','wet_zone'];
const ids=['riser','water_pipe'].flatMap(family=>variants.map(v=>`canonical-work:base:plumbing_interior_${family}_install_${v}`));
function catalog(catalogId:string):CanonicalEstimateCatalogItem {
 return {catalogId,releaseId:'TEST_ONLY',namespace:'global',workKey:'test-legacy-quantity',titleRu:'Монтаж водопровода',domain:'plumbing',definitionVersion:1,applicability:{},professionalMetadata:{},
  parameterSchema:[{parameterId:'q',ordinal:0,valueType:'decimal',unitId:'point',titleRu:'Объем работ',required:true,defaultValue:100,
   visibilityRole:'USER_INPUT',valueSourceRole:'VISIBLE_BASELINE_ASSUMPTION',
   constraints:{min:0,max:1000000000},formulaConsumers:['test-quantity-consumer'],resourceBranchConsumers:['test-resource'],
   guide:{guideKind:'MEASUREMENT_RULE',sourceRole:'USER_MEASURED',guideShortRu:'Укажите значение параметра «Объем работ» по обмеру или проектной документации.',guideVersion:'R555_V1',applicability:'Монтаж водопровода',verifiedAt:'2026-08-26',sourceSnapshotHash:'test-only-guide-binding'}} as never]};
}
const session=(id:string,q:unknown=8)=>buildConsumerCanonicalPrecompileParameterSession({catalog:catalog(id),draftId:'TEST_ONLY_clarity',parameters:{q} as never,missingParameterIds:[],userExplicitParameterIds:q==null?[]:['q'],textExtractedParameterIds:[]});

test.each(ids)('%s shows the inspected point-model limitation without changing saved quantities',id=>{
 const original=catalog(id),before=JSON.stringify(original);
 const s=session(id),card=buildCanonicalParameterCards({session:s,revision:null})[0]!;
 expect(card.labelRu).toBe(id.includes('_riser_')?'Количество точек монтажа стояка':'Количество точек монтажа водопровода');
 expect(card.unitRu).toBe('точка');expect(card.value).toBe(8);expect(card.source).toBe('manual_override');
 expect(card.guideShortRu).toContain('например, 4');expect(card.guideShortRu).toContain('ведомость точек');
 expect(card.guideShortRu).toContain('сантехника');expect(card.guideShortRu).toContain('оставьте поле пустым');
 expect(card.guideShortRu).toContain('Состав одной точки в этом старом шаблоне не подтверждён');
 expect(card.guideShortRu).toContain('не подтверждает объём вашего объекта');
 expect(JSON.stringify(original)).toBe(before);
 expect(original.parameterSchema[0]!.defaultValue).toBe(100);expect(original.parameterSchema[0]!.unitId).toBe('point');
});

test('an unanswered point quantity stays missing, and clearing a value does not restore the template 100',()=>{
 const s=session(ids[0]!),preview=buildConsumerRepairCanonicalSessionPreview({session:s,draftValues:{q:''}})!;
 const card=buildCanonicalParameterCards({session:preview,revision:null})[0]!;
 expect(card.value).toBeNull();expect(card.missing).toBe(true);expect(card.guideShortRu).toContain('оставьте поле пустым');
 expect(card.displayValueRu).not.toContain('100');
});

test('a unit alone never selects a physical measurement rule for an uninspected profile',()=>{
 for(const unitId of ['m2','m3','piece','set','point']){
  const label=canonicalPublicEstimateParameterTitleRu('q','Объем работ',{unitId});
  expect(label).toBe('Объем работ');
  expect(canonicalPublicEstimateParameterGuideRu('q',label,{unitId})).toBeUndefined();
 }
 expect(canonicalPublicEstimateParameterTitleRu('q','Чистая площадь стены без проёмов',{unitId:'m2'})).toBe('Чистая площадь стены без проёмов');
 expect(canonicalPublicEstimateParameterTitleRu('q','Объем работ',{unitId:'ratio'})).toBe('Объем работ');
 expect(canonicalPublicEstimateParameterTitleRu('different_parameter','Объем работ',{unitId:'m2'})).toBe('Объем работ');
});

test('an unreviewed conditional source requirement is retained in full',()=>{
 const original='Концевые соединения рабочей трубы: подтверждённый источник и граница оплаты именно этой позиции; без повторно учтённых изделий, исполнителей и техники';
 const s=session(ids[0]!),p=s.parameters[0]!;
 s.parameters=[{...p,parameterId:'rcs_carrier_connection_ends_cost_basis',label:original,description:original,unit:null,valueType:'string',value:null,allowedValues:[],affectsFormula:['branch'],affectsRows:['connection']}];
 const card=buildCanonicalParameterCards({session:s,revision:null})[0]!;
 expect(card.labelRu).toBe(original);
 expect(card.guideDetailsRu?.some(v=>v.includes(original))).toBe(true);
});

test('numeric guidance stays visible beside a filled or assumed quantity',()=>{
 const s=session(ids[0]!);s.parameters=[{...s.parameters[0]!,source:'ASSUMED',state:'ASSUMED',value:100,referenceValue:100}];
 let renderer!:TestRenderer.ReactTestRenderer;
 act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={null} latestDiff={null} paramEditorEnabled canonicalParameterSession={s} onApplyParamBatch={()=>{}}/>);});
 const help=renderer.root.findAll(n=>typeof n.type==='string'&&n.props.testID==='editable-param-explanation-q');
 expect(help).toHaveLength(1);expect(String(help[0]!.props.children)).toContain('сантехника');
 expect(String(help[0]!.props.children)).toContain('не подтверждает объём вашего объекта');
 expect(JSON.stringify(renderer.toJSON())).toContain('100');act(()=>renderer.unmount());
});

test('the ordinary brick numeric input explains supplier portions and keeps the saved unit and empty value',()=>{
 const catalogId='canonical-work:master:brick_partition_half_unreinforced_upto4m_krer08_02_002_05',original=catalog(catalogId);
 original.parameterSchema=[{...original.parameterSchema[0]!,parameterId:'timber_quantum',unitId:'m3',titleRu:'Реальная кратность поставки: Брусья хвойных пород обрезные4–6,5м,шириной75–150мм,толщиной40–75мм,IVсорта',
  valueType:'decimal',defaultValue:null,valueSourceRole:'CONDITIONAL_PROJECT_FACT'}];
 const before=JSON.stringify(original),s=buildConsumerCanonicalPrecompileParameterSession({catalog:original,draftId:'TEST_ONLY_BRICK_CLARITY',parameters:{},missingParameterIds:['timber_quantum'],userExplicitParameterIds:[],textExtractedParameterIds:[]});
 const card=buildCanonicalParameterCards({session:s,revision:null})[0]!;
 expect(card.labelRu).toBe('Каким объёмом отпускают брус?');expect(card.unitRu).toBe('м³');expect(card.value).toBeNull();
 expect(card.guideShortRu).toContain('число штук в это поле не вводят');expect(JSON.stringify(original)).toBe(before);
 let renderer!:TestRenderer.ReactTestRenderer;
 act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={null} latestDiff={null} paramEditorEnabled canonicalParameterSession={s} onApplyParamBatch={()=>{}}/>);});
 const help=renderer.root.findAll(n=>typeof n.type==='string'&&n.props.testID==='editable-param-explanation-timber_quantum');
 expect(help).toHaveLength(1);expect(String(help[0]!.props.children)).toContain('по предложению поставщика');
 expect(String(help[0]!.props.children)).not.toContain('фиксированная числовая норма');act(()=>renderer.unmount());
});
