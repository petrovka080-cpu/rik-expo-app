import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import { createVerifierAdmin } from "./_shared/testUserDiscipline";
import { normalizeRuText } from "../src/lib/text/encoding";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

type ScanSpec = {
  table: string;
  idColumn: string;
  columns: string[];
};

type RowRecord = Record<string, unknown>;

type UntypedAdmin = {
  from: (relation: string) => {
    select: (columns: string) => {
      range: (
        from: number,
        to: number,
      ) => Promise<{ data: RowRecord[] | null; error: Error | null }>;
    };
  };
};

const admin = createVerifierAdmin("mojibake-elimination-verify");
const adminUntyped = admin as unknown as UntypedAdmin;

const SOURCE_FILES = [
  "src/lib/text/encoding.ts",
  "src/screens/subcontracts/subcontracts.shared.ts",
  "src/screens/accountant/AccountantSubcontractTab.tsx",
  "src/screens/buyer/components/BuyerAccountingSheetBody.tsx",
  "src/lib/api/contractor.scope.service.ts",
  "src/screens/contractor/contractor.visibilityRecovery.ts",
  "src/screens/director/DirectorProposalAttachments.tsx",
  "src/screens/warehouse/warehouse.tab.empty.ts",
  "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
  "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
  "src/screens/warehouse/warehouse.api.ts",
  "src/lib/api/pdf_proposal.ts",
  "src/lib/pdf/pdf.proposal.ts",
  "src/lib/pdf/directorProductionReport.shared.ts",
  "src/lib/api/pdf_director.data.ts",
  "src/lib/pdfRunner.ts",
  "src/lib/api/director_reports.transport.discipline.ts",
  "scripts/_shared/contractorCanonicalSeed.ts",
];

const DB_SPECS: ScanSpec[] = [
  {
    table: "subcontracts",
    idColumn: "id",
    columns: ["object_name", "work_type", "work_zone", "uom", "contractor_org", "contractor_rep"],
  },
  {
    table: "requests",
    idColumn: "id",
    columns: ["name", "object_name"],
  },
  {
    table: "request_items",
    idColumn: "id",
    columns: ["name_human", "uom"],
  },
  {
    table: "warehouse_issues",
    idColumn: "id",
    columns: ["status", "object_name", "work_name"],
  },
];

const PAGE_SIZE = 500;
const STRING_LITERAL_RE = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const MOJIBAKE_MARKERS =
  /(?:Р[\u0400-\u04FF](?:Р|С)|С[\u0400-\u04FF](?:Р|С)|Р[–ЉЊЎЂѓ]|С[ЏЎЂѓ]|вЂ|Гђ|Г‘|Гѓ|Г‚|пїЅ)/u;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

function looksLikeMojibake(value: string): boolean {
  const raw = value.trim();
  if (!raw || !MOJIBAKE_MARKERS.test(raw)) return false;
  const normalized = String(normalizeRuText(raw) ?? "").trim();
  return !!normalized && normalized !== raw && !MOJIBAKE_MARKERS.test(normalized);
}

function scanSourceFile(relativePath: string) {
  const fullPath = path.join(projectRoot, relativePath);
  const text = fs.readFileSync(fullPath, "utf8");

  let corruptedLiteralCount = 0;
  const samples: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = STRING_LITERAL_RE.exec(text))) {
    const raw = match[2];
    if (raw.length < 3) continue;
    if (!looksLikeMojibake(raw)) continue;
    corruptedLiteralCount += 1;
    if (samples.length < 5) samples.push(raw.slice(0, 160));
  }

  return {
    file: relativePath,
    corruptedLiteralCount,
    samples,
  };
}

async function scanTable(spec: ScanSpec) {
  let offset = 0;
  let scannedRows = 0;
  let corruptedFieldCount = 0;
  const samples: Array<{ id: string; column: string; value: string }> = [];

  while (true) {
    const { data, error } = await adminUntyped
      .from(spec.table)
      .select([spec.idColumn, ...spec.columns].join(","))
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) break;
    scannedRows += rows.length;

    for (const row of rows) {
      const id = String(row[spec.idColumn] ?? "").trim();
      if (!id) continue;

      for (const column of spec.columns) {
        const value = row[column];
        if (typeof value !== "string" || !value.trim()) continue;
        if (!looksLikeMojibake(value)) continue;
        corruptedFieldCount += 1;
        if (samples.length < 20) {
          samples.push({ id, column, value: value.slice(0, 160) });
        }
      }
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return {
    table: spec.table,
    scannedRows,
    corruptedFieldCount,
    samples,
  };
}

async function main() {
  const sourceScan = SOURCE_FILES.map(scanSourceFile);
  const dbScan = [];
  for (const spec of DB_SPECS) {
    dbScan.push(await scanTable(spec));
  }

  const namingEncodingSummary = {
    encodingGuardFile: "src/lib/text/encoding.ts",
    normalizedBoundaries: [
      "src/screens/subcontracts/subcontracts.shared.ts",
      "src/lib/api/contractor.scope.service.ts",
      "src/screens/contractor/contractor.visibilityRecovery.ts",
      "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
      "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
      "src/lib/api/pdf_proposal.ts",
      "src/lib/api/pdf_director.data.ts",
    ],
    canonicalStatusFilterFile: "src/lib/api/director_reports.transport.discipline.ts",
    cleanSeedFile: "scripts/_shared/contractorCanonicalSeed.ts",
    sourceFilesWithCorruption: sourceScan.filter((entry) => entry.corruptedLiteralCount > 0).map((entry) => entry.file),
  };

  const sourceArtifact = {
    generatedAt: new Date().toISOString(),
    files: sourceScan,
    totalCorruptedLiterals: sourceScan.reduce((sum, entry) => sum + entry.corruptedLiteralCount, 0),
    tables: dbScan,
    totalCorruptedDbFields: dbScan.reduce((sum, entry) => sum + entry.corruptedFieldCount, 0),
  };

  const runtimeProof = {
    generatedAt: new Date().toISOString(),
    accountantSubcontractsBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/screens/accountant/AccountantSubcontractTab.tsx")
        ?.corruptedLiteralCount === 0,
    subcontractSharedBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/screens/subcontracts/subcontracts.shared.ts")
        ?.corruptedLiteralCount === 0,
    contractorScopeBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/lib/api/contractor.scope.service.ts")
        ?.corruptedLiteralCount === 0,
    directorAttachmentBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/screens/director/DirectorProposalAttachments.tsx")
        ?.corruptedLiteralCount === 0,
    buyerAccountingBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/screens/buyer/components/BuyerAccountingSheetBody.tsx")
        ?.corruptedLiteralCount === 0,
    warehouseUiBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/screens/warehouse/warehouse.tab.empty.ts")
        ?.corruptedLiteralCount === 0,
    warehousePdfBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts")
        ?.corruptedLiteralCount === 0
      && sourceScan.find((entry) => entry.file === "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts")
        ?.corruptedLiteralCount === 0,
    proposalPdfBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/lib/api/pdf_proposal.ts")
        ?.corruptedLiteralCount === 0
      && sourceScan.find((entry) => entry.file === "src/lib/pdf/pdf.proposal.ts")
        ?.corruptedLiteralCount === 0,
    directorPdfBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/lib/pdf/directorProductionReport.shared.ts")
        ?.corruptedLiteralCount === 0
      && sourceScan.find((entry) => entry.file === "src/lib/api/pdf_director.data.ts")
        ?.corruptedLiteralCount === 0,
    pdfBoundaryClean:
      sourceScan.find((entry) => entry.file === "src/lib/pdfRunner.ts")
        ?.corruptedLiteralCount === 0,
    dbTablesClean: dbScan.every((entry) => entry.corruptedFieldCount === 0),
    sourceFilesClean: sourceScan.every((entry) => entry.corruptedLiteralCount === 0),
  };

  const green = runtimeProof.dbTablesClean && runtimeProof.sourceFilesClean;
  const summary = {
    status: green ? "GREEN" : "NOT_GREEN",
    sourceCorruptedLiterals: sourceArtifact.totalCorruptedLiterals,
    dbCorruptedFields: sourceArtifact.totalCorruptedDbFields,
  };

  writeJson("artifacts/mojibake-source-check.json", sourceArtifact);
  writeJson("artifacts/mojibake-runtime-proof.json", { ...runtimeProof, status: summary.status });
  writeJson("artifacts/naming-encoding-summary.json", namingEncodingSummary);

  console.log(JSON.stringify(summary, null, 2));
  if (!green) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
