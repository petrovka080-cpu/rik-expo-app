import capture from '../../../../data/estimate-benchmarks/fixtures/source-profile-saved-geometry-editor-r22.json';
import {withCanonicalSourceProfileCalculationConsumersV1 as project} from './canonicalDefinitionParameterConsumersR1';
import {buildConsumerCanonicalParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {canonicalParameterAffectsEstimateCalculation} from '../canonicalParameters/canonicalParameterCalculationRelevance';
import {isCanonicalEstimateUserEditableParameter} from './canonicalEstimateParameterSemantics';
import type {CanonicalEstimateCatalogItem} from './contracts';
import type {CanonicalEstimateParameterSessionRevision} from './canonicalEstimateParameterSessionSnapshot';
import type {CanonicalSourceProfileSelectionV1} from './canonicalSourceProfileSelectionV1';

// Narrow exact R20 readbacks. They exercise the editor, never object readiness.
const cases=capture.cases as unknown as readonly {
  name:string;catalog:CanonicalEstimateCatalogItem;revision:CanonicalEstimateParameterSessionRevision;
}[];
const geometryIds=(catalog:CanonicalEstimateCatalogItem)=>
  (catalog.applicability.sourceProfileSelectionV1 as {geometryParameterIds:string[]}).geometryParameterIds;

describe('saved source-profile geometry remains editable through its actual consumers',()=>{
  test.each(cases)('$name saved session keeps only the same two or four original measurements',({catalog,revision})=>{
    const before=JSON.stringify(catalog),session=buildConsumerCanonicalParameterSession({catalog,revision,draftId:'TEST_ONLY_EDITOR_SLICE'});
    const ids=geometryIds(catalog);
    expect(session.parameters.map(parameter=>parameter.parameterId).sort()).toEqual([...ids].sort());
    expect(session.parameters.length).toBeLessThanOrEqual(4);
    for(const parameter of session.parameters){
      expect(parameter.value).toBe(Number(revision.parameters[parameter.parameterId]));
      expect(parameter.consumerInputRole).toBe('OBJECT_FACT');expect(parameter.inputOwnership).toBe('USER_INPUT');
      expect(canonicalParameterAffectsEstimateCalculation(parameter)).toBe(true);
    }
    expect(JSON.stringify(catalog)).toBe(before);
  });
  test('beam dimensions have exact downstream formulas through identity copies and branch selection',()=>{
    const {catalog}=cases.find(c=>c.name==='beam')!,metadata=catalog.applicability.sourceProfileSelectionV1;
    const before=JSON.stringify(catalog.parameterSchema),projected=project(catalog.parameterSchema,metadata);
    for(const id of geometryIds(catalog)){
      const parameter=projected.find(p=>p.parameterId===id)!;
      expect(parameter.formulaConsumers?.length).toBeGreaterThan(0);expect(isCanonicalEstimateUserEditableParameter(parameter)).toBe(true);
      const actualTargetFormulas=new Set(catalog.parameterSchema.filter(p=>p.visibilityRole==='INTERNAL_ONLY').flatMap(p=>p.formulaConsumers??[]));
      expect(parameter.formulaConsumers?.every(id=>actualTargetFormulas.has(id))).toBe(true);
    }
    expect(JSON.stringify(catalog.parameterSchema)).toBe(before);
    expect(project(projected,metadata)).toBe(projected);
  });
  test('an edited volume retains the other saved measurements and excludes producer-owned inputs',()=>{
    const {catalog,revision}=cases.find(c=>c.name==='beam')!,ids=geometryIds(catalog),volume=ids.find(id=>id.includes('volume_m3'))!;
    const next={...revision,parameters:{...revision.parameters,[volume]:'5'},userInputSnapshot:{...revision.userInputSnapshot,[volume]:'5'}};
    const session=buildConsumerCanonicalParameterSession({catalog,revision:next,draftId:'TEST_ONLY_EDITED_GEOMETRY'});
    expect(session.parameters.find(p=>p.parameterId===volume)?.value).toBe(5);
    for(const id of ids.filter(id=>id!==volume))expect(session.parameters.find(p=>p.parameterId===id)?.value).toBe(Number(revision.parameters[id]));
    expect(session.parameters.every(p=>p.consumerInputRole==='OBJECT_FACT')).toBe(true);
    const projected=project(catalog.parameterSchema,catalog.applicability.sourceProfileSelectionV1);
    expect(projected.filter(p=>p.visibilityRole==='INTERNAL_ONLY').every(p=>!isCanonicalEstimateUserEditableParameter(p))).toBe(true);
  });
  test('legacy schema without the new producer metadata retains the same object and admission',()=>{
    const {catalog}=cases.find(c=>c.name==='beam')!;
    expect(project(catalog.parameterSchema,undefined)).toBe(catalog.parameterSchema);
  });
  test('all condition dependencies remain reachable in an empty draft, including later presence checks',()=>{
    const {catalog}=cases.find(c=>c.name==='beam')!;
    const original=catalog.applicability.sourceProfileSelectionV1 as CanonicalSourceProfileSelectionV1;
    const ids=geometryIds(catalog);
    const metadata={...original,profiles:[{...original.profiles[0]!,geometryCopies:[],
      when:{kind:'and',conditions:ids.map(parameterId=>({kind:'present',parameterId}))}}]};
    const schema=catalog.parameterSchema.filter(parameter=>parameter.provenance?.source_geometry_copy_v1===undefined);
    const selector=schema.find(parameter=>parameter.parameterId===metadata.selectorParameterId)!;
    expect(selector.resourceBranchConsumers!.length).toBeGreaterThan(0);
    const projected=project(schema,metadata);
    for(const id of ids)expect(projected.find(parameter=>parameter.parameterId===id)!.resourceBranchConsumers)
      .toEqual(expect.arrayContaining(selector.resourceBranchConsumers!));
  });
  test.each(['unit','producer','ownership'])('a malformed %s edge cannot create an editable consumer',mutation=>{
    const {catalog}=cases.find(c=>c.name==='beam')!,schema=structuredClone(catalog.parameterSchema);
    const metadata=catalog.applicability.sourceProfileSelectionV1 as {profiles:{geometryCopies:{toParameterId:string}[]}[]};
    const target=schema.find(p=>p.parameterId===metadata.profiles[0]!.geometryCopies[0]!.toParameterId)!;
    if(mutation==='unit')target.unitId='kg';
    if(mutation==='producer')target.provenance={...target.provenance,source_geometry_copy_v1:null};
    if(mutation==='ownership')schema.find(p=>p.parameterId===geometryIds(catalog)[0])!.visibilityRole='INTERNAL_ONLY';
    expect(()=>project(schema,metadata)).toThrow(/COPY_TARGET_PRODUCER_CLOSURE|PUBLIC_GEOMETRY/u);
  });
});
