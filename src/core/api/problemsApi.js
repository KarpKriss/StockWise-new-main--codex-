import { supabase } from "./supabaseClient";

function sortByNewest(rows) {
  return [...rows].sort(
    (left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
  );
}

export async function fetchProblemRows() {
  const rpcResult = await supabase.rpc("get_problem_cases");

  if (!rpcResult.error && Array.isArray(rpcResult.data)) {
    return sortByNewest(rpcResult.data);
  }

  if (rpcResult.error) {
    console.warn("FETCH PROBLEM CASES RPC ERROR:", rpcResult.error);
  }

  const { data, error } = await supabase
    .from("empty_location_issues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("FETCH PROBLEMS ERROR:", error);
    throw new Error(error.message || "Blad pobierania problemow");
  }

  return data || [];
}

export async function resolveProblemCase({ issueId, locationId, releaseNote }) {
  const rpcResult = await supabase.rpc("resolve_problem_case", {
    p_issue_id: issueId,
    p_location_id: locationId,
    p_release_note: releaseNote || null,
  });

  if (rpcResult.error) {
    console.error("RESOLVE PROBLEM CASE RPC ERROR:", rpcResult.error);
    throw new Error(rpcResult.error.message || "Nie udalo sie zwolnic problemu");
  }

  return rpcResult.data;
}

export async function reportInventoryProblem({
  location,
  user,
  sessionId,
  zone,
  reason,
  note,
  sourceProcess,
}) {
  const { data, error } = await supabase.rpc("report_inventory_location_issue", {
    p_location_id: location.id,
    p_location_code: location.code || null,
    p_session_id: sessionId || null,
    p_user_id: user?.id || null,
    p_operator_email: user?.email || null,
    p_zone: zone || location.zone || null,
    p_issue_type: reason,
    p_note: note || null,
    p_source_process: sourceProcess || "unknown",
    p_previous_status: location.status || null,
  });

  if (error) {
    console.error("REPORT INVENTORY PROBLEM RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie zapisac problemu");
  }

  return data;
}
