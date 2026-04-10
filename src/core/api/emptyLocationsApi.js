import { supabase } from "./supabaseClient";

function applySiteFilter(query, siteId) {
  if (!siteId) {
    return query;
  }

  return query.eq("site_id", siteId);
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();

  return message.includes(columnName.toLowerCase()) || details.includes(columnName.toLowerCase());
}

async function insertAuditEntry(payload) {
  const { error } = await supabase.from("entries").insert([payload]);

  if (error) {
    console.warn("EMPTY PROCESS AUDIT INSERT ERROR:", error);
    return false;
  }

  return true;
}

export async function fetchEmptyLocationZones({ siteId } = {}) {
  let query = supabase.from("locations").select("zone, status, site_id");
  query = applySiteFilter(query, siteId);

  const { data, error } = await query;

  if (error) {
    console.error("FETCH EMPTY ZONES ERROR:", error);
    throw new Error("Blad pobierania stref");
  }

  const zones = [...new Set(
    (data || [])
      .filter((row) => String(row.status || "").toLowerCase() === "active")
      .map((row) => String(row.zone || "").trim())
      .filter(Boolean)
  )];

  return zones.sort((left, right) => left.localeCompare(right));
}

export async function fetchEmptyLocationsForZone({ zone, siteId } = {}) {
  if (!zone) {
    return [];
  }

  let locationsQuery = supabase
    .from("locations")
    .select("id, code, zone, status, locked_by, locked_at, site_id")
    .eq("zone", zone);

  locationsQuery = applySiteFilter(locationsQuery, siteId);

  const [{ data: locations, error: locationsError }, { data: stock, error: stockError }] =
    await Promise.all([
      locationsQuery,
      supabase.from("stock").select("location_id"),
    ]);

  if (locationsError) {
    console.error("FETCH EMPTY LOCATIONS ERROR:", locationsError);
    throw new Error("Blad pobierania lokalizacji");
  }

  if (stockError) {
    console.error("FETCH STOCK FOR EMPTY LOCATIONS ERROR:", stockError);
    throw new Error("Blad pobierania stocku");
  }

  const occupiedLocationIds = new Set(
    (stock || []).map((row) => row.location_id).filter(Boolean)
  );

  return (locations || [])
    .filter((row) => String(row.status || "").toLowerCase() === "active")
    .filter((row) => !occupiedLocationIds.has(row.id))
    .sort((left, right) => String(left.code || "").localeCompare(String(right.code || "")));
}

export async function markLocationOnWork({ locationId, userId }) {
  const payload = {
    status: "On work",
    locked_by: userId || null,
    locked_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("locations").update(payload).eq("id", locationId);

  if (error) {
    console.error("MARK LOCATION ON WORK ERROR:", error);
    throw new Error("Nie udalo sie zablokowac lokalizacji");
  }
}

export async function releaseLocationWork({ locationId, status = "active" }) {
  const payload = {
    status,
    locked_by: null,
    locked_at: null,
  };

  const { error } = await supabase.from("locations").update(payload).eq("id", locationId);

  if (error) {
    console.error("RELEASE LOCATION WORK ERROR:", error);
    throw new Error("Nie udalo sie odblokowac lokalizacji");
  }
}

export async function confirmEmptyLocation({
  location,
  user,
  sessionId,
  zone,
}) {
  const now = new Date().toISOString();
  const updateWithGap = {
    status: "active",
    locked_by: null,
    locked_at: null,
    last_gap_inventory: now,
  };

  let updateError = null;
  let { error } = await supabase.from("locations").update(updateWithGap).eq("id", location.id);
  updateError = error;

  if (updateError && isMissingColumnError(updateError, "last_gap_inventory")) {
    const fallback = await supabase
      .from("locations")
      .update({
        status: "active",
        locked_by: null,
        locked_at: null,
      })
      .eq("id", location.id);

    updateError = fallback.error;
  }

  if (updateError) {
    console.error("CONFIRM EMPTY LOCATION ERROR:", updateError);
    throw new Error("Nie udalo sie potwierdzic pustej lokalizacji");
  }

  await insertAuditEntry({
    session_id: sessionId,
    operator: user?.email || null,
    location: location.code,
    type: "pusta_lokalizacja",
    quantity: 0,
    operation_id: crypto.randomUUID(),
    user_id: user?.id || null,
    site_id: user?.site_id || null,
    confirmed: true,
    timestamp: now,
    lot: zone || null,
  });
}

export async function reportLocationProblem({
  location,
  user,
  sessionId,
  zone,
  reason,
}) {
  const now = new Date().toISOString();

  const correctionPayload = {
    entry_id: null,
    user_id: user?.id || null,
    reason,
    old_value: {
      zone,
      location: location.code,
      status: "On work",
    },
    new_value: {
      zone,
      location: location.code,
      status: "problem_reported",
    },
    created_at: now,
  };

  const correctionResult = await supabase.from("correction_log").insert([correctionPayload]);

  if (correctionResult.error) {
    console.warn("PROBLEM REPORT INSERT TO CORRECTION LOG ERROR:", correctionResult.error);
  }

  await insertAuditEntry({
    session_id: sessionId,
    operator: user?.email || null,
    location: location.code,
    type: "problem",
    quantity: 0,
    operation_id: crypto.randomUUID(),
    user_id: user?.id || null,
    site_id: user?.site_id || null,
    confirmed: true,
    timestamp: now,
    lot: reason,
    ean: null,
    sku: null,
  });

  await releaseLocationWork({ locationId: location.id, status: "active" });
}
