import { esc, money } from "../../api/pdf_director.format.ts";
import { renderTitledBoxSection } from "../pdf.director.sections.ts";

export const formatMoney = (value: number) => esc(money(value));
export const formatMoneyKgs = (value: number) => `${formatMoney(value)} KGS`;

export const renderSignaturesSection = () =>
  renderTitledBoxSection(
    "Подписи",
    `<div>Директор: ____________________</div>
      <div style="margin-top:10px">Ответственный: ____________________</div>`,
  );
