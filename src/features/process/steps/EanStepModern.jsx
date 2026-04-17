import { Barcode, Camera } from "lucide-react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";

export default function EanStepModern({
  value,
  onChange,
  error,
  scannerEnabled = false,
  onOpenScanner = null,
}) {
  const { language, t } = useAppPreferences();
  const copy = {
    pl: {
      title: "Skanuj EAN",
      waiting: "Oczekiwanie na skan EAN...",
      placeholder: "Wpisz EAN recznie",
      aria: "Otworz skaner EAN",
    },
    en: {
      title: "Scan EAN",
      waiting: "Waiting for EAN scan...",
      placeholder: "Enter EAN manually",
      aria: "Open EAN scanner",
    },
    de: {
      title: "EAN scannen",
      waiting: "Warte auf EAN-Scan...",
      placeholder: "EAN manuell eingeben",
      aria: "EAN-Scanner offnen",
    },
  }[language];

  return (
    <div className="process-section-card">
      <div className="scan-panel">
        <div className="scan-panel__header">
          <div className="scan-visual">
            <Barcode size={20} />
          </div>
          <span>{copy.title}</span>
        </div>

        <div className="scan-placeholder">{value || copy.waiting}</div>

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
