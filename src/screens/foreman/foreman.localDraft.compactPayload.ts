import type {
  ForemanLocalDraftDelete,
  ForemanLocalDraftHeader,
  ForemanLocalDraftItem,
  ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";

type CompactHeaderV1 = [string, string, string, string, string, string];

type CompactItemV1 = [
  string,
  string | null,
  string | null,
  string,
  number,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  number | null,
];

type CompactDeleteV1 = [string, string];

export type CompactForemanLocalDraftSnapshotV1 = {
  v: 1;
  o: string;
  r: string;
  d: string | null;
  s: string | null;
  h: CompactHeaderV1;
  i: CompactItemV1[];
  q: Record<string, string>;
  x: CompactDeleteV1[];
  sub: boolean;
  e: string | null;
  u: string;
  b?: string | null;
};

export type ForemanLocalDraftSnapshotPayload =
  | {
      kind: "compact_v1";
      snapshot: CompactForemanLocalDraftSnapshotV1;
    }
  | {
      kind: "full_v1";
      snapshot: ForemanLocalDraftSnapshot | null;
    };

export type ForemanLocalDraftSnapshotPayloadMode =
  | "none"
  | "compact_v1"
  | "full_v1"
  | "legacy_full"
  | "invalid";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const toCompactHeader = (header: ForemanLocalDraftHeader): CompactHeaderV1 => [
  header.foreman,
  header.comment,
  header.objectType,
  header.level,
  header.system,
  header.zone,
];

const fromCompactHeader = (header: CompactHeaderV1): ForemanLocalDraftHeader => ({
  foreman: header[0],
  comment: header[1],
  objectType: header[2],
  level: header[3],
  system: header[4],
  zone: header[5],
});

const toCompactItem = (item: ForemanLocalDraftItem): CompactItemV1 => [
  item.local_id,
  item.remote_item_id,
  item.rik_code,
  item.name_human,
  item.qty,
  item.uom,
  item.status,
  item.note,
  item.app_code,
  item.kind,
  item.line_no,
];

const fromCompactItem = (item: CompactItemV1): ForemanLocalDraftItem => ({
  local_id: item[0],
  remote_item_id: item[1],
  rik_code: item[2],
  name_human: item[3],
  qty: item[4],
  uom: item[5],
  status: item[6],
  note: item[7],
  app_code: item[8],
  kind: item[9],
  line_no: item[10],
});

const toCompactDelete = (item: ForemanLocalDraftDelete): CompactDeleteV1 => [
  item.local_id,
  item.remote_item_id,
];

const fromCompactDelete = (item: CompactDeleteV1): ForemanLocalDraftDelete => ({
  local_id: item[0],
  remote_item_id: item[1],
});

const isCompactHeader = (value: unknown): value is CompactHeaderV1 =>
  Array.isArray(value) &&
  value.length === 6 &&
  value.every((item) => typeof item === "string");

const isCompactItem = (value: unknown): value is CompactItemV1 =>
  Array.isArray(value) &&
  value.length === 11 &&
  typeof value[0] === "string" &&
  isStringOrNull(value[1]) &&
  isStringOrNull(value[2]) &&
  typeof value[3] === "string" &&
  typeof value[4] === "number" &&
  Number.isFinite(value[4]) &&
  isStringOrNull(value[5]) &&
  isStringOrNull(value[6]) &&
  isStringOrNull(value[7]) &&
  isStringOrNull(value[8]) &&
  isStringOrNull(value[9]) &&
  isNumberOrNull(value[10]);

const isCompactDelete = (value: unknown): value is CompactDeleteV1 =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "string" &&
  typeof value[1] === "string";

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === "string");

const isCompactSnapshot = (
  value: unknown,
): value is CompactForemanLocalDraftSnapshotV1 => {
  if (!isRecord(value)) return false;
  return (
    value.v === 1 &&
    typeof value.o === "string" &&
    typeof value.r === "string" &&
    isStringOrNull(value.d) &&
    isStringOrNull(value.s) &&
    isCompactHeader(value.h) &&
    Array.isArray(value.i) &&
    isRecord(value.q) &&
    Array.isArray(value.x) &&
    typeof value.sub === "boolean" &&
    isStringOrNull(value.e) &&
    typeof value.u === "string" &&
    (value.b === undefined || isStringOrNull(value.b))
  );
};

export const buildCompactForemanLocalDraftSnapshotPayload = (
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSnapshotPayload | null => {
  if (!snapshot) return null;
  const compact: CompactForemanLocalDraftSnapshotV1 = {
    v: 1,
    o: snapshot.ownerId,
    r: snapshot.requestId,
    d: snapshot.displayNo,
    s: snapshot.status,
    h: toCompactHeader(snapshot.header),
    i: snapshot.items.map(toCompactItem),
    q: { ...snapshot.qtyDrafts },
    x: snapshot.pendingDeletes.map(toCompactDelete),
    sub: snapshot.submitRequested,
    e: snapshot.lastError,
    u: snapshot.updatedAt,
  };
  if (snapshot.baseServerRevision !== undefined) {
    compact.b = snapshot.baseServerRevision;
  }
  return {
    kind: "compact_v1",
    snapshot: compact,
  };
};

export const buildFullForemanLocalDraftSnapshotPayload = (
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSnapshotPayload | null =>
  snapshot
    ? {
        kind: "full_v1",
        snapshot,
      }
    : null;

export const restoreForemanLocalDraftSnapshotFromPayload = (
  payload: unknown,
): ForemanLocalDraftSnapshot | null => {
  if (!isRecord(payload)) return null;
  if (payload.kind === "full_v1") {
    return isRecord(payload.snapshot)
      ? (payload.snapshot as ForemanLocalDraftSnapshot)
      : null;
  }
  if (payload.kind !== "compact_v1" || !isCompactSnapshot(payload.snapshot)) {
    return null;
  }
  if (!isStringRecord(payload.snapshot.q)) return null;
  const items: ForemanLocalDraftItem[] = [];
  for (const item of payload.snapshot.i) {
    if (!isCompactItem(item)) return null;
    items.push(fromCompactItem(item));
  }
  const pendingDeletes: ForemanLocalDraftDelete[] = [];
  for (const item of payload.snapshot.x) {
    if (!isCompactDelete(item)) return null;
    pendingDeletes.push(fromCompactDelete(item));
  }
  const snapshot: ForemanLocalDraftSnapshot = {
    version: 1,
    ownerId: payload.snapshot.o,
    requestId: payload.snapshot.r,
    displayNo: payload.snapshot.d,
    status: payload.snapshot.s,
    header: fromCompactHeader(payload.snapshot.h),
    items,
    qtyDrafts: { ...payload.snapshot.q },
    pendingDeletes,
    submitRequested: payload.snapshot.sub,
    lastError: payload.snapshot.e,
    updatedAt: payload.snapshot.u,
  };
  if (payload.snapshot.b !== undefined) {
    snapshot.baseServerRevision = payload.snapshot.b;
  }
  return snapshot;
};

export const resolveForemanLocalDraftPayloadMode = (
  payload: unknown,
  legacyFullSnapshot: unknown,
): ForemanLocalDraftSnapshotPayloadMode => {
  if (isRecord(payload) && payload.kind === "compact_v1") {
    return restoreForemanLocalDraftSnapshotFromPayload(payload) ? "compact_v1" : "invalid";
  }
  if (isRecord(payload) && payload.kind === "full_v1") return "full_v1";
  if (legacyFullSnapshot != null) return "legacy_full";
  return "none";
};
