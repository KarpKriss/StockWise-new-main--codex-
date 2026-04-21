import {
  AlertTriangle,
  FileClock,
  History,
  ShieldAlert,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import {
  fetchAuthLogs,
  fetchConfigChangeLogs,
  fetchErrorLogs,
  fetchLogUsers,
  fetchUserActionLogs,
} from "../../core/api/logsApi";

function formatDateTime(value, locale) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function getStatusTone(value) {
  const normalized = String(value || "").toLowerCase();

  if (["error", "critical", "false", "failed", "failure"].includes(normalized)) {
    return "critical";
  }

  if (["warning", "warn", "blocked"].includes(normalized)) {
    return "warning";
  }

  return "healthy";
}

export default function LogsPanel() {
  const { language, locale } = useAppPreferences();
  const copy = {
    pl: {
      tabs: {
        "user-actions": { title: "Dzialania uzytkownika", description: "Krok po kroku: co robil konkretny operator i jakie akcje dotknely backendu." },
        config: { title: "Zmiany configu", description: "Historia zmian procesu i konfiguracji admina." },
        auth: { title: "Logi logowania", description: "Udane i nieudane logowania, blokady oraz zdarzenia dostepowe." },
        errors: { title: "Bledy i fetch failures", description: "Bledy klienta, nieudane requesty i zdarzenia techniczne." },
      },
      loadError: "Nie udalo sie pobrac logow",
      title: "Logi",
      subtitle: "Podzielone logi administracyjne: dzialania operatorow, zmiany konfiguracji, logowania i bledy aplikacyjne.",
      backLabel: "Powrot do ustawien",
      userFilter: "Filtr uzytkownika",
      allUsers: "Wszyscy uzytkownicy",
      globalLogsHint: "Ta zakladka pokazuje logi globalne dla calej aplikacji.",
      loading: "Pobieram logi...",
      time: "Czas",
      user: "Uzytkownik",
      event: "Zdarzenie",
      area: "Obszar",
      status: "Status",
      details: "Szczegoly",
      show: "Pokaz",
      noLogs: "Brak logow dla wybranej kategorii i filtrow.",
      selectedEvent: "Wybrane zdarzenie",
      entryDetails: "Szczegoly wpisu",
      close: "Zamknij",
    },
    en: {
      tabs: {
        "user-actions": { title: "User actions", description: "Step by step: what a specific operator did and which actions affected the backend." },
        config: { title: "Config changes", description: "History of process and admin configuration changes." },
        auth: { title: "Auth logs", description: "Successful and failed logins, locks and access events." },
        errors: { title: "Errors and fetch failures", description: "Client errors, failed requests and technical events." },
      },
      loadError: "Could not load logs",
      title: "Logs",
      subtitle: "Split admin logs: operator actions, configuration changes, sign-ins and application errors.",
      backLabel: "Back to settings",
      userFilter: "User filter",
      allUsers: "All users",
      globalLogsHint: "This tab shows global logs for the whole application.",
      loading: "Loading logs...",
      time: "Time",
      user: "User",
      event: "Event",
      area: "Area",
      status: "Status",
      details: "Details",
      show: "Show",
      noLogs: "No logs for the selected category and filters.",
      selectedEvent: "Selected event",
      entryDetails: "Entry details",
      close: "Close",
    },
    de: {
      tabs: {
        "user-actions": { title: "Benutzeraktionen", description: "Schritt fur Schritt: was ein bestimmter Operator gemacht hat und welche Aktionen das Backend betroffen haben." },
        config: { title: "Konfigurationsaenderungen", description: "Historie von Prozess- und Admin-Konfigurationsaenderungen." },
        auth: { title: "Anmeldeprotokolle", description: "Erfolgreiche und fehlgeschlagene Anmeldungen, Sperren und Zugriffsereignisse." },
        errors: { title: "Fehler und Fetch-Failures", description: "Client-Fehler, fehlgeschlagene Requests und technische Ereignisse." },
      },
      loadError: "Logs konnten nicht geladen werden",
      title: "Logs",
      subtitle: "Getrennte Admin-Logs: Operatoraktionen, Konfigurationsaenderungen, Anmeldungen und Applikationsfehler.",
      backLabel: "Zuruck zu den Einstellungen",
      userFilter: "Benutzerfilter",
      allUsers: "Alle Benutzer",
      globalLogsHint: "Dieser Reiter zeigt globale Logs fur die gesamte Anwendung.",
      loading: "Logs werden geladen...",
      time: "Zeit",
      user: "Benutzer",
      event: "Ereignis",
      area: "Bereich",
      status: "Status",
      details: "Details",
      show: "Anzeigen",
      noLogs: "Keine Logs fur die gewahlte Kategorie und Filter.",
      selectedEvent: "Ausgewaehltes Ereignis",
      entryDetails: "Eintragsdetails",
      close: "Schliessen",
    },
  }[language];
  const LOG_TABS = [
    { key: "user-actions", icon: UserRoundSearch, ...copy.tabs["user-actions"] },
    { key: "config", icon: ShieldAlert, ...copy.tabs.config },
    { key: "auth", icon: History, ...copy.tabs.auth },
    { key: "errors", icon: FileClock, ...copy.tabs.errors },
  ];
  const [activeTab, setActiveTab] = useState("user-actions");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchLogUsers()
      .then((result) => {
        if (!cancelled) {
          setUsers(result);
        }
      })
      .catch((loadError) => {
        console.error("LOG USERS LOAD ERROR:", loadError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        setLoading(true);
        setError("");
        let result = [];

        if (activeTab === "user-actions") {
          result = await fetchUserActionLogs({ userId: selectedUser || null });
        } else if (activeTab === "config") {
          result = await fetchConfigChangeLogs();
        } else if (activeTab === "auth") {
          result = await fetchAuthLogs({ userId: selectedUser || null });
        } else {
          result = await fetchErrorLogs();
        }

        if (!cancelled) {
          setRows(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || copy.loadError);
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedUser]);

  const currentTab = useMemo(
    () => LOG_TABS.find((item) => item.key === activeTab) || LOG_TABS[0],
    [activeTab],
  );

  const needsUserFilter = activeTab === "user-actions" || activeTab === "auth";

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<FileClock size={26} />}
      backTo="/admin"
      backLabel={copy.backLabel}
      actions={
        <div className="system-status-section-summary">
          {LOG_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`app-button app-button--md ${activeTab === item.key ? "app-button--primary" : "app-button--secondary"}`}
              onClick={() => setActiveTab(item.key)}
            >
              <item.icon size={16} />
              {item.title}
            </button>
          ))}
        </div>
      }
    >
      <div className="app-card">
        <div className="system-status-section-header">
          <div>
            <h3>{currentTab.title}</h3>
            <p>{currentTab.description}</p>
          </div>
        </div>

        <div className="process-config-layout-grid">
          {needsUserFilter ? (
            <label>
              <span className="helper-note">{copy.userFilter}</span>
              <select
                className="app-input"
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
              >
                <option value="">{copy.allUsers}</option>
                {users.map((user) => (
                  <option key={user.userId || user.email} value={user.userId || ""}>
                    {user.name} {user.email ? `(${user.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="helper-note">
              {copy.globalLogsHint}
            </div>
          )}
        </div>
      </div>

      {error ? <div className="input-error-text">{error}</div> : null}

      <div className="app-card">
        {loading ? (
          <div className="app-empty-state">{copy.loading}</div>
        ) : rows.length ? (
          <div className="dashboard-table-scroll">
            <table className="app-table">
              <thead>
                <tr>
                  <th>{copy.time}</th>
                  <th>{copy.user}</th>
                  <th>{copy.event}</th>
                  <th>{copy.area}</th>
                  <th>{copy.status}</th>
                  <th>{copy.details}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tone = getStatusTone(row.status);
                  return (
                    <tr key={row.id}>
                      <td>{formatDateTime(row.timestamp, locale)}</td>
                      <td>{row.userName || row.userEmail || "-"}</td>
                      <td>{row.eventType || "-"}</td>
                      <td>{row.entity || "-"}</td>
                      <td>
                        <span className={`system-alert__pill system-alert__pill--${tone}`}>
                          {String(row.status || "info")}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="app-button app-button--secondary app-button--md"
                          onClick={() => setSelectedLog(row)}
                        >
                          {copy.show}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="app-empty-state">{copy.noLogs}</div>
        )}
      </div>

      {selectedLog ? (
        <div className="app-card">
          <div className="system-status-section-header">
            <div>
              <h3>{copy.entryDetails}</h3>
              <p>{selectedLog.eventType || selectedLog.message || copy.selectedEvent}</p>
            </div>
            <button
              type="button"
              className="app-button app-button--secondary app-button--md"
              onClick={() => setSelectedLog(null)}
            >
              {copy.close}
            </button>
          </div>

          <div className="confirm-card" style={{ marginBottom: 12 }}>
            <div className="confirm-row">
              <span>{copy.user}</span>
              <span>{selectedLog.userName || selectedLog.userEmail || "-"}</span>
            </div>
            <div className="confirm-row">
              <span>{copy.time}</span>
              <span>{formatDateTime(selectedLog.timestamp, locale)}</span>
            </div>
            <div className="confirm-row">
              <span>{copy.event}</span>
              <span>{selectedLog.eventType || "-"}</span>
            </div>
            <div className="confirm-row">
              <span>{copy.area}</span>
              <span>{selectedLog.entity || "-"}</span>
            </div>
          </div>

          <pre className="history-modal__payload">
            {JSON.stringify(selectedLog.payload || { message: selectedLog.message }, null, 2)}
          </pre>
        </div>
      ) : null}
    </PageShell>
  );
}
