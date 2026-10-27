import type { ReqHeadRow } from "./warehouse.types";

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const normalized = String(raw ?? "").trim();
  const match = normalized.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!match) return { year: 0, seq: 0 };
  return {
    seq: Number(match[1] ?? 0) || 0,
    year: Number(match[2] ?? 0) || 0,
  };
};

export const toWarehouseTextOrNull = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

export const compareWarehouseReqHeads = (left: ReqHeadRow, right: ReqHeadRow): number => {
  const leftTime = left?.submitted_at ? new Date(left.submitted_at).getTime() : 0;
  const rightTime = right?.submitted_at ? new Date(right.submitted_at).getTime() : 0;
  if (rightTime !== leftTime) return rightTime - leftTime;

  const leftDisplay = parseDisplayNo(left.display_no);
  const rightDisplay = parseDisplayNo(right.display_no);
  if (rightDisplay.year !== leftDisplay.year) return rightDisplay.year - leftDisplay.year;
  if (rightDisplay.seq !== leftDisplay.seq) return rightDisplay.seq - leftDisplay.seq;

  return String(right?.request_id ?? "").localeCompare(String(left?.request_id ?? ""));
};
