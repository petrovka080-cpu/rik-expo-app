import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
if (!outputArgument) throw new Error("S2723_STAIRS_VIBRATION_OUTPUT_DIR_MISSING");
const outputRoot = resolve(outputArgument.slice("--output-dir=".length));

const sources = [
  {
    id: "ACI_309_CONSOLIDATION_PREVIEW",
    file: "ACI_309_CONSOLIDATION_PREVIEW.pdf",
    url: "https://www.concrete.org/Portals/0/Files/PDF/Previews/30905_2pager.pdf",
  },
  {
    id: "WACKER_NEUSON_IRFU_TECHNICAL_DATA",
    file: "WACKER_NEUSON_IRFU_TECHNICAL_DATA.html",
    url: "https://www.wackerneuson.com/ru/en/products/concrete-technology/internal-vibrators/irfu/technical-data/tab",
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
    headers: { "user-agent": "RIK-S2723-STAIRS-CONCRETE-VIBRATION-SOURCE-RESTORER/1.0" },
  });
  if (!response.ok) {
    throw new Error(`S2723_STAIRS_VIBRATION_FETCH_RED:${source.id}:${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 500) {
    throw new Error(`S2723_STAIRS_VIBRATION_FETCH_EMPTY:${source.id}:${bytes.length}`);
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
  schemaVersion: "rik-expo-app.s27-23.stairs-concrete-vibration-source-snapshots.v1",
  capturedAt,
  authorities: [
    "American Concrete Institute",
    "Wacker Neuson official product website",
  ],
  sourceCount: results.length,
  sources: results,
  productionAccessed: false,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
atomicWrite(resolve(outputRoot, "manifest.json"), serialized);
process.stdout.write(`${JSON.stringify({
  status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_OFFICIAL_SOURCES_RESTORED",
  outputRoot,
  sourceCount: results.length,
  manifestSha256: sha256(serialized),
  sources: results.map(({ id, bytes, sha256: digest }) => ({ id, bytes, sha256: digest })),
}, null, 2)}\n`);
