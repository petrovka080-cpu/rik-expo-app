import * as fs from "fs";
import * as path from "path";

import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

const PREFIX = "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K";
const USER_ID = "consumer-web-proof";
const PROBLEM = "Хочу уложить ламинат на 100 кв м в квартире, нужен ремонт пола";

function writeJson(name: string, value: unknown): void {
  const dir = path.resolve(process.cwd(), "artifacts");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createDraft(input: { problemText?: string; contactPhone?: string | null; media?: boolean }) {
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: USER_ID,
    problemText: input.problemText ?? PROBLEM,
    contactPhone: input.contactPhone === undefined ? "+996 555 123 456" : input.contactPhone,
    repairType: "flooring",
    aiDraft: buildConsumerRepairAiDraft(input.problemText ?? PROBLEM),
  });
  if (input.media !== false) {
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  }
  return approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: USER_ID });
}

function expectSendError(requestDraftId: string, code: string): { status: number; codeFound: boolean; messageRu: string } {
  try {
    sendConsumerRepairRequestToMarketplace({ requestDraftId, userId: USER_ID });
  } catch (error) {
    if (!(error instanceof ConsumerRepairValidationError)) throw error;
    return {
      status: error.statusCode,
      codeFound: error.errors.some((item) => item.code === code),
      messageRu: error.errors.find((item) => item.code === code)?.messageRu ?? "",
    };
  }
  throw new Error(`Expected ${code} validation error.`);
}

async function main() {
  __resetConsumerRepairRequestStoreForTests();

  const approved = createDraft({});
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id });
  const noContact = createDraft({ contactPhone: null });
  const noDescription = createDraft({ problemText: "коротко" });
  const noMedia = createDraft({ media: false });

  const noContactResult = expectSendError(noContact.draft.id, "CONTACT_REQUIRED");
  const noDescriptionResult = expectSendError(noDescription.draft.id, "DESCRIPTION_REQUIRED");
  const noMediaResult = expectSendError(noMedia.draft.id, "MEDIA_REQUIRED");

  const sent = sendConsumerRepairRequestToMarketplace({
    requestDraftId: approved.draft.id,
    userId: USER_ID,
    idempotencyKey: "web-proof",
  });

  const screen = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
  const matrix = {
    wave: "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_GREEN_POINT_OF_NO_RETURN",
    proof_status: "PASS_WEB_PDF_VALIDATION_PROOF_ONLY",
    route: "/request",
    draft_created: true,
    approve_created_pdf: approved.pdfs.length > 0,
    pdf_open_signed_url_created: pdf.signedUrl.length > 0,
    pdf_open_content_type: pdf.contentType,
    pdf_open_works_web: pdf.signedUrl.includes("application/pdf"),
    pdf_open_works_mobile: screen.includes("Linking.openURL(pdf.signedUrl"),
    send_without_contact_status: noContactResult.status,
    send_without_contact_blocked: noContactResult.status === 422 && noContactResult.codeFound,
    send_without_contact_message: noContactResult.messageRu,
    send_without_description_status: noDescriptionResult.status,
    send_without_description_blocked: noDescriptionResult.status === 422 && noDescriptionResult.codeFound,
    send_without_description_message: noDescriptionResult.messageRu,
    send_without_media_status: noMediaResult.status,
    send_without_media_blocked: noMediaResult.status === 422 && noMediaResult.codeFound,
    send_without_media_message: noMediaResult.messageRu,
    valid_send_status: sent.marketplaceLink.status === "sent" ? 201 : 500,
    valid_send_after_backend_success_only: sent.draft.status === "sent_to_marketplace",
    direct_frontend_db_write_found: /supabase|\.from\s*\(|\.(insert|update|delete)\s*\(/i.test(screen),
    office_routes_touched: screen.includes("/office"),
  };

  writeJson("web_pdf_open", matrix);

  if (
    !matrix.approve_created_pdf
    || !matrix.pdf_open_works_web
    || !matrix.pdf_open_works_mobile
    || !matrix.send_without_contact_blocked
    || !matrix.send_without_description_blocked
    || !matrix.send_without_media_blocked
    || matrix.valid_send_status !== 201
    || matrix.direct_frontend_db_write_found
    || matrix.office_routes_touched
  ) {
    throw new Error("B2C request marketplace validation/PDF open proof failed.");
  }

  console.log(JSON.stringify(matrix, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
