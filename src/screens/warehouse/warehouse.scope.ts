// src/screens/warehouse/warehouse.scope.ts
// Extract object/level/system/zone picking + scope label logic.
// No business-logic changes.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Option } from "./warehouse.types";

export function useWarehouseScope() {
  const [objectOpt, setObjectOpt] = useState<Option | null>(null);
  const [levelOpt, setLevelOpt] = useState<Option | null>(null);
  const [systemOpt, setSystemOpt] = useState<Option | null>(null);
  const [zoneOpt, setZoneOpt] = useState<Option | null>(null);

  const [pickModal, setPickModal] = useState<{
    what: "object" | "level" | "system" | "zone" | "recipient" | null;
  }>({ what: null });

  const [pickFilter, setPickFilter] = useState("");

  const closePick = useCallback(() => {
    setPickModal({ what: null });
    setPickFilter("");
  }, []);

  const applyPick = useCallback(
    (opt: Option) => {
      if (pickModal.what === "object") setObjectOpt(opt);
      if (pickModal.what === "level") setLevelOpt(opt);
      if (pickModal.what === "system") setSystemOpt(opt);
      if (pickModal.what === "zone") setZoneOpt(opt);
      closePick();
    },
    [pickModal.what, closePick],
  );

  // Reset cascade: object -> level -> system/zone
  useEffect(() => {
    if (!objectOpt?.id) {
      if (levelOpt) setLevelOpt(null);
      if (systemOpt) setSystemOpt(null);
      if (zoneOpt) setZoneOpt(null);
    }
  }, [objectOpt?.id, levelOpt, systemOpt, zoneOpt]);

  useEffect(() => {
    if (!levelOpt?.id) {
      if (systemOpt) setSystemOpt(null);
      if (zoneOpt) setZoneOpt(null);
    }
  }, [levelOpt?.id, systemOpt, zoneOpt]);

  const scopeLabel = useMemo(() => {
    const lvl = String(levelOpt?.label ?? "").trim();
    const sys = String(systemOpt?.label ?? "").trim();
    const zn = String(zoneOpt?.label ?? "").trim();

    const parts: string[] = [];
    if (lvl) parts.push(`Этаж: ${lvl}`);
    if (sys) parts.push(`Система: ${sys}`);
    if (zn) parts.push(`Зона: ${zn}`);

    return parts.join(" · ");
  }, [levelOpt?.label, systemOpt?.label, zoneOpt?.label]);

  const scopeOpt = useMemo<Option | null>(() => {
    if (!levelOpt?.id) return null;
    return { id: String(levelOpt.id), label: scopeLabel || String(levelOpt.label ?? "") };
  }, [levelOpt, scopeLabel]);

  return {
    objectOpt,
    setObjectOpt,
    levelOpt,
    setLevelOpt,
    systemOpt,
    setSystemOpt,
    zoneOpt,
    setZoneOpt,
    scopeLabel,
    scopeOpt,

    pickModal,
    setPickModal,
    pickFilter,
    setPickFilter,
    closePick,
    applyPick,
  };
}

