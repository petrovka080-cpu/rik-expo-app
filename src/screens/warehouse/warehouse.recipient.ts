// src/screens/warehouse/warehouse.recipient.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadJson, loadString, saveJson, saveString } from "./warehouse.utils";
import type { Option } from "./warehouse.types";

const RECIPIENT_KEY = "wh:lastRecipient";
const RECIPIENT_RECENT_KEY = "wh:recentRecipients";

export function useWarehouseRecipient(args: {
  enabled: boolean;
  recipientList: Option[];
}) {
  const { enabled, recipientList } = args;

  const [recipientText, setRecipientText] = useState<string>("");
  const [recipientSuggestOpen, setRecipientSuggestOpen] = useState(false);
  const [recipientRecent, setRecipientRecent] = useState<string[]>([]);

  
  useEffect(() => {
    if (!enabled) return;

    (async () => {
      const last = (await loadString(RECIPIENT_KEY)) ?? "";
      const recent = await loadJson<string[]>(RECIPIENT_RECENT_KEY, []);
      if (last && !recipientText) setRecipientText(last);
      setRecipientRecent(Array.isArray(recent) ? recent : []);
    })().catch((e) => {
      console.warn("[warehouse.recipient] bootstrap failed", e);
    });
    
  }, [enabled]);

  const recipientSuggestions = useMemo(() => {
    const q = String(recipientText ?? "").trim().toLowerCase();

    const recent = (recipientRecent || [])
      .filter((x) => (q ? String(x).toLowerCase().includes(q) : true))
      .slice(0, 4);

    const fromProfiles = (recipientList || [])
      .map((x) => x?.label)
      .filter(Boolean)
      .map((x) => String(x))
      .filter((x) => (q ? x.toLowerCase().includes(q) : false))
      .slice(0, 4);

    return Array.from(new Set([...recent, ...fromProfiles])).slice(0, 6);
  }, [recipientText, recipientRecent, recipientList]);

  const commitRecipient = useCallback(async (name: string) => {
    const t = String(name ?? "").trim();
    if (!t) return;

    setRecipientText(t);
    setRecipientSuggestOpen(false);

    setRecipientRecent((prev) => {
      const next = [t, ...(prev || []).filter((x) => x !== t)].slice(0, 8);
      void saveJson(RECIPIENT_RECENT_KEY, next);
      return next;
    });

    void saveString(RECIPIENT_KEY, t);
  }, []);

  return {
    recipientText,
    setRecipientText,
    recipientSuggestOpen,
    setRecipientSuggestOpen,
    recipientSuggestions,
    commitRecipient,
  };
}
