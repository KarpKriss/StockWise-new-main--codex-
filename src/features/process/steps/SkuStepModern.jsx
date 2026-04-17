import { Camera, Package2 } from "lucide-react";
import { useAppPreferences } from "../../../core/preferences/AppPreferences";

export default function SkuStepModern({
  value,
  onChange,
  error,
  scannerEnabled = false,
  onOpenScanner = null,
}) {
  const { language } = useAppPreferences();
  const copy = {
    pl: {
      title: "Skanuj SKU",
      waiting: "Oczekiwanie na skan SKU...",
      placeholder: "Wpisz SKU recznie",
      aria: "Otworz skaner SKU",
    },
    en: {
      title: "Scan SKU",
      waiting: "Waiting for SKU scan...",
      placeholder: "Enter SKU manually",
      aria: "Open SKU scanner",
    },
    de: {
      title: "SKU scannen",
      waiting: "Warte auf SKU-Scan...",
      placeholder: "SKU manuell eingeben",
      aria: "SKU-Scanner offnen",
    },
  }[language];

  return (
    <div className="process-section-card">
      <div className="scan-panel">
        <div className="scan-panel__header">
          <div className="scan-visual">
            <Package2 size={20} />
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
