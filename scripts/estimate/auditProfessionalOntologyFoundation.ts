import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deterministicNormalizedSourceHash } from "../../src/lib/estimate/v4/professionalOntologyContracts";

const base = (JSON.parse(readFileSync("data/estimate-templates/estimate-10000-readiness-manifest.json", "utf8")) as { templates: Array<{template_id:string;work_key:string;calculator_family_id:string}> }).templates;
const expanded = JSON.parse(readFileSync("data/estimate-catalog/expanded-complex/templates.json", "utf8")) as Array<{template_id:string;work_family_id:string;template_level:string}>;
const scope = /_(standard|small_area|large_area|wet_zone|technical_room)$/;
const branch = execFileSync("git", ["branch", "--show-current"], {encoding:"utf8"}).trim();
const sha = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim();
const timestamp = new Date().toISOString();
const root = path.resolve("artifacts/professional-ontology-foundation");
const records = [
  ...base.map(row => ({legacyTemplateId:row.template_id,legacyOrigin:"base_10000",candidateProfessionalWorkId:null,mappingStatus:scope.test(row.work_key)?"PARAMETER_PRESET":"UNMAPPED_TECHNICAL_RECORD",mappingConfidence:0,reviewStatus:"NOT_REVIEWED",readiness:"LEGACY_TECHNICAL_TEMPLATE"})),
  ...expanded.map(row => ({legacyTemplateId:row.template_id,legacyOrigin:"expanded_complex_1610",candidateProfessionalWorkId:null,mappingStatus:"EXPANDED_PRESENTATION_TEMPLATE",mappingConfidence:0,reviewStatus:"NOT_REVIEWED",readiness:"INVENTORY_PLACEHOLDER"}))
];
const counts={technicalTemplateCount:records.length,professionalWorkCount:0,sourceMappedCount:0,formulaReadyCount:0,goldenReadyCount:0,domainReviewedCount:0,productProvenCount:0,syntheticScopeRecords:base.filter(x=>scope.test(x.work_key)).length};
const blockers=["Authoritative professional work data has not been acquired or licensed.","Current 11,610 records remain technical migration records."];
const envelope=(payload:unknown)=>({branch,exact_sha:sha,timestamp,source_inventory:["estimate-10000-readiness-manifest.json","expanded-complex/templates.json"],counts,blockers,fake_green_claimed:false,payload});
mkdirSync(root,{recursive:true});
for(const name of ["estimate-source-registry.schema.json","professional-work-ontology.schema.json","professional-work-readiness-state.json","source-acquisition-ledger.json","legacy-template-mapping.schema.json"]) copyFileSync(`data/estimate-ontology/${name}`,path.join(root,name));
for(const name of ["authoritative-source-priority.md","ingestion-pipeline-contract.md"]) copyFileSync(`docs/estimate/${name}`,path.join(root,name));
writeFileSync(path.join(root,"technical-11610-reclassification.json"),JSON.stringify(envelope({deterministicHash:deterministicNormalizedSourceHash(records),records}),null,2));
writeFileSync(path.join(root,"asphalt-reference-decomposition.json"),JSON.stringify(envelope({status:"REFERENCE_DECOMPOSITION_CONTRACT_ONLY",identity:"asphalt_concrete_pavement",passportOwner:"asphalt_concrete_pavement_passport_v4",components:["parameter contract","formula primitives","preparation assembly","material assembly","labor assembly","equipment assembly","transport assembly","quality-control assembly","documentation assembly","normative bindings","golden fixtures","PDF/procurement output"],parityRequirement:"compiled BOQ quantities and rows unchanged",productProofExecuted:false}),null,2));
writeFileSync(path.join(root,"phase-final-acceptance.md"),`# Phase acceptance\n\nSHA: ${sha}\n\nGREEN_ESTIMATE_V4_PROFESSIONAL_ONTOLOGY_AND_SOURCE_INGESTION_ARCHITECTURE_READY_AUTHORITATIVE_DATA_PENDING_NO_RELEASE\n\nTechnical templates: 11610\nProfessional works: 0\nFake green claimed: false\n`);
copyFileSync("data/estimate-ontology/source-acquisition-ledger.json",path.join(root,"open-estimate-source-registry.json"));
copyFileSync("data/estimate-ontology/open-source-access-policy.json",path.join(root,"open-source-access-policy.json"));
copyFileSync("docs/estimate/public-source-ingestion-contract.md",path.join(root,"public-source-ingestion-contract.md"));
copyFileSync("data/estimate-ontology/open-classification-crosswalk.json",path.join(root,"open-classification-crosswalk.json"));
writeFileSync(path.join(root,"technical-11610-honest-readiness.json"),JSON.stringify(envelope({technicalTemplateCount:11610,generatedScopeTemplateCount:9200,expandedTemplateCount:1610,openSourceBackedProfessionalWorkCount:0}),null,2));
writeFileSync(path.join(root,"roadworks-open-source-candidate-inventory.json"),JSON.stringify(envelope([]),null,2));
writeFileSync(path.join(root,"roadworks-distinct-collision-ledger.json"),JSON.stringify(envelope({candidates:0,collisions:0,note:"No work candidate is promoted from methodology-only sources."}),null,2));
writeFileSync(path.join(root,"asphalt-open-source-pack.json"),JSON.stringify(envelope({
  workIdentity:"asphalt_concrete_pavement",
  claims:[
    {claim:"KG estimate methodology and resource-norm structure",classification:"OPEN_NORMATIVE",sourceId:"kr_methodology_construction_cost_2017"},
    {claim:"area, volume, mass, transport geometry",classification:"ENGINEERING_FORMULA",sourceId:null},
    {claim:"layer thickness, mix type, density, waste and productivity",classification:"UNVERIFIED_ASSUMPTION",sourceId:null}
  ],
  professionalWorkPromoted:false
}),null,2));
writeFileSync(path.join(root,"wave-a-open-source-acceptance.md"),`# Wave A open-source acceptance\n\nSHA: ${sha}\n\nSTOP_ESTIMATE_V4_OPEN_SOURCE_PROFESSIONAL_WORK_CORPUS_NOT_PROVEN_NO_RELEASE\n\nOpen-source-backed distinct roadworks: 0\nTechnical templates: 11610\nFake green claimed: false\n`);
console.info(JSON.stringify({counts,hash:deterministicNormalizedSourceHash(records),fake_green_claimed:false},null,2));
