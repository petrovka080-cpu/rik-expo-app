import { useState } from "react";

import type { Attachment } from "../buyer.types";

export type BuyerAccountingSupplier = {
  name: string;
  inn?: string | null;
  bank?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function useBuyerAccountingSheetState() {
  const [acctProposalId, setAcctProposalId] = useState<string | number | null>(null);
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invCurrency, setInvCurrency] = useState("KGS");
  const [invFile, setInvFile] = useState<Attachment["file"] | null>(null);
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctSupp, setAcctSupp] = useState<BuyerAccountingSupplier | null>(null);
  const [propDocAttached, setPropDocAttached] = useState<{ name: string; url?: string } | null>(null);
  const [propDocBusy, setPropDocBusy] = useState(false);
  const [invoiceUploadedName, setInvoiceUploadedName] = useState("");

  return {
    acctProposalId,
    setAcctProposalId,
    invNumber,
    setInvNumber,
    invDate,
    setInvDate,
    invAmount,
    setInvAmount,
    invCurrency,
    setInvCurrency,
    invFile,
    setInvFile,
    acctBusy,
    setAcctBusy,
    acctSupp,
    setAcctSupp,
    propDocAttached,
    setPropDocAttached,
    propDocBusy,
    setPropDocBusy,
    invoiceUploadedName,
    setInvoiceUploadedName,
  };
}

export type BuyerAccountingSheetState = ReturnType<typeof useBuyerAccountingSheetState>;
