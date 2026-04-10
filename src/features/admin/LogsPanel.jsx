import { Activity, FileClock, History, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";

const LOG_TARGETS = [
  {
    title: "Historia inwentaryzacji",
    description: "Wpisy operacyjne z recznej inwentaryzacji i nadwyzek.",
    target: "/history",
    icon: History,
  },
  {
    title: "Historia korekt",
    description: "Zmiany danych oraz zgloszenia problemow z procesu pustych lokalizacji.",
    target: "/data/corrections",
    icon: ShieldAlert,
  },
  {
    title: "Statystyki operacyjne",
    description: "Szybki przeglad zagregowanych danych, sesji i wartosci finansowych.",
    target: "/dashboard",
    icon: Activity,
  },
  {
    title: "Logi systemowe",
    description: "Miejsce przygotowane pod przyszly widok logow technicznych i diagnostycznych.",
    target: "/admin/statuses",
    icon: FileClock,
  },
];

export default function LogsPanel() {
  const navigate = useNavigate();

  return (
    <PageShell
      title="Log's"
      subtitle="Skroty do najwazniejszych logow biznesowych, audytowych i systemowych."
      icon={<FileClock size={26} />}
      backTo="/admin"
      backLabel="Powrot do ustawien"
      compact
    >
      <div className="app-grid app-grid--cards">
        {LOG_TARGETS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              className="card selectable"
              onClick={() => navigate(item.target)}
              style={{ textAlign: "left", minHeight: 176 }}
            >
              <div className="menu-card__icon" style={{ marginBottom: 16 }}>
                <Icon size={20} />
              </div>
              <div className="card-title">{item.title}</div>
              <div className="card-desc">{item.description}</div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
