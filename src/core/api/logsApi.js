import { supabase } from "./supabaseClient";

function normalizeLogUser(row) {
  return {
    userId: row.user_id || row.id || null,
    email: row.email || "",
    name: row.name || row.alias || row.email || "Nieznany uzytkownik",
    role: row.role || "",
  };
}

function normalizeRow(row, category) {
  return {
    id:
      row.id ||
      row.log_id ||
      row.audit_id ||
      row.event_id ||
      row.issue_id ||
      crypto.randomUUID(),
    category,
    timestamp:
      row.created_at ||
      row.timestamp ||
      row.event_at ||
      row.logged_at ||
      row.activity_at ||
      null,
    userId: row.user_id || row.actor_user_id || row.profile_user_id || null,
    userEmail: row.user_email || row.email || row.operator_email || "",
    userName: row.user_name || row.name || row.operator_name || "",
    eventType: row.event_type || row.action || row.type || row.code || "",
    entity: row.entity || row.category || row.area || row.scope || "",
    message: row.message || row.description || row.reason || row.title || "",
    status: row.status || row.severity || row.success || "",
    payload: row.payload || row.details || row.meta || null,
    source: row.source || "db",
  };
}

export async function fetchLogUsers() {
  const rpcResult = await supabase.rpc("get_admin_log_users");

  if (!rpcResult.error) {
    return (rpcResult.data || []).map(normalizeLogUser);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, name, role")
    .order("email", { ascending: true });

  if (error) {
    console.error("FETCH LOG USERS ERROR:", error);
    throw new Error("Nie udalo sie pobrac listy uzytkownikow do filtrowania logow");
  }

  return (data || []).map(normalizeLogUser);
}

export async function fetchUserActionLogs({ userId = null, limit = 200 } = {}) {
  const rpcResult = await supabase.rpc("get_admin_user_action_logs", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (!rpcResult.error) {
    return (rpcResult.data || []).map((row) => normalizeRow(row, "user-actions"));
  }

  const [auditResult, emptyInventoryResult, importResult] = await Promise.all([
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase
      .from("empty_location_inventory_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("import_logs").select("*").order("created_at", { ascending: false }).limit(limit),
  ]);

  const errors = [auditResult.error, emptyInventoryResult.error, importResult.error].filter(Boolean);
  if (errors.length) {
    console.error("FETCH USER ACTION LOGS FALLBACK ERROR:", errors);
    throw new Error("Nie udalo sie pobrac logow dzialan uzytkownikow");
  }

  const rows = [
    ...(auditResult.data || []),
    ...(emptyInventoryResult.data || []),
    ...(importResult.data || []),
  ]
    .filter((row) => !userId || row.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, limit);

  return rows.map((row) => normalizeRow(row, "user-actions"));
}

export async function fetchConfigChangeLogs({ limit = 200 } = {}) {
  const rpcResult = await supabase.rpc("get_admin_config_change_logs", {
    p_limit: limit,
  });

  if (!rpcResult.error) {
    return (rpcResult.data || []).map((row) => normalizeRow(row, "config"));
  }

  const { data, error } = await supabase
    .from("config_change_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("FETCH CONFIG CHANGE LOGS ERROR:", error);
    throw new Error("Nie udalo sie pobrac logow zmian konfiguracji");
  }

  return (data || []).map((row) => normalizeRow(row, "config"));
}

export async function fetchAuthLogs({ userId = null, limit = 200 } = {}) {
  const rpcResult = await supabase.rpc("get_admin_auth_logs", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (!rpcResult.error) {
    return (rpcResult.data || []).map((row) => normalizeRow(row, "auth"));
  }

  let query = supabase
    .from("auth_event_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("FETCH AUTH LOGS ERROR:", error);
    throw new Error("Nie udalo sie pobrac logow logowania");
  }

  return (data || []).map((row) => normalizeRow(row, "auth"));
}

export async function fetchErrorLogs({ limit = 200 } = {}) {
  const rpcResult = await supabase.rpc("get_admin_error_logs", {
    p_limit: limit,
  });

  if (!rpcResult.error) {
    return (rpcResult.data || []).map((row) => normalizeRow(row, "errors"));
  }

  const { data, error } = await supabase
    .from("client_error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("FETCH ERROR LOGS ERROR:", error);
    throw new Error("Nie udalo sie pobrac logow bledow");
  }

  return (data || []).map((row) => normalizeRow(row, "errors"));
}

export async function logAuthEvent({
  email = null,
  userId = null,
  eventType,
  success = false,
  message = null,
}) {
  const { error } = await supabase.rpc("log_auth_event", {
    p_email: email,
    p_user_id: userId,
    p_event_type: eventType,
    p_success: success,
    p_message: message,
  });

  if (error) {
    console.error("LOG AUTH EVENT ERROR:", error);
  }
}

export async function logClientError({
  userId = null,
  area,
  message,
  details = {},
}) {
  const { error } = await supabase.rpc("log_client_error", {
    p_user_id: userId,
    p_area: area,
    p_message: message,
    p_details: details,
  });

  if (error) {
    console.error("LOG CLIENT ERROR ERROR:", error);
  }
}
