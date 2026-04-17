import React from "react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";
import ScannableFieldStep from "./ScannableFieldStep";

function EanStep({ value, onChange, error, scannerEnabled = false, onOpenScanner = null }) {
  const { language } = useAppPreferences();
  const copy = {
    pl: {
      title: "Skanuj EAN",
      placeholder: "Wpisz EAN recznie",
      waitingLabel: "Oczekiwanie na skan EAN...",
    },
    en: {
      title: "Scan EAN",
      placeholder: "Enter EAN manually",
      waitingLabel: "Waiting for EAN scan...",
    },
    de: {
      title: "EAN scannen",
      placeholder: "EAN manuell eingeben",
      waitingLabel: "Warte auf EAN-Scan...",
    },
  }[language];

  return (
    <ScannableFieldStep
      title={copy.title}
      visual="EAN"
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

export default EanStep;
