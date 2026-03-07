import { useCallback, useMemo } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function useWarehouseReportActions(params: {
  isWeb: boolean;
  onListScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  setReportsMode: React.Dispatch<React.SetStateAction<"choice" | "issue" | "incoming">>;
  onPdfRegister: () => void | Promise<void>;
  onPdfDocument: (id: string | number) => void | Promise<void>;
  onPdfMaterials: () => void | Promise<void>;
  onPdfObjectWork: () => void | Promise<void>;
  onPdfDayRegister: (day: string) => void | Promise<void>;
  onPdfDayMaterials: (day: string) => void | Promise<void>;
}) {
  const {
    isWeb,
    onListScroll,
    setReportsMode,
    onPdfRegister,
    onPdfDocument,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDayRegister,
    onPdfDayMaterials,
  } = params;

  const onReportsBack = useCallback(() => {
    setReportsMode("choice");
  }, [setReportsMode]);

  const onReportsSelectMode = useCallback((m: "choice" | "issue" | "incoming") => {
    setReportsMode(m);
  }, [setReportsMode]);

  const onPdfRegisterPress = useCallback(() => {
    void onPdfRegister();
  }, [onPdfRegister]);

  const onPdfDocumentPress = useCallback((id: string | number) => {
    void onPdfDocument(id);
  }, [onPdfDocument]);

  const onPdfMaterialsPress = useCallback(() => {
    void onPdfMaterials();
  }, [onPdfMaterials]);

  const onPdfObjectWorkPress = useCallback(() => {
    void onPdfObjectWork();
  }, [onPdfObjectWork]);

  const onPdfDayRegisterPress = useCallback((day: string) => {
    void onPdfDayRegister(day);
  }, [onPdfDayRegister]);

  const onPdfDayMaterialsPress = useCallback((day: string) => {
    void onPdfDayMaterials(day);
  }, [onPdfDayMaterials]);

  const reportsOnScroll = useMemo(
    () => (isWeb ? undefined : onListScroll),
    [isWeb, onListScroll],
  );
  const reportsScrollEventThrottle = useMemo(
    () => (isWeb ? undefined : 16),
    [isWeb],
  );

  return {
    onReportsBack,
    onReportsSelectMode,
    onPdfRegisterPress,
    onPdfDocumentPress,
    onPdfMaterialsPress,
    onPdfObjectWorkPress,
    onPdfDayRegisterPress,
    onPdfDayMaterialsPress,
    reportsOnScroll,
    reportsScrollEventThrottle,
  };
}

