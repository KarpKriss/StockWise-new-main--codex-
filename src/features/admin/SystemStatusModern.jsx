import { ActivitySquare } from "lucide-react";
import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { fetchSystemStatus } from "../../core/api/adminApi";

export default function SystemStatusModern() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        setLoading(true);
        const result = await fetchSystemStatus();
        if (!cancelled) {
          setStatus(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Nie udalo sie pobrac statusu systemu");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell
      title="Statusy"
      subtitle="Przeglad statusu systemowego i miejsca na kolejne metryki srodowiskowe."
      icon={<ActivitySquare size={26} />}
      backTo="/admin"
      backLabel="Powrot do ustawien"
      compact
    >
      {loading ? <div className="app-card">Ladowanie statusu systemu...</div> : null}
      {error ? <div className="input-error-text">{error}</div> : null}

      {!loading && !error ? (
        <div className="app-card">
          {status ? (
            <div className="dashboard-table-scroll">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Pole</th>
                    <th>Wartosc</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(status).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{String(value ?? "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="app-empty-state">Brak danych statusowych do wyswietlenia.</div>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
