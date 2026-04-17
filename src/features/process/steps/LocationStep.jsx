import React from "react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";
import ScannableFieldStep from "./ScannableFieldStep";

function LocationStep({ value, onChange, error, scannerEnabled = false, onOpenScanner = null }) {
  const { language } = useAppPreferences();
  const copy = {
    pl: {
      title: "Skanuj lokalizacje",
      placeholder: "Wpisz lokalizacje recznie",
      waitingLabel: "Oczekiwanie na skan...",
    },
    en: {
      title: "Scan location",
      placeholder: "Enter location manually",
      waitingLabel: "Waiting for scan...",
    },
    de: {
      title: "Lokation scannen",
      placeholder: "Lokation manuell eingeben",
      waitingLabel: "Warte auf Scan...",
    },
  }[language];

  return (
    <ScannableFieldStep
      title={copy.title}
      visual="L"
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

export default LocationStep;
