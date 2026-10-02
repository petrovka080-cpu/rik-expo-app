import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
if (!outputArgument) throw new Error("S2723_WAVIN_HEP2O_OUTPUT_DIR_MISSING");
const outputRoot = resolve(outputArgument.slice("--output-dir=".length));

const sources = [
  {
    id: "WAVIN_HEP2O_INSTALLER_GUIDE",
    file: "WAVIN_HEP2O_INSTALLER_GUIDE.pdf",
    url: "https://mediahub.wavin.com/m/585fd6c3724465db/original/Hep2O-Installer-Guide.pdf",
  },
  {
    id: "WAVIN_HEP2O_HOW_TO_INSTALL",
    file: "WAVIN_HEP2O_HOW_TO_INSTALL.html",
    url: "https://wavin.com/gb/solutions/hep2o-key/how-to-install",
  },
  {
    id: "WAVIN_HEP2O_BARRIER_PIPE_22X6_PRODUCT",
    file: "WAVIN_HEP2O_BARRIER_PIPE_22X6_PRODUCT.html",
    url: "https://wavin.com/gb/p/3ad99f03-53a6-4a99-ab95-e8b6b38716ce/hep2o-barrier-pipe-wt-22-l6",
  },
  {
    id: "KG_KRER_18_PUBLICATION",
    file: "KG_KRER_18_PUBLICATION.html",
    url: "https://minstroy.gov.kg/ru/kyzmat/434/show",
  },
  {
    id: "KG_KRER_18_PDF",
    file: "KG_KRER_18_INTERNAL_HEATING.pdf",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no18otoplenievnutrennieustrojstva_compressed-531690838924cbc41.43459761.pdf",
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
    headers: { "user-agent": "RIK-S2723-WAVIN-HEP2O-SOURCE-RESTORER/1.0" },
  });
  if (!response.ok) throw new Error(`S2723_WAVIN_HEP2O_FETCH_RED:${source.id}:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 500) {
    throw new Error(`S2723_WAVIN_HEP2O_FETCH_EMPTY:${source.id}:${bytes.length}`);
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
  schemaVersion: "rik-expo-app.s27-23.wavin-hep2o-heating-source-snapshots.v1",
  capturedAt,
  authorities: [
    "Wavin official website and media hub",
    "Ministry of Construction, Architecture and Housing and Communal Services of the Kyrgyz Republic",
  ],
  sourceCount: results.length,
  sources: results,
  productionAccessed: false,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
atomicWrite(resolve(outputRoot, "manifest.json"), serialized);
process.stdout.write(`${JSON.stringify({
  status: "GREEN_S27_23_WAVIN_HEP2O_HEATING_OFFICIAL_SOURCES_RESTORED",
  outputRoot,
  sourceCount: results.length,
  manifestSha256: sha256(serialized),
  sources: results.map(({ id, bytes, sha256: digest }) => ({ id, bytes, sha256: digest })),
}, null, 2)}\n`);
