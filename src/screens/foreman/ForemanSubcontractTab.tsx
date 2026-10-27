import { useForemanSubcontractController, type ForemanSubcontractTabProps } from "./hooks/useForemanSubcontractController";

export type Props = ForemanSubcontractTabProps;

export default function ForemanSubcontractTab(props: Props) {
  return useForemanSubcontractController(props);
}
