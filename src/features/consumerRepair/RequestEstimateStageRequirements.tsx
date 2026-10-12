import React from 'react';
import {Text, View} from 'react-native';
import {canonicalScopeRequirementStatusRuV1, type CanonicalScopeRequirementGroupV1} from '../../lib/estimate/backendPlatform/canonicalScopeRequirementV1';

export function RequestEstimateStageRequirements({groups}: {groups: readonly CanonicalScopeRequirementGroupV1[]}) {
  return <>{groups.map(group => <View key={group.groupId} style={{gap:4,paddingVertical:8}}
    testID={`request-estimate-stage-requirement-${group.groupId}`}>
    <Text style={{color:'#475569',fontWeight:'700'}}>{group.statuses.map(canonicalScopeRequirementStatusRuV1).join('; ')}</Text>
    {group.detailsRu.map((reason,index) => <Text key={index} style={{color:'#475569'}}>{reason}</Text>)}
    {group.statuses.some(status => ['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','LEGACY_SOURCE_REQUIRED','SCOPE_UNVERIFIED'].includes(status))
      ? <Text style={{color:'#9A3412'}}>Расчёт этого этапа ещё не завершён приложением. Не включён в стоимость и закупку.</Text> : null}
  </View>)}</>;
}
