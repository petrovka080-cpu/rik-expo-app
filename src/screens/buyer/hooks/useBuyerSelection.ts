import { useState } from "react";
import type { DraftAttachmentMap, LineMeta } from "../buyer.types";

export function useBuyerSelection() {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, LineMeta>>({});
  const [attachments, setAttachments] = useState<DraftAttachmentMap>({});

  return {
    picked,
    setPicked,
    meta,
    setMeta,
    attachments,
    setAttachments,
  };
}

