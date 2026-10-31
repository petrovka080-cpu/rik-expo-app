import { convertProfessionalUnitQuantity, getProfessionalUnitDefinition,
  normalizeProfessionalPricedUnitForLocale, resolveProfessionalUnitDefinition } from './professionalUnitRegistry';
import { normalizeCanonicalProfessionalBoqUnit } from './canonicalUnits';
import { convertEngineeringUnitV4, getEngineeringUnitV4, resolveEngineeringUnitV4,
  validateEngineeringUnitRegistryV4 } from './v4/engineeringUnitRegistryV4';
import { CATEGORY_UNIT_CONTRACT_V4, validateCategoryUnitV4 } from './v4/categoryUnitContractV4';
import { formatEstimateUnitLabel } from '../ai/globalEstimate/formatEstimateUnitLabel';
import type { BoqCategoryV4 } from './v4/professionalEstimateV4Contract';
import { validateFormulaDimensionsV4 } from './v4/formulaDimensionValidatorV4';

describe('shared person headcount unit', () => {
  it.each(['person','people','чел','чел.','человек'])(
    'keeps %s as people through canonical BOQ, engineering and public display', input => {
      expect(normalizeCanonicalProfessionalBoqUnit(input)).toBe('person');
      expect(resolveProfessionalUnitDefinition(input)).toMatchObject({code:'person',dimension:'headcount',
        canonicalSiUnit:'person',conversionFactorToSi:1,precision:0,discrete:true,boqCanonical:true});
      expect(resolveEngineeringUnitV4(input)).toMatchObject({unit_id:'person',dimension:'headcount',
        vector:{headcount:1},precision:0});
      expect(formatEstimateUnitLabel(input)).toBe('чел.');
    });
  it.each(['pcs','man_hour','machine_hour','set','service','h'])(
    'never converts people to %s or back', other => {
      expect(convertProfessionalUnitQuantity(2,'person',other)).toBeNull();
      expect(convertProfessionalUnitQuantity(2,other,'person')).toBeNull();
      expect(convertEngineeringUnitV4(2,'person',other)).toBeNull();
      expect(convertEngineeringUnitV4(2,other,'person')).toBeNull();
    });
  it.each(Object.keys(CATEGORY_UNIT_CONTRACT_V4) as BoqCategoryV4[])(
    'retains category admission for %s', category => {
      const result=validateCategoryUnitV4({category,unit_id:'person'});
      expect(result.ok).toBe(category==='labor'||category==='subcontract_service');
      expect(result.blockers).toEqual(result.ok?[]:['CATEGORY_UNIT_MISMATCH']);
    });
  it('preserves a reference count and price without replacing it with hours or a crew set', () => {
    expect(convertProfessionalUnitQuantity(2,'person','person')).toBe(2);
    expect(convertEngineeringUnitV4(2,'person','person')).toBe(2);
    expect(normalizeProfessionalPricedUnitForLocale({quantity:2,unitPrice:77,unit:'person',
      jurisdiction:'KG',unitSystem:'metric'})).toMatchObject({quantity:2,unitPrice:77,unit:'person',total:154});
    expect(getProfessionalUnitDefinition('man_hour')?.dimension).toBe('labor_time');
    expect(getEngineeringUnitV4('pcs')?.vector).toEqual({count:1});
    expect(validateEngineeringUnitRegistryV4().ok).toBe(true);
  });
  it.each(['2*crew','crew+crew'])(
    'keeps the headcount axis through formula arithmetic: %s', expression => {
      expect(validateFormulaDimensionsV4({expression,input_unit_ids:{crew:'person'},
        output_unit_id:'person'})).toMatchObject({ok:true,result_vector:{headcount:1},output_vector:{headcount:1}});
    });
  it.each([
    {expression:'2',input_unit_ids:{},output_unit_id:'person'},
    {expression:'crew',input_unit_ids:{crew:'person'},output_unit_id:'one'},
  ])('rejects dimensionless/headcount substitution: $expression to $output_unit_id', input => {
    const result=validateFormulaDimensionsV4(input);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain('FORMULA_DIMENSION_MISMATCH');
  });
});
