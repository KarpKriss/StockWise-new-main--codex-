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

export async function fetchAdminUsersList() {
  const data = await invokeAdminUsers("list");
  return data.users || [];
}

export async function updateAdminUserProfile(userId, payload) {
  const data = await invokeAdminUsers("update", {
    userId,
    payload,
  });

  return data.user;
}

export async function createAdminUserAccount(payload) {
  const data = await invokeAdminUsers("create", {
    payload,
  });

  return data.user;
}

export async function resetAdminUserPassword(userId, newPassword) {
  const data = await invokeAdminUsers("reset-password", {
    userId,
    newPassword,
  });

  return data;
}

export async function deleteAdminUserAccount(userId) {
  const data = await invokeAdminUsers("delete", {
    userId,
  });

  return data;
}
