import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
if (!outputArgument) throw new Error("S2723_IEK_OUTPUT_DIR_MISSING");
const outputRoot = resolve(outputArgument.slice("--output-dir=".length));

const sources = [
  {
    id: "IEK_PLASTIC_CABLE_SYSTEMS_CATALOG",
    file: "IEK_PLASTIC_CABLE_SYSTEMS.pdf",
    url: "https://www.iek.ru/upload/iblock/e16/txvbl1aqwvzyemqxfotnfmzg3xmwil7u/Plastikovye-kabelenesushchie-sistemy.pdf",
  },
  {
    id: "IEK_ELECOR_ACCESSORIES_40X25",
    file: "IEK_ELECOR_ACCESSORIES_40X25.html",
    url: "https://www.iek.ru/products/catalog/sistemy_dlya_prokladki_kabelya/kabel_kanaly_plastikovye/kabel_kanaly_elecor/aksessuary_dlya_magistralnykh_kabel_kanalov_belye",
  },
  {
    id: "IEK_ELECOR_STRAIGHT_CONNECTOR_40X25",
    file: "IEK_ELECOR_STRAIGHT_CONNECTOR_40X25.html",
    url: "https://www.iek.ru/products/catalog/sistemy_dlya_prokladki_kabelya/kabel_kanaly_plastikovye/kabel_kanaly_elecor/aksessuary_dlya_magistralnykh_kabel_kanalov_belye/soediniteli_kms_belye/elecor_soedinitel_na_styk_kms_40x25_belyy_4sht_kompl_iek",
  },
  {
    id: "IEK_ELECOR_INNER_CORNER_40X25",
    file: "IEK_ELECOR_INNER_CORNER_40X25.html",
    url: "https://www.iek.ru/products/catalog/sistemy_dlya_prokladki_kabelya/kabel_kanaly_plastikovye/kabel_kanaly_elecor/aksessuary_dlya_magistralnykh_kabel_kanalov_belye/ugly_vnutrennie_kmv_belye/elecor_ugol_vnutrenniy_kmv_40kh25_belyy_4sht_kompl_iek",
  },
  {
    id: "IEK_ELECOR_OUTER_CORNER_40X25",
    file: "IEK_ELECOR_OUTER_CORNER_40X25.html",
    url: "https://www.iek.ru/products/catalog/sistemy_dlya_prokladki_kabelya/kabel_kanaly_plastikovye/kabel_kanaly_elecor/aksessuary_dlya_magistralnykh_kabel_kanalov_belye/ugly_vneshnie_kmn_belye/elecor_ugol_vneshniy_kmn_40kh25_belyy_4sht_kompl_iek",
  },
  {
    id: "IEK_ELECOR_END_CAP_40X25",
    file: "IEK_ELECOR_END_CAP_40X25.html",
    url: "https://www.iek.ru/products/catalog/sistemy_dlya_prokladki_kabelya/kabel_kanaly_plastikovye/kabel_kanaly_elecor/aksessuary_dlya_magistralnykh_kabel_kanalov_belye/zaglushki_kmz_belye/elecor_zaglushka_kmz_40kh25_belyy_4sht_kompl_iek",
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
    headers: { "user-agent": "RIK-S2723-IEK-CABLE-CHANNEL-SOURCE-RESTORER/1.0" },
  });
  if (!response.ok) throw new Error(`S2723_IEK_FETCH_RED:${source.id}:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 500) throw new Error(`S2723_IEK_FETCH_EMPTY:${source.id}:${bytes.length}`);
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
  schemaVersion: "rik-expo-app.s27-23.iek-cable-channel-source-snapshots.v1",
  capturedAt,
  authority: "IEK GROUP official website",
  sourceCount: results.length,
  sources: results,
  productionAccessed: false,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
atomicWrite(resolve(outputRoot, "manifest.json"), serialized);
process.stdout.write(`${JSON.stringify({
  status: "GREEN_S27_23_IEK_CABLE_CHANNEL_OFFICIAL_SOURCES_RESTORED",
  outputRoot,
  sourceCount: results.length,
  manifestSha256: sha256(serialized),
  sources: results.map(({ id, bytes, sha256: digest }) => ({ id, bytes, sha256: digest })),
}, null, 2)}\n`);
