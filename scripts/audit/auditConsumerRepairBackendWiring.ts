import * as fs from "fs";
import * as path from "path";

const WAVE = "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K";
const root = process.cwd();
const artifactPath = path.join(root, "artifacts", `${WAVE}_backend_wiring.json`);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir))
    .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .map((file) => path.join(dir, file));
}

const screenPath = "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx";
const screen = read(screenPath);
const route = read("app/(tabs)/request/index.tsx");
const marketplaceService = read("src/lib/consumerRequests/consumerRequestMarketplaceService.ts");
const pdfService = read("src/lib/consumerRequests/consumerRequestPdfService.ts");
const validationService = read("src/lib/consumerRequests/consumerRequestValidationService.ts");
const hardeningMigrationPath = "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql";

const featureSources = listSourceFiles("src/features/consumerRepair")
  .map((file) => [file, read(file)] as const);
const consumerRequestSources = listSourceFiles("src/lib/consumerRequests")
  .map((file) => [file, read(file)] as const);

const directDbWritePattern = /\bsupabase\b|\.from\s*\(|\.(?:insert|update|upsert|delete)\s*\(/i;
const directMarketplaceLinkWrites = consumerRequestSources
  .filter(([file]) => !file.endsWith("consumerRequestMarketplaceService.ts"))
  .filter(([, source]) => /consumer_marketplace_links|marketplaceDemandId\s*:\s*id\("marketplace_demand"\)/.test(source))
  .map(([file]) => file);
const directSentStatusWrites = consumerRequestSources
  .filter(([file]) => !file.endsWith("consumerRequestMarketplaceService.ts"))
  .filter(([, source]) => /status\s*:\s*["']sent_to_marketplace["']/.test(source))
  .map(([file]) => file);

const matrix = {
  wave: WAVE,
  migration_exists: exists("supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql") && exists(hardeningMigrationPath),
  service_files_exist: [
    "src/lib/consumerRequests/consumerRequestService.ts",
    "src/lib/consumerRequests/consumerRequestMarketplaceService.ts",
    "src/lib/consumerRequests/consumerRequestValidationService.ts",
    "src/lib/consumerRequests/consumerRequestPdfService.ts",
    "src/lib/consumerRequests/consumerRequestPdfStorage.ts",
  ].every(exists),
  route_imports_consumer_screen: route.includes("ConsumerRepairRequestScreen"),
  request_imports_service_boundary: screen.includes("../../lib/consumerRequests"),
  no_direct_supabase_writes_from_screen: !directDbWritePattern.test(screen),
  no_direct_supabase_writes_from_feature: featureSources.every(([, source]) => !directDbWritePattern.test(source)),
  no_direct_insert_into_consumer_marketplace_links_outside_service: directMarketplaceLinkWrites.length === 0,
  no_direct_status_sent_to_marketplace_outside_service: directSentStatusWrites.length === 0,
  approve_uses_service: screen.includes("approveConsumerRepairRequestDraft("),
  send_uses_marketplace_service: screen.includes("sendConsumerRepairRequestToMarketplace(")
    && marketplaceService.includes("validateConsumerRepairRequestForMarketplace(input.requestDraftId, input.userId)"),
  pdf_open_uses_service: screen.includes("getConsumerRepairRequestPdf(")
    && screen.includes("window.open(pdf.signedUrl")
    && screen.includes("Linking.openURL(pdf.signedUrl"),
  pdf_service_uploads_before_row: pdfService.indexOf("uploadConsumerRepairPdfObject") < pdfService.indexOf("return {"),
  validation_service_blocks_empty_submit: [
    "CONTACT_REQUIRED",
    "DESCRIPTION_REQUIRED",
    "MEDIA_REQUIRED",
    "ITEMS_REQUIRED",
    "PDF_REQUIRED",
    "PDF_FILE_MISSING",
    "REQUEST_NOT_APPROVED",
    "REPAIR_TYPE_REQUIRED",
    "OWNER_MISMATCH",
  ].every((code) => validationService.includes(code)),
  direct_marketplace_link_write_files: directMarketplaceLinkWrites,
  direct_sent_status_write_files: directSentStatusWrites,
};

const passed = Object.entries(matrix)
  .filter(([, value]) => typeof value === "boolean")
  .every(([, value]) => value === true);

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify({ ...matrix, passed }, null, 2)}\n`, "utf8");

if (!passed) {
  console.error(JSON.stringify({ ...matrix, passed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ...matrix, passed }, null, 2));
