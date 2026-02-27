// src/screens/warehouse/warehouse.dicts.ts
// Extracts reference-data loading (objects, levels, systems, zones, recipients)
// from the main Warehouse component. Zero logic changes.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Option, Tab } from "./warehouse.types";
import { showErr } from "./warehouse.utils";

export function useWarehouseDicts(supabase: any, tab: Tab) {
    const [objectList, setObjectList] = useState<Option[]>([]);
    const [levelList, setLevelList] = useState<Option[]>([]);
    const [systemList, setSystemList] = useState<Option[]>([]);
    const [zoneList, setZoneList] = useState<Option[]>([]);
    const [recipientList, setRecipientList] = useState<Option[]>([]);

    const tryOptions = useCallback(async (table: string, columns: string[]) => {
        const colList = columns.join(",");
        const q = await supabase.from(table as any).select(colList).limit(1000);
        if (q.error || !Array.isArray(q.data)) return [] as Option[];
        const opts: Option[] = [];
        for (const r of q.data as any[]) {
            const id = String(r.id ?? r.uuid ?? "");
            const label = String(
                r.name ??
                r.title ??
                r.object_name ??
                r.fio ??
                r.full_name ??
                r.email ??
                r.username ??
                r.login ??
                "",
            );
            if (id && label) opts.push({ id, label });
        }
        return opts;
    }, [supabase]);

    const tryRefOptions = useCallback(
        async (table: string, opts?: { order?: string }) => {
            let q = supabase
                .from(table as any)
                .select("code,display_name,name_human_ru,name_ru,name")
                .limit(2000);

            if (opts?.order) {
                q = q.order(opts.order, { ascending: true }) as any;
            }

            const res = await q;

            if (res.error || !Array.isArray(res.data)) {
                console.log(`[${table}]error: `, res.error?.message);
                return [] as Option[];
            }

            const out: Option[] = [];
            for (const r of res.data as any[]) {
                const id = String(r.code ?? "").trim();
                const label = String(
                    r.display_name ??
                    r.name_human_ru ??
                    r.name_ru ??
                    r.name ??
                    r.code ??
                    "",
                ).trim();

                if (id && label) out.push({ id, label });
            }

            out.sort((a, b) => a.label.localeCompare(b.label, "ru"));
            return out;
        },
        [supabase],
    );

    const loadObjects = useCallback(async () => {
        const q = await supabase.from("ref_object_types" as any).select("code").limit(1);
        console.log(
            "[ref_object_types] err=",
            q.error?.message,
            "rows=",
            Array.isArray(q.data) ? q.data.length : "no-data",
        );

        const opts = await tryRefOptions("ref_object_types", { order: "name" as any });

        const cleaned = (opts || []).filter((o) => {
            const t = String(o.label ?? "").toLowerCase();
            const c = String(o.id ?? "").toLowerCase();
            if (t.includes("без объекта")) return false;
            if (c === "none" || c === "no_object" || c === "noobject") return false;
            return true;
        });

        setObjectList(cleaned);
    }, [supabase, tryRefOptions]);

    const loadRecipients = useCallback(async () => {
        const opts = await tryOptions("profiles", ["id", "full_name"]);
        setRecipientList(opts);
    }, [tryOptions]);

    const loadLevels = useCallback(async () => {
        setLevelList(await tryRefOptions("ref_levels"));
    }, [tryRefOptions]);

    const loadSystems = useCallback(async () => {
        setSystemList(await tryRefOptions("ref_systems"));
    }, [tryRefOptions]);

    const loadZones = useCallback(async () => {
        setZoneList(await tryRefOptions("ref_zones"));
    }, [tryRefOptions]);

    const dictsLoadedRef = useRef(false);

    useEffect(() => {
        if ((tab === "Расход" || tab === "Склад факт") && !dictsLoadedRef.current) {
            dictsLoadedRef.current = true;
            loadObjects().catch((e) => showErr(e));
            loadLevels().catch((e) => showErr(e));
            loadSystems().catch((e) => showErr(e));
            loadZones().catch((e) => showErr(e));
            loadRecipients().catch((e) => showErr(e));
        }
    }, [tab, loadObjects, loadLevels, loadSystems, loadZones, loadRecipients]);

    return {
        objectList,
        levelList,
        systemList,
        zoneList,
        recipientList,
    };
}
