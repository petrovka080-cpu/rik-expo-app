import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {canonicalScopeRequirementStatusRuV1,type CanonicalScopeRequirementGroupV1} from '../../lib/estimate/backendPlatform/canonicalScopeRequirementV1';

export class RequestEstimateScopeRequirements extends React.PureComponent<{groups:CanonicalScopeRequirementGroupV1[]},{open:boolean}> {
  state={open:false};
  render():React.ReactElement|null {
    const groups=this.props.groups;
    if (!groups.length) return null;
    const project=groups.filter(g=>g.statuses.some(s=>['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','SCOPE_UNVERIFIED'].includes(s))).length;
    return <View style={{gap:8,paddingVertical:10}} testID="request-estimate-scope-requirements">
      <Text style={{fontWeight:'700',color:'#334155'}}>Состав и этапы · групп требований: {groups.length}</Text>
      <Text style={{color:'#475569'}}>Отдельные работы по проекту: {project}. Включённые расходы и выполненная подготовка повторно не начисляются. Нормы и зависимые количества рассчитывает приложение.</Text>
      <Pressable accessibilityRole="button" onPress={()=>this.setState(s=>({open:!s.open}))} testID="request-estimate-scope-requirements-toggle">
        <Text style={{color:'#176b45',fontWeight:'700'}}>{this.state.open?'Скрыть состав и этапы':'Показать состав и этапы'}</Text>
      </Pressable>
      {this.state.open?groups.map(g=><View key={g.groupId} style={{gap:4,padding:10,backgroundColor:'#F1F5F9',borderRadius:6}} testID={`request-estimate-scope-group-${g.groupId}`}>
        <Text style={{fontWeight:'700',color:'#334155'}}>{g.titleRu}</Text>
        <Text style={{color:'#475569'}}>{g.statuses.map(canonicalScopeRequirementStatusRuV1).join('; ')}</Text>
        {g.detailsRu.map((reason,i)=><Text key={i} style={{color:'#475569'}}>{reason}</Text>)}
      </View>):null}
    </View>;
  }
}
