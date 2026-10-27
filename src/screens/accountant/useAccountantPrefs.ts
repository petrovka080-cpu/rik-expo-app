import { useEffect } from "react";
import {
  crossStorageGet,
  crossStorageSet,
  migrateCrossStorageKeysOnce,
} from "../../lib/crossStorage";

type Params = {
  accountantFio: string;
  bankName: string;
  bik: string;
  rs: string;
  inn: string;
  kpp: string;
  setAccountantFio: (v: string) => void;
  setHistSearchUi: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setBankName: (v: string) => void;
  setBik: (v: string) => void;
  setRs: (v: string) => void;
  setInn: (v: string) => void;
  setKpp: (v: string) => void;
};

export function useAccountantPrefs({
  accountantFio,
  bankName,
  bik,
  rs,
  inn,
  kpp,
  setAccountantFio,
  setHistSearchUi,
  setDateFrom,
  setDateTo,
  setBankName,
  setBik,
  setRs,
  setInn,
  setKpp,
}: Params) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateCrossStorageKeysOnce({
        markerKey: "acc_storage_migrated_v1",
        pairs: [
          { from: "accountant_fio", to: "acc_fio" },
          { from: "accountant_hist_search", to: "acc_hist_search" },
          { from: "accountant_hist_date_from", to: "acc_hist_date_from" },
          { from: "accountant_hist_date_to", to: "acc_hist_date_to" },
        ],
      });

      const saved = (await crossStorageGet("acc_fio")) || "";
      if (!cancelled && saved.trim()) setAccountantFio(saved.trim());
    })();
    return () => {
      cancelled = true;
    };
  }, [setAccountantFio]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = String((await crossStorageGet("acc_hist_search")) || "");
      const df = String((await crossStorageGet("acc_hist_date_from")) || "");
      const dt = String((await crossStorageGet("acc_hist_date_to")) || "");

      if (cancelled) return;
      if (q) setHistSearchUi(q);
      if (df) setDateFrom(df);
      if (dt) setDateTo(dt);
    })();
    return () => {
      cancelled = true;
    };
  }, [setDateFrom, setDateTo, setHistSearchUi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = (await crossStorageGet("acc_bankName")) || "";
      const bik0 = (await crossStorageGet("acc_bik")) || "";
      const rs0 = (await crossStorageGet("acc_rs")) || "";
      const inn0 = (await crossStorageGet("acc_inn")) || "";
      const kpp0 = (await crossStorageGet("acc_kpp")) || "";

      if (cancelled) return;
      if (b) setBankName(b);
      if (bik0) setBik(bik0);
      if (rs0) setRs(rs0);
      if (inn0) setInn(inn0);
      if (kpp0) setKpp(kpp0);
    })();
    return () => {
      cancelled = true;
    };
  }, [setBankName, setBik, setInn, setKpp, setRs]);

  useEffect(() => {
    const v = (accountantFio || "").trim();
    if (!v) return;
    void crossStorageSet("acc_fio", v);
  }, [accountantFio]);

  useEffect(() => {
    void crossStorageSet("acc_bankName", String(bankName || ""));
    void crossStorageSet("acc_bik", String(bik || ""));
    void crossStorageSet("acc_rs", String(rs || ""));
    void crossStorageSet("acc_inn", String(inn || ""));
    void crossStorageSet("acc_kpp", String(kpp || ""));
  }, [bankName, bik, rs, inn, kpp]);
}

