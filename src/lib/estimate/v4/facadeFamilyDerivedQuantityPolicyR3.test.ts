import assert from 'node:assert/strict';
import {facadeCurrentWetDefinitionR3} from './facadeCurrentWetSystemR3';
import {facadeVentilatedPorcelainDefinitionR3} from './facadeVentilatedPorcelainR3';
import {facadeFacedMaterialDefinitionR3,type FacadeFacedMaterialKeyR3} from './facadeFacedMaterialsKrerR3';
import {formulaAstInputParameterIds,type FormulaAst} from '../backendPlatform/formulaGraph';
import {validateCanonicalDerivedQuantityEditPolicyV1} from '../backendPlatform/canonicalDerivedQuantityEditPolicyV1';

// Prepared ROOT check: imports and test execution are UNRUN in source authoring.
describe('façade whole-family derived quantity policy integrity R3', () => {
  const builders = [
    ['wet', facadeCurrentWetDefinitionR3],
    ['porcelain', facadeVentilatedPorcelainDefinitionR3],
    ...(['face-brick-aac','limestone-mortar','ceramic-tile-mortar','plain-render'] as FacadeFacedMaterialKeyR3[])
      .map(key => [key, () => facadeFacedMaterialDefinitionR3(key)] as const),
  ] as const;
  for (const [key, build] of builders) test(String(key) + ' policy exactly follows formula and AST inputs', () => {
    const model = (build as typeof facadeCurrentWetDefinitionR3)();
    const formulas = new Map(model.formulas.map(formula => [formula.formula_id, formula]));
    const ids = new Set(model.parameters.map(parameter => parameter.parameter_id));
    for (const row of model.resources) {
      const formula = formulas.get(row.formula_id)!;
      const policy = row.resource_graph.derivedQuantityEditPolicyV1;
      if (formula.input_parameter_ids.length === 0) assert.equal(policy, undefined, 'CONSTANT_PHYSICAL_STOCK_HAS_NO_FAKE_PARAMETER');
      assert.doesNotThrow(() => validateCanonicalDerivedQuantityEditPolicyV1(policy, row.row_id,
        row.unit_id, formula.output_unit_id, formula.input_parameter_ids, ids,
        formulaAstInputParameterIds(formula.ast as FormulaAst)));
    }
  });
});
