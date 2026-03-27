// src/screens/warehouse/warehouse.scope.ts
// Extract object/level/system/zone picking + scope label logic.
// No business-logic changes.

import { useCallback, useEffect, useMemo } from "react";
import type { Option } from "./warehouse.types";
import { useWarehouseUiStore } from "./warehouseUi.store";

export function useWarehouseScope() {
  const objectOpt = useWarehouseUiStore((state) => state.objectOpt);
  const setObjectOpt = useWarehouseUiStore((state) => state.setObjectOpt);
  const levelOpt = useWarehouseUiStore((state) => state.levelOpt);
  const setLevelOpt = useWarehouseUiStore((state) => state.setLevelOpt);
  const systemOpt = useWarehouseUiStore((state) => state.systemOpt);
  const setSystemOpt = useWarehouseUiStore((state) => state.setSystemOpt);
  const zoneOpt = useWarehouseUiStore((state) => state.zoneOpt);
  const setZoneOpt = useWarehouseUiStore((state) => state.setZoneOpt);
  const pickModal = useWarehouseUiStore((state) => state.pickModal);
  const setPickModal = useWarehouseUiStore((state) => state.setPickModal);
  const pickFilter = useWarehouseUiStore((state) => state.pickFilter);
  const setPickFilter = useWarehouseUiStore((state) => state.setPickFilter);

  const closePick = useCallback(() => {
    setPickModal({ what: null });
    setPickFilter("");
  }, [setPickFilter, setPickModal]);

  const applyPick = useCallback(
    (opt: Option) => {
      if (pickModal.what === "object") setObjectOpt(opt);
      if (pickModal.what === "level") setLevelOpt(opt);
      if (pickModal.what === "system") setSystemOpt(opt);
      if (pickModal.what === "zone") setZoneOpt(opt);
      closePick();
    },
    [closePick, pickModal.what, setLevelOpt, setObjectOpt, setSystemOpt, setZoneOpt],
  );

  // Reset cascade: object -> level -> system/zone
  useEffect(() => {
    if (!objectOpt?.id) {
      if (levelOpt) setLevelOpt(null);
      if (systemOpt) setSystemOpt(null);
      if (zoneOpt) setZoneOpt(null);
    }
  }, [levelOpt, objectOpt?.id, setLevelOpt, setSystemOpt, setZoneOpt, systemOpt, zoneOpt]);

  useEffect(() => {
    if (!levelOpt?.id) {
      if (systemOpt) setSystemOpt(null);
      if (zoneOpt) setZoneOpt(null);
    }
  }, [levelOpt?.id, setSystemOpt, setZoneOpt, systemOpt, zoneOpt]);

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
