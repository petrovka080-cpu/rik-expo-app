export type WorkLogRow = {
  id: string;
  created_at: string;
  qty: number;
  work_uom: string | null;
  stage_note: string | null;
  note: string | null;
};

export type LinkedReqCard = {
  request_id: string;
  req_no: string;
  status: string | null;
  issue_nos: string[];
};

export type IssuedItemRow = {
  issue_item_id: string;
  mat_code?: string | null;
  request_id?: string | null;
  title: string;
  unit: string | null;
  qty: number;
  qty_left?: number | null;
  qty_used?: number | null;
  price: number | null;
  sum: number | null;
  qty_fact: number;
};

export type ActBuilderItem = {
  id: string;
  mat_code: string;
  name: string;
  uom: string;
  issuedQty: number;
  alreadyUsed: number;
  qtyMax: number;
  qty: number;
  price: number | null;
  include: boolean;
  source: "issued" | "ready";
};

export type ActBuilderWorkItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number | null;
  approvedQty?: number | null;
  approvedUnit?: string | null;
  approvedPrice?: number | null;
  comment: string;
  include: boolean;
};
