import React, { useCallback } from "react";
import { Pressable, View } from "react-native";
import type { WorkMaterialRow } from "../../../components/WorkMaterialsEditor";

type StageItem = { code: string; name: string };

export function useContractorWorkMaterialUi(params: {
  setWorkModalMaterials: React.Dispatch<React.SetStateAction<WorkMaterialRow[]>>;
  clearWorkSearchState: () => void;
  setWorkModalStage: React.Dispatch<React.SetStateAction<string>>;
  setWorkOverlayModal: React.Dispatch<React.SetStateAction<"none" | "contract" | "estimate" | "stage">>;
  styles: any;
  TextComponent: React.ComponentType<any>;
}) {
  const {
    setWorkModalMaterials,
    clearWorkSearchState,
    setWorkModalStage,
    setWorkOverlayModal,
    styles,
    TextComponent,
  } = params;

  const addWorkMaterial = useCallback(
    (item: WorkMaterialRow) => {
      setWorkModalMaterials((prev) => {
        const idx = prev.findIndex((m) => m.mat_code === item.mat_code);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            name: item.name,
            uom: item.uom,
            available: item.available,
          };
          return copy;
        }
        return [...prev, item];
      });

      clearWorkSearchState();
    },
    [setWorkModalMaterials, clearWorkSearchState],
  );

  const renderWorkSearchItem = useCallback(
    ({ item }: { item: WorkMaterialRow }) => {
      const hasStock = (item.available || 0) > 0;
      return (
        <Pressable
          onPress={() => addWorkMaterial(item as WorkMaterialRow)}
          style={styles.searchItemRow}
        >
          <View style={styles.flex1}>
            <TextComponent style={styles.searchItemName} numberOfLines={2}>
              {item.name}
            </TextComponent>
            <TextComponent style={styles.searchItemUom}>{item.uom || "ед."}</TextComponent>
          </View>
          <TextComponent style={[styles.searchItemStockText, { color: hasStock ? "#166534" : "#6b7280" }]}>
            {hasStock ? `В наличии: ${item.available}` : "Нет в наличии"}
          </TextComponent>
        </Pressable>
      );
    },
    [addWorkMaterial, styles, TextComponent],
  );

  const renderWorkStageItem = useCallback(
    ({ item }: { item: StageItem }) => (
      <Pressable
        onPress={() => {
          setWorkModalStage(item.name);
          setWorkOverlayModal("none");
        }}
        style={styles.stageItemRow}
      >
        <TextComponent style={styles.stageItemName}>{item.name}</TextComponent>
        <TextComponent style={styles.stageItemCode}>{item.code}</TextComponent>
      </Pressable>
    ),
    [setWorkModalStage, setWorkOverlayModal, styles, TextComponent],
  );

  return { addWorkMaterial, renderWorkSearchItem, renderWorkStageItem };
}
