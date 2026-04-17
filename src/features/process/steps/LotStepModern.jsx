import { Camera, Hash } from "lucide-react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";

export default function LotStepModern({
  value,
  onChange,
  error,
  scannerEnabled = false,
  onOpenScanner = null,
}) {
  const { language } = useAppPreferences();
  const copy = {
    pl: {
      title: "Numer LOT",
      placeholder: "Wprowadz numer partii",
      aria: "Otworz skaner LOT",
    },
    en: {
      title: "LOT number",
      placeholder: "Enter batch number",
      aria: "Open LOT scanner",
    },
    de: {
      title: "LOT-Nummer",
      placeholder: "Chargennummer eingeben",
      aria: "LOT-Scanner offnen",
    },
  }[language];

  return (
    <div className="process-section-card">
      <div className="scan-panel">
        <div className="scan-panel__header">
          <div className="scan-visual">
            <Hash size={20} />
          </div>
          <span>{copy.title}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <input
            className={`input ${error ? "input-error" : ""}`}
            placeholder={copy.placeholder}
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
          />
          {scannerEnabled ? (
            <button
              type="button"
              className="app-icon-button"
              onClick={onOpenScanner}
              aria-label={copy.aria}
              style={{ minWidth: 46, alignSelf: "stretch" }}
            >
              <Camera size={18} />
            </button>
          ) : null}
        </div>

        {error ? <div className="input-error-text">{error}</div> : null}
      </div>
    </div>
  );
}
