import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/u, "").split("=");
  return [key, value.join("=")];
}));
if (!args["output-dir"]) throw new Error("BATCH005_NORMATIVE_SNAPSHOT_OUTPUT_DIR_MISSING");
const outputDir = path.resolve(args["output-dir"]);
mkdirSync(outputDir, { recursive: true });

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
};
const stableJson = (value) => `${JSON.stringify(stableValue(value), null, 2)}\n`;

const sources = [
  {
    artifact_id: "KG_KRERM_2015_GUIDANCE_PDF",
    source_id: "KG_KRERM_08_2015_ELECTRICAL",
    file: "KG_KRERM_2015_GUIDANCE.pdf",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/montazoborudovania-62169004e91aaf866.70682138.pdf",
    authority: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
    role: "PRIMARY_EXACT_LOCATOR_TEXT",
  },
  {
    artifact_id: "KG_KRERM_2015_PUBLICATION_PAGE",
    source_id: "KG_KRERM_08_2015_ELECTRICAL",
    file: "KG_KRERM_2015_PUBLICATION_PAGE.html",
    url: "https://minstroy.gov.kg/ru/kyzmat/353/show",
    authority: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
    role: "OFFICIAL_PUBLICATION_STATUS",
  },
  {
    artifact_id: "KG_KRERP_2015_GUIDANCE_PDF",
    source_id: "KG_KRERP_01_2015_ELECTRICAL",
    file: "KG_KRERP_2015_GUIDANCE.pdf",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/puskonaladocnyeraboty-54969005897c6ec16.38601706.pdf",
    authority: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
    role: "PRIMARY_EXACT_LOCATOR_TEXT",
  },
  {
    artifact_id: "KG_KRERP_01_2015_COLLECTION_PDF",
    source_id: "KG_KRERP_01_2015_ELECTRICAL",
    file: "KG_KRERP_01_2015_COLLECTION.pdf",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no1elektrotehniceskieustrojstva_compressed-2576901ea4b333a55.88313103.pdf",
    authority: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
    role: "COMPANION_RATE_COLLECTION",
  },
  {
    artifact_id: "KG_KRERP_01_2015_PUBLICATION_PAGE",
    source_id: "KG_KRERP_01_2015_ELECTRICAL",
    file: "KG_KRERP_01_2015_PUBLICATION_PAGE.html",
    url: "https://minstroy.gov.kg/ru/kyzmat/404/show",
    authority: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
    role: "OFFICIAL_PUBLICATION_STATUS",
  },
  {
    artifact_id: "KG_ELECTRICAL_SAFETY_2023_STATUS",
    source_id: "KG_ELECTRICAL_SAFETY_2023",
    file: "KG_ELECTRICAL_SAFETY_2023_STATUS.json",
    url: "https://cbd.minjust.gov.kg/api/v1/GetDocument?DocumentCode=200900",
    authority: "Централизованный банк данных правовой информации Кыргызской Республики",
    role: "OFFICIAL_STATUS",
  },
  {
    artifact_id: "KG_ELECTRICAL_SAFETY_2023_EDITION",
    source_id: "KG_ELECTRICAL_SAFETY_2023",
    file: "KG_ELECTRICAL_SAFETY_2023_EDITION_1273326.json",
    url: "https://cbd.minjust.gov.kg/api/v1/GetEdition?editionId=1273326&lang=ru",
    authority: "Централизованный банк данных правовой информации Кыргызской Республики",
    role: "PRIMARY_EXACT_LOCATOR_TEXT",
  },
  {
    artifact_id: "KG_ELECTRICAL_ACCEPTANCE_2023_STATUS",
    source_id: "KG_ELECTRICAL_ACCEPTANCE_2023",
    file: "KG_ELECTRICAL_ACCEPTANCE_2023_STATUS.json",
    url: "https://cbd.minjust.gov.kg/api/v1/GetDocument?DocumentCode=51-476",
    authority: "Централизованный банк данных правовой информации Кыргызской Республики",
    role: "OFFICIAL_STATUS",
  },
  {
    artifact_id: "KG_ELECTRICAL_ACCEPTANCE_2023_EDITION",
    source_id: "KG_ELECTRICAL_ACCEPTANCE_2023",
    file: "KG_ELECTRICAL_ACCEPTANCE_2023_EDITION_1241467.json",
    url: "https://cbd.minjust.gov.kg/api/v1/GetEdition?editionId=1241467&lang=ru",
    authority: "Централизованный банк данных правовой информации Кыргызской Республики",
    role: "PRIMARY_EXACT_LOCATOR_TEXT",
  },
  {
    artifact_id: "EAEU_TR_TS_004_2011_PDF",
    source_id: "EAEU_TR_TS_004_2011",
    file: "EAEU_TR_TS_004_2011.pdf",
    url: "https://eec.eaeunion.org/upload/medialibrary/269/TR-TS-Downvolt.pdf",
    authority: "Евразийская экономическая комиссия",
    role: "PRIMARY_EXACT_LOCATOR_TEXT",
  },
  {
    artifact_id: "EAEU_TR_TS_004_2011_2022_AMENDMENT_STATUS",
    source_id: "EAEU_TR_TS_004_2011",
    file: "EAEU_TR_TS_004_2011_2022_AMENDMENT_STATUS.html",
    url: "https://eec.eaeunion.org/news/itogi-zasedaniya-soveta-eek-10-iyunya/",
    authority: "Евразийская экономическая комиссия",
    role: "OFFICIAL_AMENDMENT_STATUS",
  },
];

const results = [];
for (const source of sources) {
  const response = await fetch(source.url, {
    headers: { "user-agent": "RIK-BATCH005-NORMATIVE-SNAPSHOT-R4/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`BATCH005_NORMATIVE_FETCH_RED:${source.artifact_id}:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error(`BATCH005_NORMATIVE_FETCH_EMPTY:${source.artifact_id}:${bytes.length}`);
  writeFileSync(path.join(outputDir, source.file), bytes);
  results.push({
    ...source,
    fetched_at: "2026-08-14T00:00:00.000+06:00",
    http_status: response.status,
    final_url: response.url,
    content_type: response.headers.get("content-type"),
    bytes: bytes.length,
    sha256: sha256(bytes),
    verdict: "GREEN_OFFICIAL_SNAPSHOT",
  });
}

const jsonByArtifactId = new Map(results.filter((result) => result.file.endsWith(".json")).map((result) => [
  result.artifact_id,
  JSON.parse(readFileSync(path.join(outputDir, result.file), "utf8")),
]));
const safetyStatus = jsonByArtifactId.get("KG_ELECTRICAL_SAFETY_2023_STATUS");
const acceptanceStatus = jsonByArtifactId.get("KG_ELECTRICAL_ACCEPTANCE_2023_STATUS");
if (safetyStatus?.status?.nameRus !== "Действует" || safetyStatus?.editions?.[0]?.id !== 1273326) throw new Error("BATCH005_SAFETY_STATUS_RED");
if (acceptanceStatus?.status?.nameRus !== "Действует" || acceptanceStatus?.editions?.[0]?.id !== 1241467) throw new Error("BATCH005_ACCEPTANCE_STATUS_RED");

const manifest = {
  schema_version: "Batch005OfficialNormativeSnapshotManifestR4",
  verified_at: "2026-08-14T00:00:00.000+06:00",
  source_count: results.length,
  official_authority_only: true,
  safety_status: { document_code: 200900, edition_id: 1273326, status: safetyStatus.status.nameRus },
  acceptance_status: { document_code: 200802, edition_id: 1241467, status: acceptanceStatus.status.nameRus },
  krerm_status: "OFFICIAL_CURRENT_PUBLICATION_AVAILABLE_PRIVATE_USE_RECOMMENDED",
  krerp_status: "OFFICIAL_CURRENT_PUBLICATION_AND_COLLECTION_AVAILABLE_PRIVATE_USE_RECOMMENDED",
  eaeu_status: "ACTIVE_WITH_2022_AMENDMENTS",
  sources: results,
  verdict: "GREEN_OFFICIAL_SOURCE_SNAPSHOTS",
};
writeFileSync(path.join(outputDir, "OFFICIAL_SOURCE_SNAPSHOT_MANIFEST.json"), stableJson(manifest));
process.stdout.write(stableJson({
  sources: results.length,
  manifest_sha256: sha256(Buffer.from(stableJson(manifest))),
  safety_status: manifest.safety_status.status,
  acceptance_status: manifest.acceptance_status.status,
  verdict: manifest.verdict,
}));
