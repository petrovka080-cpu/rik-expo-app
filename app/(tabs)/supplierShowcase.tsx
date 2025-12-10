// app/(tabs)/supplierShowcase.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput as RNTextInput,
} from "react-native";

const UI = {
  bg: "#F8FAFC",
  text: "#0F172A",
  sub: "#6B7280",
  border: "#E5E7EB",
  card: "#FFFFFF",
  accent: "#0EA5E9",
  danger: "#EF4444",
};

type CartItem = {
  id: string;
  name: string;
  qty: number;
  uom: string;
  price: number;
};

const SupplierShowcaseScreen: React.FC = () => {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftUom, setDraftUom] = useState("шт");
  const [draftPrice, setDraftPrice] = useState("");

  const openAddModal = () => {
    if (!query.trim()) return;
    setDraftName(query.trim());
    setDraftQty("1");
    setDraftUom("шт");
    setDraftPrice("");
    setModalVisible(true);
  };

  const addToCart = () => {
    const name = draftName.trim();
    if (!name) return;

    const qty = parseFloat(draftQty.replace(",", ".")) || 0;
    const price = parseFloat(draftPrice.replace(",", ".")) || 0;
    const uom = draftUom.trim() || "шт";

    const item: CartItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      qty,
      uom,
      price,
    };

    setCart((prev) => [...prev, item]);
    setModalVisible(false);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((x) => x.id !== id));
  };

  const totalSum = cart.reduce((acc, it) => acc + it.qty * it.price, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Объявление поставщика</Text>
        <Text style={styles.subTitle}>
          Подготовь корзину позиций, которые хочешь разместить в объявлении.
        </Text>

        {/* Поле поиска / ввода позиции */}
        <View style={styles.searchCard}>
          <Text style={styles.label}>Позиция товара или услуги</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Например: Щебень 5–20, Бетон М200, Укладка плитки…"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />

          <Pressable
            style={[
              styles.addBtn,
              !query.trim() && { opacity: 0.6 },
            ]}
            onPress={openAddModal}
            disabled={!query.trim()}
          >
            <Text style={styles.addBtnText}>Добавить позицию</Text>
          </Pressable>

          <Text style={styles.helperText}>
            Когда будешь печатать название, ты сразу можешь добавить цену и
            кол-во через модалку. Позже сюда можно будет прикрутить поиск по
            RIK-каталогу.
          </Text>
        </View>

        {/* Корзина */}
        <View style={styles.cartCard}>
          <View style={styles.cartHeaderRow}>
            <Text style={styles.cartTitle}>Корзина позиций</Text>
            <Text style={styles.cartCount}>{cart.length}</Text>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Корзина пустая</Text>
              <Text style={styles.emptyText}>
                Добавь первую позицию через поле ввода выше — появится модалка,
                где можно указать цену и количество.
              </Text>
            </View>
          ) : (
            <>
              {cart.map((item) => {
                const sum = item.qty * item.price;
                return (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemSub}>
                        {item.qty} {item.uom} × {item.price.toLocaleString()} c
                      </Text>
                      <Text style={styles.itemSum}>
                        Сумма: {sum.toLocaleString()} c
                      </Text>
                    </View>
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Итого по корзине:</Text>
                <Text style={styles.totalValue}>
                  {totalSum.toLocaleString()} c
                </Text>
              </View>

              <Pressable style={styles.publishBtn}>
                <Text style={styles.publishBtnText}>Подать объявление</Text>
              </Pressable>
              <Text style={styles.publishHint}>
                Кнопка пока работает локально, позже привяжем к Supabase /
                API, чтобы объявление улетало в общую витрину.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Модалка добавления позиции */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новая позиция</Text>
            <Text style={styles.modalSub}>
              Укажи цену и количество для позиции объявления.
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Название</Text>
              <RNTextInput
                style={styles.modalInput}
                value={draftName}
                onChangeText={setDraftName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>Кол-во</Text>
                <RNTextInput
                  style={styles.modalInput}
                  keyboardType="decimal-pad"
                  value={draftQty}
                  onChangeText={setDraftQty}
                />
              </View>
              <View style={[styles.col, { flexBasis: 80 }]}>
                <Text style={styles.label}>Ед. изм.</Text>
                <RNTextInput
                  style={styles.modalInput}
                  value={draftUom}
                  onChangeText={setDraftUom}
                />
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Цена за единицу, c</Text>
              <RNTextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={draftPrice}
                onChangeText={setDraftPrice}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnGhostText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={addToCart}
              >
                <Text style={styles.modalBtnPrimaryText}>Сохранить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SupplierShowcaseScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.text,
  },
  subTitle: {
    fontSize: 13,
    color: UI.sub,
    marginTop: 4,
    marginBottom: 12,
  },
  searchCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 16,
  },
  cartCard: {
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 4,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: UI.text,
  },
  addBtn: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: UI.accent,
    paddingVertical: 9,
    alignItems: "center",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  helperText: {
    marginTop: 8,
    fontSize: 11,
    color: UI.sub,
  },
  cartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.text,
  },
  cartCount: {
    fontSize: 13,
    color: UI.sub,
  },
  emptyBox: {
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: UI.sub,
  },
  cartItem: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
  },
  itemSub: {
    fontSize: 12,
    color: UI.sub,
    marginTop: 2,
  },
  itemSum: {
    fontSize: 12,
    color: UI.text,
    marginTop: 2,
    fontWeight: "500",
  },
  removeBtn: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: UI.danger,
    fontSize: 15,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: UI.sub,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
  },
  publishBtn: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: UI.accent,
    paddingVertical: 10,
    alignItems: "center",
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  publishHint: {
    marginTop: 6,
    fontSize: 11,
    color: UI.sub,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.75)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0B1120",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  modalSub: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB",
    backgroundColor: "#020617",
    fontSize: 14,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    marginTop: 10,
  },
  col: {
    marginRight: 8,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    gap: 8,
  },
  modalBtn: {
    minWidth: 90,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  modalBtnGhostText: {
    color: "#E5E7EB",
  },
  modalBtnPrimary: {
    backgroundColor: UI.accent,
  },
  modalBtnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
