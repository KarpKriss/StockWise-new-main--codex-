import { supabase } from "./supabaseClient";
import {
  DEFAULT_MANUAL_PROCESS_CONFIG,
  normalizeManualProcessConfig,
  serializeManualProcessConfig,
} from "../config/manualProcessConfig";

function normalizeSiteId(siteId) {
  const normalized = String(siteId || "").trim();
  return normalized || null;
}

export async function fetchManualProcessAdminConfig(siteId) {
  const normalizedSiteId = normalizeSiteId(siteId);

  const rpcResult = await supabase.rpc("get_manual_process_admin_config", {
    p_site_id: normalizedSiteId,
  });

  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return {
      source: "rpc",
      id: row?.id || null,
      siteId: row?.site_id || normalizedSiteId,
      config: normalizeManualProcessConfig(row?.validation_rules || {}),
    };
  }

  let query = supabase
    .from("process_config")
    .select("id, site_id, validation_rules")
    .limit(1);

  if (normalizedSiteId) {
    query = query.eq("site_id", normalizedSiteId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("PROCESS CONFIG ADMIN FETCH ERROR:", error);
    return {
      source: "default",
      id: null,
      siteId: normalizedSiteId,
      config: DEFAULT_MANUAL_PROCESS_CONFIG,
    };
  }

  return {
    source: "fallback",
    id: data?.id || null,
    siteId: data?.site_id || normalizedSiteId,
    config: normalizeManualProcessConfig(data?.validation_rules || {}),
  };
}

export async function saveManualProcessAdminConfig({ siteId, config }) {
  const normalizedSiteId = normalizeSiteId(siteId);
  const payload = serializeManualProcessConfig(config);

  const rpcResult = await supabase.rpc("save_manual_process_admin_config", {
    p_site_id: normalizedSiteId,
    p_validation_rules: payload,
  });

  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return {
      source: "rpc",
      id: row?.id || null,
      siteId: row?.site_id || normalizedSiteId,
      config: normalizeManualProcessConfig(row?.validation_rules || payload),
    };
  }

  console.error("PROCESS CONFIG ADMIN RPC SAVE ERROR:", rpcResult.error);

  let existingQuery = supabase
    .from("process_config")
    .select("id, site_id")
    .order("id", { ascending: false })
    .limit(1);

  if (normalizedSiteId) {
    existingQuery = existingQuery.eq("site_id", normalizedSiteId);
  }

  const existing = await existingQuery.maybeSingle();

  if (existing.error) {
    console.error("PROCESS CONFIG ADMIN EXISTING ERROR:", existing.error);
    throw new Error(
      rpcResult.error?.message ||
        existing.error.message ||
        "Nie udalo sie zapisac konfiguracji procesu",
    );
  }

  if (existing.data?.id) {
    const updateResult = await supabase
      .from("process_config")
      .update({
        validation_rules: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id)
      .select("id, site_id, validation_rules")
      .maybeSingle();

    if (updateResult.error) {
      console.error("PROCESS CONFIG ADMIN UPDATE ERROR:", updateResult.error);
      throw new Error(
        rpcResult.error?.message ||
          updateResult.error.message ||
          "Nie udalo sie zapisac konfiguracji procesu",
      );
    }

    return {
      source: "fallback",
      id: updateResult.data?.id || null,
      siteId: updateResult.data?.site_id || normalizedSiteId,
      config: normalizeManualProcessConfig(updateResult.data?.validation_rules || payload),
    };
  }

  const insertResult = await supabase
    .from("process_config")
    .insert({
      site_id: normalizedSiteId,
      validation_rules: payload,
      updated_at: new Date().toISOString(),
    })
    .select("id, site_id, validation_rules")
    .maybeSingle();

  if (insertResult.error) {
    console.error("PROCESS CONFIG ADMIN INSERT ERROR:", insertResult.error);
    throw new Error(
      rpcResult.error?.message ||
        insertResult.error.message ||
        "Nie udalo sie zapisac konfiguracji procesu",
    );
  }

  return {
    source: "fallback",
    id: insertResult.data?.id || null,
    siteId: insertResult.data?.site_id || normalizedSiteId,
    config: normalizeManualProcessConfig(insertResult.data?.validation_rules || payload),
  };
}
