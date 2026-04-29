import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  type KeyboardEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../../src/lib/supabaseClient";
import { redactSensitiveValue } from "../../../src/lib/security/redaction";
import CalcModalContent from "./CalcModalContent";
import type { BasisKey, Field } from "./useCalcFields";
import { useCalcFields } from "./useCalcFields";
import {
  buildCalcPayload,
  EMPTY_CALC_MODAL_FORM_STATE,
  incrementCalcRowQty,
  normalizeCalcRows,
  removeCalcRow,
  setCalcRowQty,
  type CalcModalRow,
} from "./calcModal.model";
import { formatCalcNumber } from "./calcModal.normalize";
import { deriveCalcModalViewState } from "./calcModal.state";
import {
  deriveLossState,
  getCalcParseKeys,
  normalizeLossInputOnBlur,
  parseCalcFields,
  synchronizeCalcModalFields,
} from "./calcModal.validation";

type Props = {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  workType?: { code: string; name: string } | null;
  onAddToRequest?: (rows: CalcModalRow[]) => void;
};

const summarizeCalcModalPayloadForLog = (payload: Record<string, unknown>) => ({
  payloadKeyCount: Object.keys(payload).length,
  payloadKeys: Object.keys(payload).sort(),
});

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      const keyboardHeight = Number(event?.endCoordinates?.height ?? 0);
      setHeight(keyboardHeight > 0 ? keyboardHeight : 0);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return height;
}

export default function CalcModal({ visible, onClose, onBack, workType, onAddToRequest }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const { loading: loadingFields, fields, error: fieldsError } = useCalcFields(workType?.code);

  const toastY = useRef(new Animated.Value(-8)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formState, setFormState] = useState(EMPTY_CALC_MODAL_FORM_STATE);
  const [lossPct, setLossPct] = useState("");
  const [lossTouched, setLossTouched] = useState(false);
  const [filmTouched, setFilmTouched] = useState(false);
  const [manualKeys, setManualKeys] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<CalcModalRow[] | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [addingToRequest, setAddingToRequest] = useState(false);
  const [showSecondaryFields, setShowSecondaryFields] = useState(false);
  const [fieldsCollapsed, setFieldsCollapsed] = useState(false);

  const fieldMap = useMemo(() => {
    const map = new Map<BasisKey, Field>();
    for (const field of fields) {
      map.set(field.key, field);
    }
    return map;
  }, [fields]);

  const lossState = useMemo(() => deriveLossState(lossPct), [lossPct]);

  const viewState = useMemo(
    () =>
      deriveCalcModalViewState({
        workTypeCode: workType?.code,
        fields,
        loadingFields,
        calculating,
        addingToRequest,
        inputs: formState.inputs,
        measures: formState.measures,
        rows,
        lossPct,
        lossTouched,
        lossState,
      }),
    [
      workType?.code,
      fields,
      loadingFields,
      calculating,
      addingToRequest,
      formState.inputs,
      formState.measures,
      rows,
      lossPct,
      lossTouched,
      lossState,
    ],
  );

  const showToastHint = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastY.setValue(-8);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(toastY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: -8, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 2000);
  }, [toastOpacity, toastY]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    showToastHint();
  }, [visible, workType?.code, showToastHint]);

  useEffect(() => {
    setFieldsCollapsed(Boolean(rows));
  }, [rows]);

  useEffect(() => {
    if (visible) {
      return;
    }

    setRows(null);
    setFormState(EMPTY_CALC_MODAL_FORM_STATE);
    setLossPct("");
    setLossTouched(false);
    setFilmTouched(false);
    setManualKeys(new Set());
    setCalculating(false);
    setAddingToRequest(false);
    setShowSecondaryFields(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setRows(null);
    setFormState(EMPTY_CALC_MODAL_FORM_STATE);
    setLossPct("");
    setLossTouched(false);
    setFilmTouched(false);
    setManualKeys(new Set());
    setShowSecondaryFields(false);
  }, [workType?.code, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setFormState((previous) =>
      synchronizeCalcModalFields({
        fields,
        inputs: previous.inputs,
        measures: previous.measures,
        errors: previous.errors,
        autoRuleContext: {
          workTypeCode: workType?.code,
          filmTouched,
          manualKeys,
        },
      }),
    );
  }, [visible, fields, workType?.code, filmTouched, manualKeys]);

  const runParse = useCallback(
    (keys: BasisKey[], showErrors = false) => {
      const parsed = parseCalcFields({
        keys,
        inputs: formState.inputs,
        measures: formState.measures,
        errors: formState.errors,
        fieldMap,
        autoRuleContext: {
          workTypeCode: workType?.code,
          filmTouched,
          manualKeys,
        },
        showErrors,
      });

      setFormState({
        inputs: parsed.inputs,
        measures: parsed.measures,
        errors: parsed.errors,
      });

      return parsed;
    },
    [fieldMap, filmTouched, formState.errors, formState.inputs, formState.measures, manualKeys, workType?.code],
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    onBack?.();
  }, [onBack]);

  const handleInputChange = useCallback(
    (key: BasisKey, value: string) => {
      if (workType?.code === "ind_concrete" && key === "film_m2") {
        setFilmTouched(true);
      }

      if (key === "area_m2" || key === "perimeter_m") {
        setManualKeys((previous) => {
          const next = new Set(previous);
          const trimmed = String(value ?? "").trim();
          if (trimmed) {
            next.add(String(key));
          } else {
            next.delete(String(key));
          }
          return next;
        });
      }

      setFormState((previous) => {
        const nextErrors = { ...previous.errors };
        delete nextErrors[key];
        return {
          inputs: { ...previous.inputs, [key]: value },
          measures: previous.measures,
          errors: nextErrors,
        };
      });
    },
    [workType?.code],
  );

  const handleInputBlur = useCallback((key: BasisKey) => {
    runParse([key], true);
  }, [runParse]);

  const handleInputFocus = useCallback(() => {
    if (rows) {
      setFieldsCollapsed(false);
    }
  }, [rows]);

  const handleLossChange = useCallback((value: string) => {
    setLossPct(value);
    setLossTouched(false);
  }, []);

  const handleLossBlur = useCallback(() => {
    setLossTouched(true);
    setLossPct((previous) => normalizeLossInputOnBlur(previous, deriveLossState(previous)));
  }, []);

  const handleDecreaseRow = useCallback((rowKey: string) => {
    setRows((previous) => incrementCalcRowQty(previous, rowKey, -1));
  }, []);

  const handleIncreaseRow = useCallback((rowKey: string) => {
    setRows((previous) => incrementCalcRowQty(previous, rowKey, 1));
  }, []);

  const handleSetRowQty = useCallback((rowKey: string, value: string) => {
    setRows((previous) => setCalcRowQty(previous, rowKey, value));
  }, []);

  const handleRemoveRow = useCallback((rowKey: string) => {
    setRows((previous) => removeCalcRow(previous, rowKey));
  }, []);

  const handleToggleFieldsCollapsed = useCallback(() => {
    Keyboard.dismiss();
    setFieldsCollapsed((previous) => {
      const next = !previous;
      if (previous) {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
      }
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!rows) {
      return;
    }

    try {
      setAddingToRequest(true);
      await Promise.resolve(onAddToRequest?.(rows));
    } finally {
      setAddingToRequest(false);
    }
  }, [onAddToRequest, rows]);

  const calc = useCallback(async () => {
    if (!workType?.code) {
      return;
    }

    if (fields.length === 0) {
      Alert.alert("Нет полей", "Для этого вида работ не настроены поля ввода.");
      return;
    }

    if (!viewState.canCalculate) {
      runParse(viewState.requiredKeys, true);
      setLossTouched(true);
      return;
    }

    const parseKeys = getCalcParseKeys({
      fields,
      inputs: formState.inputs,
      showSecondaryFields,
    });
    const parseResult = runParse(parseKeys, true);

    setLossTouched(true);
    if (lossState.lossInvalid || !parseResult.valid) {
      return;
    }

    if (lossPct.trim()) {
      setLossPct(formatCalcNumber(lossState.lossValue));
    }

    try {
      Keyboard.dismiss();
      setCalculating(true);
      setRows(null);

      const payload = buildCalcPayload(fields, parseResult.measures, lossState.lossValue);
      const { data, error } = await supabase.rpc("rpc_calc_work_kit", {
        p_work_type_code: workType.code,
        p_inputs: payload,
      });

      if (error) {
        if (__DEV__) {
          console.error("[CalcModal][rpc_calc_work_kit]", {
            payload: summarizeCalcModalPayloadForLog(payload),
            error: redactSensitiveValue(error),
          });
        }
        throw error;
      }

      setRows(normalizeCalcRows(data));
    } catch (error) {
      if (__DEV__) {
        console.error("[CalcModal]", redactSensitiveValue(error));
      }
      Alert.alert("Ошибка", "Не удалось выполнить расчет. Проверьте параметры и попробуйте еще раз.");
      setRows(null);
    } finally {
      setCalculating(false);
    }
  }, [
    fields,
    formState.inputs,
    lossPct,
    lossState.lossInvalid,
    lossState.lossValue,
    runParse,
    showSecondaryFields,
    viewState.canCalculate,
    viewState.requiredKeys,
    workType?.code,
  ]);

  const keyboardEffectiveHeight = Math.max(0, keyboardHeight - insets.bottom);
  const footerPaddingBottom = insets.bottom + 12;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <CalcModalContent
        insets={insets}
        toastOpacity={toastOpacity}
        toastTranslateY={toastY}
        scrollRef={scrollRef}
        keyboardEffectiveHeight={keyboardEffectiveHeight}
        footerPaddingBottom={footerPaddingBottom}
        visibleWorkTypeLabel={workType?.name ?? workType?.code ?? "Вид работ"}
        onBack={onBack ? handleBack : undefined}
        onClose={handleClose}
        fieldsCollapsed={fieldsCollapsed}
        loadingFields={loadingFields}
        fieldsError={fieldsError}
        coreFields={viewState.coreFields}
        additionalFields={viewState.additionalFields}
        derivedFields={viewState.derivedFields}
        showSecondaryFields={showSecondaryFields}
        hasMultiplierField={viewState.hasMultiplierField}
        hasWastePctField={viewState.hasWastePctField}
        lossPct={lossPct}
        lossError={viewState.lossError}
        multiplier={viewState.multiplier}
        inputs={formState.inputs}
        errors={formState.errors}
        rows={rows}
        calculating={calculating}
        addingToRequest={addingToRequest}
        canCalculate={viewState.canCalculate}
        canSend={viewState.canSend}
        onInputChange={handleInputChange}
        onInputBlur={handleInputBlur}
        onInputFocus={handleInputFocus}
        onLossChange={handleLossChange}
        onLossBlur={handleLossBlur}
        onToggleSecondaryFields={() => setShowSecondaryFields((previous) => !previous)}
        onToggleFieldsCollapsed={handleToggleFieldsCollapsed}
        onCalculate={calc}
        onSend={handleSend}
        onDecreaseRow={handleDecreaseRow}
        onIncreaseRow={handleIncreaseRow}
        onSetRowQty={handleSetRowQty}
        onRemoveRow={handleRemoveRow}
      />
    </Modal>
  );
}
