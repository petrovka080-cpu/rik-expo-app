import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {PRODUCTION_WORK_DEFINITIONS_10000 as definitions,getProductionWorkDefinition10000} from '../../src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000';
import {buildGlobalCatalogInventoryV1} from '../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1';

const areaSuffix=/(?:small|medium|large)_area$/u;
test('the actual generator and inventory contain measured works without area presets',()=>{
 expect(definitions).toHaveLength(5992);
 expect(new Set(definitions.map(row=>row.workKey)).size).toBe(5992);
 expect(definitions.filter(row=>areaSuffix.test(row.workKey))).toEqual([]);
 for(const size of ['small','medium','large'])expect(getProductionWorkDefinition10000(`plaster_paint_interior_wall_plaster_apply_${size}_area`)).toBeUndefined();
 const global=buildGlobalCatalogInventoryV1();
 expect(global.rows).toHaveLength(7602);
 expect(global.rows.filter(row=>areaSuffix.test(row.catalog_id))).toEqual([]);
 expect(global.arithmetic.duplicate_catalog_id).toBe(0);
 expect(global.arithmetic.domain_denominator_sum).toBe(7602);
});

test('active subject source contains no area work identity or variant declaration',()=>{
 const root=path.resolve('src/lib/estimate/v4'),violations:string[]=[];
 const visitDirectory=(directory:string)=>{
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
   const file=path.join(directory,entry.name);
   if(entry.isDirectory()){visitDirectory(file);continue;}
   if(!entry.name.endsWith('.ts')||entry.name.endsWith('.test.ts'))continue;
   const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
   const visit=(node:ts.Node)=>{
    if(ts.isPropertyAssignment(node)&&/^(small|medium|large)_area$/u.test(node.name.getText(source).replace(/["']/gu,'')))violations.push(`${file}:variant`);
    if(ts.isStringLiteralLike(node)&&/^(?:canonical-work:[^:]+:)?(?:demolition|earthworks|concrete_foundation|masonry|waterproofing|roofing|insulation|facade|plaster_paint|drywall_ceiling|tile_stone|flooring|doors_windows|carpentry_metal|electrical|plumbing|heating_hvac|ventilation|paving_roads_landscape|special_repair)_.*_(?:small|medium|large)_area$/u.test(node.text))violations.push(`${file}:${node.text}`);
    ts.forEachChild(node,visit);
   };visit(source);
  }
 };visitDirectory(root);
 expect(violations).toEqual([]);
});
