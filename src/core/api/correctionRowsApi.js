import { supabase } from "./supabaseClient";

export async function fetchCorrectionRowsWithProblems() {
  const [correctionsResult, issuesResult] = await Promise.all([
    supabase
      .from("correction_log")
      .select("id, entry_id, user_id, reason, old_value, new_value, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("empty_location_issues")
      .select("id, user_id, zone, issue_type, note, status, created_at, location_id")
      .order("created_at", { ascending: false }),
  ]);

  if (correctionsResult.error) {
    console.error("FETCH CORRECTIONS ERROR:", correctionsResult.error);
    throw new Error("Blad pobierania historii korekt");
  }

  if (issuesResult.error) {
    console.warn("FETCH EMPTY LOCATION ISSUES ERROR:", issuesResult.error);
  }

  const correctionRows = correctionsResult.data || [];
  const issueRows = (issuesResult.data || []).map((row) => ({
    id: `issue-${row.id}`,
    entry_id: row.id,
    user_id: row.user_id || "BRAK",
    reason: row.issue_type || "Zgloszony problem",
    old_value: {
      location_id: row.location_id,
      zone: row.zone,
    },
    new_value: {
      status: row.status || "open",
      note: row.note || null,
    },
    created_at: row.created_at,
  }));

  return [...issueRows, ...correctionRows].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}
