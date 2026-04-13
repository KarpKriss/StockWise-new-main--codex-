import { supabase } from "./supabaseClient";

export async function fetchCorrectionRowsWithProblems() {
  const correctionsResult = await supabase
    .from("correction_log")
    .select("id, entry_id, user_id, reason, old_value, new_value, created_at")
    .order("created_at", { ascending: false });

  if (correctionsResult.error) {
    console.error("FETCH CORRECTIONS ERROR:", correctionsResult.error);
    throw new Error("Blad pobierania historii korekt");
  }

  return correctionsResult.data || [];
}
