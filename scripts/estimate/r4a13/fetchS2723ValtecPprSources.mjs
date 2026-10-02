import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
if (!outputArgument) throw new Error("S2723_VALTEC_PPR_OUTPUT_DIR_MISSING");
const outputRoot = resolve(outputArgument.slice("--output-dir=".length));

const sources = [
  {
    id: "VALTEC_PPR_PN25_PRODUCT_PAGE",
    file: "VALTEC_VTp.700.0020_PRODUCT.html",
    url: "https://valtec.ru/catalog/sistemy_polipropilenovyh_truboprovodov/polipropilenovye_truby/polipropilenovaya_truba_valtec_ppr_pn_20_vtp7000020.html",
  },
  {
    id: "VALTEC_PPR_PN25_PASSPORT",
    file: "VALTEC_VTp.700.0020_PASSPORT.pdf",
    url: "https://valtec.ru/document/technical/VTp.700.0020-0425.pdf",
  },
  {
    id: "VALTEC_PPR_FITTINGS_PASSPORT",
    file: "VALTEC_VTp.700_FITTINGS_PASSPORT.pdf",
    url: "https://valtec.ru/document/technical/VTp.700-fitingi-1224.pdf",
  },
  {
    id: "VALTEC_PPR_COUPLING_PRODUCT_PAGE",
    file: "VALTEC_VTp.703.0_COUPLING.html",
    url: "https://valtec.ru/catalog/sistemy_polipropilenovyh_truboprovodov/polipropilenovye_fitingi/fiting_polipropilenovyj_mufta_vtp7030.html",
  },
  {
    id: "KG_SN_KR_40_04_2025_PUBLICATION",
    file: "KG_SN_KR_40_04_2025_PUBLICATION.html",
    url: "https://minstroy.gov.kg/ru/document/148/show",
  },
  {
    id: "KG_SN_KR_40_04_2025_PDF",
    file: "KG_SN_KR_40_04_2025.pdf",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/obedinennyjsnkr4004_2025vnutrvodoprovodikanaliz-39367a9e0c5b531c7.83743590.pdf",
  },
  {
    id: "KG_KRER_16_PUBLICATION",
    file: "KG_KRER_16_PUBLICATION.html",
    url: "https://minstroy.gov.kg/ru/kyzmat/432/show",
  },
  {
    id: "KG_KRER_16_PDF",
    file: "KG_KRER_16_INTERNAL_PIPELINES.pdf",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no16truboprovodyvnutrennie_compressed-154690837388a4dd7.26767770.pdf",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, path);
}

const capturedAt = new Date().toISOString();
const results = [];
for (const source of sources) {
  const response = await fetch(source.url, {
    redirect: "follow",
    headers: { "user-agent": "RIK-S2723-VALTEC-PPR-SOURCE-RESTORER/1.0" },
  });
  if (!response.ok) throw new Error(`S2723_VALTEC_PPR_FETCH_RED:${source.id}:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 500) {
    throw new Error(`S2723_VALTEC_PPR_FETCH_EMPTY:${source.id}:${bytes.length}`);
  }
  atomicWrite(resolve(outputRoot, source.file), bytes);
  results.push({
    ...source,
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get("content-type"),
    bytes: bytes.length,
    sha256: sha256(bytes),
    capturedAt,
  });
}

const manifest = {
  schemaVersion: "rik-expo-app.s27-23.valtec-ppr-source-snapshots.v1",
  capturedAt,
  authorities: [
    "VALTEC official website",
    "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
  ],
  sourceCount: results.length,
  sources: results,
  productionAccessed: false,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
atomicWrite(resolve(outputRoot, "manifest.json"), serialized);
process.stdout.write(`${JSON.stringify({
  status: "GREEN_S27_23_VALTEC_PPR_OFFICIAL_SOURCES_RESTORED",
  outputRoot,
  sourceCount: results.length,
  manifestSha256: sha256(serialized),
  sources: results.map(({ id, bytes, sha256: digest }) => ({ id, bytes, sha256: digest })),
}, null, 2)}\n`);
