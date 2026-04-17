import { supabase } from "./supabaseClient";
import { saveEntry } from "./entriesApi";
import { markLocationOnWork, releaseLocationWork } from "./emptyLocationsApi";
import { reportInventoryProblem } from "./problemsApi";
import { normalizeSiteId } from "../auth/siteScope";
import { fetchProductCatalog, getPrimaryProductBarcode, resolveProductBySkuOrBarcode } from "./productCatalogApi";
import {
  DEFAULT_MANUAL_PROCESS_CONFIG,
  normalizeManualProcessConfig,
} from "../config/manualProcessConfig";

const BUFFER_KEY = "stockwise-manual-buffer";
const DEFAULT_CONFIG = DEFAULT_MANUAL_PROCESS_CONFIG;

export async function fetchManualProcessConfig(siteId) {
  let query = supabase
    .from("process_config")
    .select("validation_rules")
    .limit(1);

  if (siteId) {
    query = query.eq("site_id", siteId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.warn("PROCESS CONFIG FETCH ERROR:", error);
    return DEFAULT_CONFIG;
  }

  return normalizeManualProcessConfig(data?.validation_rules || {});
}

async function withRetries(task, retries = 2) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  return null;
}

export async function validateManualLocation({
  code,
  siteId,
  expectedZone,
  currentUserId,
  retries = 2,
}) {
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    throw new Error("Najpierw zeskanuj lub wpisz lokalizacje");
  }

  const safeSiteId = normalizeSiteId(siteId);

  const location = await withRetries(async () => {
    let query = supabase
      .from("locations")
      .select("id, code, zone, status, locked_by, locked_at, session_id")
      .eq("code", normalizedCode)
      .limit(1);

    if (safeSiteId) {
      query = query.eq("site_id", safeSiteId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message || "Blad pobierania lokalizacji");
    }

    return data;
  }, retries);

  if (!location) {
    throw new Error("Lokalizacja nie istnieje w mapie magazynu");
  }

  const normalizedStatus = String(location.status || "").toLowerCase();

  if (expectedZone && location.zone && location.zone !== expectedZone) {
    throw new Error(`Lokalizacja nalezy do innej strefy: ${location.zone}`);
  }

  if (normalizedStatus === "done") {
    throw new Error("Ta lokalizacja zostala juz sprawdzona");
  }

  if (normalizedStatus === "blocked") {
    throw new Error("Ta lokalizacja jest zablokowana aktywnym problemem i wymaga zwolnienia w panelu Problemy");
  }

  if (
    normalizedStatus === "in_progress" &&
    location.locked_by &&
    location.locked_by !== currentUserId
  ) {
    throw new Error("Ta lokalizacja jest aktualnie sprawdzana przez innego operatora");
  }

  return location;
}

export async function lockManualLocation({ locationId, userId }) {
  return markLocationOnWork({ locationId, userId });
}

export async function releaseManualLocation({ locationId }) {
  return releaseLocationWork({ locationId });
}

export async function completeManualLocation({
  locationId,
  sessionId,
  userId,
  operatorEmail,
}) {
  const { error } = await supabase.rpc("complete_manual_location_check", {
    p_location_id: locationId,
    p_session_id: sessionId,
    p_user_id: userId,
    p_operator_email: operatorEmail || null,
  });

  if (error) {
    console.error("COMPLETE MANUAL LOCATION RPC ERROR:", error);
    throw new Error(error.message || "Nie udalo sie zakonczyc lokalizacji");
  }
}

export async function reportManualLocationProblem({
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
    sourceProcess: "manual_inventory",
  });
}

export async function resolveManualProduct({ sku, ean, siteId }) {
  const normalizedSku = String(sku || "").trim();
  const normalizedEan = String(ean || "").trim();

  if (!normalizedSku && !normalizedEan) {
    throw new Error("SKU jest wymagane");
  }

  const { product, matchedBarcode } = await resolveProductBySkuOrBarcode({
    sku: normalizedSku,
    barcode: normalizedEan,
    siteId,
  });

  if (!product) {
    throw new Error("Nieznane SKU lub EAN");
  }

  return {
    ...product,
    matched_barcode: matchedBarcode?.code_value || null,
  };
}

export async function fetchLocationStockSnapshot(locationId, retries = 2, siteId) {
  const [data, catalog] = await Promise.all([
    withRetries(async () => {
    const { data: rows, error } = await supabase
      .from("stock")
      .select("quantity, lot, expiry_date, barcode_value, product_id")
      .eq("location_id", locationId);

    if (error) {
      console.error("LOCATION STOCK SNAPSHOT ERROR:", error);
      throw new Error(error.message || "Blad pobierania stocku lokalizacji");
    }

    return rows || [];
    }, retries),
    fetchProductCatalog(siteId).catch(() => null),
  ]);

  return data.map((row) => ({
    productId: row.product_id,
    sku: catalog?.productsById.get(row.product_id)?.sku || null,
    ean: row.barcode_value || getPrimaryProductBarcode(catalog, row.product_id) || null,
    lot: row.lot || null,
    expiry_date: row.expiry_date || null,
    quantity: Number(row.quantity) || 0,
  }));
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT_SAVE")), timeoutMs);
    }),
  ]);
}

export function readManualBuffer() {
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("READ MANUAL BUFFER ERROR:", error);
    return [];
  }
}

function writeManualBuffer(items) {
  window.localStorage.setItem(BUFFER_KEY, JSON.stringify(items));
}

export function enqueueBufferedManualEntry(payload) {
  const buffer = readManualBuffer();
  writeManualBuffer([
    ...buffer,
    {
      id: crypto.randomUUID(),
      payload,
      createdAt: new Date().toISOString(),
    },
  ]);
}

export async function flushBufferedManualEntries() {
  const buffer = readManualBuffer();

  if (!buffer.length) {
    return { sent: 0, failed: 0 };
  }

  const remaining = [];
  let sent = 0;

  for (const item of buffer) {
    try {
      await saveEntry(item.payload);
      sent += 1;
    } catch (error) {
      remaining.push(item);
    }
  }

  writeManualBuffer(remaining);

  return {
    sent,
    failed: remaining.length,
  };
}

export async function saveManualEntryWithResilience(payload, config = DEFAULT_CONFIG) {
  const retries =
    Number(config?.validation?.saveRetries || config.saveRetries) ||
    DEFAULT_CONFIG.validation.saveRetries;
  const timeoutMs =
    Number(config?.validation?.saveTimeoutMs || config.saveTimeoutMs) ||
    DEFAULT_CONFIG.validation.saveTimeoutMs;

  try {
    const data = await withRetries(
      () => withTimeout(saveEntry(payload), timeoutMs),
      retries
    );

    return {
      status: "saved",
      data,
    };
  } catch (error) {
    const message = String(error?.message || "");
    const likelyOffline =
      !navigator.onLine ||
      message === "TIMEOUT_SAVE" ||
      message.includes("Failed to fetch") ||
      message.includes("Network");

    if (likelyOffline) {
      enqueueBufferedManualEntry(payload);
      return {
        status: "buffered",
      };
    }

    throw error;
  }
}
