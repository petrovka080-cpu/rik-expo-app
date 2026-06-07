import type {
  ConsumerRequestValidationErrorItem,
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "../../lib/consumerRequests";
import type { GlobalSelectedWorkBinding } from "../../lib/ai/globalEstimate";

export type ConsumerRepairRequestScreenState = {
  problemText: string;
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  bundle: ConsumerRepairDraftBundle | null;
  history: ConsumerRepairDraftBundle[];
  aiAnswerRu: string | null;
  statusMessage: string | null;
  validationErrors: ConsumerRequestValidationErrorItem[];
  catalogPickerVisible: boolean;
  catalogPickerTargetItemId: string | null;
  catalogPickerInitialQuery: string | undefined;
  lastRemovedItem: ConsumerRepairRequestItem | null;
  selectedWork: GlobalSelectedWorkBinding | null;
};

export function buildInitialConsumerRepairRequestState(params: {
  initialProblemText?: string;
  history: ConsumerRepairDraftBundle[];
}): ConsumerRepairRequestScreenState {
  return {
    problemText: params.initialProblemText?.trim() || "",
    repairType: "Р РµРјРѕРЅС‚",
    city: "",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    bundle: null,
    history: params.history,
    aiAnswerRu: null,
    statusMessage: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    selectedWork: null,
  };
}

export function buildDeletedConsumerRepairDraftState(
  statusMessage: string,
): Pick<
  ConsumerRepairRequestScreenState,
  | "bundle"
  | "aiAnswerRu"
  | "validationErrors"
  | "catalogPickerVisible"
  | "catalogPickerTargetItemId"
  | "catalogPickerInitialQuery"
  | "lastRemovedItem"
  | "selectedWork"
  | "statusMessage"
> {
  return {
    bundle: null,
    aiAnswerRu: null,
    validationErrors: [],
    catalogPickerVisible: false,
    catalogPickerTargetItemId: null,
    catalogPickerInitialQuery: undefined,
    lastRemovedItem: null,
    selectedWork: null,
    statusMessage,
  };
}

export function buildNewConsumerRepairRequestState(statusMessage: string): ConsumerRepairRequestScreenState {
  return {
    ...buildInitialConsumerRepairRequestState({ history: [] }),
    statusMessage,
  };
}
