import React from 'react';import {TextInput} from 'react-native';import TestRenderer,{act,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
import {selectedMaterialDeliveryTestContextR1} from './selectedMaterialDeliveryTestContextR1';
import {prepareSelectedMaterialDeliveryClonePlanR1} from '../../scripts/estimate/r4a13/selectedMaterialDeliveryForwardR1';
import {ParameterDisclosurePanel} from '../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';
import {buildConsumerCanonicalParameterSession} from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import {getCanonicalEstimateCatalogItem,getCanonicalEstimateRevision,getAllCanonicalEstimateRevisionRows} from '../../src/lib/estimate/backendPlatform/canonicalEstimateClient';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../src/lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateCatalogItem:jest.fn(),getCanonicalEstimateRevision:jest.fn(),getAllCanonicalEstimateRevisionRows:jest.fn()}));
const pfx='selected_delivery_',revisionId='11111111-1111-4111-8111-111111111111';
// Actual clone-plan parameter metadata, with a controlled future revision and
// document preview. This verifies the ordinary UI callback, not a DB commit.
const fixture=selectedMaterialDeliveryTestContextR1(),parent=fixture.parents.find((entry:any)=>entry.entry.catalog_id.endsWith('facade_paint_install_standard'));
const plan=prepareSelectedMaterialDeliveryClonePlanR1(parent,parent.pin,{guideSnapshotSha256:fixture.normPackSha256,
 releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:'a'.repeat(40),sourceTree:'b'.repeat(40),masterSha256:'c'.repeat(64),evidenceSha256:'d'.repeat(64)}).plan;
const camel=(value:Record<string,unknown>)=>Object.fromEntries(Object.entries(value).map(([key,item])=>[key.replace(/_([a-z])/gu,(_all,letter:string)=>letter.toUpperCase()),item]));
const catalog:any={catalogId:plan.definition.catalog_id,releaseId:plan.definition.release_id,namespace:'global',workKey:'delivery-ui-contract',titleRu:'Окраска фасада',domain:'facade',definitionVersion:plan.definition.definition_version,applicability:{primaryMeasureParameterId:'q'},professionalMetadata:{},
 parameterSchema:plan.parameters.filter((p:any)=>p.parameter_id==='q'||p.parameter_id.startsWith(pfx)).map((p:any)=>({parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,
  required:p.required,defaultValue:null,constraints:p.constraints_json,visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,semanticParameterKey:p.truth_metadata.semantic_parameter_key,
  preliminaryCompilationAllowed:p.truth_metadata.preliminary_compilation_allowed,visibleWhen:p.truth_metadata.visible_when,guide:camel(p.truth_metadata.guide),provenance:p.truth_metadata.provenance,
  formulaConsumers:p.truth_metadata.formula_consumers,resourceBranchConsumers:p.truth_metadata.resource_branch_consumers}))};
function saved(parameters:Record<string,unknown>={}){return {revisionId,parentRevisionId:null,status:'ready',catalogId:catalog.catalogId,releaseId:catalog.releaseId,definitionVersionId:plan.definition.id,
 parameters:{q:'10',[pfx+'selection']:'NOT_SELECTED',...parameters},userInputSnapshot:{q:'10',[pfx+'selection']:'NOT_SELECTED',...parameters},checksumSha256:'1'.repeat(64),compilerVersion:'CONTROLLED_FUTURE_UI',createdAt:'2026-10-17T00:00:00Z',
 amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null},selectedMaterialDeliveryContext:{contractVersion:'canonical-selected-material-delivery-context/v1',command:null,globalConsignmentPaymentUniquenessProven:false,
  readFence:{contractVersion:'canonical-selected-delivery-read-fence/v1',parentRevisionId:revisionId,parentChecksumSha256:'1'.repeat(64),readSetSha256:'2'.repeat(64)}}} as any;}
let tree:ReactTestRenderer|undefined;
afterEach(()=>{if(tree)act(()=>tree!.unmount());tree=undefined;});
async function render(){
 const revision=saved(),session=buildConsumerCanonicalParameterSession({catalog,revision,draftId:'CONTROL_DELIVERY_UI'}),apply=jest.fn().mockResolvedValue(false);
 (getCanonicalEstimateRevision as jest.Mock).mockResolvedValue(revision);(getCanonicalEstimateCatalogItem as jest.Mock).mockResolvedValue(catalog);
 (getAllCanonicalEstimateRevisionRows as jest.Mock).mockResolvedValue([{rowId:'saved-order',titleRu:'Материал по сохранённому заказу',unitId:'l',quantity:'2',procurementEligible:true,includedInProcurement:true,
  calculationTrace:{purchaseBalance:{procurementReady:true,ownerRowId:'saved-order',unitId:'l',effectiveOrder:'2'}}}]);
 const local:any={revisionId,previousRevisionId:null,params:Object.fromEntries(Object.entries(revision.parameters).map(([id,value])=>[id,{value}])),boq:{rows:[]},trace:{params:[]},missingInputs:[]};
 await act(async()=>{tree=TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={local} latestDiff={null} paramEditorEnabled canonicalParameterSession={session} onApplyParamBatch={apply}/>);});
 return {revision,session,apply,root:tree!.root};
}
async function choose(root:ReactTestInstance,value:string){await act(async()=>{root.findByProps({testID:'editable-param-option-'+pfx+'selection-'+value}).props.onPress();});}
test('the authored selector is reachable; conditional facts stay hidden until selected and trip count stays internal',async()=>{
 const {root,session}=await render();expect(session.parameters.some(p=>p.parameterId===pfx+'selection')).toBe(true);
 expect(root.findAllByProps({testID:'selected-delivery-document-panel'})).toHaveLength(0);
 const active=buildConsumerCanonicalParameterSession({catalog,revision:saved({[pfx+'selection']:'SEPARATE_CONFIRMED'}),draftId:'CONTROL_DELIVERY_UI'});
 for(const parameter of catalog.parameterSchema.filter((p:any)=>p.visibilityRole==='USER_INPUT'&&p.parameterId.startsWith(pfx)))expect(active.parameters.some(p=>p.parameterId===parameter.parameterId)).toBe(true);
 expect(active.parameters.some(p=>p.parameterId===pfx+'admitted_trip_count')).toBe(false);
});
test('ordinary Apply carries the edited facts and exactly the confirmation viewed for this saved parent',async()=>{
 const {root,revision,apply}=await render();await choose(root,'SEPARATE_CONFIRMED');
 for(const [key,value] of [['document_reference','ДОК-17'],['consignment_id','Партия-17']])await act(async()=>{root.findByProps({testID:'editable-param-chip-'+pfx+key}).findByType(TextInput).props.onChangeText(value);});
 expect(root.findByProps({testID:'editable-param-batch-apply'}).props.disabled).toBe(true);
 await act(async()=>{root.findByProps({accessibilityLabel:'Включить в партию: Материал по сохранённому заказу'}).props.onPress();});
 await act(async()=>{root.findByProps({accessibilityLabel:'Артикул поставщика: Материал по сохранённому заказу'}).props.onChangeText('SUP-17');});
 await act(async()=>{root.findByProps({accessibilityLabel:'Подтверждаю состав партии и отдельную оплату доставки'}).props.onPress();});
 expect(root.findByProps({testID:'editable-param-batch-apply'}).props.disabled).toBe(false);
 await act(async()=>{root.findByProps({testID:'editable-param-batch-apply'}).props.onPress();});
 expect(apply).toHaveBeenCalledTimes(1);const [patches,confirmation]=apply.mock.calls[0]!;
 expect(patches).toEqual(expect.arrayContaining([expect.objectContaining({paramKey:pfx+'selection',rawValue:'SEPARATE_CONFIRMED'}),expect.objectContaining({paramKey:pfx+'document_reference',rawValue:'ДОК-17'})]));
 expect(confirmation.readFence).toEqual(revision.selectedMaterialDeliveryContext.readFence);expect(confirmation.command.skuBindings).toEqual([{rowId:'saved-order',skuKey:'SUP-17'}]);
});
test('leaving an unsaved delivery choice clears its pending state and preserves the legacy one-argument Apply callback',async()=>{
 const {root,apply}=await render();await choose(root,'SEPARATE_CONFIRMED');await choose(root,'NOT_SELECTED');
 expect(root.findAllByProps({testID:'selected-delivery-document-panel'})).toHaveLength(0);
 await act(async()=>{root.findByProps({testID:'editable-param-chip-q'}).findByType(TextInput).props.onChangeText('11');});
 expect(root.findByProps({testID:'editable-param-batch-apply'}).props.disabled).toBe(false);
 await act(async()=>{root.findByProps({testID:'editable-param-batch-apply'}).props.onPress();});
 expect(apply.mock.calls[0]).toHaveLength(1);expect(apply.mock.calls[0]![0]).toEqual([expect.objectContaining({paramKey:'q',rawValue:'11'})]);
});
