import fs from "fs";
import path from "path";
import type { SetStateAction } from "react";

import type { AccountantUiStore } from "./accountantUi.store";
import { selectAccountantScreenViewModel } from "./useAccountantScreenViewModel";
import { TABS, type Tab } from "./types";

const readAccountantFile = (fileName: string): string =>
  fs.readFileSync(path.join(__dirname, fileName), "utf8");

const setTab = (_value: SetStateAction<Tab>) => undefined;
const setString = (_value: SetStateAction<string>) => undefined;
const setBoolean = (_value: SetStateAction<boolean>) => undefined;
const setPaymentId = (_value: SetStateAction<number | null>) => undefined;

describe("useAccountantScreenViewModel", () => {
  it("maps the stable accountant UI store selectors without changing values or setters", () => {
    const state: AccountantUiStore = {
      tab: TABS[2],
      histSearchUi: "paid",
      dateFrom: "2026-05-01",
      dateTo: "2026-05-07",
      periodOpen: true,
      cardOpen: true,
      freezeWhileOpen: true,
      currentPaymentId: 42,
      accountantFio: "Accountant",
      setTab,
      setHistSearchUi: setString,
      setDateFrom: setString,
      setDateTo: setString,
      setPeriodOpen: setBoolean,
      setCardOpen: setBoolean,
      setFreezeWhileOpen: setBoolean,
      setCurrentPaymentId: setPaymentId,
      setAccountantFio: setString,
    };

    expect(selectAccountantScreenViewModel(state)).toEqual({
      tab: TABS[2],
      histSearchUi: "paid",
      dateFrom: "2026-05-01",
      dateTo: "2026-05-07",
      periodOpen: true,
      cardOpen: true,
      freezeWhileOpen: true,
      currentPaymentId: 42,
      accountantFio: "Accountant",
      setTab,
      setHistSearchUi: setString,
      setDateFrom: setString,
      setDateTo: setString,
      setPeriodOpen: setBoolean,
      setCardOpen: setBoolean,
      setFreezeWhileOpen: setBoolean,
      setCurrentPaymentId: setPaymentId,
      setAccountantFio: setString,
    });
  });

  it("keeps AccountantScreen selector pressure behind one typed view-model hook", () => {
    const screenSource = readAccountantFile("AccountantScreen.tsx");
    const compositionSource = readAccountantFile("useAccountantScreenComposition.tsx");
    const viewModelSource = readAccountantFile("useAccountantScreenViewModel.ts");
    const screenHookCalls = screenSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g) ?? [];

    expect(screenSource).toContain('import { useAccountantScreenComposition } from "./useAccountantScreenComposition";');
    expect(compositionSource).toContain('import { useAccountantScreenViewModel } from "./useAccountantScreenViewModel";');
    expect(screenSource).not.toContain("useAccountantUiStore(");
    expect(compositionSource).toContain("} = useAccountantScreenViewModel();");
    expect(screenHookCalls).toEqual(["useAccountantScreenComposition("]);

    expect(viewModelSource).toContain("export type AccountantScreenViewModel");
    expect(viewModelSource).toContain("selectAccountantScreenViewModel");
    expect(viewModelSource).toContain("useShallow(selectAccountantScreenViewModel)");
    expect(viewModelSource.match(/useAccountantUiStore\(/g) ?? []).toHaveLength(1);
  });
});
