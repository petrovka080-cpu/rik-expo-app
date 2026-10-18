import {
  assertCanonicalPublisherParameterOrdinalsUniqueR1 as validate,
  createCanonicalDefinitionClonePlan,
} from './canonicalDefinitionPublisherR1';
import {pavingCut70ConditionalConsumerDefinitionR1 as paving} from '../../../src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityDefinitionR1 as source} from '../../../src/lib/estimate/v4/pavingCutStationary70QuantityR1';

it('persists six appended paving needs after the six unchanged source parameter ordinals',()=>{
  const before=JSON.stringify(source()),parameters=paving().parameters;
  expect(parameters.map(p=>p.ordinal)).toEqual(Array.from({length:12},(_,i)=>i));
  expect(parameters.slice(0,6)).toEqual(source().parameters);
  expect(()=>validate(parameters)).not.toThrow();
  expect(JSON.stringify(source())).toBe(before);
});

it('rejects the observed duplicate ordinal in the real clone-plan entry before building a write plan',()=>{
  const parameters=[{parameter_id:'source',ordinal:1},{parameter_id:'need',ordinal:1}];
  // Incomplete synthetic input proves validation precedes all other plan work.
  expect(()=>createCanonicalDefinitionClonePlan({representative:{parameters}} as unknown as Parameters<typeof createCanonicalDefinitionClonePlan>[0]))
    .toThrow('STOP_CANONICAL_PUBLISHER_DUPLICATE_PARAMETER_ORDINAL:1');
});

it('preserves valid sparse historical ordinals and input ordering without renumbering',()=>{
  const parameters=[{parameter_id:'later',ordinal:95},{parameter_id:'earlier',ordinal:12}],before=JSON.stringify(parameters);
  expect(()=>validate(parameters)).not.toThrow();expect(JSON.stringify(parameters)).toBe(before);
});

it.each([undefined,null,'1',1.5,Number.NaN])('rejects non-integer ordinal %s before SQL coercion',ordinal=>{
  expect(()=>validate([{parameter_id:'invalid',ordinal}])).toThrow('STOP_CANONICAL_PUBLISHER_PARAMETER_ORDINAL_INVALID:invalid');
});
