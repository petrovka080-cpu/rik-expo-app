import {knaufInteriorPlasterBaseLabourDefinitionS2763,knaufInteriorPlasterBaseLabourPackS2763 as pack} from './knaufInteriorPlasterBaseLabourS2763';
import {evaluateFormulaGraph} from '../backendPlatform/formulaGraph';

test.each([
  ['WALL','18.42095','0.0142','0.0568','0.59285','0.66385'],
  ['CEILING','22.4005','0.01775','0.0639','0.69225','0.7739'],
] as const)('pinned %s column has independent fractional per100m2 quantities without shift rounding',(surface,...expected)=>{
  const def=knaufInteriorPlasterBaseLabourDefinitionS2763(surface);
  expect(def.formulas.map(f=>evaluateFormulaGraph(f.ast,{q:'35.5'}))).toEqual(expected);
  expect(def.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST')).toHaveLength(4);
  expect(def.resources.at(-1)?.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
  expect(def.parameters.every(p=>p.default_value==null&&p.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT')).toBe(true);
  expect(def.resources.every(r=>r.source_metadata?.historic2015PriceNotAdmitted===true)).toBe(true);
  expect(pack.newFullTechnicalTypes).toBe(0);
});
