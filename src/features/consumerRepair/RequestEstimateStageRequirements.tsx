import React from 'react';
import {Text} from 'react-native';
import type {CanonicalScopeRequirementGroupV1} from '../../lib/estimate/backendPlatform/canonicalScopeRequirementV1';

export function RequestEstimateStageRequirements({groups}: {groups: readonly CanonicalScopeRequirementGroupV1[]}) {
  return <>{groups.map(group => {
    const calculationIncomplete = group.statuses.some(status =>
      ['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','LEGACY_SOURCE_REQUIRED','SCOPE_UNVERIFIED'].includes(status));
    const objectFactsMissing = group.statuses.includes('OBJECT_FACT_REQUIRED');
    if (!calculationIncomplete && !objectFactsMissing) return null;
    return <Text key={group.groupId} style={{color:'#9A3412',paddingVertical:8}}
      testID={`request-estimate-stage-requirement-${group.groupId}`}>
      {objectFactsMissing ? 'Исходные данные не заполнены' : 'Не рассчитано'}
    </Text>;
  })}</>;
}
