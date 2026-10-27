import { ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 as conditions, roofConditionIncludesPlannedPrimerV1 } from './canonicalRoofForecastConditionV1';
import { assertRoofPlannedPreparationOwnerContextV1 } from './canonicalRoofPlannedPreparationV1';
import { admitRoofPrimerPrerequisiteServerV1 } from './canonicalRoofPrimerPrerequisiteServerV1';
const input={ownerUserId:'00000000-0000-4000-8000-000000000001',organizationId:null,
  fieldRevisionId:'00000000-0000-4000-8000-000000000002',fieldCatalogId:'canonical-work:base:roofing_interior_flat_roof_install_technical_room',
  fieldParameters:{roof_torch_conditions:conditions},supplied:false,command:undefined,parentAmendmentContract:{}};
test.each(['inheritedExternalOwner','suppliedExternalOwner'])('new25mm profile keeps the existing%s double-payment fence',key=>{
  expect(roofConditionIncludesPlannedPrimerV1(conditions)).toBe(true);
  expect(()=>assertRoofPlannedPreparationOwnerContextV1({parameters:input.fieldParameters,inheritedExternalOwner:null,[key]:{externalOwner:true}})).toThrow();
  expect(roofConditionIncludesPlannedPrimerV1('Произвольная похожая формулировка25мм')).toBe(false);
});
test('clearing the current external link cannot bypass the complete ancestor owner audit for25mm',async()=>{
  const query=jest.fn(async()=>({rows:[{external_owner_seen:true,complete_instance:true}]}));
  await expect(admitRoofPrimerPrerequisiteServerV1({query},input)).rejects.toMatchObject({code:'ROOF_PRIMER_OWNER_CONFLICT'});
  expect(query.mock.calls).toHaveLength(1);
});
test('25mm with no external owner is allowed only after a complete history read',async()=>{
  await expect(admitRoofPrimerPrerequisiteServerV1({query:async()=>({rows:[{external_owner_seen:false,complete_instance:false}]})},input)).rejects.toMatchObject({code:'ROOF_PRIMER_INSTANCE_IDENTITY_MISMATCH'});
  await expect(admitRoofPrimerPrerequisiteServerV1({query:async()=>({rows:[{external_owner_seen:false,complete_instance:true}]})},input)).resolves.toBeNull();
});
