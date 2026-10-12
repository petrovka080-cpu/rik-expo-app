import React from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {listCanonicalRoofPrimerPrerequisiteCandidatesV1} from '../../lib/estimate/backendPlatform/canonicalEstimateClient';
import {readRoofPrimerPrerequisiteDecisionV1,roofPrimerPhaseRuV1,ROOF_PRIMER_PREREQUISITE_CONTRACT_V1,
  type RoofPrimerPhaseV1,type RoofPrimerPrerequisiteCandidateV1,type RoofPrimerPrerequisiteCommandV1,type RoofPrimerPrerequisiteDecisionV1} from '../../lib/estimate/backendPlatform/canonicalRoofPrimerPrerequisiteV1';

type Props={revisionId:string;stored:RoofPrimerPrerequisiteDecisionV1|null;fieldReady:boolean;disabled:boolean;
  onSave:(command:RoofPrimerPrerequisiteCommandV1|null)=>Promise<void>};
type State={open:boolean;loading:boolean;saving:boolean;items:RoofPrimerPrerequisiteCandidateV1[];selected:RoofPrimerPrerequisiteCandidateV1|null;
  phase:RoofPrimerPhaseV1|null;sectionLabelRu:string;confirmed:boolean;error:string|null};
const phases:RoofPrimerPhaseV1[]=['completed_accepted','planned','applied_readiness_unknown','partly_completed','unknown'];
export class RequestEstimatePrimerPrerequisite extends React.PureComponent<Props,State>{
  state:State={open:false,loading:false,saving:false,items:[],selected:null,phase:null,sectionLabelRu:'Основное поле кровли',confirmed:false,error:null};
  private alive=true;
  componentWillUnmount():void{this.alive=false;}
  private open=async()=>{
    if(this.props.disabled||this.state.saving)return;
    const revisionId=this.props.revisionId,stored=readRoofPrimerPrerequisiteDecisionV1(this.props.stored);
    this.setState({open:true,loading:true,error:null,selected:stored?stored:null,phase:stored?.phase??(this.props.fieldReady?'completed_accepted':null),
      sectionLabelRu:stored?.sectionLabelRu??'Основное поле кровли',confirmed:stored?.sameSectionAndCompatibilityConfirmed===true});
    try{
      const result=await listCanonicalRoofPrimerPrerequisiteCandidatesV1(revisionId);
      if(this.alive&&this.props.revisionId===revisionId){
        if(result.revisionId!==revisionId)throw Error('Версия сметы изменилась. Откройте связь снова.');
        this.setState({items:result.items,loading:false});
      }
    }catch(error){if(this.alive&&this.props.revisionId===revisionId)this.setState({loading:false,error:error instanceof Error?error.message:'Сметы огрунтовки не загрузились.'});}
  };
  private save=async(clear=false)=>{
    if(this.props.disabled||this.state.saving)return;
    const {selected,phase,confirmed,sectionLabelRu}=this.state;
    if(!clear&&(!selected||!phase||!confirmed||!sectionLabelRu.trim()))return;
    const stored=this.props.stored;
    if(!clear&&stored&&selected?.sourceRevisionId===stored.sourceRevisionId&&selected.sourceChecksumSha256===stored.sourceChecksumSha256
      &&phase===stored.phase&&sectionLabelRu.trim()===stored.sectionLabelRu&&confirmed){this.setState({open:false,error:null});return;}
    this.setState({saving:true,error:null});
    try{
      await this.props.onSave(clear?null:{contractVersion:ROOF_PRIMER_PREREQUISITE_CONTRACT_V1,
        sourceRevisionId:selected!.sourceRevisionId,sourceChecksumSha256:selected!.sourceChecksumSha256,
        phase:phase!,sectionLabelRu:sectionLabelRu.trim(),sameSectionAndCompatibilityConfirmed:true});
      if(this.alive)this.setState({open:false,saving:false});
    }catch(error){if(this.alive)this.setState({saving:false,error:error instanceof Error?error.message:'Связь не сохранена.'});}
  };
  render():React.ReactNode{
    const stored=readRoofPrimerPrerequisiteDecisionV1(this.props.stored),s=this.state;
    const disabled=this.props.disabled||s.saving;
    return <View style={{gap:8,padding:12,backgroundColor:'#F1F5F9',borderRadius:6}} testID="request-estimate-primer-prerequisite">
      <Text style={{fontWeight:'700'}}>Огрунтовка основания</Text>
      <Text>{stored?`${roofPrimerPhaseRuV1(stored.phase)} · ${stored.sectionLabelRu}`:this.props.fieldReady?'Выполнение подтверждено исходными данными. Повторная огрунтовка не начисляется.':'Подготовку нужно подтвердить до выполнения покрытия.'}</Text>
      {stored?<><Text>Связанная смета: {stored.sourceDisplayTitleRu} · версия {stored.sourceRevisionNumber}</Text>
        <Text>Стоимость подготовки учитывается в связанной смете. Количества и цены здесь повторно не добавляются.</Text>
        {stored.phase!=='completed_accepted'?<Text>План подготовки не подтверждает фактическую готовность основания.</Text>:null}</>:null}
      <Pressable accessibilityRole="button" disabled={disabled} onPress={this.open}>
        <Text style={{color:'#176b45',fontWeight:'700'}}>{stored?'Изменить связь со сметой огрунтовки':'Связать существующую смету огрунтовки'}</Text>
      </Pressable>
      {s.open?<View style={{gap:10}} testID="request-estimate-primer-link-editor">
        <Text>Выберите сохранённую огрунтовку этого участка с подтверждённой проектной совместимостью. Уже выполненную подготовку повторно не заказывайте.</Text>
        {s.loading?<Text>Загружаем сохранённые сметы…</Text>:s.items.length===0?<Text>Подходящих сохранённых смет огрунтовки пока нет. Подтверждённый факт готовности основания сохраняется без отдельной ссылки.</Text>:null}
        {s.items.map(item=><Pressable key={item.sourceRevisionId} accessibilityRole="button" accessibilityState={{selected:s.selected?.sourceRevisionId===item.sourceRevisionId}}
          disabled={disabled} onPress={()=>this.setState({selected:item,error:null})} style={{padding:10,borderWidth:1,borderColor:s.selected?.sourceRevisionId===item.sourceRevisionId?'#176b45':'#CBD5E1',borderRadius:6}}>
          <Text>{item.sourceDisplayTitleRu} · версия {item.sourceRevisionNumber}</Text>
        </Pressable>)}
        {s.selected?<>
          <Text>Площадь в выбранной смете огрунтовки: {s.selected.sourceNormAreaM2.replace('.',',')} м². Она обмеряется отдельно и не умножается на число слоёв покрытия.</Text>
          <TextInput accessibilityLabel="Участок связи огрунтовки и покрытия" editable={!disabled} value={s.sectionLabelRu} maxLength={200}
            onChangeText={sectionLabelRu=>this.setState({sectionLabelRu})} style={{padding:10,borderWidth:1,borderColor:'#CBD5E1',borderRadius:6}}/>
          {this.props.fieldReady?<Text>Основание уже подтверждено как огрунтованное: связывается выполненная подготовка.</Text>:phases.map(phase=><Pressable key={phase} accessibilityRole="button" accessibilityState={{selected:s.phase===phase}}
            disabled={disabled} onPress={()=>this.setState({phase})}><Text>{s.phase===phase?'● ':'○ '}{roofPrimerPhaseRuV1(phase)}</Text></Pressable>)}
          <Pressable accessibilityRole="checkbox" accessibilityState={{checked:s.confirmed}} disabled={disabled} onPress={()=>this.setState({confirmed:!s.confirmed})}>
            <Text>{s.confirmed?'☑ ':'☐ '}Смета относится к этому участку; совместимость основания, огрунтовки и покрытия подтверждена проектом</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled||!s.phase||!s.confirmed||!s.sectionLabelRu.trim()} onPress={()=>this.save()}><Text style={{fontWeight:'700',color:'#176b45'}}>{s.saving?'Сохраняем связь…':'Сохранить связь'}</Text></Pressable>
        </>:null}
        {stored?<Pressable accessibilityRole="button" disabled={disabled} onPress={()=>this.save(true)}><Text>Убрать только связь; сохранить обе сметы</Text></Pressable>:null}
        <Pressable accessibilityRole="button" disabled={s.saving} onPress={()=>this.setState({open:false,error:null})}><Text>Отмена</Text></Pressable>
        {s.error?<Text accessibilityRole="alert" style={{color:'#B91C1C'}}>{s.error}</Text>:null}
      </View>:null}
    </View>;
  }
}
