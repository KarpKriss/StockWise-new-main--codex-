import { Camera, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LoadingOverlay from "../../components/loaders/LoadingOverlay";
import BarcodeScannerModal from "../../components/scanner/BarcodeScannerModal";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import { useAuth } from "../../core/auth/AppAuth";
import {
  DEFAULT_MANUAL_PROCESS_CONFIG,
  SCAN_FORMAT_OPTIONS,
  SCANNABLE_MANUAL_FIELDS,
  normalizeManualProcessConfig,
} from "../../core/config/manualProcessConfig";
import {
  fetchManualProcessAdminConfig,
  saveManualProcessAdminConfig,
} from "../../core/api/processConfigApi";
import { useAppPreferences } from "../../core/preferences/AppPreferences";

const FORMAT_LABELS = Object.fromEntries(
  SCAN_FORMAT_OPTIONS.map((option) => [option.value, option.label])
);

function Toggle({ label, checked, onChange, disabled = false, help = "" }) {
  return (
    <label className={`process-config-toggle ${disabled ? "is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {help ? (
          <span style={{ display: "block", fontSize: 12, opacity: 0.72, marginTop: 4 }}>{help}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function ScanningSettingsPanel() {
  const { user } = useAuth();
  const { language } = useAppPreferences();
  const [configState, setConfigState] = useState(DEFAULT_MANUAL_PROCESS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");
  const [dataSource, setDataSource] = useState("default");
  const [diagnosticScannerOpen, setDiagnosticScannerOpen] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  const fieldLabels = {
    pl: { location: "Lokalizacja", ean: "EAN", sku: "SKU", lot: "LOT" },
    en: { location: "Location", ean: "EAN", sku: "SKU", lot: "LOT" },
    de: { location: "Lagerplatz", ean: "EAN", sku: "SKU", lot: "LOT" },
  }[language];

  const copy = {
    pl: {
      loadError: "Nie udalo sie pobrac ustawien skanowania",
      saveError: "Nie udalo sie zapisac ustawien skanowania",
      enableField: "Wlacz co najmniej jedno pole do skanowania.",
      needFormat: (field) => `Pole ${fieldLabels[field]} musi miec co najmniej jeden format kodu.`,
      saved: "Ustawienia skanowania zostaly zapisane.",
      title: "Skanowanie",
      subtitle: "Sterowanie skanerem aparatu w procesie recznej inwentaryzacji: wlaczenie, pola i obslugiwane formaty kodow.",
      backLabel: "Powrot do ustawien",
      save: "Zapisz ustawienia",
      saving: "Zapisywanie...",
      loading: "Pobieram ustawienia skanowania...",
      modeTitle: "Tryb skanowania",
      modeDesc: "Ta sekcja steruje ikonami aparatu i obsluga kamery na telefonach operatorow.",
      source: "Zrodlo",
      globalTitle: "Globalne wlaczenie skanowania",
      active: "Aktywne",
      activeHelp: "Gdy wylaczone, wszystkie pola dzialaja tylko w trybie recznego wpisywania.",
      autoClose: "Zamknij po odczycie",
      autoCloseHelp: "Po poprawnym skanie modal kamery zamknie sie automatycznie.",
      preferBack: "Preferuj tylny aparat",
      preferBackHelp: "Na telefonie system sprobuje od razu otworzyc tylny aparat.",
      activeFields: "Aktywne pola skanowania",
      none: "Brak",
      diagnosticTitle: "Nie wiesz, jakiego formatu masz kod?",
      diagnosticText: "Sprawdz to tutaj. Uruchom aparat, zeskanuj kod i zobacz, jaki format rozpoznaje aktualna biblioteka skanera.",
      diagnosticButton: "Sprawdz format kodu",
      scannedValue: "Odczytana wartosc",
      detectedFormat: "Rozpoznany format",
      detectionFallback: "Biblioteka odczytala kod, ale nie zwrocila jednoznacznej nazwy formatu.",
      supportStatus: "Status obslugi",
      supported: "Format jest obslugiwany i mozna go przypisac do pola procesu.",
      unsupported: "Tego formatu nie ma na aktualnej liscie albo biblioteka go nie raportuje.",
      diagnosticHint: "Po skanowaniu zobaczysz tutaj nazwe formatu albo informacje, ze obecna biblioteka nie potrafi go jednoznacznie okreslic.",
      processFields: "Pola procesu",
      processFieldsDesc: "Dla kazdego pola wybierasz, czy pokazujemy ikone aparatu i jakie typy kodow sa akceptowane.",
      cameraIcon: "Ikona aparatu",
      savingOverlay: "Zapisuje ustawienia skanowania i aktualizuje konfiguracje pol procesu...",
      scannerTitle: "Sprawdz format kodu",
      scannerDesc: "Zeskanuj kod aparatem albo wgraj zdjecie. Po odczycie pokazemy wykryty format albo informacje, ze obecna biblioteka go nie raportuje.",
    },
    en: {
      loadError: "Failed to load scanning settings",
      saveError: "Failed to save scanning settings",
      enableField: "Enable at least one field for scanning.",
      needFormat: (field) => `Field ${fieldLabels[field]} must have at least one barcode format.`,
      saved: "Scanning settings have been saved.",
      title: "Scanning",
      subtitle: "Control the camera scanner in manual inventory: enablement, fields, and supported code formats.",
      backLabel: "Back to settings",
      save: "Save settings",
      saving: "Saving...",
      loading: "Loading scanning settings...",
      modeTitle: "Scanning mode",
      modeDesc: "This section controls camera icons and camera usage on operator phones.",
      source: "Source",
      globalTitle: "Global scanning enablement",
      active: "Active",
      activeHelp: "When disabled, all fields stay in manual input mode only.",
      autoClose: "Close after detection",
      autoCloseHelp: "After a successful scan, the camera modal closes automatically.",
      preferBack: "Prefer rear camera",
      preferBackHelp: "On phones, the system will try to open the rear camera first.",
      activeFields: "Active scanning fields",
      none: "None",
      diagnosticTitle: "Not sure what code format you have?",
      diagnosticText: "Check it here. Open the camera, scan the code, and see which format the current scanner library recognizes.",
      diagnosticButton: "Check code format",
      scannedValue: "Scanned value",
      detectedFormat: "Detected format",
      detectionFallback: "The library read the code but did not return a clear format name.",
      supportStatus: "Support status",
      supported: "This format is supported and can be assigned to a process field.",
      unsupported: "This format is not on the current list or the library does not report it.",
      diagnosticHint: "After scanning, you will see the format name here or information that the current library cannot identify it clearly.",
      processFields: "Process fields",
      processFieldsDesc: "For each field, choose whether we show the camera icon and which code types are accepted.",
      cameraIcon: "Camera icon",
      savingOverlay: "Saving scanning settings and updating process field configuration...",
      scannerTitle: "Check code format",
      scannerDesc: "Scan the code with the camera or upload a photo. After detection, we show the detected format or that the current library does not report it.",
    },
    de: {
      loadError: "Scaneinstellungen konnten nicht geladen werden",
      saveError: "Scaneinstellungen konnten nicht gespeichert werden",
      enableField: "Aktiviere mindestens ein Feld fuer das Scannen.",
      needFormat: (field) => `Feld ${fieldLabels[field]} muss mindestens ein Barcode-Format haben.`,
      saved: "Scaneinstellungen wurden gespeichert.",
      title: "Scannen",
      subtitle: "Steuerung des Kamerascanners fuer die manuelle Inventur: Aktivierung, Felder und unterstuetzte Codeformate.",
      backLabel: "Zurueck zu Einstellungen",
      save: "Einstellungen speichern",
      saving: "Wird gespeichert...",
      loading: "Scaneinstellungen werden geladen...",
      modeTitle: "Scanmodus",
      modeDesc: "Dieser Bereich steuert Kamera-Icons und die Kameranutzung auf Operator-Handys.",
      source: "Quelle",
      globalTitle: "Globale Scanner-Aktivierung",
      active: "Aktiv",
      activeHelp: "Wenn deaktiviert, bleiben alle Felder nur im manuellen Eingabemodus.",
      autoClose: "Nach Erkennung schliessen",
      autoCloseHelp: "Nach einem erfolgreichen Scan schliesst sich das Kameramodal automatisch.",
      preferBack: "Rueckkamera bevorzugen",
      preferBackHelp: "Auf Handys versucht das System zuerst die Rueckkamera zu oeffnen.",
      activeFields: "Aktive Scan-Felder",
      none: "Keine",
      diagnosticTitle: "Nicht sicher, welches Codeformat vorliegt?",
      diagnosticText: "Pruefe es hier. Oeffne die Kamera, scanne den Code und sieh, welches Format die aktuelle Scanner-Bibliothek erkennt.",
      diagnosticButton: "Codeformat pruefen",
      scannedValue: "Gelesener Wert",
      detectedFormat: "Erkanntes Format",
      detectionFallback: "Die Bibliothek hat den Code gelesen, aber keinen eindeutigen Formatnamen geliefert.",
      supportStatus: "Unterstuetzungsstatus",
      supported: "Dieses Format wird unterstuetzt und kann einem Prozessfeld zugewiesen werden.",
      unsupported: "Dieses Format steht nicht auf der aktuellen Liste oder die Bibliothek meldet es nicht.",
      diagnosticHint: "Nach dem Scan siehst du hier den Formatnamen oder den Hinweis, dass die aktuelle Bibliothek ihn nicht eindeutig bestimmen kann.",
      processFields: "Prozessfelder",
      processFieldsDesc: "Fuer jedes Feld waehlt man, ob das Kamera-Icon angezeigt wird und welche Codetypen akzeptiert werden.",
      cameraIcon: "Kamera-Icon",
      savingOverlay: "Scaneinstellungen werden gespeichert und die Prozessfeld-Konfiguration aktualisiert...",
      scannerTitle: "Codeformat pruefen",
      scannerDesc: "Scanne den Code mit der Kamera oder lade ein Foto hoch. Nach der Erkennung zeigen wir das erkannte Format oder dass die aktuelle Bibliothek es nicht meldet.",
    },
  }[language];

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        setLoading(true);
        const result = await fetchManualProcessAdminConfig(user?.site_id);
        if (!cancelled) {
          setConfigState(result.config);
          setDataSource(result.source);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || copy.loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [user?.site_id, copy.loadError]);

  const scanning = configState.scanning || DEFAULT_MANUAL_PROCESS_CONFIG.scanning;

  const activeFieldsSummary = useMemo(
    () =>
      SCANNABLE_MANUAL_FIELDS.filter((fieldKey) => scanning.fields?.[fieldKey]?.enabled)
        .map((fieldKey) => fieldLabels[fieldKey])
        .join(", "),
    [fieldLabels, scanning.fields],
  );

  function updateScanning(patch) {
    setConfigState((current) =>
      normalizeManualProcessConfig({
        ...current,
        scanning: {
          ...current.scanning,
          ...patch,
        },
      }),
    );
    setSaveInfo("");
  }

  function updateField(fieldKey, patch) {
    setConfigState((current) =>
      normalizeManualProcessConfig({
        ...current,
        scanning: {
          ...current.scanning,
          fields: {
            ...current.scanning?.fields,
            [fieldKey]: {
              ...current.scanning?.fields?.[fieldKey],
              ...patch,
            },
          },
        },
      }),
    );
    setSaveInfo("");
  }

  function toggleFormat(fieldKey, format) {
    const currentFormats = scanning.fields?.[fieldKey]?.formats || [];
    const nextFormats = currentFormats.includes(format)
      ? currentFormats.filter((item) => item !== format)
      : [...currentFormats, format];

    updateField(fieldKey, { formats: nextFormats });
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const normalized = normalizeManualProcessConfig(configState);

      if (normalized.scanning.enabled) {
        const hasEnabledField = SCANNABLE_MANUAL_FIELDS.some(
          (fieldKey) => normalized.scanning.fields?.[fieldKey]?.enabled,
        );

        if (!hasEnabledField) {
          throw new Error(copy.enableField);
        }

        const fieldWithoutFormats = SCANNABLE_MANUAL_FIELDS.find(
          (fieldKey) =>
            normalized.scanning.fields?.[fieldKey]?.enabled &&
            !(normalized.scanning.fields?.[fieldKey]?.formats || []).length,
        );

        if (fieldWithoutFormats) {
          throw new Error(copy.needFormat(fieldWithoutFormats));
        }
      }

      const result = await saveManualProcessAdminConfig({
        siteId: user?.site_id,
        config: normalized,
      });

      setConfigState(result.config);
      setDataSource(result.source);
      setSaveInfo(copy.saved);
    } catch (saveError) {
      setError(saveError.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  function normalizeDetectedFormat(rawFormat) {
    const normalized = String(rawFormat || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

    return normalized || null;
  }

  function handleDiagnosticDetected(value) {
    setDiagnosticResult((current) => ({
      ...(current || {}),
      value: String(value || "").trim(),
    }));
  }

  function handleDiagnosticDetectedDetail(details) {
    const normalizedFormat = normalizeDetectedFormat(details?.rawFormat);

    setDiagnosticResult({
      value: String(details?.value || "").trim(),
      rawFormat: details?.rawFormat || null,
      normalizedFormat,
      formatLabel: normalizedFormat ? FORMAT_LABELS[normalizedFormat] || normalizedFormat : null,
      supported: Boolean(normalizedFormat && FORMAT_LABELS[normalizedFormat]),
      source: details?.source || "camera",
    });
  }

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<Camera size={26} />}
      backTo="/admin"
      backLabel={copy.backLabel}
      actions={
        <Button type="button" variant="primary" size="md" disabled={saving || loading} onClick={handleSave}>
          <Save size={16} />
          {saving ? copy.saving : copy.save}
        </Button>
      }
    >
      {loading ? <div className="app-card">{copy.loading}</div> : null}
      {error ? <div className="input-error-text">{error}</div> : null}
      {saveInfo ? <div className="helper-note">{saveInfo}</div> : null}

      {!loading ? (
        <>
          <div className="app-card">
            <div className="system-status-section-header" style={{ marginBottom: 14 }}>
              <div>
                <h3>{copy.modeTitle}</h3>
                <p>{copy.modeDesc}</p>
              </div>
              <div className="system-status-section-summary">
                <span className="system-alert__pill system-alert__pill--healthy">{copy.source}: {dataSource}</span>
              </div>
            </div>

            <div className="process-config-step-list">
              <div className="process-config-step-card">
                <div className="process-config-step-card__main">
                  <div>
                    <div className="process-config-step-card__label">{copy.globalTitle}</div>
                  </div>
                </div>
                <div className="process-config-step-card__toggles">
                  <Toggle
                    label={copy.active}
                    checked={Boolean(scanning.enabled)}
                    onChange={(value) => updateScanning({ enabled: value })}
                    help={copy.activeHelp}
                  />
                  <Toggle
                    label={copy.autoClose}
                    checked={Boolean(scanning.autoCloseOnSuccess)}
                    disabled={!scanning.enabled}
                    onChange={(value) => updateScanning({ autoCloseOnSuccess: value })}
                    help={copy.autoCloseHelp}
                  />
                  <Toggle
                    label={copy.preferBack}
                    checked={Boolean(scanning.preferBackCamera)}
                    disabled={!scanning.enabled}
                    onChange={(value) => updateScanning({ preferBackCamera: value })}
                    help={copy.preferBackHelp}
                  />
                </div>
              </div>
            </div>

            <div className="helper-note" style={{ marginTop: 14 }}>
              {copy.activeFields}: <strong>{activeFieldsSummary || copy.none}</strong>
            </div>
          </div>

          <div className="app-card" style={{ marginTop: 18 }}>
            <div className="scanner-diagnostic-bar">
              <div className="scanner-diagnostic-bar__copy">
                <div className="scanner-diagnostic-bar__title">{copy.diagnosticTitle}</div>
                <div className="scanner-diagnostic-bar__text">{copy.diagnosticText}</div>
              </div>

              <div className="scanner-diagnostic-bar__actions">
                <Button type="button" variant="secondary" size="md" onClick={() => setDiagnosticScannerOpen(true)}>
                  <Camera size={16} />
                  {copy.diagnosticButton}
                </Button>
              </div>
            </div>

            {diagnosticResult ? (
              <div className="scanner-diagnostic-result">
                <div className="scanner-diagnostic-result__row">
                  <span>{copy.scannedValue}</span>
                  <strong>{diagnosticResult.value || "-"}</strong>
                </div>
                <div className="scanner-diagnostic-result__row">
                  <span>{copy.detectedFormat}</span>
                  <strong>
                    {diagnosticResult.formatLabel || copy.detectionFallback}
                  </strong>
                </div>
                <div className="scanner-diagnostic-result__row">
                  <span>{copy.supportStatus}</span>
                  <strong>
                    {diagnosticResult.supported ? copy.supported : copy.unsupported}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="helper-note" style={{ marginTop: 12 }}>
                {copy.diagnosticHint}
              </div>
            )}
          </div>

          <div className="app-card" style={{ marginTop: 18 }}>
            <h3>{copy.processFields}</h3>
            <p className="helper-note">
              {copy.processFieldsDesc}
            </p>

            <div className="process-config-step-list">
              {SCANNABLE_MANUAL_FIELDS.map((fieldKey) => {
                const fieldConfig = scanning.fields?.[fieldKey] || DEFAULT_MANUAL_PROCESS_CONFIG.scanning.fields[fieldKey];
                return (
                  <div key={fieldKey} className="process-config-step-card">
                    <div className="process-config-step-card__main" style={{ alignItems: "flex-start" }}>
                      <div style={{ width: "100%" }}>
                        <div className="process-config-step-card__key">{fieldKey}</div>
                        <div className="process-config-step-card__label">{fieldLabels[fieldKey]}</div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                            gap: 10,
                            marginTop: 14,
                          }}
                        >
                          {SCAN_FORMAT_OPTIONS.map((option) => {
                            const active = fieldConfig.formats?.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={`app-button app-button--${active ? "primary" : "ghost"} app-button--sm`}
                                disabled={!scanning.enabled || !fieldConfig.enabled}
                                onClick={() => toggleFormat(fieldKey, option.value)}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="process-config-step-card__toggles">
                      <Toggle
                        label={copy.cameraIcon}
                        checked={Boolean(fieldConfig.enabled)}
                        disabled={!scanning.enabled}
                        onChange={(value) => updateField(fieldKey, { enabled: value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
      <LoadingOverlay
        open={saving}
        fullscreen
        message={copy.savingOverlay}
      />
      <BarcodeScannerModal
        open={diagnosticScannerOpen}
        title={copy.scannerTitle}
        description={copy.scannerDesc}
        formats={[]}
        preferBackCamera={Boolean(scanning.preferBackCamera)}
        autoCloseOnSuccess
        onDetected={handleDiagnosticDetected}
        onDetectedDetail={handleDiagnosticDetectedDetail}
        onClose={() => setDiagnosticScannerOpen(false)}
      />
    </PageShell>
  );
}
