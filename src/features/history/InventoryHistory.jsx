import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../core/api/supabaseClient";

function normalizeType(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized === "nadwyżka" || normalized === "nadwyzka" || normalized === "surplus") {
    return {
      label: "Nadwyzka",
      color: "#4CAF50",
      prefix: "+",
    };
  }

  if (normalized === "brak" || normalized === "shortage") {
    return {
      label: "Brak",
      color: "#F44336",
      prefix: "-",
    };
  }

  return {
    label: type || "Operacja",
    color: "#1976D2",
    prefix: "",
  };
}

export default function InventoryHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      const { data, error: fetchError } = await supabase
        .from("entries")
        .select("*")
        .in("type", ["brak", "nadwyżka", "nadwyzka", "surplus", "shortage"])
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchError) {
        console.error("HISTORY FETCH ERROR:", fetchError);
        setError("Blad pobierania historii");
        setLoading(false);
        return;
      }

      setEntries(data || []);
      setError("");
      setLoading(false);
    }

    fetchHistory();
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

  if (loading) {
    return <div className="screen-title">Ladowanie historii...</div>;
  }

  if (error) {
    return <div className="screen-title">{error}</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div className="screen-title">Historia operacji</div>

      <input
        className="input"
        placeholder="Szukaj po lokalizacji, SKU, EAN, locie lub typie"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 20 }}
      />

      {!filteredEntries.length ? (
        <div className="screen-title">Brak operacji inwentaryzacyjnych</div>
      ) : (
        <div className="confirm-card">
          {filteredEntries.map((entry) => {
            const typeMeta = normalizeType(entry.type);

            return (
              <div
                key={entry.id}
                className="confirm-row"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: 10,
                  marginBottom: 10,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {entry.location || "-"} | {entry.sku || "-"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {typeMeta.label} | {entry.operator || "BRAK"} |{" "}
                    {new Date(entry.created_at || entry.timestamp).toLocaleString()}
                  </div>
                  {entry.lot && (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Lot: {entry.lot}</div>
                  )}
                  {entry.ean && (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>EAN: {entry.ean}</div>
                  )}
                </div>

                <span
                  style={{
                    color: typeMeta.color,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {typeMeta.prefix}
                  {entry.quantity ?? 0}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
