import { ArrowRight, Download, FileUp, FolderSync } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";

const ACTIONS = [
  {
    title: "Import danych referencyjnych",
    description: "Przejdz do sekcji Dane, aby zaladowac produkty, stock, ceny i mape magazynu.",
    target: "/data",
    icon: FileUp,
  },
  {
    title: "Eksport raportow",
    description: "Skorzystaj z historii, dashboardu i korekt, aby pobrac aktualne zestawienia.",
    target: "/dashboard",
    icon: Download,
  },
  {
    title: "Konfiguracja przeplywu danych",
    description: "To miejsce jest przygotowane pod przyszle scenariusze automatycznych importow i eksportow.",
    target: "/admin",
    icon: FolderSync,
  },
];

export default function ImportExportPanel() {
  const navigate = useNavigate();

  return (
    <PageShell
      title="Import / Export"
      subtitle="Centralny punkt wejscia do operacji wsadowych i wymiany danych."
      icon={<FolderSync size={26} />}
      backTo="/admin"
      backLabel="Powrot do ustawien"
      compact
    >
      <div className="app-grid app-grid--cards">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              type="button"
              className="card selectable"
              onClick={() => navigate(action.target)}
              style={{ textAlign: "left", minHeight: 180 }}
            >
              <div className="menu-card__icon" style={{ marginBottom: 16 }}>
                <Icon size={20} />
              </div>
              <div className="card-title">{action.title}</div>
              <div className="card-desc">{action.description}</div>
              <div
                style={{
                  marginTop: 18,
                  color: "var(--app-primary-strong)",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Przejdz dalej <ArrowRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
