import React from "react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";
import ScannableFieldStep from "./ScannableFieldStep";

function SkuStep({ value, onChange, error, scannerEnabled = false, onOpenScanner = null }) {
  const { language } = useAppPreferences();
  const copy = {
    pl: {
      title: "Skanuj SKU",
      placeholder: "Wpisz SKU recznie",
      waitingLabel: "Oczekiwanie na skan...",
    },
    en: {
      title: "Scan SKU",
      placeholder: "Enter SKU manually",
      waitingLabel: "Waiting for scan...",
    },
    de: {
      title: "SKU scannen",
      placeholder: "SKU manuell eingeben",
      waitingLabel: "Warte auf Scan...",
    },
  }[language];

  return (
    <ScannableFieldStep
      title={copy.title}
      visual="SKU"
      value={value}
      onChange={onChange}
      error={error}
      placeholder={copy.placeholder}
      waitingLabel={copy.waitingLabel}
      scannerEnabled={scannerEnabled}
      onOpenScanner={onOpenScanner}
    />
  );
}

export default SkuStep;
