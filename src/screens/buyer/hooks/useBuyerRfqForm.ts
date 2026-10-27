import { useRef, useState } from "react";

export function useBuyerRfqForm() {
  const [rfqBusy, setRfqBusy] = useState(false);

  const [rfqDeadlineIso, setRfqDeadlineIso] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString();
  });

  const [rfqDeliveryDays, setRfqDeliveryDays] = useState("2");

  const [rfqPhone, setRfqPhone] = useState("");
  const [rfqCountryCode, setRfqCountryCode] = useState("+996");
  const [rfqEmail, setRfqEmail] = useState("");

  const [rfqCity, setRfqCity] = useState("");
  const [rfqAddressText, setRfqAddressText] = useState("");

  const [rfqNote, setRfqNote] = useState("");
  const [rfqShowItems, setRfqShowItems] = useState(false);

  const [rfqVisibility, setRfqVisibility] = useState<"open" | "company_only">("open");
  const [rfqPaymentTerms, setRfqPaymentTerms] = useState<"cash" | "bank" | "after" | "deferred">("bank");
  const [rfqDeliveryType, setRfqDeliveryType] = useState<"delivery" | "pickup" | "on_site">("delivery");
  const [rfqDeliveryWindow, setRfqDeliveryWindow] = useState("9:00–18:00");

  const [rfqNeedInvoice, setRfqNeedInvoice] = useState(true);
  const [rfqNeedWaybill, setRfqNeedWaybill] = useState(true);
  const [rfqNeedCert, setRfqNeedCert] = useState(false);

  const [rfqRememberContacts, setRfqRememberContacts] = useState(true);

  const rfqCountryCodeTouched = useRef(false);

  return {
    rfqBusy,
    setRfqBusy,
    rfqDeadlineIso,
    setRfqDeadlineIso,
    rfqDeliveryDays,
    setRfqDeliveryDays,
    rfqPhone,
    setRfqPhone,
    rfqCountryCode,
    setRfqCountryCode,
    rfqEmail,
    setRfqEmail,
    rfqCity,
    setRfqCity,
    rfqAddressText,
    setRfqAddressText,
    rfqNote,
    setRfqNote,
    rfqShowItems,
    setRfqShowItems,
    rfqVisibility,
    setRfqVisibility,
    rfqPaymentTerms,
    setRfqPaymentTerms,
    rfqDeliveryType,
    setRfqDeliveryType,
    rfqDeliveryWindow,
    setRfqDeliveryWindow,
    rfqNeedInvoice,
    setRfqNeedInvoice,
    rfqNeedWaybill,
    setRfqNeedWaybill,
    rfqNeedCert,
    setRfqNeedCert,
    rfqRememberContacts,
    setRfqRememberContacts,
    rfqCountryCodeTouched,
  };
}

