// WORK draft: NOT RUN. Synthetic contract inputs are not construction norms.
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "./canonicalEstimateCompileCore";
import { buildAutomaticConstructionOwnerR1, type AutomaticRowSpec } from "../v4/automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "../v4/effectivePurchaseBalanceR1";
import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import { canonicalEstimateSha256HexText } from "./canonicalEstimateSha256";
import { planCanonicalEffectiveResourceQuantitiesV1 } from "./canonicalEffectiveResourceQuantityV1";
import { canonicalEstimateRevisionRowFromStorage } from "./canonicalEstimateRevisionReadMapper";
import { projectCanonicalEstimatePreliminaryNeedTransport } from "./canonicalEstimatePreliminaryNeedTransport";
import { assertCanonicalPurchaseSupplyRevisionV1, assertCanonicalPurchaseSupplyRowV1, assertCanonicalPurchaseSupplyReadyV1,
  canonicalPurchaseSupplyWarningV1 } from "./canonicalPurchaseSupplyReadinessV1";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows, canonicalArtifactPreliminaryNeeds } from "./canonicalEstimateArtifactContract";
import { buildCanonicalProfessionalPdfProjection } from "./canonicalProfessionalPdf";
import { buildCanonicalRevisionCommitPayload } from "./canonicalEstimateRevisionWriter";

const provenance = {kind:"manual",reason:"synthetic retention control; no published material or norm"};
const hash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const clone = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId:"order",orderUnitId:"m",consumed:"consumed",
  stock:"0",reserve:"0",quantum:"M",manualQuantumViolationPolicy:"retain-raw-and-block-quantum"});
const downstream = effectivePurchaseBalanceExpressionsR1({ownerRowId:"packs",orderUnitId:"item",consumed:"1",stock:"0",reserve:"0",quantum:"1"});
function input(quantity: string | null = "8", optIn = true): CanonicalEstimateCompileCoreInput {
  const rows:AutomaticRowSpec[] = [
    {rowId:"reused",formulaId:"reused",section:"Balance",category:"material",title:"Зависимое физическое количество",unitId:"m",
      expression:`${downstream.effective}*M`,costTreatment:"INFORMATIONAL_SCOPE"},
    {rowId:"packs",formulaId:"packs",section:"Balance",category:"material",title:"Количество единиц поставки",unitId:"item",
      expression:balance.packages,costTreatment:"INFORMATIONAL_SCOPE",effectiveQuantityOutput:downstream.owner.effectiveQuantityOutput},
    {rowId:"order",formulaId:"order",section:"Purchase",category:"material",title:"Исходный материал",unitId:"m",
      expression:"ceil(consumed/M)*M",costTreatment:"OWN_COST",procurement:true,...balance.owner},
    {rowId:"consumption",formulaId:"consumption",section:"Installation",category:"material",title:"Независимый исходный расход",unitId:"m",
      expression:"consumed",costTreatment:"INFORMATIONAL_SCOPE"},
  ];
  const definition = buildAutomaticConstructionOwnerR1({contract:"synthetic-supply-retention",semanticOwner:"synthetic",
    sourceId:"synthetic-test-only",normId:"not-a-construction-norm",sourceMetadata:{source_title:"Synthetic contract fixture",
      source_document_version:"test",definition_hash:"a".repeat(64),exact_locator:"TEST only",artifact_sha256:"a".repeat(64)},
    applicabilityRu:"Synthetic control, not a production source",profile:[],excludedUnownedAssumptions:[],rows,
    ordinary:[{id:"consumed",title:"Исходный расход",kind:"ordinary",valueType:"decimal",unitId:"m",min:0},
      {id:"M",title:"Подтверждённая кратность",kind:"ordinary",valueType:"decimal",unitId:"m",min:0.000000001}],conditional:[]});
  const resources=clone([...definition.resources]);
  if (!optIn) delete (resources.find(row=>row.row_id==="order")!.resource_graph.purchaseBalanceV1 as Record<string,unknown>).manualQuantumViolationPolicy;
  return {operation:"recalculate",compilerVersion:"test-manual-supply",catalogId:"synthetic",primaryMeasureParameterId:"consumed",
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:resources,
    submittedParameters:{consumed:"3",M:"75"},confirmedParameters:{},currencyCode:"USD",priceItems:[],
    maximumResourceRows:resources.length,hashJson:hash,
    rowOverrides:{order:{quantity,unitPrice:"12.50",titleRu:"Мой <материал> требует уточнения",provenance}}};
}
type Result=Awaited<ReturnType<typeof compileCanonicalEstimateCore>>;
const all=(result:Result)=>[...result.rows,...result.preliminaryNeeds];
const byId=(result:Result,id:string)=>all(result).find(row=>row.row_id===id)!;
function saved(result:Result, source:CanonicalEstimateCompileCoreInput) {
  return {id:"00000000-0000-4000-8000-000000000001",release_id:"00000000-0000-4000-8000-000000000002",catalog_id:"synthetic",
    definition_version_id:"00000000-0000-4000-8000-000000000003",checksum_sha256:hash(result.revisionProjection),
    row_count:result.rows.length,currency_code:"USD",input_parameters:result.parameters,
    amendment_contract:{rowOverrides:clone(source.rowOverrides),parameterSources:{preliminaryNeeds:clone(result.preliminaryNeeds),
      ...(result.purchaseSupplyIndexV1?{purchaseSupplyIndexV1:clone(result.purchaseSupplyIndexV1)}:{})}}};
}

test("resolved owner retains raw Q/title/price but never publishes a paid/order/balance/effective quantity", async()=>{
  const source=input(), before=JSON.stringify(source);const result=await compileCanonicalEstimateCore(source),owner=byId(result,"order");
  expect(owner).toMatchObject({quantity:"8",unit_price:"12.50",currency_code:"USD",amount:null,
    included_in_estimate:false,included_in_procurement:false,title_ru:"Мой <материал> требует уточнения"});
  expect(owner.calculation_trace).toMatchObject({manualQuantityOverride:true,manualAmendment:provenance,
    exactPurchaseQuantityV1:{manualQuantityText:"8",quantityText:"8",calculatedQuantityText:"75"},
    purchaseSupplyBlocksV1:[{rawManualQuantity:"8",quantum:"75",procurementReady:false}]});
  expect(owner.calculation_trace).not.toHaveProperty("purchaseBalance");expect(owner.calculation_trace).not.toHaveProperty("effectiveQuantityOutput");
  expect(result.derivedParameters).not.toHaveProperty(balance.effective);
  for(const id of ["packs","reused"]){expect(byId(result,id)).toMatchObject({quantity:null,need_state:"SUPPLY_CONFIRMATION_REQUIRED"});}
  expect(byId(result,"consumption").quantity).toBe("3");expect(JSON.stringify(source)).toBe(before);
});
test("M-only early branch retains Q without inventing consumption, and legacy strict still rejects it",async()=>{
  const source=input();source.submittedParameters={M:"75"};const result=await compileCanonicalEstimateCore(source);
  expect(result.preliminaryNeeds.find(row=>row.row_id==="order")).toMatchObject({quantity:"8",unit_price:"12.50",currency_code:"USD"});
  expect(byId(result,"order").calculation_trace).not.toHaveProperty("purchaseBalance");
  const strict=input("8",false);strict.submittedParameters={M:"75"};
  await expect(compileCanonicalEstimateCore(strict)).rejects.toMatchObject({code:"ROW_AMENDMENT_INVALID"});
});
test.each(["0","8"])("unknown supplier multiple is not inferred for manual %s",async quantity=>{
  const source=input(quantity);source.submittedParameters={consumed:"3"};const result=await compileCanonicalEstimateCore(source);
  expect(byId(result,"order").calculation_trace).toMatchObject({purchaseSupplyBlocksV1:[{quantum:null,reasonCode:"ORDER_QUANTUM_UNCONFIRMED"}]});
});
test.each(["-1","8.0000000001","1e2","Infinity","NaN"])("bad manual exact domain %s remains a rejection",async quantity=>{
  await expect(compileCanonicalEstimateCore(input(quantity))).rejects.toBeDefined();
});
test("default strict, automatic invalid supply and clear-to-formula are distinct",async()=>{
  await expect(compileCanonicalEstimateCore(input("8",false))).rejects.toMatchObject({code:"ROW_AMENDMENT_INVALID"});
  const source=input(null);const ready=await compileCanonicalEstimateCore(source);
  expect(byId(ready,"order").quantity).toBe("75");expect(ready.purchaseSupplyIndexV1).toBeUndefined();
  expect(()=>assertCanonicalPurchaseSupplyReadyV1(all(ready))).not.toThrow();
  const strict=await compileCanonicalEstimateCore(input("75",false));expect(byId(strict,"order").calculation_trace).not.toHaveProperty("exactPurchaseQuantityV1");
  expect(strict.purchaseSupplyIndexV1).toBeUndefined();
  const invalid=input(null);invalid.submittedParameters={consumed:"3",M:"0"};
  await expect(compileCanonicalEstimateCore(invalid)).rejects.toBeDefined();
});
test("condition, title, requiredWhen and forbiddenWhen-only dependencies are planned before consumers",()=>{
  for(const kind of ["condition","title","requiredWhen","forbiddenWhen"] as const){
    const source=input();const resource=source.resourceDefinitions.find(row=>row.row_id==="consumption")!;
    if(kind==="condition")resource.inclusion_ast={kind:"formula_greater_than",expression:balance.effective,unitId:"m",value:0};
    else if(kind==="title")resource.resource_graph={...resource.resource_graph,titleSpecificationParameterIds:[balance.effective]};
    else {const parameter=clone(source.parameterDefinitions.find(p=>p.parameter_id==="consumed")!);
      parameter.parameter_id="detail";parameter.required=false;
      parameter.constraints_json={...parameter.constraints_json,[kind]:{kind:"formula_greater_than",expression:balance.effective,unitId:"m",value:0}};
      source.parameterDefinitions=[...source.parameterDefinitions,parameter];
      resource.resource_graph={...resource.resource_graph,inputParameterIds:["detail"]};}
    const plan=planCanonicalEffectiveResourceQuantitiesV1(source.parameterDefinitions,source.resourceDefinitions,source.formulaDefinitions);
    expect(plan.dependencies.get("consumption")).toContain("order");
    expect(plan.ordered.findIndex(row=>row.row_id==="order")).toBeLessThan(plan.ordered.findIndex(row=>row.row_id==="consumption"));
  }
});
test("saved JSON/read mapper/compact needs retain exact evidence and false flags cannot evade procurement",async()=>{
  const source=input(),result=await compileCanonicalEstimateCore(source),revision=clone(saved(result,source));
  const stored=clone(result.rows), reopened=stored.map(row=>canonicalEstimateRevisionRowFromStorage(row,null,null,revision.amendment_contract));
  expect(reopened.find(row=>row.rowId==="order")!.quantity).toBe("8");
  const transport=projectCanonicalEstimatePreliminaryNeedTransport(revision);
  expect(transport.preliminaryNeeds.find(row=>row.rowId==="packs")).toMatchObject({needState:"SUPPLY_CONFIRMATION_REQUIRED",quantity:null,purchaseSupplyBlocks:[{rawManualQuantity:"8"}]});
  expect(()=>assertCanonicalPurchaseSupplyRevisionV1([...stored,...revision.amendment_contract.parameterSources.preliminaryNeeds],revision.amendment_contract)).not.toThrow();
  const selection=selectCanonicalArtifactRows(stored as never[]);
  expect(()=>buildCanonicalProcurementProjection({revision,sourceRows:selection.sourceRows,procurementRows:selection.procurementRows}))
    .toThrow(expect.objectContaining({code:"PROCUREMENT_SUPPLY_QUANTUM_BLOCKED"}));
});
test.each(["drop-index","drop-block","drop-both","drop-exact","drop-assessment","drop-all-new-fields","missing-manual-override","raw-Q","provenance","dependent-Q","paid-flag","paid-amount","owner-unit"])("immutable read rejects tamper %s",async kind=>{
  const source=input(),result=await compileCanonicalEstimateCore(source),revision=saved(result,source),rows=clone(all(result)) as Record<string,any>[];
  const owner=rows.find(row=>row.row_id==="order")!;
  if(kind==="drop-index"||kind==="drop-both")delete revision.amendment_contract.parameterSources.purchaseSupplyIndexV1;
  if(kind==="drop-block"||kind==="drop-both")for(const row of rows)delete row.calculation_trace.purchaseSupplyBlocksV1;
  if(kind==="drop-exact")delete owner.calculation_trace.exactPurchaseQuantityV1;
  if(kind==="drop-assessment")delete owner.calculation_trace.manualPurchaseSupplyAssessmentV1;
  if(kind==="missing-manual-override")delete revision.amendment_contract.rowOverrides!.order;
  if(kind==="drop-all-new-fields"){
    delete revision.amendment_contract.parameterSources.purchaseSupplyIndexV1;
    for(const row of rows){
      delete row.calculation_trace.purchaseSupplyBlocksV1;
      delete row.calculation_trace.exactPurchaseQuantityV1;
      delete row.calculation_trace.manualPurchaseSupplyAssessmentV1;
    }
    // Keep the saved source policy: source/hash substitution is a separate trust boundary.
  }
  if(kind==="raw-Q")owner.calculation_trace.exactPurchaseQuantityV1.manualQuantityText="9";
  if(kind==="provenance")revision.amendment_contract.rowOverrides!.order.provenance={kind:"manual",reason:"forged"};
  if(kind==="dependent-Q")rows.find(row=>row.row_id==="packs")!.quantity="0.1";
  if(kind==="paid-flag")owner.included_in_estimate=true;
  if(kind==="paid-amount")owner.amount="100";
  if(kind==="owner-unit")owner.unit_id="item";
  expect(()=>assertCanonicalPurchaseSupplyRevisionV1(rows,revision.amendment_contract))
    .toThrow(expect.objectContaining({code:"ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID"}));
});
test("paginated row reads bind the full saved amendment; a partial set cannot pass full-revision validation",async()=>{
  const source=input(),result=await compileCanonicalEstimateCore(source),revision=saved(result,source),owner=byId(result,"order");
  expect(()=>assertCanonicalPurchaseSupplyRowV1(owner,revision.amendment_contract)).not.toThrow();
  expect(()=>assertCanonicalPurchaseSupplyRevisionV1([owner],revision.amendment_contract))
    .toThrow(expect.objectContaining({code:"ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID"}));
  expect(()=>assertCanonicalPurchaseSupplyRevisionV1([...all(result),owner],revision.amendment_contract))
    .toThrow(expect.objectContaining({code:"ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID"}));
});
test("normalization of manual whitespace and zero leaves original amendment bytes and reason intact",async()=>{
  const source=input(" 0.000 ");source.submittedParameters={consumed:"3"};
  source.rowOverrides!.order.provenance={kind:"manual",reason:"  retained exact reason  "};
  const original=JSON.stringify(source.rowOverrides),result=await compileCanonicalEstimateCore(source),revision=saved(result,source);
  expect(byId(result,"order").calculation_trace).toMatchObject({
    exactPurchaseQuantityV1:{quantityText:"0.000",manualQuantityText:"0.000"},
    purchaseSupplyBlocksV1:[{rawManualQuantity:"0.000",manualProvenance:{kind:"manual",reason:"retained exact reason"}}]});
  expect(JSON.stringify(source.rowOverrides)).toBe(original);
  expect(JSON.stringify(revision.amendment_contract.rowOverrides)).toBe(original);
  expect(()=>assertCanonicalPurchaseSupplyRevisionV1(all(result),revision.amendment_contract)).not.toThrow();
});
test("PDF keeps manual title and currency price informational, escapes text, and stays partial",async()=>{
  const source=input(),result=await compileCanonicalEstimateCore(source),revision=saved(result,source);
  const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows as never[],preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),
    workTitleRu:"Synthetic fixture",definitionVersionId:String(revision.definition_version_id),expectedProjectedRowCount:result.rows.length});
  expect(pdf.html).toContain("Мой &lt;материал&gt; требует уточнения");
  const order=pdf.html.split('Мой &lt;материал&gt; требует уточнения</strong>')[1]!.split('</tr>')[0]!;
  expect([...order.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(match=>match[1])).toEqual(['12,50 USD','']);
  expect(pdf.html).not.toContain('справочно');
  expect(pdf.html).toContain("полный итог не рассчитан");expect(pdf.html).toContain("Закупка пока не готова");
  expect(canonicalPurchaseSupplyWarningV1(byId(result,"order"))).toContain("8");
  expect(pdf.grandTotalStatus).toBe("PARTIAL_NEEDS_PRICE");
  expect(pdf.html).toContain('class="purchase-supply-block"');
  expect(order).not.toMatch(/введено вручную|заказ не подтверждён/u);
  expect(order).toContain('<td class="numeric">8</td>');
  expect(pdf.html).toContain(".purchase-supply-block .numeric{white-space:normal;overflow-wrap:anywhere}");
});

test("commit payload carries the compiler index without rewriting original amendment Q/provenance",async()=>{
  const source=input("8.000"), result=await compileCanonicalEstimateCore(source), old=JSON.stringify(source.rowOverrides);
  const payload=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:"USD",totals:result.totals,
    checksumSha256:hash(result.revisionProjection),compilerVersion:source.compilerVersion,parameters:result.parameters,
    approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:source.submittedParameters,
    parentRevisionId:null,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,purchaseSupplyIndexV1:result.purchaseSupplyIndexV1});
  expect(payload.parameterSources).toMatchObject({purchaseSupplyIndexV1:{owners:[{rawManualQuantity:"8.000",manualProvenance:provenance}]}});
  expect(JSON.stringify(source.rowOverrides)).toBe(old);
  const revision=saved(result,source);expect(()=>assertCanonicalPurchaseSupplyRevisionV1(all(result),revision.amendment_contract)).not.toThrow();
});

test.each(["condition","title","requiredWhen","forbiddenWhen"] as const)("%s-only consumer is saved unresolved without a physical output",async kind=>{
  const source=input(),resource=source.resourceDefinitions.find(row=>row.row_id==="consumption")!;
  if(kind==="condition")resource.inclusion_ast={kind:"formula_greater_than",expression:balance.effective,unitId:"m",value:0};
  else if(kind==="title")resource.resource_graph={...resource.resource_graph,titleSpecificationParameterIds:[balance.effective]};
  else {const parameter=clone(source.parameterDefinitions.find(p=>p.parameter_id==="consumed")!);
    parameter.parameter_id="detail";parameter.required=false;
    parameter.constraints_json={...parameter.constraints_json,[kind]:{kind:"formula_greater_than",expression:balance.effective,unitId:"m",value:0}};
    source.parameterDefinitions=[...source.parameterDefinitions,parameter];resource.resource_graph={...resource.resource_graph,inputParameterIds:["detail"]};}
  const result=await compileCanonicalEstimateCore(source);
  expect(byId(result,"consumption")).toMatchObject({quantity:null,need_state:"SUPPLY_CONFIRMATION_REQUIRED"});
  expect(byId(result,"consumption").calculation_trace).not.toHaveProperty("effectiveQuantityOutput");
});

test("a false ordinary inclusion remains false; this is not acceptance of the future material overlay",async()=>{
  const source=input(), before=JSON.stringify(source.rowOverrides);
  const owner=source.resourceDefinitions.find(row=>row.row_id==="order")!;
  owner.inclusion_ast={kind:"formula_greater_than",expression:"consumed",unitId:"m",value:100};
  const result=await compileCanonicalEstimateCore(source);
  expect(all(result).some(row=>row.row_id==="order")).toBe(false);
  expect(result.purchaseSupplyIndexV1).toBeUndefined();expect(JSON.stringify(source.rowOverrides)).toBe(before);
});

test.each(["paid-flag","paid-amount","dependent-quantity"])("raw preliminary tamper %s is rejected before artifact normalization",async kind=>{
  const source=input(),result=await compileCanonicalEstimateCore(source),revision=saved(result,source);
  const need=revision.amendment_contract.parameterSources.preliminaryNeeds.find(row=>row.row_id==="packs")!;
  if(kind==="paid-flag")need.included_in_estimate=true;
  if(kind==="paid-amount")need.amount="1";
  if(kind==="dependent-quantity")need.quantity="0.1";
  expect(()=>canonicalArtifactPreliminaryNeeds(revision)).toThrow(expect.objectContaining({code:"ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID"}));
});

test("a ready exact manual quantity survives procurement projection after a storage-normalized numeric column",async()=>{
  const source=input("75.000"),result=await compileCanonicalEstimateCore(source),revision=saved(result,source),stored=clone(result.rows);
  stored.find(row=>row.row_id==="order")!.quantity="75"; // PostgreSQL numeric transport may normalize trailing zeros.
  const selection=selectCanonicalArtifactRows(stored as never[]);
  const projection=buildCanonicalProcurementProjection({revision,sourceRows:selection.sourceRows,procurementRows:selection.procurementRows});
  expect(projection.rows.find(row=>row.rowId==="order")!.quantity).toBe("75.000");
  expect(source.rowOverrides!.order.quantity).toBe("75.000");
});
