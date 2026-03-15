import { useEffect, useState } from "react";
import type { AppOption, RefOption } from "./foreman.types";
import {
  peekForemanAppOptions,
  peekForemanDictsSnapshot,
  readForemanAppOptions,
  readForemanDictsSnapshot,
} from "./foreman.dicts.repo";

const warnForemanDicts = (scope: "refs load failed" | "app load failed", error: unknown) => {
  if (__DEV__) {
    console.warn(`[foreman.dicts] ${scope}`, error);
  }
};

export function useForemanDicts() {
  const initialSnapshot = peekForemanDictsSnapshot();
  const initialAppOptions = peekForemanAppOptions();

  const [objOptions, setObjOptions] = useState<RefOption[]>(initialSnapshot?.objOptions ?? []);
  const [lvlOptions, setLvlOptions] = useState<RefOption[]>(initialSnapshot?.lvlOptions ?? []);
  const [sysOptions, setSysOptions] = useState<RefOption[]>(initialSnapshot?.sysOptions ?? []);
  const [zoneOptions, setZoneOptions] = useState<RefOption[]>(initialSnapshot?.zoneOptions ?? []);
  const [objAllOptions, setObjAllOptions] = useState<RefOption[]>(initialSnapshot?.objAllOptions ?? []);
  const [lvlAllOptions, setLvlAllOptions] = useState<RefOption[]>(initialSnapshot?.lvlAllOptions ?? []);
  const [sysAllOptions, setSysAllOptions] = useState<RefOption[]>(initialSnapshot?.sysAllOptions ?? []);
  const [zoneAllOptions, setZoneAllOptions] = useState<RefOption[]>(initialSnapshot?.zoneAllOptions ?? []);
  const [appOptions, setAppOptions] = useState<AppOption[]>(initialAppOptions ?? []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await readForemanDictsSnapshot();
        if (cancelled) return;
        setObjAllOptions(snapshot.objAllOptions);
        setObjOptions(snapshot.objOptions);
        setLvlAllOptions(snapshot.lvlAllOptions);
        setLvlOptions(snapshot.lvlOptions);
        setSysAllOptions(snapshot.sysAllOptions);
        setSysOptions(snapshot.sysOptions);
        setZoneAllOptions(snapshot.zoneAllOptions);
        setZoneOptions(snapshot.zoneOptions);
      } catch (e) {
        warnForemanDicts("refs load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const options = await readForemanAppOptions();
        if (!cancelled) setAppOptions(options);
      } catch (e) {
        warnForemanDicts("app load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    objOptions,
    lvlOptions,
    sysOptions,
    zoneOptions,
    objAllOptions,
    lvlAllOptions,
    sysAllOptions,
    zoneAllOptions,
    appOptions,
  };
}
