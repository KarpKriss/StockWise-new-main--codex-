import { supabase } from "./supabaseClient";

const TRACKED_TYPES = ["brak", "nadwyżka", "nadwyzka", "surplus", "shortage", "checked_empty"];

function normalizeHistoryEntry(entry, correctionMeta) {
  const correction = correctionMeta.get(entry.id);

  return {
    ...entry,
    wasEdited: Boolean(correction),
    correctionCount: correction?.count || 0,
    lastCorrectionAt: correction?.lastCorrectionAt || null,
  };
}

export async function fetchInventoryHistoryEntries() {
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("*")
    .in("type", TRACKED_TYPES)
    .order("created_at", { ascending: false })
    .limit(500);

  if (entriesError) {
    console.error("HISTORY FETCH ERROR:", entriesError);
    throw new Error("Blad pobierania historii");
  }

  const { data: corrections, error: correctionsError } = await supabase
    .from("correction_log")
    .select("entry_id, created_at")
    .order("created_at", { ascending: false });

  if (correctionsError) {
    console.error("HISTORY CORRECTIONS FETCH ERROR:", correctionsError);
    throw new Error("Blad pobierania oznaczen korekt");
  }

  const correctionMeta = new Map();

  (corrections || []).forEach((row) => {
    if (!row.entry_id) {
      return;
    }

    const current = correctionMeta.get(row.entry_id);

    if (!current) {
      correctionMeta.set(row.entry_id, {
        count: 1,
        lastCorrectionAt: row.created_at,
      });
      return;
    }

    correctionMeta.set(row.entry_id, {
      count: current.count + 1,
      lastCorrectionAt: current.lastCorrectionAt || row.created_at,
    });
  });

  return (entries || []).map((entry) => normalizeHistoryEntry(entry, correctionMeta));
}

export async function updateInventoryHistoryEntry({
  entryId,
  reason,
  changes,
}) {
  const { data, error } = await supabase.rpc("update_inventory_history_entry", {
    p_entry_id: entryId,
    p_reason: reason,
    p_changes: changes,
  });

  if (error) {
    console.error("UPDATE INVENTORY HISTORY ENTRY RPC ERROR:", error);

    if (String(error.message || "").includes("update_inventory_history_entry")) {
      throw new Error("Brakuje backendowej funkcji update_inventory_history_entry. Wdroz SQL dla historii operacji.");
    }

    throw new Error(error.message || "Nie udalo sie zapisac zmian");
  }

  return data;
}
