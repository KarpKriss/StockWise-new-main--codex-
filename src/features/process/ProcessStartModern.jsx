import { Boxes, ScanSearch, Workflow } from "lucide-react";
import { useState } from "react";
import LoadingOverlay from "../../components/loaders/LoadingOverlay";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import { useSession } from "../../core/session/AppSession";
import "../menu/menu-modern.css";

export default function ProcessStartModern() {
  const { startSession } = useSession();
  const [selectedType, setSelectedType] = useState(null);
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    if (!selectedType || starting) {
      return;
    }

    try {
      setStarting(true);
      await startSession(selectedType);
    } finally {
      setStarting(false);
    }
  }

  return (
    <PageShell
      title="Wybierz tryb pracy"
      subtitle="Rozpocznij proces, ktory najlepiej odpowiada Twojemu zadaniu na hali."
      icon={<Workflow size={26} />}
      backTo="/menu"
      compact
    >
      <div className="app-grid app-grid--cards">
        <button
          className={`card selectable ${selectedType === "empty" ? "active" : ""}`}
          onClick={() => setSelectedType("empty")}
        >
          <div className="menu-card__icon">
            <Boxes size={22} />
          </div>
          <div className="card-title" style={{ marginTop: 14 }}>
            Inwentaryzuj puste
          </div>
          <div className="card-desc">
            Kontrola pustych lokalizacji, potwierdzenia, nadwyzki i zgloszenia problemow.
          </div>
        </button>

        <button
          className={`card selectable ${selectedType === "manual" ? "active" : ""}`}
          onClick={() => setSelectedType("manual")}
        >
          <div className="menu-card__icon">
            <ScanSearch size={22} />
          </div>
          <div className="card-title" style={{ marginTop: 14 }}>
            Inwentaryzacja reczna
          </div>
          <div className="card-desc">
            Reczne skanowanie lokalizacji, SKU, LOT i zapisy brakow oraz nadwyzek.
          </div>
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="lg"
          loading={starting}
          loadingLabel="Uruchamiam proces..."
          disabled={!selectedType || starting}
          onClick={handleStart}
        >
          Rozpocznij prace
        </Button>
      </div>
      <LoadingOverlay
        open={starting}
        fullscreen
        message="Uruchamiam sesje operatora i przygotowuje wybrany proces..."
      />
    </PageShell>
  );
}
