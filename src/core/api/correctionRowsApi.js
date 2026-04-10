import { supabase } from "./supabaseClient";

export async function fetchCorrectionRowsWithProblems() {
  const [correctionsResult, problemsResult] = await Promise.all([
    supabase
      .from("correction_log")
      .select("id, entry_id, user_id, reason, old_value, new_value, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("entries")
      .select("id, user_id, operator, location, type, lot, created_at, timestamp")
      .eq("type", "problem")
      .order("created_at", { ascending: false }),
  ]);

  if (correctionsResult.error) {
    console.error("FETCH CORRECTIONS ERROR:", correctionsResult.error);
    throw new Error("Blad pobierania historii korekt");
  }

  if (problemsResult.error) {
    console.warn("FETCH PROBLEM REPORTS ERROR:", problemsResult.error);
  }

  const correctionRows = correctionsResult.data || [];
  const problemRows = (problemsResult.data || []).map((row) => ({
    id: `problem-${row.id}`,
    entry_id: row.id,
    user_id: row.user_id || row.operator || "BRAK",
    reason: row.lot || "Zgloszony problem",
    old_value: {
      location: row.location,
      type: row.type,
    },
    new_value: {
      status: "problem_reported",
    },
    created_at: row.created_at || row.timestamp,
  }));

  return [...problemRows, ...correctionRows].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}
