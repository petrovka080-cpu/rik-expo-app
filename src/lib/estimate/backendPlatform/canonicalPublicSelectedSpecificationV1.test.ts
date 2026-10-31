import {canonicalPublicSelectedSpecificationV1 as project,canonicalPublicPhysicalSpecificationPartsV1 as physical} from './canonicalPublicSelectedSpecificationV1';
import {canonicalPublicEstimateRowNameRu as name} from './canonicalPublicEstimateLanguageRu';

const graph={titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',titleSpecificationParameterIds:['selected_spec']};
const render=(spec:string)=>project({rowId:'reused:resource',titleRu:'Подъёмное оборудование — '+spec,graph,parameters:{selected_spec:spec}});
test('measured formwork areas retain their orientation without putting source citations in the name',()=>{
 for(const orientation of ['','горизонтальной ']){
  const base='Измеренная площадь контакта '+orientation+'опалубки с бетоном',titleRu=base+' по RICS NRM 2';
  expect(name({rowId:'reused:area',titleRu})).toBe(base);
  expect(name({rowId:'reused:area',titleRu,manualTitleOverride:true})).toBe(titleRu);
 }
});

test('opaque project document is internal evidence, not a public resource name',()=>{
 const spec='LIFT-CS-EMBED-STANDARD-REV-A',before={selected_spec:spec};
 expect(render(spec)).toEqual({nameRu:'Подъёмное оборудование',specificationRu:null,detailsRu:[spec]});
 expect(before).toEqual({selected_spec:spec});
});
test('historical specification bindings use the same APPEND and separator defaults as the compiler',()=>{
 const selected_spec='SUPPORT-CS-EMBED-STANDARD-REV-A';
 expect(project({titleRu:'Монтажные опоры — '+selected_spec,graph:{titleSpecificationParameterIds:['selected_spec']},parameters:{selected_spec}})?.nameRu).toBe('Монтажные опоры');
 expect(project({titleRu:'Монтажные опоры — '+selected_spec,graph:{titleSpecificationMode:'UNSAFE_MODE',titleSpecificationParameterIds:['selected_spec']},parameters:{selected_spec}})).toBeNull();
});
test('measurable physical selection survives without manufacturer or document text',()=>{
 const spec='Manufacturer Model-900; B25; Ø12 мм; 250 × 120 × 65 мм; 5 т; 230 В; 1.5 кВт; DOC-KJ-REV-A';
 expect(render(spec)?.nameRu).toBe('Подъёмное оборудование, B25, Ø12 мм, 250 × 120 × 65 мм, 5 т, 230 В, 1.5 кВт');
 expect(render(spec)?.detailsRu).toEqual([spec]);
});
test('long internal synthetic references do not leak and do not become a material admission',()=>{
 const spec='TEST_ONLY_SYNTHETIC_DOCUMENT_REVISION_NOT_REAL_PROJECT_OR_ACCEPTANCE homogeneous class+diameter+product+cutlength 1';
 expect(render(spec)?.nameRu).toBe('Подъёмное оборудование');expect(render(spec)?.detailsRu).toEqual([spec]);
});
test('source/template mismatch and explicit manual name retain normal source handling',()=>{
 expect(project({titleRu:'Собственное название',graph,parameters:{selected_spec:'Другое'},manualTitleOverride:true})).toBeNull();
 expect(project({titleRu:'Подъёмное оборудование — чужое',graph,parameters:{selected_spec:'Другое'}})).toBeNull();
 expect(project({titleRu:'Подъёмное оборудование — Другое',graph:{...graph,titleSpecificationMode:'REPLACE'},parameters:{selected_spec:'Другое'}})).toBeNull();
 expect(project({titleRu:'Подъёмное оборудование — Другое',graph})).toBeNull();
});
test('labels and multi-part values must match the saved compiler append exactly',()=>{
 const g={...graph,titleSpecificationParameterIds:['load_spec','power_spec'],titleSpecificationParameterLabelsRu:{load_spec:'Грузоподъёмность',power_spec:'Питание'}},p={load_spec:'5 т',power_spec:'230 В'};
 expect(project({titleRu:'Механизм — Грузоподъёмность: 5 т, Питание: 230 В',graph:g,parameters:p})?.nameRu).toBe('Механизм, 5 т, 230 В');
 expect(p).toEqual({load_spec:'5 т',power_spec:'230 В'});
});
test('service contents and waste boundaries are not unstructured product specifications',()=>{
 for(const id of ['waste_mode','service_contents','contents','reference']){
  const value='Материалы остаются на объекте; тара и погрузка включены';
  expect(project({titleRu:'Услуга — '+value,graph:{...graph,titleSpecificationParameterIds:[id]},parameters:{[id]:value}})).toBeNull();
 }
});
test('compact saved needs recover only an exact literal product suffix and keep raw evidence',()=>{
 const spec='LIFT-CS-EMBED-STANDARD-REV-A',input={titleRu:'Подъёмное оборудование — '+spec,graph:undefined,parameters:{lift_spec:spec},compactPreliminaryNeed:true};
 expect(project(input)).toEqual({nameRu:'Подъёмное оборудование',specificationRu:null,detailsRu:[spec]});
 expect(project({...input,compactPreliminaryNeed:false})).toBeNull();
 expect(project({...input,manualTitleOverride:true})).toBeNull();
 expect(project({...input,parameters:{lift_spec:'Чужой документ'}})).toBeNull();
 expect(project({...input,parameters:{service_contents:spec}})).toBeNull();
 expect(input.titleRu).toBe('Подъёмное оборудование — '+spec);
});
test('overlapping dimensions and a class already present in the functional name are not duplicated',()=>{
 expect(physical('250 × 120 × 65 мм; A500C; 12 мм')).toEqual(['250 × 120 × 65 мм','A500C','12 мм']);
 expect(project({titleRu:'Бетон B25 — B25',graph,parameters:{selected_spec:'B25'}})?.nameRu).toBe('Бетон B25');
});
