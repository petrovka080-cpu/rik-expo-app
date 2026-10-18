import React from 'react';import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {CanonicalSelectedDeliveryDocumentPanel as Panel} from '../../src/features/consumerRepair/CanonicalSelectedDeliveryDocumentPanel';
import {selectedDeliveryDocumentOrderRowsR1 as orders,selectedDeliveryDocumentRequestR1 as request} from '../../src/lib/estimate/backendPlatform/canonicalSelectedDeliveryDocumentR1';
const revisionId='11111111-1111-4111-8111-111111111111';
const source=():any=>({revision:{revisionId,checksumSha256:'1'.repeat(64),selectedMaterialDeliveryContext:{contractVersion:'canonical-selected-material-delivery-context/v1',command:null,
 readFence:{contractVersion:'canonical-selected-delivery-read-fence/v1',parentRevisionId:revisionId,parentChecksumSha256:'1'.repeat(64),readSetSha256:'2'.repeat(64)},globalConsignmentPaymentUniquenessProven:false}},
 rows:[{rowId:'saved-material-order',titleRu:'Краска в упаковке',quantity:'2',unitId:'l',includedInProcurement:true,procurementEligible:true,
 calculationTrace:{purchaseBalance:{procurementReady:true,ownerRowId:'saved-material-order',unitId:'l',effectiveOrder:'2'}}},
 {rowId:'unready',titleRu:'Неподтверждённый материал',quantity:'3',unitId:'l',includedInProcurement:false,procurementEligible:true,calculationTrace:{}}]});
let trees:ReactTestRenderer[]=[];
beforeAll(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(async()=>{await act(async()=>{for(const tree of trees)tree.unmount();});trees=[];});
async function render(extra:Record<string,unknown>={}){
 const current=source(),onChange=jest.fn(),loadSource=jest.fn().mockResolvedValue(current);
 const props={revisionId,documentReference:'ДОК-17',consignmentId:'Партия-17',disabled:false,loadSource,onChange,...extra};let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(<Panel {...props}/>);});trees.push(tree);return {tree,props,current,onChange,loadSource};
}
const byLabel=(tree:ReactTestRenderer,label:string)=>tree.root.findByProps({accessibilityLabel:label});
async function selectAndConfirm(tree:ReactTestRenderer){
 await act(async()=>{byLabel(tree,'Включить в партию: Краска в упаковке').props.onPress();});
 await act(async()=>{byLabel(tree,'Артикул поставщика: Краска в упаковке').props.onChangeText('SUP-001');});
 await act(async()=>{byLabel(tree,'Подтверждаю состав партии и отдельную оплату доставки').props.onPress();});
}
test('only included ready saved orders are selectable; no SKU is invented from a row identifier',async()=>{
 const {tree,onChange}=await render();expect(tree.root.findAllByProps({accessibilityLabel:'Включить в партию: Неподтверждённый материал'})).toHaveLength(0);
 expect(tree.root.findAllByProps({accessibilityLabel:'Артикул поставщика: Краска в упаковке'})).toHaveLength(0);expect(onChange).toHaveBeenLastCalledWith(undefined,true);
});
test('explicit material, supplier SKU and payment confirmation retain exactly the viewed read fence',async()=>{
 const {tree,onChange,current}=await render();await selectAndConfirm(tree);const [confirmation,pending]=onChange.mock.calls.at(-1)!;
 expect(pending).toBe(false);expect(confirmation.readFence).toEqual(current.revision.selectedMaterialDeliveryContext.readFence);
 expect(confirmation.command).toMatchObject({documentReference:'ДОК-17',consignmentId:'Партия-17',separatePaymentConfirmed:true,skuBindings:[{rowId:'saved-material-order',skuKey:'SUP-001'}]});
 expect(confirmation.command.skuBindings[0]).not.toHaveProperty('quantity');expect(confirmation).not.toHaveProperty('price');
});
test('editing a supplier SKU clears previous confirmation before the ordinary Apply action',async()=>{
 const {tree,onChange}=await render();await selectAndConfirm(tree);
 await act(async()=>{byLabel(tree,'Артикул поставщика: Краска в упаковке').props.onChangeText('SUP-002');});
 expect(onChange).toHaveBeenLastCalledWith(undefined,true);expect(byLabel(tree,'Подтверждаю состав партии и отдельную оплату доставки').props.accessibilityState.checked).toBe(false);
});
test('editing the document invalidates confirmation without changing saved material quantities',async()=>{
 const {tree,onChange,props}=await render();await selectAndConfirm(tree);
 await act(async()=>{tree.update(<Panel {...props} documentReference="ДОК-18"/>);});expect(onChange).toHaveBeenLastCalledWith(undefined,true);
 expect(byLabel(tree,'Подтверждаю состав партии и отдельную оплату доставки').props.accessibilityState.checked).toBe(false);
});
test('unchanged saved confirmation reopens with its SKU and does not create a new acknowledgement',async()=>{
 const saved=source();saved.revision.selectedMaterialDeliveryContext.command={contractVersion:'canonical-selected-material-delivery-command/v1',documentReference:'ДОК-17',consignmentId:'Партия-17',documentCapturedAt:'2026-10-17T00:00:00Z',separatePaymentConfirmed:true,skuBindings:[{rowId:'saved-material-order',skuKey:'SAVED-SKU'}]};
 const {tree,onChange}=await render({loadSource:jest.fn().mockResolvedValue(saved)});
 expect(byLabel(tree,'Артикул поставщика: Краска в упаковке').props.value).toBe('SAVED-SKU');expect(onChange).toHaveBeenLastCalledWith(undefined,false);
 expect(byLabel(tree,'Подтверждаю состав партии и отдельную оплату доставки').props.accessibilityState.checked).toBe(true);
});
test('a failed read blocks confirmation and exposes a normal retry button',async()=>{
 const {tree,onChange}=await render({loadSource:jest.fn().mockRejectedValue(new Error('Партия недоступна.'))});
 expect(tree.root.findAllByProps({accessibilityRole:'alert'})).toHaveLength(1);expect(onChange).toHaveBeenLastCalledWith(undefined,true);
 expect(tree.root.findAllByProps({accessibilityRole:'checkbox'})).toHaveLength(0);
});
test('no confirmed order is created when no saved procurement row is ready',async()=>{
 const saved=source();saved.rows=[];const {tree,onChange}=await render({loadSource:jest.fn().mockResolvedValue(saved)});
 expect(tree.root.findAllByProps({accessibilityRole:'checkbox'})).toHaveLength(0);expect(onChange).toHaveBeenLastCalledWith(undefined,true);
});
test('pending application disables material, SKU and confirmation controls',async()=>{
 const {tree,props}=await render();await selectAndConfirm(tree);await act(async()=>{tree.update(<Panel {...props} disabled/>);});
 expect(byLabel(tree,'Включить в партию: Краска в упаковке').props.disabled).toBe(true);expect(byLabel(tree,'Артикул поставщика: Краска в упаковке').props.editable).toBe(false);
 expect(byLabel(tree,'Подтверждаю состав партии и отдельную оплату доставки').props.disabled).toBe(true);
});
test('document construction cannot select another, excluded or unready row',()=>{
 const current=source();expect(orders(current,revisionId)).toHaveLength(1);
 expect(()=>request({source:current,revisionId,documentReference:'ДОК-17',consignmentId:'Партия-17',selectedRowIds:['unready'],skuByRowId:{unready:'SKU'},capturedAt:'2026-10-17T00:00:00Z'})).toThrow();
});
test('a stale revision or missing supplier SKU cannot form a confirmed request',()=>{
 const current=source();expect(()=>orders(current,'22222222-2222-4222-8222-222222222222')).toThrow();
 expect(()=>request({source:current,revisionId,documentReference:'ДОК-17',consignmentId:'Партия-17',selectedRowIds:['saved-material-order'],skuByRowId:{},capturedAt:'2026-10-17T00:00:00Z'})).toThrow();
});
