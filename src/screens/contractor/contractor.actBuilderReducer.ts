import type { ActBuilderItem, ActBuilderWorkItem } from "./types";

export type ActBuilderState = {
  items: ActBuilderItem[];
  works: ActBuilderWorkItem[];
  expandedWorkId: string | null;
  expandedMatId: string | null;
};

export type ActBuilderAction =
  | { type: "SET_ALL"; payload: { items: ActBuilderItem[]; works: ActBuilderWorkItem[] } }
  | { type: "TOGGLE_WORK_INCLUDE"; payload: { index: number } }
  | { type: "SET_WORK_QTY"; payload: { index: number; qty: number } }
  | { type: "SET_WORK_UNIT"; payload: { index: number; unit: string } }
  | { type: "SET_WORK_PRICE"; payload: { index: number; price: number | null } }
  | { type: "TOGGLE_MAT_INCLUDE"; payload: { index: number } }
  | { type: "SET_MAT_QTY"; payload: { index: number; qty: number } }
  | { type: "SET_MAT_PRICE"; payload: { index: number; price: number | null } }
  | { type: "TOGGLE_EXPANDED_WORK"; payload: { id: string } }
  | { type: "TOGGLE_EXPANDED_MAT"; payload: { id: string } };

export const initialActBuilderState: ActBuilderState = {
  items: [],
  works: [],
  expandedWorkId: null,
  expandedMatId: null,
};

export function actBuilderReducer(state: ActBuilderState, action: ActBuilderAction): ActBuilderState {
  switch (action.type) {
    case "SET_ALL":
      return {
        ...state,
        items: action.payload.items,
        works: action.payload.works,
        expandedWorkId: null,
        expandedMatId: null,
      };
    case "TOGGLE_WORK_INCLUDE":
      return {
        ...state,
        works: state.works.map((item, i) =>
          i === action.payload.index ? { ...item, include: !item.include } : item
        ),
        expandedWorkId: null,
      };
    case "SET_WORK_QTY":
      return {
        ...state,
        works: state.works.map((item, i) =>
          i === action.payload.index ? { ...item, qty: action.payload.qty } : item
        ),
      };
    case "SET_WORK_UNIT":
      return {
        ...state,
        works: state.works.map((item, i) =>
          i === action.payload.index ? { ...item, unit: action.payload.unit } : item
        ),
      };
    case "SET_WORK_PRICE":
      return {
        ...state,
        works: state.works.map((item, i) =>
          i === action.payload.index ? { ...item, price: action.payload.price } : item
        ),
      };
    case "TOGGLE_MAT_INCLUDE":
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.payload.index ? { ...item, include: !item.include } : item
        ),
        expandedMatId: null,
      };
    case "SET_MAT_QTY":
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.payload.index ? { ...item, qty: action.payload.qty } : item
        ),
      };
    case "SET_MAT_PRICE":
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.payload.index ? { ...item, price: action.payload.price } : item
        ),
      };
    case "TOGGLE_EXPANDED_WORK":
      return {
        ...state,
        expandedWorkId: state.expandedWorkId === action.payload.id ? null : action.payload.id,
      };
    case "TOGGLE_EXPANDED_MAT":
      return {
        ...state,
        expandedMatId: state.expandedMatId === action.payload.id ? null : action.payload.id,
      };
    default:
      return state;
  }
}

