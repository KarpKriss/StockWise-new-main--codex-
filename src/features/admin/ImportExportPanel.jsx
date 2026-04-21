import {
  ArrowLeftRight,
  Boxes,
  FileSpreadsheet,
  FileCog,
  History,
  MapPinned,
  Package,
  PlayCircle,
  Save,
  Tag,
  Upload,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LoadingOverlay from "../../components/loaders/LoadingOverlay";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import { useAuth } from "../../core/auth/AppAuth";
import {
  fetchImportExportMapping,
  fetchImportExportPreviewSample,
  saveImportExportMapping,
  validateImportExportEntityMapping,
} from "../../core/api/importExportConfigApi";
import {
  getDefaultImportExportMapping,
  IMPORT_EXPORT_ENTITIES,
} from "../../core/config/importExportDefaults";
import { getEntityDefinition, mergeImportExportMapping } from "../../core/utils/importExportMapping";
import { parseTabularFile } from "../../utils/tabularFile";
import { exportToCSV } from "../../utils/csvExport";
import { useAppPreferences } from "../../core/preferences/AppPreferences";

const ENTITY_ICONS = {
  products: Package,
  stock: Warehouse,
  prices: Tag,
  locations: MapPinned,
  corrections: History,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function SectionCard({ title, description, children }) {
  return (
    <div className="process-section-card import-config-section-card">
      <h3 className="process-section-card__title">{title}</h3>
      {description ? <p className="process-panel__subtitle">{description}</p> : null}
      {children}
    </div>
  );
}

export default function ImportExportPanel() {
  const { user } = useAuth();
  const { language } = useAppPreferences();
  const [mapping, setMapping] = useState(getDefaultImportExportMapping());
  const [selectedEntity, setSelectedEntity] = useState("stock");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");
  const [uploadedHeaders, setUploadedHeaders] = useState([]);
  const [templateSample, setTemplateSample] = useState([]);
  const [exportSample, setExportSample] = useState([]);
  const [templatePreparing, setTemplatePreparing] = useState(false);

  const copy = {
    pl: {
      loadError: "Nie udalo sie pobrac konfiguracji mapowania",
      saveError: "Nie udalo sie zapisac konfiguracji",
      templateReadError: "Nie udalo sie odczytac naglowkow pliku",
      noExportSample: "Brak danych probnych do wygenerowania testowego eksportu.",
      testExportError: "Nie udalo sie wygenerowac testowego eksportu",
      title: "Import / Export",
      subtitle: "Mapuj kolumny wejsciowe i naglowki eksportu dla danych referencyjnych bez zmian w kodzie.",
      backLabel: "Powrot do ustawien",
      restoreDefaults: "Przywroc domyslne",
      uploadTemplate: "Wgraj formatke",
      testExport: "Test eksportu",
      saveMapping: "Zapisz mapowanie",
      loading: "Ladowanie konfiguracji import/export...",
      saved: (title) => `Mapowanie dla sekcji "${title}" zostalo zapisane.`,
      sourceImport: "Import",
      noImport: "Bez importu",
      sourceExport: "Eksport",
      noExport: "Bez eksportu",
      readHeadersTitle: "Odczytane naglowki pliku",
      readHeadersDesc: "To wlasnie te kolumny mozna teraz wykorzystac do mapowania importu lub eksportu.",
      columnsCount: "kolumn",
      sampleLoaded: "Wczytano tez probke pierwszego wiersza pliku, wiec mozesz od razu porownac uklad danych z mapowaniem.",
      validationWarning: "Walidacja mapowania wykryla problemy. Zapis jest ryzykowny, dopoki ich nie poprawisz.",
      importMapping: "Mapowanie importu",
      importMappingDesc: "Wskaz, z jakiej kolumny pliku pobierac konkretne pole. Mozesz mapowac po nazwie naglowka lub po numerze kolumny.",
      noImportDesc: "Dla tego panelu import nie jest obslugiwany, bo to widok historyczny i auditowy.",
      exportOnly: "Ten obszar ma tylko konfiguracje eksportu.",
      fieldRequired: "Pole wymagane",
      fieldOptional: "Pole opcjonalne",
      mappingMode: "Tryb mapowania",
      header: "Naglowek",
      columnNumber: "Numer kolumny",
      columnName: "Nazwa naglowka",
      headerName: "Naglowek",
      placeholderIndex: "Np. 4",
      placeholderHeader: "Np. sku albo ilosc",
      exportMapping: "Mapowanie eksportu",
      exportMappingDesc: "Ustaw kolejnosc kolumn, ich nazwy w pliku i to, ktore dane maja trafic do eksportu.",
      visibility: "Widocznosc",
      active: "Aktywna",
      exportHeader: "Naglowek eksportu",
      exportHeaderPlaceholder: "Naglowek w eksporcie",
      sourceField: "Dane z pola",
      previewTitle: "Podglad eksportu",
      previewDesc: "Probka pokazuje, jak bedzie wygladal pojedynczy rekord po zastosowaniu aktualnego mapowania.",
      previewHeader: "Naglowek eksportu",
      previewValue: "Przykladowa wartosc",
      noPreview: "Brak probki danych dla tej sekcji. Zapis mapowania nadal jest mozliwy, ale test eksportu nie wygeneruje pliku.",
      saveOverlay: "Zapisuje mapowanie importu i eksportu dla wybranego obszaru danych...",
      templateOverlay: "Odczytuje formatke i analizuje naglowki pliku...",
      editorSubtitle: "Skonfiguruj osobno import i eksport dla tego obszaru danych.",
    },
    en: {
      loadError: "Failed to load mapping configuration",
      saveError: "Failed to save configuration",
      templateReadError: "Failed to read file headers",
      noExportSample: "No sample data available to generate a test export.",
      testExportError: "Failed to generate test export",
      title: "Import / Export",
      subtitle: "Map input columns and export headers for reference data without changing code.",
      backLabel: "Back to settings",
      restoreDefaults: "Restore defaults",
      uploadTemplate: "Upload template",
      testExport: "Test export",
      saveMapping: "Save mapping",
      loading: "Loading import/export configuration...",
      saved: (title) => `Mapping for section "${title}" has been saved.`,
      sourceImport: "Import",
      noImport: "No import",
      sourceExport: "Export",
      noExport: "No export",
      readHeadersTitle: "Read file headers",
      readHeadersDesc: "These are the columns you can now use for import or export mapping.",
      columnsCount: "columns",
      sampleLoaded: "A sample first row was also loaded, so you can compare the layout with the mapping immediately.",
      validationWarning: "Mapping validation detected issues. Saving is risky until you fix them.",
      importMapping: "Import mapping",
      importMappingDesc: "Choose which file column provides each field. You can map by header name or by column number.",
      noImportDesc: "Import is not supported for this panel because it is a historical and audit view.",
      exportOnly: "This area only supports export configuration.",
      fieldRequired: "Required field",
      fieldOptional: "Optional field",
      mappingMode: "Mapping mode",
      header: "Header",
      columnNumber: "Column number",
      columnName: "Header name",
      headerName: "Header",
      placeholderIndex: "e.g. 4",
      placeholderHeader: "e.g. sku or quantity",
      exportMapping: "Export mapping",
      exportMappingDesc: "Set column order, file header names, and which fields should be included in exports.",
      visibility: "Visibility",
      active: "Active",
      exportHeader: "Export header",
      exportHeaderPlaceholder: "Header in export",
      sourceField: "Field source",
      previewTitle: "Export preview",
      previewDesc: "The sample shows how a single record will look after applying the current mapping.",
      previewHeader: "Export header",
      previewValue: "Sample value",
      noPreview: "No sample data is available for this section. You can still save the mapping, but test export will not generate a file.",
      saveOverlay: "Saving import and export mapping for the selected data area...",
      templateOverlay: "Reading the template and analyzing file headers...",
      editorSubtitle: "Configure import and export separately for this data area.",
    },
    de: {
      loadError: "Mapping-Konfiguration konnte nicht geladen werden",
      saveError: "Konfiguration konnte nicht gespeichert werden",
      templateReadError: "Dateikopfzeilen konnten nicht gelesen werden",
      noExportSample: "Keine Beispieldaten fuer einen Testexport vorhanden.",
      testExportError: "Testexport konnte nicht erstellt werden",
      title: "Import / Export",
      subtitle: "Ordne Eingabespalten und Exportkopfzeilen fuer Referenzdaten zu, ohne den Code zu aendern.",
      backLabel: "Zurueck zu Einstellungen",
      restoreDefaults: "Standard wiederherstellen",
      uploadTemplate: "Vorlage hochladen",
      testExport: "Testexport",
      saveMapping: "Mapping speichern",
      loading: "Import-/Export-Konfiguration wird geladen...",
      saved: (title) => `Mapping fuer Bereich "${title}" wurde gespeichert.`,
      sourceImport: "Import",
      noImport: "Kein Import",
      sourceExport: "Export",
      noExport: "Kein Export",
      readHeadersTitle: "Gelesene Dateikopfzeilen",
      readHeadersDesc: "Diese Spalten koennen jetzt fuer Import- oder Export-Mapping verwendet werden.",
      columnsCount: "Spalten",
      sampleLoaded: "Es wurde auch ein Beispiel der ersten Zeile geladen, damit du das Layout sofort mit dem Mapping vergleichen kannst.",
      validationWarning: "Die Mapping-Pruefung hat Probleme erkannt. Speichern ist riskant, bis sie behoben sind.",
      importMapping: "Import-Mapping",
      importMappingDesc: "Lege fest, aus welcher Dateispalte jedes Feld gelesen wird. Mapping ist nach Kopfzeile oder Spaltennummer moeglich.",
      noImportDesc: "Import wird fuer dieses Panel nicht unterstuetzt, weil es sich um eine Historien- und Auditansicht handelt.",
      exportOnly: "Dieser Bereich unterstuetzt nur Export-Konfiguration.",
      fieldRequired: "Pflichtfeld",
      fieldOptional: "Optionales Feld",
      mappingMode: "Mapping-Modus",
      header: "Kopfzeile",
      columnNumber: "Spaltennummer",
      columnName: "Kopfzeilenname",
      headerName: "Kopfzeile",
      placeholderIndex: "z. B. 4",
      placeholderHeader: "z. B. sku oder menge",
      exportMapping: "Export-Mapping",
      exportMappingDesc: "Lege Spaltenreihenfolge, Dateikopfzeilen und exportierte Felder fest.",
      visibility: "Sichtbarkeit",
      active: "Aktiv",
      exportHeader: "Export-Kopfzeile",
      exportHeaderPlaceholder: "Kopfzeile im Export",
      sourceField: "Datenfeld",
      previewTitle: "Exportvorschau",
      previewDesc: "Das Beispiel zeigt, wie ein einzelner Datensatz nach Anwendung des aktuellen Mappings aussieht.",
      previewHeader: "Export-Kopfzeile",
      previewValue: "Beispielwert",
      noPreview: "Fuer diesen Bereich sind keine Beispieldaten verfuegbar. Das Mapping kann trotzdem gespeichert werden, aber der Testexport erzeugt keine Datei.",
      saveOverlay: "Import- und Export-Mapping fuer den ausgewaehlten Datenbereich wird gespeichert...",
      templateOverlay: "Vorlage wird gelesen und Dateikopfzeilen werden analysiert...",
      editorSubtitle: "Konfiguriere Import und Export separat fuer diesen Datenbereich.",
    },
  }[language];

  const entityLabels = {
    products: {
      pl: { title: "Produkty", description: "Mapowanie plikow z indeksami SKU, wieloma kodami EAN i nazwami referencyjnymi." },
      en: { title: "Products", description: "Map files with SKU indexes, multiple EAN codes, and reference names." },
      de: { title: "Produkte", description: "Dateien mit SKU-Indizes, mehreren EAN-Codes und Referenznamen zuordnen." },
    },
    stock: {
      pl: { title: "Stock", description: "Mapowanie stanow magazynowych po lokalizacji, SKU lub EAN, LOT i ilosci." },
      en: { title: "Stock", description: "Map warehouse stock by location, SKU or EAN, lot, and quantity." },
      de: { title: "Bestand", description: "Bestandsdaten nach Lagerplatz, SKU oder EAN, LOT und Menge zuordnen." },
    },
    prices: {
      pl: { title: "Ceny", description: "Mapowanie cen wykorzystywanych w raportach finansowych." },
      en: { title: "Prices", description: "Map prices used in financial reports." },
      de: { title: "Preise", description: "Zuordnung von Preisen fuer Finanzberichte." },
    },
    locations: {
      pl: { title: "Mapa magazynu", description: "Mapowanie kodow lokalizacji, stref, alei, poziomow, typow lokalizacji i statusow operacyjnych." },
      en: { title: "Warehouse map", description: "Map location codes, zones, aisles, levels, location types, and operational statuses." },
      de: { title: "Lagerplan", description: "Lagerplatzcodes, Zonen, Gange, Ebenen, Lokationstypen und operative Status zuordnen." },
    },
    corrections: {
      pl: { title: "Historia", description: "Mapowanie naglowkow eksportu dla historii korekt i problemow." },
      en: { title: "History", description: "Map export headers for correction and problem history." },
      de: { title: "Historie", description: "Export-Kopfzeilen fuer Korrektur- und Problemhistorie zuordnen." },
    },
  };

  const fieldLabelOverrides = {
    products: {
      name: { en: "Name", de: "Name" },
      status: { en: "Status", de: "Status" },
      ean: { en: "EAN / codes", de: "EAN / Codes" },
    },
    stock: {
      location_code: { en: "Location", de: "Lagerplatz" },
      quantity: { en: "Quantity", de: "Menge" },
      zone: { en: "Zone", de: "Zone" },
      expiry_date: { en: "Expiry date", de: "Verfallsdatum" },
    },
    prices: {
      price: { en: "Price", de: "Preis" },
    },
    locations: {
      code: { en: "Location code", de: "Lagerplatzcode" },
      zone: { en: "Zone", de: "Zone" },
      aisle: { en: "Aisle", de: "Gang" },
      level: { en: "Level", de: "Ebene" },
      location_type: { en: "Location type", de: "Lokationstyp" },
      status: { en: "Status", de: "Status" },
    },
    corrections: {
      created_at: { en: "Date", de: "Datum" },
      user_id: { en: "Operator", de: "Operator" },
      reason: { en: "Reason", de: "Grund" },
      old_value: { en: "Old value", de: "Alter Wert" },
      new_value: { en: "New value", de: "Neuer Wert" },
    },
  };

  useEffect(() => {
    async function loadMapping() {
      try {
        setLoading(true);
        const next = await fetchImportExportMapping(user?.site_id || null);
        setMapping(mergeImportExportMapping(next));
        setError("");
        setSaveInfo("");
      } catch (err) {
        setError(err.message || copy.loadError);
      } finally {
        setLoading(false);
      }
    }

    loadMapping();
  }, [user?.site_id, copy.loadError]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        const sample = await fetchImportExportPreviewSample(selectedEntity, mapping);
        if (!cancelled) {
          setExportSample(sample);
        }
      } catch (err) {
        if (!cancelled) {
          setExportSample([]);
        }
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [mapping, selectedEntity]);

  const entity = getEntityDefinition(selectedEntity);
  const entityMapping = useMemo(() => mergeImportExportMapping(mapping).entities[selectedEntity], [mapping, selectedEntity]);

  function updateImportField(fieldKey, patch) {
    setSaveInfo("");
    setMapping((current) => {
      const next = clone(mergeImportExportMapping(current));
      next.entities[selectedEntity].import.fields[fieldKey] = {
        ...next.entities[selectedEntity].import.fields[fieldKey],
        ...patch,
      };
      return next;
    });
  }

  function updateExportColumn(index, patch) {
    setSaveInfo("");
    setMapping((current) => {
      const next = clone(mergeImportExportMapping(current));
      next.entities[selectedEntity].export.columns[index] = {
        ...next.entities[selectedEntity].export.columns[index],
        ...patch,
      };
      return next;
    });
  }

  function resetSelectedEntity() {
    setSaveInfo("");
    setMapping((current) => {
      const defaults = getDefaultImportExportMapping();
      const next = clone(mergeImportExportMapping(current));
      next.entities[selectedEntity] = defaults.entities[selectedEntity];
      return next;
    });
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSaveInfo("");
      const validationErrors = validateImportExportEntityMapping(entity, entityMapping);
      if (validationErrors.length) {
        throw new Error(validationErrors[0]);
      }
      const saved = await saveImportExportMapping(user?.site_id || null, mapping);
      setMapping(mergeImportExportMapping(saved));
      setSaveInfo(copy.saved(entity.title));
    } catch (err) {
      setError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  function handleTemplateUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setTemplatePreparing(true);
        const parsed = await parseTabularFile(file);
        setUploadedHeaders(parsed.headers || []);
        setTemplateSample((parsed.rawRows || []).slice(0, 1));
        setError("");
      } catch (err) {
        setError(err.message || copy.templateReadError);
      } finally {
        setTemplatePreparing(false);
      }
    };
    input.click();
  }

  function handleTestExport() {
    try {
      const validationErrors = validateImportExportEntityMapping(entity, entityMapping);
      if (validationErrors.length) {
        throw new Error(validationErrors[0]);
      }

      if (!exportSample.length) {
        throw new Error(copy.noExportSample);
      }

      exportToCSV({
        data: [
          exportSample.reduce((acc, item) => {
            acc[item.header] = item.value;
            return acc;
          }, {}),
        ],
        columns: exportSample.map((item) => ({ key: item.header, label: item.header })),
        fileName: `test-export-${selectedEntity}.csv`,
      });
    } catch (err) {
      setError(err.message || copy.testExportError);
    }
  }

  const validationErrors = useMemo(
    () => validateImportExportEntityMapping(entity, entityMapping),
    [entity, entityMapping],
  );

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<ArrowLeftRight size={26} />}
      backTo="/admin"
      backLabel={copy.backLabel}
      actions={
        <>
          <Button variant="secondary" onClick={resetSelectedEntity}>
            {copy.restoreDefaults}
          </Button>
          <Button variant="secondary" onClick={handleTemplateUpload}>
            <Upload size={16} />
            {copy.uploadTemplate}
          </Button>
          <Button variant="secondary" onClick={handleTestExport}>
            <PlayCircle size={16} />
            {copy.testExport}
          </Button>
          <Button loading={saving} onClick={handleSave}>
            <Save size={16} />
            {copy.saveMapping}
          </Button>
        </>
      }
    >
      {error ? <div className="input-error-text">{error}</div> : null}
      {saveInfo ? <div className="helper-note">{saveInfo}</div> : null}
      {loading ? <div className="app-card">{copy.loading}</div> : null}

      {!loading ? (
        <>
          <div className="app-grid app-grid--cards import-config-grid">
            {Object.values(IMPORT_EXPORT_ENTITIES).map((item) => {
              const Icon = ENTITY_ICONS[item.key] || FileCog;
              const active = selectedEntity === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`card selectable import-config-tile ${active ? "import-config-tile--active" : ""}`}
                  onClick={() => setSelectedEntity(item.key)}
                >
                  <div className="menu-card__icon">
                    <Icon size={22} />
                  </div>
                  <div className="card-title" style={{ marginTop: 14 }}>{item.title}</div>
                  <div className="card-desc">{item.description}</div>
                </button>
              );
            })}
          </div>

          <div className="app-card import-config-editor-card">
            <div className="app-module-panel__header import-config-editor-card__header">
              <div>
                <h2 className="process-panel__title" style={{ fontSize: 28 }}>{entity.title}</h2>
                <p className="process-panel__subtitle">{copy.editorSubtitle}</p>
              </div>
              <span className="history-status-chip">
                {entity.supportsImport ? copy.sourceImport : copy.noImport} / {entity.supportsExport ? copy.sourceExport : copy.noExport}
              </span>
            </div>

            {uploadedHeaders.length ? (
              <div className="app-card" style={{ marginBottom: 18 }}>
                <div className="system-status-section-header">
                  <div>
                    <h3>{copy.readHeadersTitle}</h3>
                    <p>{copy.readHeadersDesc}</p>
                  </div>
                  <span className="history-status-chip">
                    <FileSpreadsheet size={14} style={{ marginRight: 6 }} />
                    {uploadedHeaders.length} {copy.columnsCount}
                  </span>
                </div>
                <div className="import-config-header-list">
                  {uploadedHeaders.map((header, index) => (
                    <span key={`${header}-${index}`} className="history-status-chip">
                      {index + 1}. {header}
                    </span>
                  ))}
                </div>
                {templateSample.length ? (
                  <div className="helper-note" style={{ marginTop: 12 }}>
                    {copy.sampleLoaded}
                  </div>
                ) : null}
              </div>
            ) : null}

            {validationErrors.length ? (
              <div className="app-card" style={{ marginBottom: 18 }}>
                <div className="input-error-text" style={{ marginBottom: 10 }}>
                  {copy.validationWarning}
                </div>
                <ul className="process-panel__list">
                  {validationErrors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="import-config-editor-layout">
              <SectionCard
                title={copy.importMapping}
                description={
                  entity.supportsImport
                    ? copy.importMappingDesc
                    : copy.noImportDesc
                }
              >
                {entity.supportsImport ? (
                  <div className="import-mapping-list">
                    {entity.importFields.map((field) => {
                      const fieldConfig = entityMapping.import.fields[field.key] || { mode: "header", value: field.aliases?.[0] || field.key };
                      return (
                        <div className="import-mapping-row import-mapping-row--import" key={field.key}>
                          <div className="import-mapping-row__meta">
                            <div className="import-mapping-row__title">{field.label}</div>
                            <div className="helper-note">
                              {field.required ? copy.fieldRequired : copy.fieldOptional}
                            </div>
                          </div>
                          <div className="import-mapping-row__controls import-mapping-row__controls--import">
                            <div className="import-mapping-row__control">
                              <label className="app-field__label">{copy.mappingMode}</label>
                              <select
                                className="import-mapping-input"
                                value={fieldConfig.mode}
                                onChange={(event) => updateImportField(field.key, { mode: event.target.value })}
                              >
                                <option value="header">{copy.header}</option>
                                <option value="index">{copy.columnNumber}</option>
                              </select>
                            </div>
                            <div className="import-mapping-row__control">
                              <label className="app-field__label">
                                {fieldConfig.mode === "index" ? copy.columnNumber : copy.columnName}
                              </label>
                              <input
                                className="import-mapping-input"
                                type={fieldConfig.mode === "index" ? "number" : "text"}
                                min={1}
                                value={fieldConfig.value || ""}
                                onChange={(event) => updateImportField(field.key, { value: event.target.value })}
                                placeholder={fieldConfig.mode === "index" ? copy.placeholderIndex : copy.placeholderHeader}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="app-empty-state">{copy.exportOnly}</div>
                )}
              </SectionCard>

              <SectionCard
                title={copy.exportMapping}
                description={copy.exportMappingDesc}
              >
                <div className="import-mapping-list">
                  {entityMapping.export.columns.map((column, index) => (
                    <div className="import-mapping-row import-mapping-row--export" key={column.id || `${column.source}-${index}`}>
                      <div className="import-mapping-row__controls import-mapping-row__controls--export">
                        <div className="import-mapping-row__control">
                          <label className="app-field__label">{copy.visibility}</label>
                          <label className="import-export-toggle import-export-toggle--card">
                            <input
                              type="checkbox"
                              checked={column.enabled !== false}
                              onChange={(event) => updateExportColumn(index, { enabled: event.target.checked })}
                            />
                            <span>{copy.active}</span>
                          </label>
                        </div>
                        <div className="import-mapping-row__control">
                          <label className="app-field__label">{copy.exportHeader}</label>
                          <input
                            className="import-mapping-input"
                            type="text"
                            value={column.header || ""}
                            onChange={(event) => updateExportColumn(index, { header: event.target.value })}
                            placeholder={copy.exportHeaderPlaceholder}
                          />
                        </div>
                        <div className="import-mapping-row__control">
                          <label className="app-field__label">{copy.sourceField}</label>
                          <select
                            className="import-mapping-input"
                            value={column.source}
                            onChange={(event) => updateExportColumn(index, { source: event.target.value })}
                          >
                            {entity.exportFields.map((field) => (
                              <option key={field.key} value={field.key}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="app-card" style={{ marginTop: 18 }}>
              <div className="system-status-section-header">
                <div>
                  <h3>{copy.previewTitle}</h3>
                  <p>{copy.previewDesc}</p>
                </div>
              </div>

              {exportSample.length ? (
                <div className="dashboard-table-scroll">
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>{copy.previewHeader}</th>
                        <th>{copy.previewValue}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportSample.map((item) => (
                        <tr key={item.header}>
                          <td>{item.header}</td>
                          <td>{String(item.value ?? "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="app-empty-state">
                  {copy.noPreview}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
      <LoadingOverlay
        open={saving}
        fullscreen
        message={copy.saveOverlay}
      />
      <LoadingOverlay
        open={templatePreparing}
        fullscreen
        message={copy.templateOverlay}
      />
    </PageShell>
  );
}
