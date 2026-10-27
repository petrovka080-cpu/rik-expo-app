import { useCallback, useMemo } from "react";
import { useForemanDicts } from "../../foreman/useForemanDicts";
import { normalizeRuText } from "../../../lib/text/encoding";

export function useContractorHumanizers() {
  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();

  const objNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of objOptions || []) {
      m.set(String(o.code || "").trim(), normalizeRuText(String(o.name || "").trim()));
    }
    return m;
  }, [objOptions]);

  const lvlNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of lvlOptions || []) {
      m.set(String(o.code || "").trim(), normalizeRuText(String(o.name || "").trim()));
    }
    return m;
  }, [lvlOptions]);

  const sysNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of sysOptions || []) {
      m.set(String(o.code || "").trim(), normalizeRuText(String(o.name || "").trim()));
    }
    return m;
  }, [sysOptions]);

  const toHumanObject = useCallback(
    (raw: string | null | undefined): string => {
      const src = normalizeRuText(String(raw || "").trim());
      if (!src) return "—";
      const parts = src
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean);
      if (!parts.length) return src;
      const out = parts.map(
        (p) => objNameByCode.get(p) || lvlNameByCode.get(p) || sysNameByCode.get(p) || p,
      );
      return out.join(" / ");
    },
    [objNameByCode, lvlNameByCode, sysNameByCode],
  );

  const toHumanWork = useCallback(
    (raw: string | null | undefined): string => {
      const src = normalizeRuText(String(raw || "").trim());
      if (!src) return "—";
      return sysNameByCode.get(src) || src;
    },
    [sysNameByCode],
  );

  return { toHumanObject, toHumanWork };
}
