import { Edit3, KeyRound, Plus, Search, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import {
  createAdminUserAccount,
  deleteAdminUserAccount,
  checkAdminUsersBackendHealth,
  fetchAdminUsersList,
  resetAdminUserPassword,
  updateAdminUserProfile,
} from "../../core/api/adminUsersApi";

const ROLE_OPTIONS = ["user", "superuser", "office", "manager", "admin"];
const STATUS_OPTIONS = ["active", "inactive"];
const INITIAL_CREATE_FORM = {
  email: "",
  password: "",
  name: "",
  operatorNumber: "",
  role: "user",
  status: "active",
};
const INITIAL_PASSWORD_FORM = {
  newPassword: "",
};

function formatLastActivity(value, locale, copy) {
  if (!value) {
    return copy.noActivity;
  }

  return new Date(value).toLocaleString(locale);
}

function formatLastLogin(value, locale, copy) {
  if (!value) {
    return copy.noLogin;
  }

  return new Date(value).toLocaleString(locale);
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "status-badge status-badge--active";
  if (normalized === "inactive") return "status-badge status-badge--inactive";
  if (normalized === "paused") return "status-badge status-badge--paused";
  return "status-badge status-badge--neutral";
}

export default function UserPanelModern() {
  const { language, locale } = useAppPreferences();
  const copy = {
    pl: {
      noActivity: "Brak aktywnosci",
      noLogin: "Brak logowania",
      loadError: "Nie udalo sie pobrac listy uzytkownikow",
      saveChangesError: "Nie udalo sie zapisac zmian",
      emailPasswordRequired: "Email i haslo sa wymagane",
      createUserError: "Nie udalo sie utworzyc uzytkownika",
      enterNewPassword: "Wprowadz nowe haslo",
      passwordResetSuccess: "Haslo zostalo zresetowane.",
      resetPasswordError: "Nie udalo sie zresetowac hasla",
      deleteUserError: "Nie udalo sie usunac uzytkownika",
      title: "Uzytkownicy",
      subtitle: "Lista operatorow, ich ostatnia aktywnosc i panel szybkiej administracji kontami.",
      backLabel: "Powrot do ustawien",
      addUser: "Dodaj uzytkownika",
      search: "Szukaj",
      searchPlaceholder: "Email, pseudonim, rola lub numer operatora",
      status: "Status",
      all: "Wszystkie",
      active: "Aktywne",
      inactive: "Nieaktywne",
      loading: "Ladowanie listy uzytkownikow...",
      fallbackInfo: "Lista zostala zaladowana z tabel `profiles` i `sessions`, bo edge function `admin-users` nie odpowiedziala. Akcje takie jak tworzenie kont, reset hasla i usuwanie wymagaja wdrozonego backendu administratorskiego.",
      rpcInfoPrefix: "Lista i edycja profilu sa obslugiwane przez SQL RPC. Backend edge jest",
      rpcInfoDown: " niedostepny, wiec create/reset/delete pozostaja zablokowane.",
      rpcInfoUp: " aktywny, wiec pelne akcje administratorskie sa dostepne.",
      rpcInfoUnknown: " jeszcze niezweryfikowany. Akcje create/reset/delete sprawdza go przy pierwszym uzyciu.",
      accountsCount: "Liczba kont",
      allProfilesHint: "Wszystkie profile widoczne w panelu.",
      activeAccounts: "Aktywne konta",
      activeAccountsHint: "Konta z dostepem do logowania.",
      activeSessions: "Aktywne sesje",
      activeSessionsHint: "Sesje aktualnie oznaczone jako active.",
      accountsWithLogin: "Konta z logowaniem",
      accountsWithLoginHint: "Profile, dla ktorych mamy timestamp ostatniego logowania.",
      usersList: "Lista uzytkownikow",
      usersAfterFilters: "{{count}} kont po zastosowaniu filtrow.",
      user: "Uzytkownik",
      role: "Rola",
      lastLogin: "Ostatnie logowanie",
      lastActivity: "Ostatnia aktywnosc",
      operatorNumber: "Numer operatora",
      session: "Sesja",
      actions: "Akcje",
      noAlias: "Brak pseudonimu",
      noEmail: "Brak emaila",
      none: "brak",
      edit: "Edytuj",
      noUsersFiltered: "Brak uzytkownikow spelniajacych filtry.",
      addUserTitle: "Dodaj uzytkownika",
      addUserDesc: "Utworz nowe konto operatora i przygotuj jego profil roboczy.",
      close: "Zamknij",
      email: "Email",
      emailPlaceholder: "operator@firma.pl",
      initialPassword: "Haslo startowe",
      passwordPlaceholder: "Wprowadz haslo",
      alias: "Pseudonim / imie operatora",
      aliasPlaceholder: "Np. Jan",
      operatorNumberPlaceholder: "Np. OP-014",
      createUserHint: "To konto zostanie utworzone przez bezpieczny backend administratorski, bez obchodzenia sesji zalogowanego admina.",
      backendUnavailableCreate: "Tworzenie kont jest chwilowo niedostepne, bo backend `admin-users` nie odpowiada.",
      createAccount: "Utworz konto",
      cancel: "Anuluj",
      editUserTitle: "Edycja uzytkownika",
      lastActivityPrefix: "ostatnia aktywnosc",
      aliasPlaceholderEdit: "Wprowadz imie operatora",
      accountStatus: "Status konta",
      lastLoginCard: "Ostatnie logowanie",
      authSourceHint: "Ta data pochodzi z warstwy logowania Supabase Auth.",
      lastSessionCard: "Ostatnia sesja",
      sessionsHint: "Status sesji pochodzi z ostatniej sesji z tabeli sessions.",
      newPassword: "Nowe haslo",
      resetPasswordPlaceholder: "Wprowadz nowe haslo do resetu",
      editHint: "Zmiana roli, aktywacja, dezaktywacja, pseudonim i numer operatora sa przygotowane pod bezpieczny backend administracyjny.",
      backendUnavailableRpc: "Edycja profilu jest chwilowo niedostepna, bo backend RPC nie odpowiedzial.",
      backendUnavailableEdge: "Reset hasla i usuwanie sa chwilowo wylaczone, dopoki backend `admin-users` nie zostanie wdrozony.",
      saveChanges: "Zapisz zmiany",
      deactivate: "Dezaktywuj konto",
      activate: "Aktywuj konto",
      resetPassword: "Reset hasla",
      deleteUser: "Usun uzytkownika",
    },
    en: {
      noActivity: "No activity",
      noLogin: "No login",
      loadError: "Could not load the user list",
      saveChangesError: "Could not save changes",
      emailPasswordRequired: "Email and password are required",
      createUserError: "Could not create the user",
      enterNewPassword: "Enter a new password",
      passwordResetSuccess: "Password has been reset.",
      resetPasswordError: "Could not reset the password",
      deleteUserError: "Could not delete the user",
      title: "Users",
      subtitle: "List of operators, their latest activity and a quick account administration panel.",
      backLabel: "Back to settings",
      addUser: "Add user",
      search: "Search",
      searchPlaceholder: "Email, alias, role or operator number",
      status: "Status",
      all: "All",
      active: "Active",
      inactive: "Inactive",
      loading: "Loading user list...",
      fallbackInfo: "The list was loaded from the `profiles` and `sessions` tables because the `admin-users` edge function did not respond. Actions such as account creation, password reset and deletion require the deployed admin backend.",
      rpcInfoPrefix: "List and profile editing are handled by SQL RPC. The edge backend is",
      rpcInfoDown: " unavailable, so create/reset/delete remain blocked.",
      rpcInfoUp: " active, so full admin actions are available.",
      rpcInfoUnknown: " not verified yet. Create/reset/delete actions will check it on first use.",
      accountsCount: "Accounts",
      allProfilesHint: "All profiles visible in the panel.",
      activeAccounts: "Active accounts",
      activeAccountsHint: "Accounts with login access.",
      activeSessions: "Active sessions",
      activeSessionsHint: "Sessions currently marked as active.",
      accountsWithLogin: "Accounts with login",
      accountsWithLoginHint: "Profiles that have a last login timestamp.",
      usersList: "User list",
      usersAfterFilters: "{{count}} accounts after filters.",
      user: "User",
      role: "Role",
      lastLogin: "Last login",
      lastActivity: "Last activity",
      operatorNumber: "Operator number",
      session: "Session",
      actions: "Actions",
      noAlias: "No alias",
      noEmail: "No email",
      none: "none",
      edit: "Edit",
      noUsersFiltered: "No users match the filters.",
      addUserTitle: "Add user",
      addUserDesc: "Create a new operator account and prepare its work profile.",
      close: "Close",
      email: "Email",
      emailPlaceholder: "operator@company.com",
      initialPassword: "Initial password",
      passwordPlaceholder: "Enter password",
      alias: "Alias / operator name",
      aliasPlaceholder: "e.g. John",
      operatorNumberPlaceholder: "e.g. OP-014",
      createUserHint: "This account will be created through the secure admin backend without bypassing the logged-in admin session.",
      backendUnavailableCreate: "Account creation is temporarily unavailable because the `admin-users` backend is not responding.",
      createAccount: "Create account",
      cancel: "Cancel",
      editUserTitle: "Edit user",
      lastActivityPrefix: "last activity",
      aliasPlaceholderEdit: "Enter operator name",
      accountStatus: "Account status",
      lastLoginCard: "Last login",
      authSourceHint: "This date comes from the Supabase Auth login layer.",
      lastSessionCard: "Last session",
      sessionsHint: "Session status comes from the latest record in the sessions table.",
      newPassword: "New password",
      resetPasswordPlaceholder: "Enter new password to reset",
      editHint: "Role changes, activation, deactivation, alias and operator number are prepared for the secure admin backend.",
      backendUnavailableRpc: "Profile editing is temporarily unavailable because the RPC backend did not respond.",
      backendUnavailableEdge: "Password reset and delete are temporarily disabled until the `admin-users` backend is deployed.",
      saveChanges: "Save changes",
      deactivate: "Deactivate account",
      activate: "Activate account",
      resetPassword: "Reset password",
      deleteUser: "Delete user",
    },
    de: {
      noActivity: "Keine Aktivitat",
      noLogin: "Kein Login",
      loadError: "Benutzerliste konnte nicht geladen werden",
      saveChangesError: "Aenderungen konnten nicht gespeichert werden",
      emailPasswordRequired: "E-Mail und Passwort sind erforderlich",
      createUserError: "Benutzer konnte nicht erstellt werden",
      enterNewPassword: "Neues Passwort eingeben",
      passwordResetSuccess: "Passwort wurde zuruckgesetzt.",
      resetPasswordError: "Passwort konnte nicht zuruckgesetzt werden",
      deleteUserError: "Benutzer konnte nicht geloescht werden",
      title: "Benutzer",
      subtitle: "Liste der Operatoren, ihrer letzten Aktivitat und ein Schnellbereich fur die Kontoverwaltung.",
      backLabel: "Zuruck zu den Einstellungen",
      addUser: "Benutzer hinzufugen",
      search: "Suchen",
      searchPlaceholder: "E-Mail, Alias, Rolle oder Operatornummer",
      status: "Status",
      all: "Alle",
      active: "Aktiv",
      inactive: "Inaktiv",
      loading: "Benutzerliste wird geladen...",
      fallbackInfo: "Die Liste wurde aus den Tabellen `profiles` und `sessions` geladen, weil die Edge Function `admin-users` nicht geantwortet hat. Aktionen wie Benutzeranlage, Passwort-Reset und Loeschung benoetigen das bereitgestellte Admin-Backend.",
      rpcInfoPrefix: "Liste und Profilbearbeitung werden ueber SQL RPC bedient. Das Edge-Backend ist",
      rpcInfoDown: " nicht verfuegbar, daher bleiben Erstellen/Reset/Loeschen blockiert.",
      rpcInfoUp: " aktiv, daher sind vollstaendige Admin-Aktionen verfuegbar.",
      rpcInfoUnknown: " noch nicht verifiziert. Erstellen/Reset/Loeschen pruefen es bei der ersten Nutzung.",
      accountsCount: "Konten",
      allProfilesHint: "Alle im Panel sichtbaren Profile.",
      activeAccounts: "Aktive Konten",
      activeAccountsHint: "Konten mit Login-Zugang.",
      activeSessions: "Aktive Sitzungen",
      activeSessionsHint: "Sitzungen, die aktuell als aktiv markiert sind.",
      accountsWithLogin: "Konten mit Login",
      accountsWithLoginHint: "Profile mit Zeitstempel fur den letzten Login.",
      usersList: "Benutzerliste",
      usersAfterFilters: "{{count}} Konten nach Anwendung der Filter.",
      user: "Benutzer",
      role: "Rolle",
      lastLogin: "Letzter Login",
      lastActivity: "Letzte Aktivitat",
      operatorNumber: "Operatornummer",
      session: "Sitzung",
      actions: "Aktionen",
      noAlias: "Kein Alias",
      noEmail: "Keine E-Mail",
      none: "keine",
      edit: "Bearbeiten",
      noUsersFiltered: "Keine Benutzer entsprechen den Filtern.",
      addUserTitle: "Benutzer hinzufugen",
      addUserDesc: "Neues Operator-Konto anlegen und Arbeitsprofil vorbereiten.",
      close: "Schliessen",
      email: "E-Mail",
      emailPlaceholder: "operator@unternehmen.de",
      initialPassword: "Startpasswort",
      passwordPlaceholder: "Passwort eingeben",
      alias: "Alias / Operatorname",
      aliasPlaceholder: "z. B. Jan",
      operatorNumberPlaceholder: "z. B. OP-014",
      createUserHint: "Dieses Konto wird ueber das sichere Admin-Backend angelegt, ohne die Sitzung des angemeldeten Admins zu umgehen.",
      backendUnavailableCreate: "Die Benutzeranlage ist voruebergehend nicht verfuegbar, weil das `admin-users`-Backend nicht antwortet.",
      createAccount: "Konto anlegen",
      cancel: "Abbrechen",
      editUserTitle: "Benutzer bearbeiten",
      lastActivityPrefix: "letzte Aktivitat",
      aliasPlaceholderEdit: "Operatorname eingeben",
      accountStatus: "Kontostatus",
      lastLoginCard: "Letzter Login",
      authSourceHint: "Dieses Datum stammt aus der Supabase-Auth-Login-Schicht.",
      lastSessionCard: "Letzte Sitzung",
      sessionsHint: "Der Sitzungsstatus stammt aus dem letzten Eintrag der Tabelle `sessions`.",
      newPassword: "Neues Passwort",
      resetPasswordPlaceholder: "Neues Passwort fur den Reset eingeben",
      editHint: "Rollenwechsel, Aktivierung, Deaktivierung, Alias und Operatornummer sind fur das sichere Admin-Backend vorbereitet.",
      backendUnavailableRpc: "Die Profilbearbeitung ist voruebergehend nicht verfuegbar, weil das RPC-Backend nicht geantwortet hat.",
      backendUnavailableEdge: "Passwort-Reset und Loeschen sind voruebergehend deaktiviert, bis das `admin-users`-Backend bereitgestellt ist.",
      saveChanges: "Aenderungen speichern",
      deactivate: "Konto deaktivieren",
      activate: "Konto aktivieren",
      resetPassword: "Passwort zurucksetzen",
      deleteUser: "Benutzer loeschen",
    },
  }[language];
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [draft, setDraft] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [edgeAvailable, setEdgeAvailable] = useState(null);
  const [rpcAvailable, setRpcAvailable] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      const users = await fetchAdminUsersList();
      setRows(users);
      setRpcAvailable(
        users.some((row) => String(row.backendMode || "").includes("rpc")),
      );
      setError("");
    } catch (err) {
      setRpcAvailable(false);
      setError(err.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let cancelled = false;

    checkAdminUsersBackendHealth().then((result) => {
      if (!cancelled) {
        setEdgeAvailable(result.ok);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !needle ||
        String(row.email || "").toLowerCase().includes(needle) ||
        String(row.alias || row.name || "").toLowerCase().includes(needle) ||
        String(row.role || "").toLowerCase().includes(needle) ||
        String(row.operatorNumber || "").toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const userSummary = useMemo(() => {
    const totalUsers = rows.length;
    const activeAccounts = rows.filter((row) => row.status === "active").length;
    const activeSessions = rows.filter((row) => row.latest_session_status === "active").length;
    const recentLogins = rows.filter((row) => row.last_sign_in_at).length;

    return {
      totalUsers,
      activeAccounts,
      activeSessions,
      recentLogins,
    };
  }, [rows]);

  const usesFallbackBackend = rows.some((row) => row.backendMode === "fallback");

  function openEditor(user) {
    setSelectedUser(user);
    setDraft({
      ...user,
      name: user.name || "",
      operatorNumber: user.operatorNumber || "",
    });
    setPasswordForm(INITIAL_PASSWORD_FORM);
  }

  function closeEditor() {
    setSelectedUser(null);
    setDraft(null);
    setPasswordForm(INITIAL_PASSWORD_FORM);
  }

  async function handleSaveUser() {
    if (!selectedUser || !draft) return;

    try {
      setSaving(true);
      await updateAdminUserProfile(selectedUser.user_id, {
        name: draft.name,
        role: draft.role,
        status: draft.status,
        operatorNumber: draft.operatorNumber,
      });
      await loadUsers();
      closeEditor();
    } catch (err) {
      alert(err.message || copy.saveChangesError);
    } finally {
      setSaving(false);
    }
  }

  function handleToggleStatus() {
    if (!draft) return;
    const nextStatus = draft.status === "active" ? "inactive" : "active";
    setDraft((current) => ({ ...current, status: nextStatus }));
  }

  async function handleCreateUser() {
    if (!createForm.email || !createForm.password) {
      alert(copy.emailPasswordRequired);
      return;
    }

    try {
      setSaving(true);
      await createAdminUserAccount(createForm);
      setEdgeAvailable(true);
      setCreateForm(INITIAL_CREATE_FORM);
      setCreateOpen(false);
      await loadUsers();
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("backend `admin-users` nie odpowiada")) {
        setEdgeAvailable(false);
      }
      alert(err.message || copy.createUserError);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!selectedUser) return;
    if (!passwordForm.newPassword) {
      alert(copy.enterNewPassword);
      return;
    }

    try {
      setSaving(true);
      await resetAdminUserPassword(selectedUser.user_id, passwordForm.newPassword);
      setEdgeAvailable(true);
      setPasswordForm(INITIAL_PASSWORD_FORM);
      alert(copy.passwordResetSuccess);
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("backend `admin-users` nie odpowiada")) {
        setEdgeAvailable(false);
      }
      alert(err.message || copy.resetPasswordError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await deleteAdminUserAccount(selectedUser.user_id);
      setEdgeAvailable(true);
      await loadUsers();
      closeEditor();
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("backend `admin-users` nie odpowiada")) {
        setEdgeAvailable(false);
      }
      alert(err.message || copy.deleteUserError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<Users size={26} />}
      backTo="/admin"
      backLabel={copy.backLabel}
      compact
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          {copy.addUser}
        </Button>
      }
    >
      <div className="app-card user-toolbar-card">
        <div className="user-toolbar-row">
          <div className="app-field user-toolbar-row__search">
            <label className="app-field__label">{copy.search}</label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--app-text-soft)",
                }}
              />
              <input
                style={{ paddingLeft: 40 }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
              />
            </div>
          </div>

          <div className="app-field">
            <label className="app-field__label">{copy.status}</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">{copy.all}</option>
              <option value="active">{copy.active}</option>
              <option value="inactive">{copy.inactive}</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <div className="app-card">{copy.loading}</div> : null}
      {error ? <div className="input-error-text">{error}</div> : null}
      {!loading && !error && usesFallbackBackend ? (
        <div className="app-card" style={{ marginBottom: 16 }}>
          {copy.fallbackInfo}
        </div>
      ) : null}
      {!loading && !error && rpcAvailable ? (
        <div className="app-card" style={{ marginBottom: 16 }}>
          {copy.rpcInfoPrefix}
          {edgeAvailable === false
            ? copy.rpcInfoDown
            : edgeAvailable === true
              ? copy.rpcInfoUp
              : copy.rpcInfoUnknown}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="system-status-grid" style={{ marginBottom: 16 }}>
          <div className="system-status-metric system-status-metric--neutral">
            <div>
              <div className="system-status-metric__label">{copy.accountsCount}</div>
              <div className="system-status-metric__value">{userSummary.totalUsers}</div>
              <div className="system-status-metric__hint">{copy.allProfilesHint}</div>
            </div>
          </div>
          <div className="system-status-metric system-status-metric--healthy">
            <div>
              <div className="system-status-metric__label">{copy.activeAccounts}</div>
              <div className="system-status-metric__value">{userSummary.activeAccounts}</div>
              <div className="system-status-metric__hint">{copy.activeAccountsHint}</div>
            </div>
          </div>
          <div className="system-status-metric system-status-metric--neutral">
            <div>
              <div className="system-status-metric__label">{copy.activeSessions}</div>
              <div className="system-status-metric__value">{userSummary.activeSessions}</div>
              <div className="system-status-metric__hint">{copy.activeSessionsHint}</div>
            </div>
          </div>
          <div className="system-status-metric system-status-metric--neutral">
            <div>
              <div className="system-status-metric__label">{copy.accountsWithLogin}</div>
              <div className="system-status-metric__value">{userSummary.recentLogins}</div>
              <div className="system-status-metric__hint">{copy.accountsWithLoginHint}</div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="app-card">
          <div className="app-module-panel__header" style={{ marginBottom: 14 }}>
            <div>
              <h2 className="process-panel__title" style={{ fontSize: 24 }}>
                {copy.usersList}
              </h2>
              <p className="process-panel__subtitle">
                {copy.usersAfterFilters.replace("{{count}}", filteredRows.length)}
              </p>
            </div>
          </div>

          <div className="dashboard-table-scroll">
            <table className="app-table">
              <thead>
                <tr>
                  <th>{copy.user}</th>
                  <th>{copy.role}</th>
                  <th>{copy.status}</th>
                  <th>{copy.lastLogin}</th>
                  <th>{copy.lastActivity}</th>
                  <th>{copy.operatorNumber}</th>
                  <th>{copy.session}</th>
                  <th>{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="user-inline">
                        <div className="user-table-avatar">
                          {(row.alias || row.email || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="user-inline__title">{row.alias || copy.noAlias}</div>
                          <div className="user-inline__meta">{row.email || copy.noEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{row.role}</td>
                    <td>
                      <span className={getStatusClass(row.status)}>
                        {row.status === "active" ? copy.active : copy.inactive}
                      </span>
                    </td>
                    <td>{formatLastLogin(row.last_sign_in_at, locale, copy)}</td>
                    <td>{formatLastActivity(row.last_activity, locale, copy)}</td>
                    <td>{row.operatorNumber || "-"}</td>
                    <td>
                      <span className={getStatusClass(row.latest_session_status)}>
                        {row.latest_session_status || copy.none}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={!rpcAvailable}
                        onClick={() => openEditor(row)}
                      >
                        <Edit3 size={16} />
                        {copy.edit}
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="app-empty-state">
                      {copy.noUsersFiltered}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="history-modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <h2 className="process-panel__title" style={{ fontSize: 26, margin: 0 }}>
                  {copy.addUserTitle}
                </h2>
                <p className="process-panel__subtitle">
                  {copy.addUserDesc}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                {copy.close}
              </Button>
            </div>

            <div className="history-modal__grid">
              <Input
                label={copy.email}
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder={copy.emailPlaceholder}
              />
              <Input
                label={copy.initialPassword}
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder={copy.passwordPlaceholder}
              />
              <Input
                label={copy.alias}
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={copy.aliasPlaceholder}
              />
              <Input
                label={copy.operatorNumber}
                value={createForm.operatorNumber}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, operatorNumber: event.target.value }))
                }
                placeholder={copy.operatorNumberPlaceholder}
              />
              <div className="app-field">
                <label className="app-field__label">{copy.role}</label>
                <select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="app-field">
                <label className="app-field__label">{copy.status}</label>
                <select
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "active" ? copy.active : copy.inactive}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="helper-note" style={{ marginTop: 14 }}>
              {copy.createUserHint}
            </p>
            {edgeAvailable === false ? (
              <p className="input-error-text" style={{ marginTop: 10 }}>
                {copy.backendUnavailableCreate}
              </p>
            ) : null}

            <div className="process-actions" style={{ marginTop: 20 }}>
              <Button loading={saving} onClick={handleCreateUser}>
                <UserPlus size={16} />
                {copy.createAccount}
              </Button>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                {copy.cancel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedUser && draft ? (
        <div className="history-modal-overlay" onClick={closeEditor}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <h2 className="process-panel__title" style={{ fontSize: 26, margin: 0 }}>
                  {copy.editUserTitle}
                </h2>
                <p className="process-panel__subtitle">
                  {selectedUser.email || copy.noEmail} - {copy.lastActivityPrefix}: {formatLastActivity(selectedUser.last_activity, locale, copy)}
                </p>
              </div>
              <Button variant="secondary" onClick={closeEditor}>
                {copy.close}
              </Button>
            </div>

            <div className="history-modal__grid">
              <Input label={copy.email} value={draft.email || ""} disabled />
              <Input
                label={copy.alias}
                value={draft.name || ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={copy.aliasPlaceholderEdit}
              />
              <div className="app-field">
                <label className="app-field__label">{copy.role}</label>
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="app-field">
                <label className="app-field__label">{copy.accountStatus}</label>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "active" ? copy.active : copy.inactive}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={copy.operatorNumber}
                value={draft.operatorNumber || ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, operatorNumber: event.target.value }))
                }
                placeholder={copy.operatorNumberPlaceholder}
              />
              <div className="app-card" style={{ padding: 16 }}>
                <div className="app-field__label">{copy.lastLoginCard}</div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  {formatLastLogin(selectedUser.last_sign_in_at, locale, copy)}
                </div>
                <div className="helper-note" style={{ marginTop: 8 }}>
                  {copy.authSourceHint}
                </div>
              </div>
              <div className="app-card" style={{ padding: 16 }}>
                <div className="app-field__label">{copy.lastSessionCard}</div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  {selectedUser.latest_session_status || copy.none}
                </div>
                <div className="helper-note" style={{ marginTop: 8 }}>
                  {copy.sessionsHint}
                </div>
              </div>
              <Input
                label={copy.newPassword}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm({ newPassword: event.target.value })}
                placeholder={copy.resetPasswordPlaceholder}
              />
            </div>

            <p className="helper-note" style={{ marginTop: 14 }}>
              {copy.editHint}
            </p>
            {!rpcAvailable || edgeAvailable === false ? (
              <p className="input-error-text" style={{ marginTop: 10 }}>
                {!rpcAvailable
                  ? copy.backendUnavailableRpc
                  : copy.backendUnavailableEdge}
              </p>
            ) : null}

            <div className="process-actions" style={{ marginTop: 20 }}>
              <Button disabled={!rpcAvailable} loading={saving} onClick={handleSaveUser}>
                <Shield size={16} />
                {copy.saveChanges}
              </Button>
              <Button disabled={!rpcAvailable} variant="secondary" onClick={handleToggleStatus}>
                {draft.status === "active" ? copy.deactivate : copy.activate}
              </Button>
            </div>

            <div className="process-actions" style={{ marginTop: 12 }}>
              <Button disabled={edgeAvailable === false} variant="secondary" loading={saving} onClick={handlePasswordReset}>
                <KeyRound size={16} />
                {copy.resetPassword}
              </Button>
              <Button disabled={edgeAvailable === false} variant="secondary" loading={saving} onClick={handleDeleteUser}>
                <Trash2 size={16} />
                {copy.deleteUser}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
