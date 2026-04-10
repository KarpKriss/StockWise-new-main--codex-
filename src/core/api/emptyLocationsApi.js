import { supabase } from "./supabaseClient";

function normalizeUuidLike(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(normalized) ? normalized : null;
}

function unwrapRpcRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data) {
    return [];
  }

  return Array.isArray(data.data) ? data.data : [];
}

export async function fetchEmptyLocationZones({ siteId } = {}) {
  const safeSiteId = normalizeUuidLike(siteId);

  const { data, error } = await supabase.rpc("get_empty_location_zones", {
    p_site_id: safeSiteId,
  });

  if (error) {
    console.error("FETCH EMPTY ZONES RPC ERROR:", error);
    throw new Error(error.message || "Blad pobierania stref");
  }

  const rows = unwrapRpcRows(data);
  const zones = rows
    .map((row) => String(row.zone || "").trim())
    .filter(Boolean);

  return [...new Set(zones)].sort((left, right) => left.localeCompare(right));
}

export async function fetchEmptyLocationsForZone({ zone, siteId } = {}) {
  if (!zone) {
    return [];
  }

  const safeSiteId = normalizeUuidLike(siteId);
  const { data, error } = await supabase.rpc("get_empty_locations_for_zone", {
    p_zone: zone,
    p_site_id: safeSiteId,
  });

  if (error) {
    console.error("FETCH EMPTY LOCATIONS RPC ERROR:", error);
    throw new Error(error.message || "Blad pobierania lokalizacji");
  }

  return unwrapRpcRows(data).sort((left, right) =>
    String(left.code || "").localeCompare(String(right.code || ""))
  );
}

export async function markLocationOnWork({ locationId, userId }) {
  const { data, error } = await supabase.rpc("start_empty_location_work", {
    p_location_id: locationId,
    p_user_id: userId,
  });

  if (error) {
    console.error("MARK LOCATION ON WORK RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie zablokowac lokalizacji");
  }

  return data;
}

export async function releaseLocationWork({ locationId }) {
  const { error } = await supabase.rpc("release_empty_location_work", {
    p_location_id: locationId,
  });

  if (error) {
    console.error("RELEASE LOCATION WORK RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie odblokowac lokalizacji");
  }
}

export async function confirmEmptyLocation({
  location,
  user,
  sessionId,
  zone,
}) {
  const { error } = await supabase.rpc("confirm_empty_location", {
    p_location_id: location.id,
    p_session_id: sessionId,
    p_user_id: user?.id || null,
    p_operator_email: user?.email || null,
    p_zone: zone || null,
  });

  if (error) {
    console.error("CONFIRM EMPTY LOCATION RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie potwierdzic pustej lokalizacji");
  }
}

export async function reportLocationProblem({
  location,
  user,
  sessionId,
  zone,
  reason,
}) {
  const { error } = await supabase.rpc("report_empty_location_issue", {
    p_location_id: location.id,
    p_session_id: sessionId,
    p_user_id: user?.id || null,
    p_operator_email: user?.email || null,
    p_zone: zone || null,
    p_issue_type: reason,
    p_note: null,
  });

  if (error) {
    console.error("REPORT EMPTY LOCATION ISSUE RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie zapisac problemu");
  }
}
