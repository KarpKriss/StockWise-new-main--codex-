import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Eye, FileWarning, Search } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import { exportToCSV } from "../../utils/csvExport";
import { fetchCorrectionRowsWithProblems } from "../../core/api/correctionRowsApi";
import { useAuth } from "../../core/auth/AppAuth";
import { fetchImportExportMapping } from "../../core/api/importExportConfigApi";
import { getMappedExportColumns } from "../../core/utils/importExportMapping";
import { useAppPreferences } from "../../core/preferences/AppPreferences";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale) : "-";
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function buildChangeRows(row) {
  const before = row.old_value || {};
  const after = row.new_value || {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return keys.map((key) => ({
    key,
    before: before[key],
    after: after[key],
  }));
}

export default function CorrectionsPanelModern() {
  const { user } = useAuth();
  const { language, locale } = useAppPreferences();
  const [rows, setRows] = useState([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapping, setMapping] = useState(null);

  const copy = {
    pl: {
      loadError: "Blad pobierania historii korekt",
      title: "Historia korekt",
      subtitle: "Pelna historia zmian operacji z before / after, powodem i komentarzem korekty.",
      backLabel: "Powrot do danych",
      export: "Eksport correction log",
      operator: "Operator",
      allOperators: "Wszyscy operatorzy",
      fromDate: "Od dnia",
      toDate: "Do dnia",
      search: "Szukaj",
      searchPlaceholder: "Powod, komentarz, entry id, before / after",
      loading: "Ladowanie historii korekt...",
      sectionTitle: "Zmiany operacji",
      sectionSubtitle: (count) => `${count} rekordow po zastosowaniu aktywnych filtrow.`,
      auditTrail: "Audit trail korekt",
      tableDate: "Data",
      tableWho: "Kto zmienil",
      tableEntryId: "Entry ID",
      tableReason: "Powod",
      tableComment: "Komentarz",
      tableDetails: "Szczegoly",
      show: "Pokaz",
      missing: "BRAK",
      empty: "Brak korekt spelniajacych filtry.",
      modalTitle: "Szczegoly korekty",
      close: "Zamknij",
      changedBy: "Kto zmienil",
      reason: "Powod",
      comment: "Komentarz",
      compareTitle: "Porownanie przed / po",
      field: "Pole",
      before: "Przed",
      after: "Po",
    },
    en: {
      loadError: "Failed to load correction history",
      title: "Correction history",
      subtitle: "Complete change history with before / after values, reason, and comment.",
      backLabel: "Back to data",
      export: "Export correction log",
      operator: "Operator",
      allOperators: "All operators",
      fromDate: "From date",
      toDate: "To date",
      search: "Search",
      searchPlaceholder: "Reason, comment, entry id, before / after",
      loading: "Loading correction history...",
      sectionTitle: "Operation changes",
      sectionSubtitle: (count) => `${count} records after applying active filters.`,
      auditTrail: "Correction audit trail",
      tableDate: "Date",
      tableWho: "Changed by",
      tableEntryId: "Entry ID",
      tableReason: "Reason",
      tableComment: "Comment",
      tableDetails: "Details",
      show: "Show",
      missing: "MISSING",
      empty: "No corrections match the current filters.",
      modalTitle: "Correction details",
      close: "Close",
      changedBy: "Changed by",
      reason: "Reason",
      comment: "Comment",
      compareTitle: "Before / after comparison",
      field: "Field",
      before: "Before",
      after: "After",
    },
    de: {
      loadError: "Korrekturverlauf konnte nicht geladen werden",
      title: "Korrekturverlauf",
      subtitle: "Vollstaendige Aenderungshistorie mit Vorher-/Nachher-Werten, Grund und Kommentar.",
      backLabel: "Zurueck zu Daten",
      export: "Korrekturprotokoll exportieren",
      operator: "Operator",
      allOperators: "Alle Operatoren",
      fromDate: "Von Datum",
      toDate: "Bis Datum",
      search: "Suchen",
      searchPlaceholder: "Grund, Kommentar, Entry-ID, Vorher / Nachher",
      loading: "Korrekturverlauf wird geladen...",
      sectionTitle: "Aenderungen an Vorgaengen",
      sectionSubtitle: (count) => `${count} Datensaetze nach Anwendung der aktiven Filter.`,
      auditTrail: "Korrektur-Audit-Trail",
      tableDate: "Datum",
      tableWho: "Geaendert von",
      tableEntryId: "Entry-ID",
      tableReason: "Grund",
      tableComment: "Kommentar",
      tableDetails: "Details",
      show: "Anzeigen",
      missing: "FEHLT",
      empty: "Keine Korrekturen entsprechen den aktuellen Filtern.",
      modalTitle: "Korrekturdetails",
      close: "Schliessen",
      changedBy: "Geaendert von",
      reason: "Grund",
      comment: "Kommentar",
      compareTitle: "Vorher / Nachher Vergleich",
      field: "Feld",
      before: "Vorher",
      after: "Nachher",
    },
  }[language];

  useEffect(() => {
    async function loadRows() {
      try {
        setLoading(true);
        setRows(await fetchCorrectionRowsWithProblems());
        setError("");
      } catch (err) {
        setError(err.message || copy.loadError);
      } finally {
        setLoading(false);
      }
    }

    loadRows();
  }, [copy.loadError]);

  useEffect(() => {
    async function loadMapping() {
      try {
        setMapping(await fetchImportExportMapping(user?.site_id || null));
      } catch (err) {
        console.error("CORRECTIONS MAPPING LOAD ERROR:", err);
      }
    }

    loadMapping();
  }, [user?.site_id]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      const matchesUser = selectedUser === "all" || row.user_id === selectedUser;
      const loweredSearch = search.trim().toLowerCase();
      const matchesSearch =
        !loweredSearch ||
        JSON.stringify(row.old_value || {}).toLowerCase().includes(loweredSearch) ||
        JSON.stringify(row.new_value || {}).toLowerCase().includes(loweredSearch) ||
        String(row.reason || "").toLowerCase().includes(loweredSearch) ||
        String(row.comment || "").toLowerCase().includes(loweredSearch) ||
        String(row.entry_id || "").toLowerCase().includes(loweredSearch);
      const matchesFrom = !dateFrom || (createdAt && createdAt >= new Date(`${dateFrom}T00:00:00`));
      const matchesTo = !dateTo || (createdAt && createdAt <= new Date(`${dateTo}T23:59:59`));

      return matchesUser && matchesSearch && matchesFrom && matchesTo;
    });
  }, [rows, selectedUser, search, dateFrom, dateTo]);

  const userOptions = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      if (row.user_id && !map.has(row.user_id)) {
        map.set(row.user_id, row.user_name || row.user_email || row.user_id);
      }
    });

    return [...map.entries()];
  }, [rows]);

  const exportRows = filteredRows.map((row) => ({
    created_at: formatDate(row.created_at),
    user_id: row.user_id || "",
    operator: row.user_name || row.user_email || row.user_id || "",
    entry_id: row.entry_id || "",
    reason: row.reason || "",
    comment: row.comment || "",
    old_value: JSON.stringify(row.old_value || {}),
    new_value: JSON.stringify(row.new_value || {}),
  }));

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<FileWarning size={26} />}
      backTo="/data"
      backLabel={copy.backLabel}
      actions={
        <Button
          variant="secondary"
          onClick={() =>
            exportToCSV({
              data: exportRows,
              columns: getMappedExportColumns("corrections", mapping),
              fileName: "correction-log.csv",
            })
          }
        >
          <Download size={16} />
          {copy.export}
        </Button>
      }
    >
      <div className="app-card history-toolbar-card">
        <div className="history-toolbar-row">
          <div className="app-field">
            <label className="app-field__label">{copy.operator}</label>
            <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
              <option value="all">{copy.allOperators}</option>
              {userOptions.map(([userId, label]) => (
                <option key={userId} value={userId}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="history-toolbar-row">
          <div className="app-field">
            <label className="app-field__label">{copy.fromDate}</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="app-field">
            <label className="app-field__label">{copy.toDate}</label>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>

          <div className="app-field history-toolbar-row__search">
            <label className="app-field__label">{copy.search}</label>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--app-text-soft)" }} />
              <input
                style={{ paddingLeft: 40 }}
                type="text"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="app-card">{copy.loading}</div> : null}
      {error ? <div className="input-error-text">{error}</div> : null}

      {!loading && !error ? (
        <div className="app-card">
          <div className="app-module-panel__header" style={{ marginBottom: 14 }}>
            <div>
              <h2 className="process-panel__title" style={{ fontSize: 24 }}>{copy.sectionTitle}</h2>
              <p className="process-panel__subtitle">{copy.sectionSubtitle(filteredRows.length)}</p>
            </div>
            <span className="history-status-chip">
              <CalendarDays size={14} style={{ marginRight: 6 }} />
              {copy.auditTrail}
            </span>
          </div>

          <div className="dashboard-table-scroll">
            <table className="app-table">
              <thead>
                <tr>
                  <th>{copy.tableDate}</th>
                  <th>{copy.tableWho}</th>
                  <th>{copy.tableEntryId}</th>
                  <th>{copy.tableReason}</th>
                  <th>{copy.tableComment}</th>
                  <th>{copy.tableDetails}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.created_at, locale)}</td>
                    <td>{row.user_name || row.user_email || row.user_id || copy.missing}</td>
                    <td>{row.entry_id || copy.missing}</td>
                    <td>{row.reason || "-"}</td>
                    <td>{row.comment || "-"}</td>
                    <td>
                      <Button variant="secondary" size="md" onClick={() => setSelectedRow(row)}>
                        <Eye size={16} />
                        {copy.show}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="app-empty-state">{copy.empty}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {selectedRow ? (
        <div className="history-modal-overlay" onClick={() => setSelectedRow(null)}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <h2 className="process-panel__title" style={{ fontSize: 26, margin: 0 }}>{copy.modalTitle}</h2>
                <p className="process-panel__subtitle">{formatDate(selectedRow.created_at, locale)} - {selectedRow.user_name || selectedRow.user_id || copy.missing}</p>
              </div>
              <Button variant="secondary" onClick={() => setSelectedRow(null)}>{copy.close}</Button>
            </div>

            <div className="process-meta-grid" style={{ marginBottom: 18 }}>
              <div className="process-meta-item">
                <div className="process-meta-item__label">{copy.changedBy}</div>
                <div className="process-meta-item__value">{selectedRow.user_name || selectedRow.user_email || selectedRow.user_id || copy.missing}</div>
              </div>
              <div className="process-meta-item">
                <div className="process-meta-item__label">{copy.reason}</div>
                <div className="process-meta-item__value">{selectedRow.reason || "-"}</div>
              </div>
              <div className="process-meta-item">
                <div className="process-meta-item__label">{copy.comment}</div>
                <div className="process-meta-item__value">{selectedRow.comment || "-"}</div>
              </div>
              <div className="process-meta-item">
                <div className="process-meta-item__label">Entry ID</div>
                <div className="process-meta-item__value">{selectedRow.entry_id || "-"}</div>
              </div>
            </div>

            <div className="process-section-card">
              <h3 className="process-section-card__title">{copy.compareTitle}</h3>
              <div className="dashboard-table-scroll">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>{copy.field}</th>
                      <th>{copy.before}</th>
                      <th>{copy.after}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildChangeRows(selectedRow).map((change) => (
                      <tr key={change.key}>
                        <td>{change.key}</td>
                        <td>{formatValue(change.before)}</td>
                        <td>{formatValue(change.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
