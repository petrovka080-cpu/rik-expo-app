import { StyleSheet } from "react-native";

export const consumerRepairRequestScreenStyles = StyleSheet.create({
  screen: {
    backgroundColor: "#F8FAFC",
  },
  content: {
    gap: 14,
    paddingTop: 4,
  },
  lead: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 10,
  },
  label: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  chipTextSelected: {
    color: "#1D4ED8",
  },
  status: {
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    color: "#047857",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "900",
  },
});
