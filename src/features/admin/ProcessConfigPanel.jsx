import { SlidersHorizontal, ToggleLeft } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import { processConfig } from "./ProcessConfig";

export default function ProcessConfigPanel() {
  const rows = Object.entries(processConfig);

  return (
    <PageShell
      title="Konfiguracja procesu"
      subtitle="Podglad aktywnych krokow procesu i ich wymagalnosci w obecnej konfiguracji."
      icon={<SlidersHorizontal size={26} />}
      backTo="/admin"
      backLabel="Powrot do ustawien"
      compact
    >
      <div className="app-card">
        <div className="dashboard-table-scroll">
          <table className="app-table">
            <thead>
              <tr>
                <th>Krok</th>
                <th>Etykieta</th>
                <th>Wlaczony</th>
                <th>Obowiazkowy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value.label}</td>
                  <td>{value.enabled ? "Tak" : "Nie"}</td>
                  <td>{value.mandatory ? "Tak" : "Nie"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="app-card">
        <div className="menu-card__icon" style={{ marginBottom: 16 }}>
          <ToggleLeft size={20} />
        </div>
        <div className="card-title">Kolejny krok</div>
        <div className="card-desc">
          W nastepnej iteracji mozemy dopiac edycje tej konfiguracji z zapisem do backendu zamiast samego podgladu.
        </div>
      </div>
    </PageShell>
  );
}
