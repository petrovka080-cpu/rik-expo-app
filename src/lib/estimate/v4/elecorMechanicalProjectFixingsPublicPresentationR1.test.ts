// WORK / NOT RUN. These5 checks additionally REQUIRE the one-entry proposed shared dictionary merge.
import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json';
import {canonicalPublicEstimateRowNameRu as name,canonicalPublicEstimateRowDetailsRu as details}from'../backendPlatform/canonicalPublicEstimateLanguageRu';
import {canonicalPublicResourceDisplayPresentationV1 as display}from'../backendPlatform/canonicalPublicResourcePresentationV1';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactSpecificationParts}from'../backendPlatform/canonicalEstimateArtifactContract';
import {compileElecorMechanicalProjectFixingsR1 as compile,elecorMechanicalProjectFixingsDefinitionR1 as definition,
 elecorMechanicalProjectFixingsControlInputR1 as control,elecorMechanicalProjectFixingsPackR1 as pack,
 elecorMechanicalProjectFixingsOwnerR1 as owner}from'./elecorMechanicalProjectFixingsCompletionR1';
const resource=()=>definition().resources.find(r=>r.row_id===owner)!;
it('adds one exact existingdictionary binding with full535463identity andpercompletepair price unit',()=>{
 const rows=publicBindings.bindings.filter(b=>b.rowId===owner&&b.sourceTitleRu===pack.publicOwnerSourceTitleRu);
 expect(rows).toHaveLength(1);expect(rows[0].nameRu).toBe(pack.publicOwnerNameRu);
 for(const text of ['fischer','DuoPower 6 × 30','Panhead 4,5 × 40','535463','50 комплектов','цена за комплект'])expect(rows[0].nameRu).toContain(text);
 expect(details({rowId:owner,titleRu:pack.publicOwnerSourceTitleRu}).join(' ')).toContain('цена за одну пару, не за коробку');
});
it('uses existingauthored row binding before genericfischerremoval, with fixed source descriptor',()=>{
 const r=resource(),descriptor=r.resource_graph.publicResourcePresentationV1;
 expect(r.title_ru).toBe(pack.publicOwnerSourceTitleRu);expect(r.resource_graph.titleSpecificationMode).toBeUndefined();
 expect(display({rowId:owner,titleRu:r.title_ru,descriptor})?.nameRu).toBe(pack.publicOwnerNameRu);
 expect(name({rowId:owner,titleRu:r.title_ru})).toBe(pack.publicOwnerNameRu);
});
it('does not borrow the source-specific name for another row,replacedSKU ormanualtitle',()=>{
 const r=resource();expect(name({rowId:'another-row',titleRu:r.title_ru})).not.toBe(pack.publicOwnerNameRu);
 expect(name({rowId:owner,titleRu:r.title_ru.replace('535463','535459')})).not.toBe(pack.publicOwnerNameRu);
 const manual='Моя цена и название fischer';expect(name({rowId:owner,titleRu:manual,manualTitleOverride:true})).toBe(manual);
 expect(display({rowId:owner,titleRu:manual,descriptor:r.resource_graph.publicResourcePresentationV1,manualTitleOverride:true})).toBeNull();
});
it('preserves same full exactSKU name/50pairbasis through existing shared artifact projection without altering savedrow',async()=>{
 const c=await compile(control()),row=c.rows.find(r=>r.row_id===owner)!;const before=JSON.stringify(row);
 expect(row.unit_id).toBe('pcs');expect(row.quantity).toBe('50');expect(canonicalArtifactVisibleRowTitle(row)).toBe(pack.publicOwnerNameRu);
 const text=canonicalArtifactSpecificationParts(row,{}).flatMap(p=>p.parts).join(' ');
 expect(text).toContain('50 комплектов');expect(text).toContain('не за коробку');expect(JSON.stringify(row)).toBe(before);
});
it('keepsmanual price/title/exclusion as humanrights, outside dictionaryrewriting',async()=>{
 const c=await compile(control(),{[owner]:{quantity:'100',unitPrice:'77',titleRu:'Мой крепёж fischer, за комплект',includedInEstimate:false,
  provenance:{kind:'manual',reason:'CONTROL_ONLY ownership/title test'}}});
 const row=c.rows.find(r=>r.row_id===owner)!;expect(row.amount).toBe('7700');expect(row.included_in_estimate).toBe(false);
 expect(canonicalArtifactVisibleRowTitle(row)).toBe('Мой крепёж fischer, за комплект');expect(row.unit_id).toBe('pcs');
});
