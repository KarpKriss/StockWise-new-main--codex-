import {
  AlertTriangle,
  FileClock,
  History,
  ShieldAlert,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import {
  fetchAuthLogs,
  fetchConfigChangeLogs,
  fetchErrorLogs,
  fetchLogUsers,
  fetchUserActionLogs,
} from "../../core/api/logsApi";

const LOG_TABS = [
  {
    key: "user-actions",
    title: "Dzialania uzytkownika",
    description: "Krok po kroku: co robil konkretny operator i jakie akcje dotknely backendu.",
    icon: UserRoundSearch,
  },
  {
    key: "config",
    title: "Zmiany configu",
    description: "Historia zmian procesu i konfiguracji admina.",
    icon: ShieldAlert,
  },
  {
    key: "auth",
    title: "Logi logowania",
    description: "Udane i nieudane logowania, blokady oraz zdarzenia dostepowe.",
    icon: History,
  },
  {
    key: "errors",
    title: "Bledy i fetch failures",
    description: "Bledy klienta, nieudane requesty i zdarzenia techniczne.",
    icon: FileClock,
  },
];

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pl-PL", {
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
          setError(loadError.message || "Nie udalo sie pobrac logow");
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
      title="Log's"
      subtitle="Podzielone logi administracyjne: dzialania operatorow, zmiany konfiguracji, logowania i bledy aplikacyjne."
      icon={<FileClock size={26} />}
      backTo="/admin"
      backLabel="Powrot do ustawien"
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
              <span className="helper-note">Filtr uzytkownika</span>
              <select
                className="app-input"
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
              >
                <option value="">Wszyscy uzytkownicy</option>
                {users.map((user) => (
                  <option key={user.userId || user.email} value={user.userId || ""}>
                    {user.name} {user.email ? `(${user.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="helper-note">
              Ta zakladka pokazuje logi globalne dla calej aplikacji.
            </div>
          )}
        </div>
      </div>

      {error ? <div className="input-error-text">{error}</div> : null}

      <div className="app-card">
        {loading ? (
          <div className="app-empty-state">Pobieram logi...</div>
        ) : rows.length ? (
          <div className="dashboard-table-scroll">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Czas</th>
                  <th>Uzytkownik</th>
                  <th>Zdarzenie</th>
                  <th>Obszar</th>
                  <th>Status</th>
                  <th>Szczegoly</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tone = getStatusTone(row.status);
                  return (
                    <tr key={row.id}>
                      <td>{formatDateTime(row.timestamp)}</td>
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
                          Pokaz
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="app-empty-state">Brak logow dla wybranej kategorii i filtrow.</div>
        )}
      </div>

      {selectedLog ? (
        <div className="app-card">
          <div className="system-status-section-header">
            <div>
              <h3>Szczegoly wpisu</h3>
              <p>{selectedLog.eventType || selectedLog.message || "Wybrane zdarzenie"}</p>
            </div>
            <button
              type="button"
              className="app-button app-button--secondary app-button--md"
              onClick={() => setSelectedLog(null)}
            >
              Zamknij
            </button>
          </div>

          <div className="confirm-card" style={{ marginBottom: 12 }}>
            <div className="confirm-row">
              <span>Uzytkownik</span>
              <span>{selectedLog.userName || selectedLog.userEmail || "-"}</span>
            </div>
            <div className="confirm-row">
              <span>Czas</span>
              <span>{formatDateTime(selectedLog.timestamp)}</span>
            </div>
            <div className="confirm-row">
              <span>Zdarzenie</span>
              <span>{selectedLog.eventType || "-"}</span>
            </div>
            <div className="confirm-row">
              <span>Obszar</span>
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
