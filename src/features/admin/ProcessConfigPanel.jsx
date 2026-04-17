import { Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LoadingOverlay from "../../components/loaders/LoadingOverlay";
import PageShell from "../../components/layout/PageShell";
import { useAuth } from "../../core/auth/AppAuth";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import {
  DEFAULT_MANUAL_PROCESS_CONFIG,
  MANUAL_STEP_DEFINITIONS,
  getOrderedEnabledManualSteps,
  normalizeManualProcessConfig,
} from "../../core/config/manualProcessConfig";
import {
  fetchManualProcessAdminConfig,
  saveManualProcessAdminConfig,
} from "../../core/api/processConfigApi";
import { fetchConfigChangeLogs } from "../../core/api/logsApi";

function ToggleField({ checked, onChange, disabled = false, label }) {
  return (
    <label className={`process-config-toggle ${disabled ? "is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function ProcessConfigPanel() {
  const { user } = useAuth();
  const { language, locale } = useAppPreferences();
  const copy = {
    pl: {
      loadError: "Nie udalo sie pobrac konfiguracji procesu",
      locationRequired: "Krok lokalizacji musi pozostac wlaczony i obowiazkowy.",
      typeRequired: "Typ operacji musi pozostac wlaczony i obowiazkowy.",
      quantityRequired: "Ilosc musi pozostac wlaczona i obowiazkowa.",
      skuOrEanRequired: "Musisz pozostawic aktywne co najmniej jedno z pol: SKU albo EAN.",
      operationTypeRequired: "Co najmniej jeden typ operacji musi pozostac aktywny.",
      saved: "Konfiguracja procesu recznego zostala zapisana.",
      saveError: "Nie udalo sie zapisac konfiguracji procesu",
      title: "Konfiguracja procesu",
      subtitle: "Sterowanie reczna inwentaryzacja: kolejnosc krokow, widocznosc, wymagania i reguly walidacji. Proces pustych lokalizacji pozostaje niezalezny.",
      backLabel: "Powrot do ustawien",
      saving: "Zapisywanie...",
      saveConfig: "Zapisz konfiguracje",
      loading: "Pobieram konfiguracje recznej inwentaryzacji...",
      stepsTitle: "Kroki procesu recznego",
      stepsDesc: "Zmieniaj kolejnosc, widocznosc i wymagalnosc poszczegolnych etapow.",
      source: "Zrodlo",
      order: "Kolejnosc",
      visible: "Widoczny",
      mandatory: "Obowiazkowy",
      activeStepsOrder: "Kolejnosc aktywnych krokow",
      noActiveSteps: "Brak aktywnych krokow",
      operationTypesTitle: "Dozwolone typy operacji",
      operationTypesDesc: "Ta konfiguracja dotyczy tylko recznej inwentaryzacji.",
      available: "Dostepny",
      validationTitle: "Walidacje i limity",
      regexHelpAria: "Instrukcja pisania formatow regex",
      regexStrong: "Jak pisac regex",
      regexLine1: "^ oznacza poczatek tekstu, a $ jego koniec.",
      regexLine2: "\\d to cyfra, {4} to dokladnie 4 znaki, a myslnik - wpisujesz doslownie.",
      regexLine3: "Przyklad LOT:",
      regexLine4: "Przyklad bardziej ogolny:",
      lotRegex: "Regex LOT",
      lotMessage: "Komunikat LOT",
      eanRegex: "Regex EAN",
      eanMessage: "Komunikat EAN",
      skuRegex: "Regex SKU",
      skuMessage: "Komunikat SKU",
      quantityWarn: "Prog ostrzezenia ilosci",
      quantityHard: "Twardy limit ilosci",
      quantityHardMessage: "Komunikat limitu ilosci",
      locationTimeout: "Limit czasu lokalizacji (ms)",
      saveTimeout: "Timeout zapisu API (ms)",
      saveRetry: "Retry zapisu",
      fetchRetry: "Retry pobran",
      historyTitle: "Historia zmian konfiguracji",
      historyDesc: "Ostatnie zapisy konfiguracji procesu recznego wraz z informacja, kto wprowadzil zmiane.",
      time: "Czas",
      user: "Uzytkownik",
      action: "Akcja",
      scope: "Zakres",
      noHistory: "Brak zapisanej historii zmian konfiguracji.",
      overlay: "Zapisuje konfiguracje procesu i aktualizuje ustawienia operatorow...",
    },
    en: {
      loadError: "Could not load process configuration",
      locationRequired: "The location step must remain enabled and mandatory.",
      typeRequired: "The operation type step must remain enabled and mandatory.",
      quantityRequired: "Quantity must remain enabled and mandatory.",
      skuOrEanRequired: "You must keep at least one of these fields active: SKU or EAN.",
      operationTypeRequired: "At least one operation type must remain active.",
      saved: "Manual process configuration has been saved.",
      saveError: "Could not save process configuration",
      title: "Process configuration",
      subtitle: "Control manual inventory: step order, visibility, requirements and validation rules. The empty-location flow stays independent.",
      backLabel: "Back to settings",
      saving: "Saving...",
      saveConfig: "Save configuration",
      loading: "Loading manual inventory configuration...",
      stepsTitle: "Manual process steps",
      stepsDesc: "Change the order, visibility and mandatory status of each stage.",
      source: "Source",
      order: "Order",
      visible: "Visible",
      mandatory: "Mandatory",
      activeStepsOrder: "Enabled step order",
      noActiveSteps: "No active steps",
      operationTypesTitle: "Allowed operation types",
      operationTypesDesc: "This configuration only applies to manual inventory.",
      available: "Available",
      validationTitle: "Validations and limits",
      regexHelpAria: "Regex format writing guide",
      regexStrong: "How to write regex",
      regexLine1: "^ means start of text and $ means end of text.",
      regexLine2: "\\d is a digit, {4} means exactly 4 characters, and - is written literally.",
      regexLine3: "LOT example:",
      regexLine4: "More general example:",
      lotRegex: "LOT regex",
      lotMessage: "LOT message",
      eanRegex: "EAN regex",
      eanMessage: "EAN message",
      skuRegex: "SKU regex",
      skuMessage: "SKU message",
      quantityWarn: "Quantity warning threshold",
      quantityHard: "Hard quantity limit",
      quantityHardMessage: "Quantity limit message",
      locationTimeout: "Location timeout (ms)",
      saveTimeout: "API save timeout (ms)",
      saveRetry: "Save retries",
      fetchRetry: "Fetch retries",
      historyTitle: "Configuration change history",
      historyDesc: "Latest saves of manual process configuration together with who introduced the change.",
      time: "Time",
      user: "User",
      action: "Action",
      scope: "Scope",
      noHistory: "No saved configuration change history.",
      overlay: "Saving process configuration and updating operator settings...",
    },
    de: {
      loadError: "Prozesskonfiguration konnte nicht geladen werden",
      locationRequired: "Der Lokationsschritt muss aktiviert und verpflichtend bleiben.",
      typeRequired: "Der Operationstyp muss aktiviert und verpflichtend bleiben.",
      quantityRequired: "Die Menge muss aktiviert und verpflichtend bleiben.",
      skuOrEanRequired: "Mindestens eines dieser Felder muss aktiv bleiben: SKU oder EAN.",
      operationTypeRequired: "Mindestens ein Operationstyp muss aktiv bleiben.",
      saved: "Die Konfiguration des manuellen Prozesses wurde gespeichert.",
      saveError: "Prozesskonfiguration konnte nicht gespeichert werden",
      title: "Prozesskonfiguration",
      subtitle: "Steuerung der manuellen Inventur: Reihenfolge der Schritte, Sichtbarkeit, Pflichtfelder und Validierungsregeln. Der Leerplatzprozess bleibt unabhaengig.",
      backLabel: "Zuruck zu den Einstellungen",
      saving: "Speichern...",
      saveConfig: "Konfiguration speichern",
      loading: "Konfiguration der manuellen Inventur wird geladen...",
      stepsTitle: "Schritte des manuellen Prozesses",
      stepsDesc: "Reihenfolge, Sichtbarkeit und Pflichtstatus der einzelnen Schritte aendern.",
      source: "Quelle",
      order: "Reihenfolge",
      visible: "Sichtbar",
      mandatory: "Verpflichtend",
      activeStepsOrder: "Reihenfolge aktiver Schritte",
      noActiveSteps: "Keine aktiven Schritte",
      operationTypesTitle: "Erlaubte Operationstypen",
      operationTypesDesc: "Diese Konfiguration gilt nur fur die manuelle Inventur.",
      available: "Verfugbar",
      validationTitle: "Validierungen und Limits",
      regexHelpAria: "Anleitung zum Schreiben von Regex-Formaten",
      regexStrong: "Regex schreiben",
      regexLine1: "^ bedeutet Anfang des Textes und $ das Ende.",
      regexLine2: "\\d ist eine Ziffer, {4} bedeutet genau 4 Zeichen und - wird direkt geschrieben.",
      regexLine3: "LOT-Beispiel:",
      regexLine4: "Allgemeineres Beispiel:",
      lotRegex: "LOT-Regex",
      lotMessage: "LOT-Meldung",
      eanRegex: "EAN-Regex",
      eanMessage: "EAN-Meldung",
      skuRegex: "SKU-Regex",
      skuMessage: "SKU-Meldung",
      quantityWarn: "Warnschwelle Menge",
      quantityHard: "Hartes Mengenlimit",
      quantityHardMessage: "Meldung Mengenlimit",
      locationTimeout: "Zeitlimit Lokation (ms)",
      saveTimeout: "API-Speicher-Timeout (ms)",
      saveRetry: "Speicher-Wiederholungen",
      fetchRetry: "Abruf-Wiederholungen",
      historyTitle: "Historie der Konfigurationsaenderungen",
      historyDesc: "Letzte Speicherungen der manuellen Prozesskonfiguration inklusive Benutzer.",
      time: "Zeit",
      user: "Benutzer",
      action: "Aktion",
      scope: "Bereich",
      noHistory: "Keine gespeicherte Historie zu Konfigurationsaenderungen.",
      overlay: "Prozesskonfiguration wird gespeichert und Operatoreinstellungen werden aktualisiert...",
    },
  }[language];
  const [configState, setConfigState] = useState(DEFAULT_MANUAL_PROCESS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");
  const [dataSource, setDataSource] = useState("default");
  const [historyRows, setHistoryRows] = useState([]);

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
  }, [copy.loadError, user?.site_id]);

  useEffect(() => {
    let cancelled = false;

    fetchConfigChangeLogs({ limit: 8 })
      .then((rows) => {
        if (!cancelled) {
          setHistoryRows(rows.filter((row) => row.entity === "manual_process" || row.entity === "process_config"));
        }
      })
      .catch((loadError) => {
        console.error("PROCESS CONFIG HISTORY LOAD ERROR:", loadError);
      });

    return () => {
      cancelled = true;
    };
  }, [saveInfo]);

  const stepRows = useMemo(
    () =>
      MANUAL_STEP_DEFINITIONS.map((definition) => ({
        key: definition.key,
        ...configState.steps[definition.key],
      })).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [configState.steps],
  );

  const orderedPreview = useMemo(
    () => getOrderedEnabledManualSteps(configState).map((step) => step.label).join(" -> "),
    [configState],
  );

  function updateStep(key, patch) {
    setConfigState((current) => ({
      ...current,
      steps: {
        ...current.steps,
        [key]: {
          ...current.steps[key],
          ...patch,
          ...(patch.enabled === false ? { mandatory: false } : {}),
        },
      },
    }));
    setSaveInfo("");
  }

  function updateValidation(key, value) {
    setConfigState((current) => ({
      ...current,
      validation: {
        ...current.validation,
        [key]: value,
      },
    }));
    setSaveInfo("");
  }

  function updateOperationType(key, patch) {
    setConfigState((current) => ({
      ...current,
      operationTypes: {
        ...current.operationTypes,
        [key]: {
          ...current.operationTypes[key],
          ...patch,
        },
      },
    }));
    setSaveInfo("");
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const normalized = normalizeManualProcessConfig(configState);

      if (!normalized.steps.location?.enabled || !normalized.steps.location?.mandatory) {
        throw new Error(copy.locationRequired);
      }

      if (!normalized.steps.type?.enabled || !normalized.steps.type?.mandatory) {
        throw new Error(copy.typeRequired);
      }

      if (!normalized.steps.quantity?.enabled || !normalized.steps.quantity?.mandatory) {
        throw new Error(copy.quantityRequired);
      }

      if (!normalized.steps.sku?.enabled && !normalized.steps.ean?.enabled) {
        throw new Error(copy.skuOrEanRequired);
      }

      if (!Object.values(normalized.operationTypes).some((item) => item.enabled)) {
        throw new Error(copy.operationTypeRequired);
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

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<SlidersHorizontal size={26} />}
      backTo="/admin"
      backLabel={copy.backLabel}
      actions={
        <button
          type="button"
          className="app-button app-button--primary app-button--md"
          disabled={saving || loading}
          onClick={handleSave}
        >
          <Save size={16} />
          {saving ? copy.saving : copy.saveConfig}
        </button>
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
                <h3>{copy.stepsTitle}</h3>
                <p>{copy.stepsDesc}</p>
              </div>
              <div className="system-status-section-summary">
                <span className="system-alert__pill system-alert__pill--healthy">
                  {copy.source}: {dataSource}
                </span>
              </div>
            </div>

            <div className="process-config-step-list">
              {stepRows.map((step) => {
                const isLocked = ["location", "type", "quantity"].includes(step.key);
                return (
                  <div key={step.key} className="process-config-step-card">
                    <div className="process-config-step-card__main">
                      <div>
                        <div className="process-config-step-card__key">{step.key}</div>
                        <div className="process-config-step-card__label">{step.label}</div>
                      </div>
                      <div className="process-config-step-card__order">
                        <label>{copy.order}</label>
                        <input
                          className="app-input"
                          type="number"
                          min="1"
                          value={step.order}
                          onChange={(event) => updateStep(step.key, { order: Number(event.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    <div className="process-config-step-card__toggles">
                      <ToggleField
                        label={copy.visible}
                        checked={step.enabled}
                        disabled={isLocked}
                        onChange={(value) => updateStep(step.key, { enabled: value })}
                      />
                      <ToggleField
                        label={copy.mandatory}
                        checked={step.mandatory}
                        disabled={isLocked || !step.enabled}
                        onChange={(value) => updateStep(step.key, { mandatory: value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="helper-note" style={{ marginTop: 14 }}>
              {copy.activeStepsOrder}: <strong>{orderedPreview || copy.noActiveSteps}</strong>
            </div>
          </div>

          <div className="process-config-layout-grid">
            <div className="app-card">
              <h3>{copy.operationTypesTitle}</h3>
              <p className="helper-note">{copy.operationTypesDesc}</p>

              <div className="process-config-step-list">
                {Object.entries(configState.operationTypes).map(([key, value]) => (
                  <div key={key} className="process-config-step-card">
                    <div className="process-config-step-card__main">
                      <div>
                        <div className="process-config-step-card__key">{key}</div>
                        <div className="process-config-step-card__label">{value.label}</div>
                      </div>
                    </div>
                    <div className="process-config-step-card__toggles">
                      <ToggleField
                        label={copy.available}
                        checked={value.enabled}
                        onChange={(enabled) => updateOperationType(key, { enabled })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="app-card">
              <div className="process-config-card-header">
                <h3>{copy.validationTitle}</h3>
                <div className="regex-help" tabIndex={0}>
                  <button
                    type="button"
                    className="regex-help__button"
                    aria-label={copy.regexHelpAria}
                  >
                    i
                  </button>
                  <div className="regex-help__tooltip" role="tooltip">
                    <strong>{copy.regexStrong}</strong>
                    <span>
                      {copy.regexLine1}
                    </span>
                    <span>
                      {copy.regexLine2}
                    </span>
                    <span>
                      {copy.regexLine3} <code>^\d{"{4}"}-\d{"{3}"}-\d{"{3}"}-\d{"{4}"}$</code>
                    </span>
                    <span>
                      {copy.regexLine4} <code>^[A-Za-z0-9._/-]{"{1,50}"}$</code>
                    </span>
                  </div>
                </div>
              </div>
              <div className="process-config-form-grid">
                <label>
                  <span>{copy.lotRegex}</span>
                  <input
                    className="app-input"
                    value={configState.validation.lotPattern}
                    onChange={(event) => updateValidation("lotPattern", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.lotMessage}</span>
                  <input
                    className="app-input"
                    value={configState.validation.lotMessage}
                    onChange={(event) => updateValidation("lotMessage", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.eanRegex}</span>
                  <input
                    className="app-input"
                    value={configState.validation.eanPattern}
                    onChange={(event) => updateValidation("eanPattern", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.eanMessage}</span>
                  <input
                    className="app-input"
                    value={configState.validation.eanMessage}
                    onChange={(event) => updateValidation("eanMessage", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.skuRegex}</span>
                  <input
                    className="app-input"
                    value={configState.validation.skuPattern}
                    onChange={(event) => updateValidation("skuPattern", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.skuMessage}</span>
                  <input
                    className="app-input"
                    value={configState.validation.skuMessage}
                    onChange={(event) => updateValidation("skuMessage", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.quantityWarn}</span>
                  <input
                    className="app-input"
                    type="number"
                    min="1"
                    value={configState.validation.quantityWarningThreshold}
                    onChange={(event) =>
                      updateValidation("quantityWarningThreshold", Number(event.target.value) || 0)
                    }
                  />
                </label>

                <label>
                  <span>{copy.quantityHard}</span>
                  <input
                    className="app-input"
                    type="number"
                    min="1"
                    value={configState.validation.quantityHardLimit}
                    onChange={(event) =>
                      updateValidation("quantityHardLimit", Number(event.target.value) || 0)
                    }
                  />
                </label>

                <label>
                  <span>{copy.quantityHardMessage}</span>
                  <input
                    className="app-input"
                    value={configState.validation.quantityHardLimitMessage}
                    onChange={(event) => updateValidation("quantityHardLimitMessage", event.target.value)}
                  />
                </label>

                <label>
                  <span>{copy.locationTimeout}</span>
                  <input
                    className="app-input"
                    type="number"
                    min="1000"
                    step="1000"
                    value={configState.validation.locationTimeoutMs}
                    onChange={(event) =>
                      updateValidation("locationTimeoutMs", Number(event.target.value) || 0)
                    }
                  />
                </label>

                <label>
                  <span>{copy.saveTimeout}</span>
                  <input
                    className="app-input"
                    type="number"
                    min="1000"
                    step="1000"
                    value={configState.validation.saveTimeoutMs}
                    onChange={(event) =>
                      updateValidation("saveTimeoutMs", Number(event.target.value) || 0)
                    }
                  />
                </label>

                <label>
                  <span>{copy.saveRetry}</span>
                  <input
                    className="app-input"
                    type="number"
                    min="0"
                    value={configState.validation.saveRetries}
                    onChange={(event) => updateValidation("saveRetries", Number(event.target.value) || 0)}
                  />
                </label>

                <label>
                  <span>{copy.fetchRetry}</span>
                  <input
                    className="app-input"
                    type="number"
                    min="0"
                    value={configState.validation.fetchRetries}
                    onChange={(event) => updateValidation("fetchRetries", Number(event.target.value) || 0)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="app-card" style={{ marginTop: 18 }}>
            <div className="system-status-section-header">
              <div>
                <h3>{copy.historyTitle}</h3>
                <p>{copy.historyDesc}</p>
              </div>
            </div>

            {historyRows.length ? (
              <div className="dashboard-table-scroll">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>{copy.time}</th>
                      <th>{copy.user}</th>
                      <th>{copy.action}</th>
                      <th>{copy.scope}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.timestamp ? new Date(row.timestamp).toLocaleString(locale) : "-"}</td>
                        <td>{row.userName || row.userEmail || row.userId || "-"}</td>
                        <td>{row.eventType || "-"}</td>
                        <td>{row.entity || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="app-empty-state">{copy.noHistory}</div>
            )}
          </div>
        </>
      ) : null}
      <LoadingOverlay
        open={saving}
        fullscreen
        message={copy.overlay}
      />
    </PageShell>
  );
}
