import { supabase } from "./supabaseClient";

function unwrapFunctionError(error) {
  if (!error) {
    return new Error("Nieznany blad backendu administracyjnego");
  }

  const message =
    error.context?.json?.error ||
    error.context?.json?.message ||
    error.message ||
    "Nieznany blad backendu administracyjnego";

  return new Error(message);
}

function isEdgeFunctionUnavailable(error) {
  const message = String(
    error?.context?.json?.error ||
      error?.context?.json?.message ||
      error?.message ||
      ""
  ).toLowerCase();

  return (
    message.includes("failed to send a request to the edge function") ||
    message.includes("edge function returned a non-2xx status code") ||
    message.includes("functions fetch failed") ||
    message.includes("function not found")
  );
}

async function invokeAdminUsers(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    console.error(`ADMIN USERS FUNCTION ERROR [${action}]:`, error);
    throw unwrapFunctionError(error);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

async function fetchAdminUsersListFallback() {
  const [profilesResult, sessionsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, user_id, email, name, role, status, created_at, updated_at, login_attempts, failed_attempts, lock_until, operator_number"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, user_id, operator, status, started_at, ended_at, last_activity, created_at")
      .order("started_at", { ascending: false }),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message || "Nie udalo sie pobrac profili uzytkownikow");
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message || "Nie udalo sie pobrac aktywnosci sesji");
  }

  const latestSessionByUser = new Map();

  for (const session of sessionsResult.data || []) {
    if (!session.user_id || latestSessionByUser.has(session.user_id)) continue;
    latestSessionByUser.set(session.user_id, session);
  }

  return (profilesResult.data || []).map((profile) => {
    const latestSession = latestSessionByUser.get(profile.user_id || "") || null;

    return {
      id: profile.user_id || profile.id,
      profileId: profile.id,
      user_id: profile.user_id,
      email: profile.email || "",
      name: profile.name || "",
      alias: profile.name || latestSession?.operator || "",
      operatorNumber: profile.operator_number || "",
      role: String(profile.role || "user").toLowerCase(),
      status: String(profile.status || "inactive").toLowerCase(),
      created_at: profile.created_at || null,
      updated_at: profile.updated_at || null,
      lock_until: profile.lock_until,
      login_attempts: profile.login_attempts ?? profile.failed_attempts ?? 0,
      last_activity:
        latestSession?.last_activity ||
        latestSession?.ended_at ||
        latestSession?.started_at ||
        latestSession?.created_at ||
        null,
      latest_session_status: latestSession?.status ? String(latestSession.status).toLowerCase() : null,
      backendMode: "fallback",
    };
  });
}

function requireEdgeFunctionFeature(message) {
  throw new Error(
    `${message} Backend admin-users nie odpowiada. Wdroz edge function, aby uzyc tej akcji.`
  );
}

export async function fetchAdminUsersList() {
  try {
    const data = await invokeAdminUsers("list");
    return (data.users || []).map((entry) => ({ ...entry, backendMode: "edge" }));
  } catch (error) {
    if (!isEdgeFunctionUnavailable(error)) {
      throw error;
    }

    return fetchAdminUsersListFallback();
  }
}

export async function updateAdminUserProfile(userId, payload) {
  try {
    const data = await invokeAdminUsers("update", {
      userId,
      payload,
    });

    return data.user;
  } catch (error) {
    if (isEdgeFunctionUnavailable(error)) {
      requireEdgeFunctionFeature("Nie udalo sie zapisac zmian uzytkownika.");
    }
    throw error;
  }
}

export async function createAdminUserAccount(payload) {
  try {
    const data = await invokeAdminUsers("create", {
      payload,
    });

    return data.user;
  } catch (error) {
    if (isEdgeFunctionUnavailable(error)) {
      requireEdgeFunctionFeature("Nie udalo sie utworzyc konta.");
    }
    throw error;
  }
}

export async function resetAdminUserPassword(userId, newPassword) {
  try {
    const data = await invokeAdminUsers("reset-password", {
      userId,
      newPassword,
    });

    return data;
  } catch (error) {
    if (isEdgeFunctionUnavailable(error)) {
      requireEdgeFunctionFeature("Nie udalo sie zresetowac hasla.");
    }
    throw error;
  }
}

export async function deleteAdminUserAccount(userId) {
  try {
    const data = await invokeAdminUsers("delete", {
      userId,
    });

    return data;
  } catch (error) {
    if (isEdgeFunctionUnavailable(error)) {
      requireEdgeFunctionFeature("Nie udalo sie usunac uzytkownika.");
    }
    throw error;
  }
}
