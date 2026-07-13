import {
  buildRequestContextLines,
  buildRequestContextView,
  parseRequestContextFromNotes,
} from "./requestContextView";

type DirectorHeaderItem = {
  note?: unknown;
};

type DirectorHeaderGroup = {
  request_id?: unknown;
  items?: DirectorHeaderItem[];
};

type DirectorHeaderMeta = {
  id?: unknown;
  request_no?: unknown;
  display_no?: unknown;
  status?: unknown;
  created_at?: unknown;
  submitted_at?: unknown;
  need_by?: unknown;
  object_name?: unknown;
  object?: unknown;
  site_address_snapshot?: unknown;
  level_code?: unknown;
  system_code?: unknown;
  zone_code?: unknown;
};

export function selectDirectorRequestHeaderLines(
  sheetRequest: DirectorHeaderGroup,
  requestMeta?: DirectorHeaderMeta | null,
): string[] {
  const notes = (sheetRequest.items || []).map((row) => row.note);
  const noteContext = parseRequestContextFromNotes(notes);
  const context = buildRequestContextView(
    {
      requestId: requestMeta?.id ?? sheetRequest.request_id,
      requestNo: requestMeta?.request_no,
      displayNo: requestMeta?.display_no,
      objectName: requestMeta?.object_name,
      object: requestMeta?.object,
      siteAddress: requestMeta?.site_address_snapshot,
      levelCode: requestMeta?.level_code,
      systemCode: requestMeta?.system_code,
      zoneCode: requestMeta?.zone_code,
      status: requestMeta?.status,
      createdAt: requestMeta?.created_at,
      submittedAt: requestMeta?.submitted_at,
      neededBy: requestMeta?.need_by,
    },
    noteContext,
  );
  return buildRequestContextLines(context, { includeRequestNo: true, maxLines: 8 });
}
