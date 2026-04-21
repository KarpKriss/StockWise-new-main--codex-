import { supabase } from "./supabaseClient";
import { reportInventoryProblem } from "./problemsApi";
import { applySiteFilter, normalizeSiteId } from "../auth/siteScope";
import { resolveProductBySkuOrBarcode } from "./productCatalogApi";

function unwrapRpcRows(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data) {
    return [];
  }

  return Array.isArray(data.data) ? data.data : [];
}

function isLocationReadyStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return !normalized || normalized === "active" || normalized === "pending";
}

export async function fetchEmptyLocationZones({ siteId } = {}) {
  const safeSiteId = normalizeSiteId(siteId);
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await applySiteFilter(
      supabase.from("locations").select("zone, status"),
      safeSiteId
    ).range(from, to);

    if (error) {
      console.error("FETCH EMPTY ZONES ERROR:", error);
      throw new Error(error.message || "Blad pobierania stref");
    }

    const chunk = unwrapRpcRows(data);
    rows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }
  const zones = rows
    .filter((row) => isLocationReadyStatus(row.status) || !("status" in row))
    .map((row) => String(row.zone || "").trim())
    .filter(Boolean);

  return [...new Set(zones)].sort((left, right) => left.localeCompare(right));
}

export async function fetchQuickStartAnchorLocation({ code, siteId } = {}) {
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    throw new Error("Najpierw zeskanuj lub wpisz lokalizacje startowa.");
  }

  const safeSiteId = normalizeSiteId(siteId);
  let query = applySiteFilter(
    supabase
      .from("locations")
      .select("id, code, zone, status, locked_by, locked_at, session_id, site_id")
      .eq("code", normalizedCode)
      .limit(1)
      .maybeSingle(),
    safeSiteId
  );

  const { data, error } = await query;

  if (error) {
    console.error("FETCH QUICK START LOCATION ERROR:", error);
    throw new Error(error.message || "Nie udalo sie odczytac lokalizacji startowej");
  }

  if (!data) {
    throw new Error("Nie znaleziono lokalizacji startowej w mapie magazynu.");
  }

  return data;
}

export async function fetchEmptyLocationsForZone({ zone, siteId } = {}) {
  if (!zone) {
    return { locations: [], totalCount: 0 };
  }

  const safeSiteId = normalizeSiteId(siteId);
  const pageSize = 1000;
  const allLocations = [];
  let offset = 0;

  const stockRows = [];
  let stockOffset = 0;

  while (true) {
    const { data, error: stockError } = await applySiteFilter(
      supabase.from("stock").select("location_id"),
      safeSiteId
    ).range(stockOffset, stockOffset + pageSize - 1);

    if (stockError) {
      console.error("FETCH STOCK FOR EMPTY LOCATIONS ERROR:", stockError);
      throw new Error(stockError.message || "Blad pobierania stocku");
    }

    if (!data?.length) {
      break;
    }

    stockRows.push(...data);

    if (data.length < pageSize) {
      break;
    }

    stockOffset += pageSize;
  }

  while (true) {
    let query = applySiteFilter(
      supabase
        .from("locations")
        .select("id, code, zone, status, locked_by, locked_at, site_id")
        .eq("zone", zone)
        .order("code", { ascending: true })
        .range(offset, offset + pageSize - 1),
      safeSiteId
    );

    const { data, error } = await query;

    if (error) {
      console.error("FETCH EMPTY LOCATIONS PAGE ERROR:", error);
      throw new Error(error.message || "Blad pobierania lokalizacji");
    }

    if (!data?.length) {
      break;
    }

    allLocations.push(...data);

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  const occupiedIds = new Set((stockRows || []).map((row) => row.location_id).filter(Boolean));
  const emptyLocations = allLocations.filter(
    (row) => isLocationReadyStatus(row.status) && !occupiedIds.has(row.id)
  );

  return {
    locations: emptyLocations,
    totalCount: emptyLocations.length,
  };
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
  note,
}) {
  return reportInventoryProblem({
    location,
    user,
    sessionId,
    zone,
    reason,
    note,
    sourceProcess: "empty_location",
  });
}

export async function reportLocationSurplus({
  location,
  user,
  sessionId,
  zone,
  ean,
  sku,
  lot,
  quantity,
}) {
  const { data, error } = await supabase.rpc("report_empty_location_surplus", {
    p_location_id: location.id,
    p_session_id: sessionId,
    p_user_id: user?.id || null,
    p_operator_email: user?.email || null,
    p_zone: zone || null,
    p_ean: ean || null,
    p_sku: sku || null,
    p_lot: lot || null,
    p_quantity: quantity,
  });

  if (error) {
    console.error("REPORT EMPTY LOCATION SURPLUS RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie zapisac nadwyzki");
  }

  return data;
}

export async function resolveProductForSurplus({ sku, ean, siteId } = {}) {
  const normalizedSku = String(sku || "").trim();
  const normalizedEan = String(ean || "").trim();
  const safeSiteId = normalizeSiteId(siteId);

  if (!normalizedSku && !normalizedEan) {
    return null;
  }

  const { product, matchedBarcode } = await resolveProductBySkuOrBarcode({
    sku: normalizedSku,
    barcode: normalizedEan,
    siteId: safeSiteId,
  });

  return product
    ? {
        ...product,
        matched_barcode: matchedBarcode?.code_value || null,
      }
    : null;
}
