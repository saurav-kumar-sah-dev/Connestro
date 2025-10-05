// src/utils/accounts.js

// LocalStorage keys
const ACCOUNTS_KEY = "ms_accounts";
const ACTIVE_ID_KEY = "ms_active_account_id";

function emit(evt) {
  try {
    window.dispatchEvent(new Event(evt));
  } catch {}
}

// Read/write helpers
export function getAccounts() {
  try {
    const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export function getActiveAccountId() {
  return localStorage.getItem(ACTIVE_ID_KEY) || "";
}

export function setActiveAccountId(id) {
  if (id) localStorage.setItem(ACTIVE_ID_KEY, String(id));
  else localStorage.removeItem(ACTIVE_ID_KEY);
}

// Seed current session into accounts (used once on app boot)
export function ensureActiveSeed() {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  if (!token || !userRaw) return;

  let user = null;
  try {
    user = JSON.parse(userRaw);
  } catch {
    user = null;
  }
  if (!user?.id) return;

  const list = getAccounts();
  if (!list.find((a) => String(a.id) === String(user.id))) {
    const item = {
      id: user.id,
      username: user.username,
      role: user.role,
      passwordSet: user.passwordSet,
      user,   // snapshot (may not yet include profileImage)
      token,
      lastUsed: Date.now(),
    };
    saveAccounts([item, ...list]);
    emit("accounts:changed");
  }
  setActiveAccountId(user.id);
}

// Add or update an account from auth response
export function upsertAccount({ token, user }) {
  if (!token || !user?.id) return;

  const list = getAccounts();
  const idx = list.findIndex((a) => String(a.id) === String(user.id));
  const item = {
    id: user.id,
    username: user.username,
    role: user.role,
    passwordSet: user.passwordSet,
    user,   // snapshot
    token,
    lastUsed: Date.now(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...item };
  else list.unshift(item);

  saveAccounts(list);
  setActiveAccountId(user.id);
  emit("accounts:changed");

  // Activate it in the app (this also makes axios use the right token)
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  emit("auth:changed");
}

// Switch to an existing stored account
export function switchAccount(id) {
  const list = getAccounts();
  const acc = list.find((a) => String(a.id) === String(id));
  if (!acc) return false;

  acc.lastUsed = Date.now();
  saveAccounts(list);
  setActiveAccountId(acc.id);
  emit("accounts:changed");

  localStorage.setItem("token", acc.token);
  localStorage.setItem("user", JSON.stringify(acc.user));
  emit("auth:changed");
  return true;
}

// Remove an account; if removing active, switch to another or logout
export function removeAccount(id) {
  const active = getActiveAccountId();
  const list = getAccounts().filter((a) => String(a.id) !== String(id));
  saveAccounts(list);
  emit("accounts:changed");

  if (String(active) === String(id)) {
    if (list.length) {
      const next = list[0];
      setActiveAccountId(next.id);
      localStorage.setItem("token", next.token);
      localStorage.setItem("user", JSON.stringify(next.user));
      emit("auth:changed");
    } else {
      setActiveAccountId("");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      emit("auth:changed");
    }
  }
}

// Keep the active account snapshot in sync after profile edits
export function updateCurrentAccountUser(user) {
  if (!user?.id) return;
  const active = getActiveAccountId();
  if (!active) return;

  const list = getAccounts();
  const idx = list.findIndex((a) => String(a.id) === String(user.id));
  if (idx >= 0) {
    list[idx].user = { ...list[idx].user, ...user, id: user.id };
    list[idx].username = user.username || list[idx].username;
    if (typeof user.passwordSet === "boolean") list[idx].passwordSet = user.passwordSet;
    saveAccounts(list);
    emit("accounts:changed");
  }
}

// NEW: update any account’s snapshot (e.g., to add profileImage)
export function updateAccountUserSnapshot(id, patch = {}) {
  const list = getAccounts();
  const idx = list.findIndex((a) => String(a.id) === String(id));
  if (idx < 0) return false;

  const before = list[idx];
  const nextUser = { ...(before.user || {}), ...patch, id: before.id };
  const next = {
    ...before,
    user: nextUser,
    username: patch.username || before.username,
    role: patch.role || before.role,
    passwordSet:
      typeof patch.passwordSet === "boolean" ? patch.passwordSet : before.passwordSet,
  };
  list[idx] = next;
  saveAccounts(list);
  emit("accounts:changed");
  return true;
}