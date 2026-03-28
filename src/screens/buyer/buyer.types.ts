import type { BuyerInboxRow } from "../../lib/catalog_api";

export type BuyerTab = "inbox" | "pending" | "approved" | "rejected" | "subcontracts";
export type BuyerSheetKind = "none" | "inbox" | "accounting" | "rework" | "prop_details" | "rfq";

export type Attachment = {
  name: string;
  file: File | Blob | { name?: string | null; uri?: string | null; mimeType?: string | null; size?: number | null };
};

export type LineMeta = {
  price?: string;
  supplier?: string;
  note?: string;
};

export type DraftAttachmentMap = Record<string, Attachment | undefined>;

export type ProposalHeadLite = {
  id?: string | number | null;
  status?: string | null;
  total_sum?: number | null;
  submitted_at?: string | null;
  sent_to_accountant_at?: string | null;
};

export type ProposalViewLine = {
  request_item_id?: string | number | null;
  app_code?: string | null;
  note?: string | null;
  supplier?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
};

export type BuyerGroup = {
  request_id: string;
  request_id_old?: number | null;
  items: BuyerInboxRow[];
};
