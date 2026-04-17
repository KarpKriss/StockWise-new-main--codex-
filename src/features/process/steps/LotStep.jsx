import React from "react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";
import ScannableFieldStep from "./ScannableFieldStep";

function LotStep({ value, onChange, error, scannerEnabled = false, onOpenScanner = null }) {
  const { language } = useAppPreferences();
  const copy = {
    pl: {
      title: "Numer LOT",
      placeholder: "Wprowadz numer partii",
      helperText: "Mozesz wpisac LOT recznie albo zeskanowac go aparatem, jesli to pole ma wlaczone skanowanie.",
    },
    en: {
      title: "LOT number",
      placeholder: "Enter batch number",
      helperText: "You can enter the LOT manually or scan it with the camera if scanning is enabled for this field.",
    },
    de: {
      title: "LOT-Nummer",
      placeholder: "Chargennummer eingeben",
      helperText: "Du kannst die LOT-Nummer manuell eingeben oder mit der Kamera scannen, wenn das Feld Scannen aktiviert hat.",
    },
  }[language];

  return (
    <ScannableFieldStep
      title={copy.title}
      visual={null}
      value={value}
      onChange={onChange}
      error={error}
      placeholder={copy.placeholder}
      scannerEnabled={scannerEnabled}
      onOpenScanner={onOpenScanner}
      helperText={copy.helperText}
    />
  );
}

export default LotStep;
