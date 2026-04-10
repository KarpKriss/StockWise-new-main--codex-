import { KeyRound, Shield, UserCog, Users } from "lucide-react";
import PageShell from "../../components/layout/PageShell";

const CARDS = [
  {
    title: "Zarzadzanie rolami",
    description: "Tu przygotujemy mapowanie uprawnien i widocznosci modulow dla poszczegolnych rol.",
    icon: Shield,
  },
  {
    title: "Tworzenie i edycja kont",
    description: "Widok jest gotowy jako punkt startowy pod przyszla tabele uzytkownikow i formularze.",
    icon: UserCog,
  },
  {
    title: "Reset hasel i blokady",
    description: "Miejsce pod akcje administratorskie zwiazane z bezpieczenstwem kont.",
    icon: KeyRound,
  },
];

export default function UserPanelModern() {
  return (
    <PageShell
      title="Uzytkownicy"
      subtitle="Sekcja administracyjna pod konta operatorow, role i bezpieczenstwo dostepu."
      icon={<Users size={26} />}
      backTo="/admin"
      backLabel="Powrot do ustawien"
      compact
    >
      <div className="app-card" style={{ marginBottom: 18 }}>
        <div className="process-panel__title" style={{ fontSize: 24 }}>Panel gotowy do rozbudowy</div>
        <p className="process-panel__subtitle">
          Trasa i layout sa gotowe. W kolejnym kroku mozemy podlaczyc realne dane z backendu i akcje administratorskie.
        </p>
      </div>

      <div className="app-grid app-grid--cards">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="app-card">
              <div className="menu-card__icon" style={{ marginBottom: 16 }}>
                <Icon size={20} />
              </div>
              <div className="card-title">{card.title}</div>
              <div className="card-desc">{card.description}</div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
