import React, { useEffect, useMemo, useState } from "react";
import { Clock3, Edit3, History, PencilLine, Search } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import {
  fetchInventoryHistoryEntries,
  updateInventoryHistoryEntry,
} from "../../core/api/inventoryHistoryApi";

function normalizeType(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized === "nadwyzka" || normalized === "nadwyzka" || normalized === "surplus") {
    return { label: "Nadwyzka", tone: "success", prefix: "+" };
  }

  if (normalized === "brak" || normalized === "shortage") {
    return { label: "Brak", tone: "danger", prefix: "-" };
  }

  if (normalized === "checked_empty") {
    return { label: "Pusta lokalizacja", tone: "neutral", prefix: "" };
  }

  return { label: type || "Operacja", tone: "neutral", prefix: "" };
}

const EDITABLE_TYPES = [
  { value: "surplus", label: "Nadwyzka" },
  { value: "shortage", label: "Brak" },
  { value: "checked_empty", label: "Pusta lokalizacja" },
];

const INITIAL_FORM = {
  location: "",
  sku: "",
  ean: "",
  lot: "",
  quantity: "",
  type: "",
  reason: "",
};

function buildEditForm(entry) {
  return {
    location: entry.location || "",
    sku: entry.sku || "",
    ean: entry.ean || "",
    lot: entry.lot || "",
    quantity: entry.quantity ?? "",
    type: entry.type || "",
    reason: "",
  };
}

export default function InventoryHistoryModern() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  async function loadEntries() {
    try {
      setLoading(true);
      setEntries(await fetchInventoryHistoryEntries());
      setError("");
    } catch (fetchError) {
      console.error("HISTORY FETCH ERROR:", fetchError);
      setError(fetchError.message || "Blad pobierania historii");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.location, entry.sku, entry.ean, entry.lot, entry.operator, entry.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [entries, search]);

  function openEditor(entry) {
    setEditingEntry(entry);
    setEditForm(buildEditForm(entry));
    setError("");
  }

  function closeEditor() {
    setEditingEntry(null);
    setEditForm(INITIAL_FORM);
    setSaving(false);
  }

  async function handleSaveEdit() {
    if (!editingEntry?.id) {
      return;
    }

    if (!String(editForm.reason || "").trim()) {
      setError("Podaj powod zmiany, aby zapisac korekte.");
      return;
    }

    const changes = {
      location: editForm.location || null,
      sku: editForm.sku || null,
      ean: editForm.ean || null,
      lot: editForm.lot || null,
      quantity: editForm.quantity === "" ? null : Number(editForm.quantity),
      type: editForm.type || null,
    };

    try {
      setSaving(true);
      await updateInventoryHistoryEntry({
        entryId: editingEntry.id,
        reason: editForm.reason.trim(),
        changes,
      });
      closeEditor();
      await loadEntries();
    } catch (saveError) {
      setError(saveError.message || "Nie udalo sie zapisac zmian");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Historia operacji"
      subtitle="Przegladaj zapisane wyniki inwentaryzacji, edytuj wpisy i kontroluj ich dalsze korekty."
      icon={<History size={26} />}
      backTo="/menu"
    >
      <div className="app-card">
        <div className="app-field">
          <label className="app-field__label">Szukaj operacji</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--app-text-soft)" }}
            />
            <input
              className="app-input"
              placeholder="Lokalizacja, SKU, EAN, lot lub operator"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>
      </div>

      {loading ? <div className="app-card">Ladowanie historii...</div> : null}
      {error ? <div className="app-card input-error-text">{error}</div> : null}

      {!loading && !error ? (
        <div className="confirm-card">
          {filteredEntries.length ? (
            filteredEntries.map((entry) => {
              const typeMeta = normalizeType(entry.type);

              return (
                <div
                  key={entry.id}
                  className={`confirm-row history-operation-row ${entry.wasEdited ? "history-operation-row--edited" : ""}`}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(84, 98, 140, 0.12)",
                    alignItems: "flex-start",
                    gap: 18,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {entry.location || "-"} | {entry.sku || "-"}
                      </div>
                      {entry.wasEdited ? (
                        <span className="history-status-chip history-status-chip--edited">
                          <PencilLine size={14} style={{ marginRight: 6 }} />
                          Edytowano
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--app-text-soft)", marginTop: 4 }}>
                      {typeMeta.label} | {entry.operator || "BRAK"} | {new Date(entry.created_at || entry.timestamp).toLocaleString()}
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                      {entry.lot ? (
                        <div style={{ fontSize: 13, color: "var(--app-text-soft)" }}>LOT: {entry.lot}</div>
                      ) : null}
                      {entry.ean ? (
                        <div style={{ fontSize: 13, color: "var(--app-text-soft)" }}>EAN: {entry.ean}</div>
                      ) : null}
                      {entry.wasEdited && entry.lastCorrectionAt ? (
                        <div style={{ fontSize: 13, color: "var(--app-primary-strong)" }}>
                          <Clock3 size={13} style={{ verticalAlign: "text-bottom", marginRight: 4 }} />
                          Ostatnia korekta: {new Date(entry.lastCorrectionAt).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      style={{
                        color:
                          typeMeta.tone === "success"
                            ? "var(--app-success)"
                            : typeMeta.tone === "danger"
                              ? "var(--app-danger)"
                              : "var(--app-primary-strong)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        minWidth: 42,
                        textAlign: "right",
                      }}
                    >
                      {typeMeta.prefix}
                      {entry.quantity ?? 0}
                    </span>
                    <Button variant="secondary" size="md" onClick={() => openEditor(entry)}>
                      <Edit3 size={16} />
                      Edytuj
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="app-empty-state">Brak operacji inwentaryzacyjnych</div>
          )}
        </div>
      ) : null}

      {editingEntry ? (
        <div className="history-modal-overlay" onClick={closeEditor}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <h2 className="process-panel__title" style={{ fontSize: 26, margin: 0 }}>
                  Edycja operacji
                </h2>
                <p className="process-panel__subtitle">
                  {editingEntry.location || "-"} | {editingEntry.operator || "BRAK"}
                </p>
              </div>
              <Button variant="secondary" onClick={closeEditor}>
                Zamknij
              </Button>
            </div>

            <div className="history-modal__grid">
              <div className="app-field">
                <label className="app-field__label">Lokalizacja</label>
                <input className="app-input" value={editForm.location} onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))} />
              </div>
              <div className="app-field">
                <label className="app-field__label">SKU</label>
                <input className="app-input" value={editForm.sku} onChange={(event) => setEditForm((current) => ({ ...current, sku: event.target.value }))} />
              </div>
              <div className="app-field">
                <label className="app-field__label">EAN</label>
                <input className="app-input" value={editForm.ean} onChange={(event) => setEditForm((current) => ({ ...current, ean: event.target.value }))} />
              </div>
              <div className="app-field">
                <label className="app-field__label">LOT</label>
                <input className="app-input" value={editForm.lot} onChange={(event) => setEditForm((current) => ({ ...current, lot: event.target.value }))} />
              </div>
              <div className="app-field">
                <label className="app-field__label">Ilosc</label>
                <input className="app-input" type="number" value={editForm.quantity} onChange={(event) => setEditForm((current) => ({ ...current, quantity: event.target.value }))} />
              </div>
              <div className="app-field">
                <label className="app-field__label">Typ operacji</label>
                <select value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}>
                  {EDITABLE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="app-field" style={{ marginTop: 18 }}>
              <label className="app-field__label">Powod zmiany</label>
              <textarea
                className="app-input"
                value={editForm.reason}
                onChange={(event) => setEditForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Opisz, dlaczego edytujesz ten wpis"
                style={{ minHeight: 110 }}
              />
            </div>

            <div className="process-actions" style={{ marginTop: 20 }}>
              <Button size="lg" loading={saving} onClick={handleSaveEdit}>
                Zapisz zmiany
              </Button>
              <Button variant="secondary" size="lg" onClick={closeEditor}>
                Anuluj
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
