import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,StyleSheet} from 'react-native';
import {formatEstimateUnitLabel} from '../../lib/ai/globalEstimate/formatEstimateUnitLabel';
import {selectedDeliveryDocumentOrderRowsR1,selectedDeliveryDocumentRequestR1,type SelectedDeliveryDocumentSourceR1} from '../../lib/estimate/backendPlatform/canonicalSelectedDeliveryDocumentR1';
import type {CanonicalSelectedMaterialDeliveryRequestR1 as Confirmation} from '../../lib/estimate/backendPlatform/canonicalSelectedMaterialDeliveryContractR1';
type Props=Readonly<{revisionId:string;documentReference:string;consignmentId:string;disabled:boolean;
 loadSource:(revisionId:string)=>Promise<SelectedDeliveryDocumentSourceR1>;
 onChange:(command:Confirmation|undefined,pending:boolean)=>void}>;
export function CanonicalSelectedDeliveryDocumentPanel(props:Props){
 const [source,setSource]=useState<SelectedDeliveryDocumentSourceR1|null>(null),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
 const [selected,setSelected]=useState<string[]>([]),[skus,setSkus]=useState<Record<string,string>>({}),[confirmed,setConfirmed]=useState(false),[edited,setEdited]=useState(false);
 useEffect(()=>{
  let active=true;setSource(null);setError(null);props.onChange(undefined,true);
  void props.loadSource(props.revisionId).then(value=>{
   selectedDeliveryDocumentOrderRowsR1(value,props.revisionId);if(!active)return;
   const saved=value.revision.selectedMaterialDeliveryContext!.command;
   setSelected(saved?.skuBindings.map(binding=>binding.rowId)??[]);setSkus(Object.fromEntries(saved?.skuBindings.map(binding=>[binding.rowId,binding.skuKey])??[]));
   setEdited(false);setConfirmed(Boolean(saved));setSource(value);
  }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Не удалось загрузить сохранённый заказ.');});
  return()=>{active=false;};
 },[props.revisionId,props.loadSource,retry]);
 useEffect(()=>{
  if(!source||source.revision.revisionId!==props.revisionId)return;
  const saved=source.revision.selectedMaterialDeliveryContext!.command;
  const matches=saved?.documentReference===props.documentReference&&saved?.consignmentId===props.consignmentId;
  if(!edited&&matches){props.onChange(undefined,false);return;}
  setConfirmed(false);props.onChange(undefined,true);
 },[source,props.documentReference,props.consignmentId,edited]);
 const change=(rows:string[],values:Record<string,string>)=>{setSelected(rows);setSkus(values);setEdited(true);setConfirmed(false);setError(null);props.onChange(undefined,true);};
 const confirm=()=>{
  if(!source||source.revision.revisionId!==props.revisionId||props.disabled)return;
  if(confirmed){setConfirmed(false);setEdited(true);props.onChange(undefined,true);return;}
  try{
   const command=selectedDeliveryDocumentRequestR1({source,revisionId:props.revisionId,documentReference:props.documentReference,consignmentId:props.consignmentId,
    selectedRowIds:selected,skuByRowId:skus,capturedAt:new Date().toISOString()});
   setError(null);setConfirmed(true);props.onChange(command,false);
  }catch(reason){setError(reason instanceof Error?reason.message:'Проверьте документ и артикулы выбранных материалов.');}
 };
 const rows=source&&source.revision.revisionId===props.revisionId?selectedDeliveryDocumentOrderRowsR1(source,props.revisionId):[];
 return <View style={styles.panel} testID="selected-delivery-document-panel">
  <Text style={styles.title}>Подтверждение партии и отдельной доставки</Text>
  <Text style={styles.note}>Выберите материалы по документу партии и укажите их артикулы у поставщика. Количества берутся из сохранённой сметы. Разгрузка и возврат тары в эту доставку не входят.</Text>
  {!source&&!error?<Text>Загружаем сохранённый заказ…</Text>:null}
  {source&&rows.length===0?<Text>В этой версии нет подтверждённых позиций заказа для отдельной доставки.</Text>:null}
  {rows.map(row=><View key={row.rowId} style={styles.row}>
   <Pressable accessibilityRole="checkbox" accessibilityLabel={`Включить в партию: ${row.titleRu}`} accessibilityState={{checked:selected.includes(row.rowId),disabled:props.disabled}}
    disabled={props.disabled} onPress={()=>change(selected.includes(row.rowId)?selected.filter(id=>id!==row.rowId):[...selected,row.rowId],skus)}>
    <Text style={styles.label}>{selected.includes(row.rowId)?'☑':'☐'} {row.titleRu}</Text>
   </Pressable>
   <Text style={styles.note}>{row.quantity} {formatEstimateUnitLabel(row.unitId)}</Text>
   {selected.includes(row.rowId)?<TextInput accessibilityLabel={`Артикул поставщика: ${row.titleRu}`} placeholder="Артикул поставщика" value={skus[row.rowId]??''}
    editable={!props.disabled} maxLength={500} onChangeText={value=>change(selected,{...skus,[row.rowId]:value})} style={styles.input}/>:null}
  </View>)}
  {source&&rows.length>0?<Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed,disabled:props.disabled}} disabled={props.disabled}
   accessibilityLabel="Подтверждаю состав партии и отдельную оплату доставки" onPress={confirm} style={styles.confirm}>
   <Text>{confirmed?'☑':'☐'} Подтверждаю состав партии по указанному документу и отдельную оплату доставки.</Text>
  </Pressable>:null}
  {error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}
  {!source&&error?<Pressable accessibilityRole="button" disabled={props.disabled} onPress={()=>setRetry(value=>value+1)}><Text>Повторить загрузку заказа</Text></Pressable>:null}
 </View>;
}
const styles=StyleSheet.create({panel:{padding:12,borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,gap:8},title:{fontSize:15,fontWeight:'700',color:'#0F172A'},note:{fontSize:12,color:'#475569'},
 row:{gap:5,paddingVertical:6},label:{fontSize:14,color:'#0F172A'},input:{borderWidth:1,borderColor:'#94A3B8',borderRadius:6,padding:9,color:'#0F172A'},confirm:{paddingVertical:9},error:{color:'#B91C1C',fontSize:12}});
