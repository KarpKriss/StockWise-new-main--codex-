import { Barcode, Camera } from "lucide-react";

export default function EanStepModern({
  value,
  onChange,
  error,
  scannerEnabled = false,
  onOpenScanner = null,
}) {
  return (
    <div className="process-section-card">
      <div className="scan-panel">
        <div className="scan-panel__header">
          <div className="scan-visual">
            <Barcode size={20} />
          </div>
          <span>Skanuj EAN</span>
        </div>

        <div className="scan-placeholder">{value || "Oczekiwanie na skan EAN..."}</div>

        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <input
            className={`input ${error ? "input-error" : ""}`}
            placeholder="Wpisz EAN recznie"
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
          />
          {scannerEnabled ? (
            <button
              type="button"
              className="app-icon-button"
              onClick={onOpenScanner}
              aria-label="Otworz skaner EAN"
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
